import * as BABYLON from "@babylonjs/core";

export const PLAYER_COLLIDER_HALF_HEIGHT = 1;
export const CHARACTER_SCALE = 1.8;
export const PLAYER_NAME_TAG_HEIGHT = 0.85;

const GROUND_RAY_START_OFFSET = 1.5;
const GROUND_RAY_LENGTH = 1000;
const MIN_WALKABLE_NORMAL_Y = 0.55;
const DEBUG_GROUNDING = false;

export function markWalkableGround(mesh) {
    mesh.metadata = { ...(mesh.metadata || {}), groundingRole: "walkable" };
}

export function markNonGround(node, role = "helper") {
    node.metadata = { ...(node.metadata || {}), groundingRole: role };
    node.getChildMeshes?.().forEach((mesh) => {
        mesh.metadata = { ...(mesh.metadata || {}), groundingRole: role };
    });
}

function isWalkableGround(mesh) {
    return mesh?.metadata?.groundingRole === "walkable"
        && mesh.isEnabled()
        && mesh.isVisible
        && mesh.isPickable;
}

export function calculateCharacterGrounding(controller, visualRoots) {
    controller.computeWorldMatrix(true);
    visualRoots.forEach((root) => root.computeWorldMatrix(true));

    const renderMeshes = visualRoots.flatMap((root) => {
        const meshes = root.getChildMeshes?.(false) || [];
        return root.getBoundingInfo ? [root, ...meshes] : meshes;
    }).filter((mesh) => mesh.getTotalVertices?.() > 0);

    const controllerY = controller.getAbsolutePosition().y;
    let minimumY = Number.POSITIVE_INFINITY;
    let maximumY = Number.NEGATIVE_INFINITY;
    renderMeshes.forEach((mesh) => {
        mesh.computeWorldMatrix(true);
        const bounds = mesh.getBoundingInfo().boundingBox;
        minimumY = Math.min(minimumY, bounds.minimumWorld.y);
        maximumY = Math.max(maximumY, bounds.maximumWorld.y);
    });

    const measuredFeetOffset = Number.isFinite(minimumY) ? minimumY - controllerY : -PLAYER_COLLIDER_HALF_HEIGHT;

    // This GLB is already authored around the centered player capsule: its feet
    // sit one capsule half-height below the network root. Moving the visual root
    // again duplicates that offset and sinks half of the character underground.
    const visualRootYOffset = 0;

    return {
        measuredFeetOffset,
        visualRootYOffset,
        characterHeight: Number.isFinite(maximumY - minimumY) ? maximumY - minimumY : 2
    };
}

export function groundNetworkPosition(scene, receivedPosition, source = "unknown", playerId = "unknown") {
    const received = new BABYLON.Vector3(receivedPosition.x, receivedPosition.y, receivedPosition.z);
    const origin = new BABYLON.Vector3(received.x, received.y + GROUND_RAY_START_OFFSET, received.z);
    const ray = new BABYLON.Ray(origin, BABYLON.Vector3.Down(), GROUND_RAY_LENGTH);
    const hits = scene.multiPickWithRay(ray, isWalkableGround) || [];
    const hit = hits
        .filter((candidate) => candidate.hit && candidate.pickedPoint)
        .sort((a, b) => a.distance - b.distance)
        .find((candidate) => Math.abs(candidate.getNormal(true)?.y ?? 0) >= MIN_WALKABLE_NORMAL_Y);

    const grounded = received.clone();
    if (hit) grounded.y = hit.pickedPoint.y + PLAYER_COLLIDER_HALF_HEIGHT;

    if (DEBUG_GROUNDING) {
        console.debug("[grounding]", {
            playerId,
            source,
            received: received.asArray(),
            grounded: grounded.asArray(),
            groundMesh: hit?.pickedMesh?.name || null
        });
    }
    return grounded;
}
