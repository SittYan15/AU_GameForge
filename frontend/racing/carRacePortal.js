// frontend/racing/carRacePortal.js
import * as BABYLON from "@babylonjs/core";
import {
    CAR_RACE_PORTAL,
    CAR_RACE_PORTAL_TRIGGER_RADIUS
} from "./carRaceDefinitions.js";

export { CAR_RACE_PORTAL_TRIGGER_RADIUS };

export function createCarRacePortal(scene) {
    const root =
        new BABYLON.TransformNode(
            "car_race_portal_root",
            scene
        );

    root.position.copyFromFloats(
        CAR_RACE_PORTAL.x,
        CAR_RACE_PORTAL.y,
        CAR_RACE_PORTAL.z
    );

    const pad =
        BABYLON.MeshBuilder.CreateCylinder(
            "car_race_portal",
            {
                diameter: 5.6,
                height: 0.18,
                tessellation: 48
            },
            scene
        );

    pad.parent = root;
    pad.position.y = 0.09;
    pad.checkCollisions = false;
    pad.isPickable = false;

    const padMaterial =
        new BABYLON.StandardMaterial(
            "car_race_portal_material",
            scene
        );

    padMaterial.diffuseColor =
        new BABYLON.Color3(
            1.00,
            0.24,
            0.02
        );

    padMaterial.emissiveColor =
        new BABYLON.Color3(
            0.65,
            0.10,
            0.01
        );

    padMaterial.alpha = 0.82;
    pad.material = padMaterial;

    const ring =
        BABYLON.MeshBuilder.CreateTorus(
            "car_race_portal_ring",
            {
                diameter: 5.0,
                thickness: 0.28,
                tessellation: 48
            },
            scene
        );

    ring.parent = root;
    ring.position.y = 2.4;
    ring.rotation.x = Math.PI / 2;
    ring.checkCollisions = false;
    ring.isPickable = false;

    const ringMaterial =
        new BABYLON.StandardMaterial(
            "car_race_portal_ring_material",
            scene
        );

    ringMaterial.emissiveColor =
        new BABYLON.Color3(
            1.0,
            0.32,
            0.04
        );

    ring.material = ringMaterial;

    const beacon =
        BABYLON.MeshBuilder.CreateSphere(
            "car_race_portal_beacon",
            {
                diameter: 0.7,
                segments: 16
            },
            scene
        );

    beacon.parent = root;
    beacon.position.y = 4.8;
    beacon.material = ringMaterial;
    beacon.isPickable = false;

    // Floating label.
    const labelTexture =
        new BABYLON.DynamicTexture(
            "car_race_portal_label_texture",
            {
                width: 1024,
                height: 256
            },
            scene,
            false
        );

    labelTexture.hasAlpha = true;

    const context =
        labelTexture.getContext();

    context.clearRect(
        0,
        0,
        1024,
        256
    );

    context.fillStyle =
        "rgba(12,14,18,.88)";

    context.fillRect(
        0,
        0,
        1024,
        256
    );

    context.strokeStyle =
        "#ff6a1a";

    context.lineWidth = 14;

    context.strokeRect(
        7,
        7,
        1010,
        242
    );

    context.textAlign =
        "center";

    context.textBaseline =
        "middle";

    context.fillStyle =
        "#ffffff";

    context.font =
        "bold 88px Arial";

    context.fillText(
        "🏎  CAMPUS ROAD RACE",
        512,
        128
    );

    labelTexture.update(true);

    const labelMaterial =
        new BABYLON.StandardMaterial(
            "car_race_portal_label_material",
            scene
        );

    labelMaterial.diffuseTexture =
        labelTexture;

    labelMaterial.emissiveTexture =
        labelTexture;

    labelMaterial.disableLighting =
        true;

    labelMaterial.backFaceCulling =
        false;

    const label =
        BABYLON.MeshBuilder.CreatePlane(
            "car_race_portal_label",
            {
                width: 9.0,
                height: 2.25,
                sideOrientation:
                    BABYLON.Mesh.DOUBLESIDE
            },
            scene
        );

    label.parent = root;
    label.position.y = 6.5;
    label.material = labelMaterial;
    label.billboardMode =
        BABYLON.Mesh.BILLBOARDMODE_Y;
    label.isPickable = false;

    scene.onBeforeRenderObservable.add(
        () => {
            ring.rotation.z +=
                0.012 *
                scene.getAnimationRatio();

            beacon.position.y =
                4.8 +
                Math.sin(
                    performance.now() *
                        0.0025
                ) *
                    0.18;
        }
    );

    return root;
}
