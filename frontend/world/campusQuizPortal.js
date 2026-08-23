// frontend/world/campusQuizPortal.js

import * as BABYLON from "@babylonjs/core";

export const CAMPUS_QUIZ_PORTAL_POSITION = Object.freeze({
    x: -120.83,
    y: 0.00,
    z: 6.98
});

export const CAMPUS_QUIZ_PORTAL_TRIGGER_RADIUS = 2.2;

export function createCampusQuizPortal(scene) {
    const root = new BABYLON.TransformNode("campusQuizPortalRoot", scene);
    root.position.copyFromFloats(
        CAMPUS_QUIZ_PORTAL_POSITION.x,
        CAMPUS_QUIZ_PORTAL_POSITION.y,
        CAMPUS_QUIZ_PORTAL_POSITION.z
    );

    const material = new BABYLON.StandardMaterial("campusQuizPortalMaterial", scene);
    material.diffuseColor = new BABYLON.Color3(0.42, 0.10, 0.70);
    material.emissiveColor = new BABYLON.Color3(0.62, 0.18, 1.00);
    material.alpha = 0.82;

    const disc = BABYLON.MeshBuilder.CreateCylinder(
        "campus_quiz_portal",
        {
            diameter: 4,
            height: 0.18,
            tessellation: 48
        },
        scene
    );
    disc.parent = root;
    disc.material = material;
    disc.isPickable = false;
    disc.checkCollisions = false;

    const ring = BABYLON.MeshBuilder.CreateTorus(
        "campus_quiz_portal_ring",
        {
            diameter: 3.2,
            thickness: 0.13,
            tessellation: 48
        },
        scene
    );
    ring.parent = root;
    ring.position.y = 1.2;
    ring.rotation.x = Math.PI / 2;
    ring.material = material;
    ring.isPickable = false;
    ring.checkCollisions = false;

    const orb = BABYLON.MeshBuilder.CreateSphere(
        "campus_quiz_portal_orb",
        {
            diameter: 0.48,
            segments: 20
        },
        scene
    );
    orb.parent = root;
    orb.position.y = 2.2;
    orb.material = material;
    orb.isPickable = false;
    orb.checkCollisions = false;

    let elapsed = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        elapsed += dt;
        ring.rotation.z += dt * 0.9;
        orb.position.y = 2.2 + Math.sin(elapsed * 2.2) * 0.16;
    });

    return {
        root,
        position: root.position,
        dispose() {
            scene.onBeforeRenderObservable.remove(observer);
            root.dispose(false, true);
            material.dispose();
        }
    };
}
