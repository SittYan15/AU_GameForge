// frontend/racing/carPhysicsController.js
import * as BABYLON from "@babylonjs/core";
import {
    PLAYER_COLLIDER_HALF_HEIGHT
} from "../grounding.js";

/*
 * AU Campus Road Race v1.3
 * --------------------------------
 * Lightweight raycast-vehicle dynamics with actual vertical motion.
 *
 * This is intentionally NOT a full Havok rigid-body vehicle. The project does
 * not currently include @babylonjs/havok, and the previous CPU bottleneck came
 * from too many scene queries. This controller keeps the current multiplayer
 * architecture while adding the important physical behavior:
 *
 * - real 9.81 m/s² gravity
 * - airborne / grounded state
 * - spring + damper suspension
 * - suspension droop and compression
 * - ramp takeoff and landing
 * - uphill/downhill gravity component
 * - traction loss in the air
 * - reduced steering in the air
 * - lateral tire grip
 * - aerodynamic drag
 * - rolling resistance
 * - speed-sensitive steering
 * - collision energy loss
 * - landing impact
 * - body pitch / roll
 *
 * Expensive ground raycasts are throttled. Integration and interpolation still
 * run every rendered frame.
 */

const DEFAULTS = Object.freeze({
    maxForwardSpeed: 24.0,
    maxReverseSpeed: 6.0,

    engineAcceleration: 11.5,
    reverseAcceleration: 5.2,
    brakeDeceleration: 19.0,

    rollingResistance: 0.72,
    aerodynamicDrag: 0.015,
    airDrag: 0.006,

    gravity: 9.81,
    downforceAcceleration: 1.8,

    wheelBase: 2.65,
    trackWidth: 1.72,

    maxSteerLowSpeed: 0.56,
    maxSteerHighSpeed: 0.18,
    steeringResponse: 7.0,
    airSteerFactor: 0.10,

    lateralGripLowSpeed: 12.0,
    lateralGripHighSpeed: 5.5,
    airLateralGrip: 0.15,

    collisionVelocityRetention: 0.24,

    // The network/player root remains the humanoid capsule center.
    rideHeight: PLAYER_COLLIDER_HALF_HEIGHT,

    // Raycast suspension. Values are acceleration-domain rather than Newtons,
    // so vehicle mass cancels out and tuning stays simple.
    suspensionTravel: 0.46,
    suspensionCompressionLimit: 0.38,
    suspensionSpring: 44.0,
    suspensionDamping: 11.5,
    maxSuspensionAcceleration: 34.0,
    maxVerticalSpeed: 12.0,

    // The car may stay attached on normal road transitions, but a real gap
    // larger than rideHeight + suspensionTravel produces an airborne state.
    landingSnapTolerance: 0.10,

    obstacleProbeWidth: 0.38,
    obstacleProbeForwardPadding: 0.65,
    obstacleNormalYThreshold: 0.55,

    // 3 ground rays * ~30 Hz = ~90 ground intersections/sec for the local car.
    // This is far cheaper than the old 15+ raycasts every rendered frame.
    surfaceProbeIntervalMs: 33,
    obstacleProbeIntervalMs: 60,

    surfaceSmoothingSpeed: 8.5,

    bodyRollAmount: 0.075,
    bodyPitchAmount: 0.028,
    groundedVisualResponse: 8.0,
    airborneVisualResponse: 1.3,

    groundProbeUp: 3.5,
    groundProbeDown: 14.0,
    minGroundNormalY: 0.30
});

const WORLD_UP =
    new BABYLON.Vector3(
        0,
        1,
        0
    );

function moveToward(
    value,
    target,
    maxDelta
) {
    return value < target
        ? Math.min(
            target,
            value + maxDelta
        )
        : Math.max(
            target,
            value - maxDelta
        );
}

function signOrZero(value) {
    return Math.abs(value) < 0.0001
        ? 0
        : Math.sign(value);
}

function expBlend(
    response,
    deltaSeconds
) {
    return (
        1 -
        Math.exp(
            -response *
            deltaSeconds
        )
    );
}

function safeNormalize(
    vector,
    fallback
) {
    return vector.lengthSquared() < 0.000001
        ? fallback.clone()
        : vector.normalize();
}

function smoothUnitVector(
    current,
    target,
    blend,
    fallback
) {
    return safeNormalize(
        BABYLON.Vector3.Lerp(
            current,
            target,
            blend
        ),
        fallback
    );
}

function horizontalForward(
    heading
) {
    return new BABYLON.Vector3(
        Math.sin(heading),
        0,
        Math.cos(heading)
    );
}

function horizontalRight(
    heading
) {
    return new BABYLON.Vector3(
        Math.cos(heading),
        0,
        -Math.sin(heading)
    );
}

function isWalkableRaceGround(mesh) {
    return (
        mesh?.metadata
            ?.groundingRole ===
            "walkable" &&
        mesh.isEnabled() &&
        mesh.isVisible &&
        mesh.isPickable
    );
}

function sampleGround(
    scene,
    position,
    config
) {
    const origin =
        new BABYLON.Vector3(
            position.x,
            position.y +
                config.groundProbeUp,
            position.z
        );

    const ray =
        new BABYLON.Ray(
            origin,
            BABYLON.Vector3.Down(),
            config.groundProbeUp +
                config.groundProbeDown
        );

    const hit =
        scene.pickWithRay(
            ray,
            isWalkableRaceGround,
            false
        );

    if (
        !hit?.hit ||
        !hit.pickedPoint
    ) {
        return null;
    }

    const normal =
        hit.getNormal(true);

    if (
        !normal ||
        normal.y <
            config.minGroundNormalY
    ) {
        return null;
    }

    return {
        point:
            hit.pickedPoint.clone(),
        normal:
            normal.normalize(),
        mesh:
            hit.pickedMesh
    };
}

function sampleCarGroundProbes(
    scene,
    position,
    heading,
    config
) {
    const forward =
        horizontalForward(
            heading
        );

    const halfWheelBase =
        config.wheelBase *
        0.46;

    return {
        center:
            sampleGround(
                scene,
                position,
                config
            ),

        front:
            sampleGround(
                scene,
                position.add(
                    forward.scale(
                        halfWheelBase
                    )
                ),
                config
            ),

        rear:
            sampleGround(
                scene,
                position.subtract(
                    forward.scale(
                        halfWheelBase
                    )
                ),
                config
            )
    };
}

function buildSurfaceFromProbes(
    probes,
    heading
) {
    const forward =
        horizontalForward(
            heading
        );

    const right =
        horizontalRight(
            heading
        );

    const available =
        Object.values(
            probes
        )
            .filter(Boolean);

    let normal =
        WORLD_UP.clone();

    if (available.length) {
        normal =
            available
                .reduce(
                    (
                        total,
                        probe
                    ) =>
                        total.add(
                            probe.normal
                        ),
                    BABYLON.Vector3.Zero()
                )
                .normalize();
    }

    const projectedForward =
        forward.subtract(
            normal.scale(
                BABYLON.Vector3.Dot(
                    forward,
                    normal
                )
            )
        );

    const surfaceForward =
        safeNormalize(
            projectedForward,
            forward
        );

    const surfaceRight =
        safeNormalize(
            BABYLON.Vector3.Cross(
                normal,
                surfaceForward
            ),
            right
        );

    let pitch =
        Math.asin(
            BABYLON.Scalar.Clamp(
                surfaceForward.y,
                -1,
                1
            )
        );

    if (
        probes.front &&
        probes.rear
    ) {
        pitch =
            Math.atan2(
                probes.front.point.y -
                    probes.rear.point.y,
                2.65 *
                    0.92
            );
    }

    const roll =
        Math.atan2(
            BABYLON.Vector3.Dot(
                normal,
                right
            ),
            Math.max(
                0.001,
                normal.y
            )
        );

    return {
        probes,
        normal,
        forward:
            surfaceForward,
        right:
            surfaceRight,
        pitch,
        roll,
        groundPoint:
            probes.center
                ?.point ||
            probes.front
                ?.point ||
            probes.rear
                ?.point ||
            null
    };
}

function findBlockingObstacle(
    scene,
    position,
    requestedMovement,
    config
) {
    const distance =
        Math.hypot(
            requestedMovement.x,
            requestedMovement.z
        );

    if (
        distance <
        0.0001
    ) {
        return null;
    }

    const direction =
        safeNormalize(
            new BABYLON.Vector3(
                requestedMovement.x,
                0,
                requestedMovement.z
            ),
            BABYLON.Vector3.Forward()
        );

    const right =
        safeNormalize(
            BABYLON.Vector3.Cross(
                BABYLON.Vector3.Up(),
                direction
            ),
            BABYLON.Vector3.Right()
        );

    const rayLength =
        distance +
        config.obstacleProbeForwardPadding;

    const baseOrigin =
        position.add(
            new BABYLON.Vector3(
                0,
                0.10,
                0
            )
        );

    const origins = [
        baseOrigin,
        baseOrigin.add(
            right.scale(
                config.obstacleProbeWidth
            )
        ),
        baseOrigin.subtract(
            right.scale(
                config.obstacleProbeWidth
            )
        )
    ];

    for (
        const origin of
        origins
    ) {
        const ray =
            new BABYLON.Ray(
                origin,
                direction,
                rayLength
            );

        const hits =
            scene.multiPickWithRay(
                ray,
                (mesh) =>
                    mesh &&
                    mesh.name !==
                        "player" &&
                    mesh.isEnabled() &&
                    mesh.isVisible &&
                    mesh.checkCollisions
            ) ||
            [];

        hits.sort(
            (a, b) =>
                a.distance -
                b.distance
        );

        for (
            const hit of
            hits
        ) {
            if (
                !hit.hit ||
                !hit.pickedPoint
            ) {
                continue;
            }

            const normal =
                hit.getNormal(true);

            if (!normal) {
                continue;
            }

            // Road/ramp triangles face upward. Only wall-like geometry is a
            // blocking obstacle for the racing controller.
            if (
                Math.abs(
                    normal.y
                ) >=
                config.obstacleNormalYThreshold
            ) {
                continue;
            }

            return {
                hit,
                normal:
                    normal.normalize()
            };
        }
    }

    return null;
}

export function sampleCarSurface(
    scene,
    position,
    heading,
    options = {}
) {
    const config = {
        ...DEFAULTS,
        ...options
    };

    return buildSurfaceFromProbes(
        sampleCarGroundProbes(
            scene,
            position,
            heading,
            config
        ),
        heading
    );
}

export function createCarPhysicsController({
    scene,
    player,
    getInputMap,
    startHeading = 0,
    options = {}
}) {
    const config = {
        ...DEFAULTS,
        ...options
    };

    let enabled = false;

    let heading =
        startHeading;

    // Horizontal world-space velocity. Y is deliberately kept at zero because
    // vertical motion has its own gravity/suspension state.
    let planarVelocity =
        BABYLON.Vector3.Zero();

    let verticalVelocity = 0;
    let steering = 0;

    let lastLongitudinalSpeed = 0;

    let grounded = false;
    let wasGrounded = false;
    let airTime = 0;
    let suspensionCompression = 0;
    let landingImpact = 0;

    let visualPitch = 0;
    let visualRoll = 0;

    let cachedGroundProbes =
        sampleCarGroundProbes(
            scene,
            player.position,
            heading,
            config
        );

    let lastSurfaceProbeAt =
        performance.now();

    let lastObstacleProbeAt =
        -Infinity;

    let cachedObstacle =
        null;

    let surfaceState =
        buildSurfaceFromProbes(
            cachedGroundProbes,
            heading
        );

    let smoothedSurfaceNormal =
        surfaceState.normal.clone();

    let smoothedSurfaceForward =
        surfaceState.forward.clone();

    let smoothedSurfacePitch =
        surfaceState.pitch;

    let smoothedSurfaceRoll =
        surfaceState.roll;

    const smoothSurface =
        (
            rawSurface,
            deltaSeconds,
            snap = false
        ) => {
            const blend =
                snap
                    ? 1
                    : expBlend(
                        config.surfaceSmoothingSpeed,
                        deltaSeconds
                    );

            smoothedSurfaceNormal =
                smoothUnitVector(
                    smoothedSurfaceNormal,
                    rawSurface.normal,
                    blend,
                    WORLD_UP
                );

            smoothedSurfaceForward =
                smoothUnitVector(
                    smoothedSurfaceForward,
                    rawSurface.forward,
                    blend,
                    horizontalForward(
                        heading
                    )
                );

            smoothedSurfaceForward =
                safeNormalize(
                    smoothedSurfaceForward.subtract(
                        smoothedSurfaceNormal.scale(
                            BABYLON.Vector3.Dot(
                                smoothedSurfaceForward,
                                smoothedSurfaceNormal
                            )
                        )
                    ),
                    horizontalForward(
                        heading
                    )
                );

            const smoothedRight =
                safeNormalize(
                    BABYLON.Vector3.Cross(
                        smoothedSurfaceNormal,
                        smoothedSurfaceForward
                    ),
                    horizontalRight(
                        heading
                    )
                );

            smoothedSurfacePitch =
                BABYLON.Scalar.Lerp(
                    smoothedSurfacePitch,
                    rawSurface.pitch,
                    blend
                );

            smoothedSurfaceRoll =
                BABYLON.Scalar.Lerp(
                    smoothedSurfaceRoll,
                    rawSurface.roll,
                    blend
                );

            return {
                ...rawSurface,
                normal:
                    smoothedSurfaceNormal.clone(),
                forward:
                    smoothedSurfaceForward.clone(),
                right:
                    smoothedRight,
                pitch:
                    smoothedSurfacePitch,
                roll:
                    smoothedSurfaceRoll
            };
        };

    surfaceState =
        smoothSurface(
            surfaceState,
            0,
            true
        );

    const refreshSurface =
        (
            deltaSeconds,
            force = false
        ) => {
            const now =
                performance.now();

            if (
                force ||
                now -
                    lastSurfaceProbeAt >=
                    config.surfaceProbeIntervalMs
            ) {
                cachedGroundProbes =
                    sampleCarGroundProbes(
                        scene,
                        player.position,
                        heading,
                        config
                    );

                lastSurfaceProbeAt =
                    now;
            }

            surfaceState =
                smoothSurface(
                    buildSurfaceFromProbes(
                        cachedGroundProbes,
                        heading
                    ),
                    deltaSeconds,
                    force
                );

            return surfaceState;
        };

    const refreshObstacle =
        (
            requestedMovement,
            force = false
        ) => {
            const now =
                performance.now();

            if (
                force ||
                now -
                    lastObstacleProbeAt >=
                    config.obstacleProbeIntervalMs
            ) {
                cachedObstacle =
                    findBlockingObstacle(
                        scene,
                        player.position,
                        requestedMovement,
                        config
                    );

                lastObstacleProbeAt =
                    now;
            }

            return cachedObstacle;
        };

    const getGroundContact =
        () => {
            const centerGround =
                surfaceState
                    .probes
                    .center;

            if (!centerGround) {
                return {
                    hasGround:
                        false,
                    contact:
                        false,
                    roadY:
                        null,
                    distance:
                        Infinity,
                    targetY:
                        null,
                    compression:
                        0
                };
            }

            const roadY =
                centerGround.point.y;

            const distance =
                player.position.y -
                roadY;

            const targetY =
                roadY +
                config.rideHeight;

            const contact =
                distance <=
                    config.rideHeight +
                    config.suspensionTravel &&
                distance >=
                    config.rideHeight -
                    config.suspensionCompressionLimit -
                    0.20;

            const compression =
                BABYLON.Scalar.Clamp(
                    (
                        config.rideHeight -
                        distance
                    ) /
                        config.suspensionTravel,
                    -1,
                    1
                );

            return {
                hasGround:
                    true,
                contact,
                roadY,
                distance,
                targetY,
                compression
            };
        };

    let lastState = {
        speed: 0,
        heading,
        velocity:
            BABYLON.Vector3.Zero(),
        steering: 0,
        slipAmount: 0,
        collisionSeverity: 0,
        throttle: 0,
        brake: 0,
        speedRatio: 0,

        grounded: false,
        airborne: true,
        airTime: 0,
        verticalSpeed: 0,
        suspensionCompression: 0,
        landingImpact: 0,

        surfaceForward:
            surfaceState.forward.clone(),
        groundNormal:
            surfaceState.normal.clone(),
        groundPitch:
            surfaceState.pitch,
        groundRoll:
            surfaceState.roll,

        pitch: 0,
        roll: 0
    };

    const reset = ({
        nextHeading =
            startHeading,
        keepVelocity =
            false
    } = {}) => {
        heading =
            nextHeading;

        steering = 0;

        if (!keepVelocity) {
            planarVelocity.copyFromFloats(
                0,
                0,
                0
            );

            verticalVelocity = 0;
        }

        lastLongitudinalSpeed = 0;

        grounded = false;
        wasGrounded = false;
        airTime = 0;
        suspensionCompression = 0;
        landingImpact = 0;

        visualPitch = 0;
        visualRoll = 0;

        cachedGroundProbes =
            sampleCarGroundProbes(
                scene,
                player.position,
                heading,
                config
            );

        lastSurfaceProbeAt =
            performance.now();

        lastObstacleProbeAt =
            -Infinity;

        cachedObstacle =
            null;

        surfaceState =
            buildSurfaceFromProbes(
                cachedGroundProbes,
                heading
            );

        smoothedSurfaceNormal =
            surfaceState.normal.clone();

        smoothedSurfaceForward =
            surfaceState.forward.clone();

        smoothedSurfacePitch =
            surfaceState.pitch;

        smoothedSurfaceRoll =
            surfaceState.roll;

        surfaceState =
            smoothSurface(
                surfaceState,
                0,
                true
            );

        const contact =
            getGroundContact();

        if (
            contact.hasGround &&
            Math.abs(
                player.position.y -
                contact.targetY
            ) <
            1.0
        ) {
            player.position.y =
                contact.targetY;

            grounded = true;
            wasGrounded = true;
        }
    };

    const integrateVerticalPhysics =
        (
            deltaSeconds,
            speedRatio
        ) => {
            const contact =
                getGroundContact();

            landingImpact = 0;

            const previousGrounded =
                grounded;

            grounded = false;

            let verticalAcceleration =
                -config.gravity;

            if (
                contact.contact
            ) {
                const error =
                    contact.targetY -
                    player.position.y;

                // Suspension support includes static preload equal to gravity.
                // At target ride height:
                // springSupport = gravity
                // gravity + support => net zero.
                const springSupport =
                    BABYLON.Scalar.Clamp(
                        config.gravity +
                            error *
                                config.suspensionSpring -
                            verticalVelocity *
                                config.suspensionDamping,
                        0,
                        config.maxSuspensionAcceleration
                    );

                verticalAcceleration +=
                    springSupport;

                grounded =
                    springSupport >
                    0.05;

                suspensionCompression =
                    contact.compression;
            } else {
                suspensionCompression =
                    -1;
            }

            // Aerodynamic downforce is small enough to preserve jumps but
            // makes the car settle naturally at speed.
            verticalAcceleration -=
                config.downforceAcceleration *
                speedRatio *
                speedRatio;

            verticalVelocity +=
                verticalAcceleration *
                deltaSeconds;

            verticalVelocity =
                BABYLON.Scalar.Clamp(
                    verticalVelocity,
                    -config.maxVerticalSpeed,
                    config.maxVerticalSpeed
                );

            player.position.y +=
                verticalVelocity *
                deltaSeconds;

            // Suspension bottom-out / ground penetration protection.
            if (
                contact.hasGround
            ) {
                const minimumY =
                    contact.roadY +
                    config.rideHeight -
                    config.suspensionCompressionLimit;

                if (
                    player.position.y <
                    minimumY
                ) {
                    landingImpact =
                        Math.max(
                            landingImpact,
                            Math.max(
                                0,
                                -verticalVelocity
                            )
                        );

                    player.position.y =
                        minimumY;

                    verticalVelocity =
                        Math.max(
                            0,
                            verticalVelocity *
                                -0.08
                        );

                    grounded = true;
                }
            }

            if (
                grounded
            ) {
                airTime = 0;
            } else {
                airTime +=
                    deltaSeconds;
            }

            if (
                !previousGrounded &&
                grounded
            ) {
                landingImpact =
                    Math.max(
                        landingImpact,
                        Math.max(
                            0,
                            -verticalVelocity
                        )
                    );
            }

            wasGrounded =
                previousGrounded;

            return contact;
        };

    const update =
        (rawDeltaSeconds) => {
            const deltaSeconds =
                BABYLON.Scalar.Clamp(
                    Number(
                        rawDeltaSeconds
                    ) ||
                        0,
                    1 / 240,
                    0.05
                );

            if (!enabled) {
                return lastState;
            }

            const controls =
                getInputMap?.() ||
                {};

            const throttle =
                controls["w"]
                    ? 1
                    : 0;

            const brakeReverse =
                controls["s"]
                    ? 1
                    : 0;

            const steerInput =
                (
                    controls["d"]
                        ? 1
                        : 0
                ) -
                (
                    controls["a"]
                        ? 1
                        : 0
                );

            surfaceState =
                refreshSurface(
                    deltaSeconds
                );

            const forward =
                horizontalForward(
                    heading
                );

            const right =
                horizontalRight(
                    heading
                );

            let longitudinalSpeed =
                BABYLON.Vector3.Dot(
                    planarVelocity,
                    forward
                );

            let lateralSpeed =
                BABYLON.Vector3.Dot(
                    planarVelocity,
                    right
                );

            const initialSpeedRatio =
                BABYLON.Scalar.Clamp(
                    Math.abs(
                        longitudinalSpeed
                    ) /
                        config.maxForwardSpeed,
                    0,
                    1
                );

            // Use the last-frame ground state for drive/traction. The vertical
            // integrator updates it again below.
            const tractionFactor =
                grounded
                    ? 1
                    : 0.06;

            if (throttle) {
                if (
                    longitudinalSpeed <
                    0
                ) {
                    longitudinalSpeed =
                        moveToward(
                            longitudinalSpeed,
                            0,
                            config.brakeDeceleration *
                                tractionFactor *
                                deltaSeconds
                        );
                } else {
                    const torqueFactor =
                        1 -
                        Math.pow(
                            initialSpeedRatio,
                            1.40
                        );

                    longitudinalSpeed +=
                        config.engineAcceleration *
                        Math.max(
                            0.10,
                            torqueFactor
                        ) *
                        tractionFactor *
                        deltaSeconds;
                }
            } else if (
                brakeReverse
            ) {
                if (
                    longitudinalSpeed >
                    0.45
                ) {
                    longitudinalSpeed =
                        Math.max(
                            0,
                            longitudinalSpeed -
                                config.brakeDeceleration *
                                Math.max(
                                    0.08,
                                    tractionFactor
                                ) *
                                deltaSeconds
                        );
                } else if (
                    grounded
                ) {
                    longitudinalSpeed -=
                        config.reverseAcceleration *
                        deltaSeconds;
                }
            } else if (
                grounded
            ) {
                longitudinalSpeed =
                    moveToward(
                        longitudinalSpeed,
                        0,
                        config.rollingResistance *
                            deltaSeconds
                    );
            }

            // Gravity component along the road:
            // uphill slows the vehicle, downhill accelerates it.
            if (grounded) {
                const gradeAcceleration =
                    -config.gravity *
                    surfaceState.forward.y;

                longitudinalSpeed +=
                    gradeAcceleration *
                    deltaSeconds;
            }

            const dragCoefficient =
                grounded
                    ? config.aerodynamicDrag
                    : config.airDrag;

            longitudinalSpeed -=
                signOrZero(
                    longitudinalSpeed
                ) *
                dragCoefficient *
                longitudinalSpeed *
                longitudinalSpeed *
                deltaSeconds;

            longitudinalSpeed =
                BABYLON.Scalar.Clamp(
                    longitudinalSpeed,
                    -config.maxReverseSpeed,
                    config.maxForwardSpeed
                );

            steering =
                BABYLON.Scalar.Lerp(
                    steering,
                    steerInput,
                    1 -
                        Math.exp(
                            -config.steeringResponse *
                                deltaSeconds
                        )
                );

            const speedRatio =
                BABYLON.Scalar.Clamp(
                    Math.abs(
                        longitudinalSpeed
                    ) /
                        config.maxForwardSpeed,
                    0,
                    1
                );

            const maxSteerAngle =
                BABYLON.Scalar.Lerp(
                    config.maxSteerLowSpeed,
                    config.maxSteerHighSpeed,
                    speedRatio
                );

            const steerAngle =
                steering *
                maxSteerAngle;

            if (
                Math.abs(
                    longitudinalSpeed
                ) >
                0.08
            ) {
                const yawRate =
                    (
                        longitudinalSpeed /
                        config.wheelBase
                    ) *
                    Math.tan(
                        steerAngle
                    );

                heading +=
                    yawRate *
                    (
                        grounded
                            ? 1
                            : config.airSteerFactor
                    ) *
                    deltaSeconds;
            }

            const newForward =
                horizontalForward(
                    heading
                );

            const newRight =
                horizontalRight(
                    heading
                );

            const grip =
                grounded
                    ? BABYLON.Scalar.Lerp(
                        config.lateralGripLowSpeed,
                        config.lateralGripHighSpeed,
                        speedRatio
                    )
                    : config.airLateralGrip;

            const rawSlip =
                Math.abs(
                    lateralSpeed
                ) /
                Math.max(
                    2,
                    Math.abs(
                        longitudinalSpeed
                    )
                );

            const slipAmount =
                grounded
                    ? BABYLON.Scalar.Clamp(
                        rawSlip +
                            Math.abs(
                                steering
                            ) *
                            speedRatio *
                            0.22,
                        0,
                        1
                    )
                    : 0;

            lateralSpeed *=
                Math.exp(
                    -grip *
                        deltaSeconds
                );

            planarVelocity =
                newForward
                    .scale(
                        longitudinalSpeed
                    )
                    .add(
                        newRight.scale(
                            lateralSpeed
                        )
                    );

            const requestedMovement =
                planarVelocity.scale(
                    deltaSeconds
                );

            const obstacle =
                refreshObstacle(
                    requestedMovement
                );

            let collisionSeverity = 0;

            if (!obstacle) {
                player.position.x +=
                    requestedMovement.x;

                player.position.z +=
                    requestedMovement.z;
            } else {
                collisionSeverity =
                    Math.abs(
                        longitudinalSpeed
                    );

                planarVelocity.scaleInPlace(
                    config.collisionVelocityRetention
                );

                longitudinalSpeed *=
                    config.collisionVelocityRetention;
            }

            // Refresh the road under the new X/Z position when the probe timer
            // allows it, then integrate actual gravity/suspension in Y.
            surfaceState =
                refreshSurface(
                    deltaSeconds
                );

            const contact =
                integrateVerticalPhysics(
                    deltaSeconds,
                    speedRatio
                );

            // Hard landings reuse the existing collision audio event.
            collisionSeverity =
                Math.max(
                    collisionSeverity,
                    landingImpact *
                        0.75
                );

            const acceleration =
                (
                    longitudinalSpeed -
                    lastLongitudinalSpeed
                ) /
                deltaSeconds;

            lastLongitudinalSpeed =
                longitudinalSpeed;

            let targetPitch;
            let targetRoll;

            if (
                grounded &&
                contact.hasGround
            ) {
                const accelerationPitch =
                    BABYLON.Scalar.Clamp(
                        -acceleration *
                            config.bodyPitchAmount *
                            0.05,
                        -0.045,
                        0.045
                    );

                const cornerRoll =
                    -steering *
                    speedRatio *
                    config.bodyRollAmount;

                targetPitch =
                    -surfaceState.pitch +
                    accelerationPitch;

                targetRoll =
                    surfaceState.roll +
                    cornerRoll;
            } else {
                // Preserve take-off attitude in the air and only very slowly
                // relax the chassis. This looks much more like a real car than
                // snapping to the road normal below it.
                targetPitch =
                    visualPitch *
                    0.995;

                targetRoll =
                    visualRoll *
                    0.985;
            }

            const visualResponse =
                grounded
                    ? config.groundedVisualResponse
                    : config.airborneVisualResponse;

            const visualBlend =
                expBlend(
                    visualResponse,
                    deltaSeconds
                );

            visualPitch =
                BABYLON.Scalar.Lerp(
                    visualPitch,
                    targetPitch,
                    visualBlend
                );

            visualRoll =
                BABYLON.Scalar.Lerp(
                    visualRoll,
                    targetRoll,
                    visualBlend
                );

            const fullVelocity =
                new BABYLON.Vector3(
                    planarVelocity.x,
                    verticalVelocity,
                    planarVelocity.z
                );

            lastState = {
                speed:
                    longitudinalSpeed,
                heading,
                velocity:
                    fullVelocity,
                steering,
                slipAmount,
                collisionSeverity,
                throttle,
                brake:
                    brakeReverse,
                speedRatio,

                grounded,
                airborne:
                    !grounded,
                airTime,
                verticalSpeed:
                    verticalVelocity,
                suspensionCompression,
                landingImpact,

                surfaceForward:
                    surfaceState.forward.clone(),
                groundNormal:
                    surfaceState.normal.clone(),
                groundPitch:
                    surfaceState.pitch,
                groundRoll:
                    surfaceState.roll,

                pitch:
                    visualPitch,
                roll:
                    visualRoll
            };

            return lastState;
        };

    return {
        setEnabled(value) {
            enabled =
                Boolean(value);

            if (!enabled) {
                steering = 0;
            }
        },

        isEnabled() {
            return enabled;
        },

        reset,
        update,

        getHeading() {
            return heading;
        },

        getVelocity() {
            return lastState
                .velocity
                .clone();
        },

        getVisualState() {
            return {
                roll:
                    lastState.roll,
                pitch:
                    lastState.pitch
            };
        },

        getSurfaceState() {
            return {
                forward:
                    lastState
                        .surfaceForward
                        .clone(),
                normal:
                    lastState
                        .groundNormal
                        .clone(),
                pitch:
                    lastState.groundPitch,
                roll:
                    lastState.groundRoll
            };
        },

        getLastState() {
            return {
                ...lastState,
                velocity:
                    lastState
                        .velocity
                        .clone(),
                surfaceForward:
                    lastState
                        .surfaceForward
                        .clone(),
                groundNormal:
                    lastState
                        .groundNormal
                        .clone()
            };
        }
    };
}
