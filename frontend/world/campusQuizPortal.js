// frontend/world/campusQuizPortal.js

import * as BABYLON from "@babylonjs/core";

export const CAMPUS_QUIZ_PORTAL_POSITION = Object.freeze({
    // In front of the Campus Quiz waiting/spectator platforms.
    x: 165.56,
    y: 0.00,
    z: -20.58
});

export const CAMPUS_QUIZ_PORTAL_TRIGGER_RADIUS = 2.2;

export function createCampusQuizPortal(scene) {
    const root =
        new BABYLON.TransformNode(
            "campusQuizPortalRoot",
            scene
        );

    root.position.copyFromFloats(
        CAMPUS_QUIZ_PORTAL_POSITION.x,
        CAMPUS_QUIZ_PORTAL_POSITION.y,
        CAMPUS_QUIZ_PORTAL_POSITION.z
    );

    const pad =
        BABYLON.MeshBuilder.CreateCylinder(
            "campus_quiz_portal",
            {
                diameter: 5.6,
                height: 0.18,
                tessellation: 48
            },
            scene
        );

    pad.parent =
        root;

    pad.position.y =
        0.09;

    pad.checkCollisions =
        false;

    pad.isPickable =
        false;

    const padMaterial =
        new BABYLON.StandardMaterial(
            "campus_quiz_portal_material",
            scene
        );

    padMaterial.diffuseColor =
        new BABYLON.Color3(
            0.46,
            0.12,
            0.86
        );

    padMaterial.emissiveColor =
        new BABYLON.Color3(
            0.34,
            0.06,
            0.72
        );

    padMaterial.alpha =
        0.82;

    pad.material =
        padMaterial;

    const ring =
        BABYLON.MeshBuilder.CreateTorus(
            "campus_quiz_portal_ring",
            {
                diameter: 5.0,
                thickness: 0.28,
                tessellation: 48
            },
            scene
        );

    ring.parent =
        root;

    ring.position.y =
        2.4;

    ring.rotation.x =
        Math.PI / 2;

    ring.checkCollisions =
        false;

    ring.isPickable =
        false;

    const ringMaterial =
        new BABYLON.StandardMaterial(
            "campus_quiz_portal_ring_material",
            scene
        );

    ringMaterial.emissiveColor =
        new BABYLON.Color3(
            0.72,
            0.28,
            1.00
        );

    ringMaterial.diffuseColor =
        new BABYLON.Color3(
            0.44,
            0.10,
            0.78
        );

    ring.material =
        ringMaterial;

    const beacon =
        BABYLON.MeshBuilder.CreateSphere(
            "campus_quiz_portal_beacon",
            {
                diameter: 0.7,
                segments: 16
            },
            scene
        );

    beacon.parent =
        root;

    beacon.position.y =
        4.8;

    beacon.material =
        ringMaterial;

    beacon.isPickable =
        false;

    beacon.checkCollisions =
        false;

    const labelTexture =
        new BABYLON.DynamicTexture(
            "campus_quiz_portal_label_texture",
            {
                width: 1024,
                height: 256
            },
            scene,
            false
        );

    labelTexture.hasAlpha =
        true;

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
        "#b56cff";

    context.lineWidth =
        14;

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
        "bold 82px Arial";

    context.fillText(
        "🧠  SURVIVAL QUIZ",
        512,
        128
    );

    labelTexture.update(
        true
    );

    const labelMaterial =
        new BABYLON.StandardMaterial(
            "campus_quiz_portal_label_material",
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
            "campus_quiz_portal_label",
            {
                width: 9.0,
                height: 2.25,
                sideOrientation:
                    BABYLON.Mesh.DOUBLESIDE
            },
            scene
        );

    label.parent =
        root;

    label.position.y =
        6.5;

    label.material =
        labelMaterial;

    label.billboardMode =
        BABYLON.Mesh.BILLBOARDMODE_Y;

    label.isPickable =
        false;

    const observer =
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

    return {
        root,
        position:
            root.position,

        dispose() {
            scene
                .onBeforeRenderObservable
                .remove(
                    observer
                );

            root.dispose(
                false,
                true
            );

            padMaterial.dispose();
            ringMaterial.dispose();
            labelMaterial.dispose();
            labelTexture.dispose();
        }
    };
}
