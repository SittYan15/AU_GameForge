// frontend/racing/carPhysicsController.js
import * as BABYLON from "@babylonjs/core";

/*
 * Lightweight arcade vehicle dynamics for AU Campus Road Race.
 *
 * No Havok/Cannon dependency is required. The controller provides:
 * - engine torque curve
 * - separate brake/reverse behavior
 * - rolling resistance
 * - aerodynamic drag
 * - bicycle-model steering
 * - speed-sensitive steering angle
 * - lateral tire grip/slip
 * - collision energy loss
 * - visual body roll/pitch
 */

const DEFAULTS = Object.freeze({
    maxForwardSpeed: 22.0,
    maxReverseSpeed: 5.5,

    engineAcceleration: 10.8,
    reverseAcceleration: 5.2,
    brakeDeceleration: 18.0,

    rollingResistance: 0.85,
    aerodynamicDrag: 0.018,

    wheelBase: 2.65,

    maxSteerLowSpeed: 0.58,
    maxSteerHighSpeed: 0.20,
    steeringResponse: 7.5,

    lateralGripLowSpeed: 11.0,
    lateralGripHighSpeed: 5.2,

    collisionVelocityRetention: 0.28,
    minimumCollisionRatio: 0.72,

    bodyRollAmount: 0.10,
    bodyPitchAmount: 0.035
});

function moveToward(value, target, maxDelta) {
    if (value < target) {
        return Math.min(
            target,
            value + maxDelta
        );
    }

    return Math.max(
        target,
        value - maxDelta
    );
}

function signOrZero(value) {
    if (Math.abs(value) < 0.0001) {
        return 0;
    }

    return Math.sign(value);
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
    let heading = startHeading;
    let velocity =
        BABYLON.Vector3.Zero();

    let steering = 0;

    let lastLongitudinalSpeed =
        0;

    let visualRoll = 0;
    let visualPitch = 0;

    const getForward = () =>
        new BABYLON.Vector3(
            Math.sin(heading),
            0,
            Math.cos(heading)
        );

    const getRight = () =>
        new BABYLON.Vector3(
            Math.cos(heading),
            0,
            -Math.sin(heading)
        );

    const reset = ({
        nextHeading = startHeading,
        keepVelocity = false
    } = {}) => {
        heading =
            nextHeading;

        steering = 0;

        if (!keepVelocity) {
            velocity.copyFromFloats(
                0,
                0,
                0
            );
        }

        lastLongitudinalSpeed =
            0;

        visualRoll = 0;
        visualPitch = 0;
    };

    const update = (
        rawDeltaSeconds
    ) => {
        if (!enabled) {
            return {
                speed: 0,
                heading,
                velocity:
                    velocity.clone(),
                steering,
                roll:
                    visualRoll,
                pitch:
                    visualPitch
            };
        }

        const deltaSeconds =
            BABYLON.Scalar.Clamp(
                Number(
                    rawDeltaSeconds
                ) ||
                    0,
                1 / 240,
                0.05
            );

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

        let forward =
            getForward();

        let right =
            getRight();

        let longitudinalSpeed =
            BABYLON.Vector3.Dot(
                velocity,
                forward
            );

        let lateralSpeed =
            BABYLON.Vector3.Dot(
                velocity,
                right
            );

        const forwardSpeedRatio =
            BABYLON.Scalar.Clamp(
                Math.abs(
                    longitudinalSpeed
                ) /
                    config.maxForwardSpeed,
                0,
                1
            );

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
                            deltaSeconds
                    );
            } else {
                const torqueFactor =
                    1 -
                    Math.pow(
                        forwardSpeedRatio,
                        1.35
                    );

                longitudinalSpeed +=
                    config.engineAcceleration *
                    Math.max(
                        0.12,
                        torqueFactor
                    ) *
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
                                deltaSeconds
                    );
            } else {
                longitudinalSpeed -=
                    config.reverseAcceleration *
                    deltaSeconds;
            }
        } else {
            longitudinalSpeed =
                moveToward(
                    longitudinalSpeed,
                    0,
                    config.rollingResistance *
                        deltaSeconds
                );

            longitudinalSpeed -=
                signOrZero(
                    longitudinalSpeed
                ) *
                config.aerodynamicDrag *
                longitudinalSpeed *
                longitudinalSpeed *
                deltaSeconds;
        }

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
                deltaSeconds;
        }

        forward =
            getForward();

        right =
            getRight();

        const grip =
            BABYLON.Scalar.Lerp(
                config.lateralGripLowSpeed,
                config.lateralGripHighSpeed,
                speedRatio
            );

        lateralSpeed *=
            Math.exp(
                -grip *
                    deltaSeconds
            );

        velocity =
            forward
                .scale(
                    longitudinalSpeed
                )
                .add(
                    right.scale(
                        lateralSpeed
                    )
                );

        const requestedMovement =
            velocity.scale(
                deltaSeconds
            );

        const before =
            player.position.clone();

        player.moveWithCollisions(
            requestedMovement
        );

        const actualMovement =
            player.position
                .subtract(
                    before
                );

        actualMovement.y = 0;

        const wantedDistance =
            Math.hypot(
                requestedMovement.x,
                requestedMovement.z
            );

        const movedDistance =
            Math.hypot(
                actualMovement.x,
                actualMovement.z
            );

        if (
            wantedDistance >
                0.012 &&
            movedDistance /
                wantedDistance <
                config.minimumCollisionRatio
        ) {
            velocity.scaleInPlace(
                config.collisionVelocityRetention
            );

            longitudinalSpeed *=
                config.collisionVelocityRetention;

            lateralSpeed *=
                0.15;
        }

        const acceleration =
            (
                longitudinalSpeed -
                lastLongitudinalSpeed
            ) /
            deltaSeconds;

        lastLongitudinalSpeed =
            longitudinalSpeed;

        const targetRoll =
            -steering *
            speedRatio *
            config.bodyRollAmount;

        const targetPitch =
            BABYLON.Scalar.Clamp(
                -acceleration *
                    config.bodyPitchAmount *
                    0.05,
                -0.055,
                0.055
            );

        visualRoll =
            BABYLON.Scalar.Lerp(
                visualRoll,
                targetRoll,
                1 -
                    Math.exp(
                        -7 *
                            deltaSeconds
                    )
            );

        visualPitch =
            BABYLON.Scalar.Lerp(
                visualPitch,
                targetPitch,
                1 -
                    Math.exp(
                        -7 *
                            deltaSeconds
                    )
            );

        return {
            speed:
                longitudinalSpeed,
            heading,
            velocity:
                velocity.clone(),
            steering,
            roll:
                visualRoll,
            pitch:
                visualPitch
        };
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
            return velocity.clone();
        },

        getVisualState() {
            return {
                roll:
                    visualRoll,
                pitch:
                    visualPitch
            };
        }
    };
}
