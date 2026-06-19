// npc.js
import * as BABYLON from "@babylonjs/core";

// ---> THE FIX: Add parameters for name, start position, and waypoints
export const createNPC = async (scene, npcName, startPosition, waypoints) => {
    // Use the custom name for the collider
    const npc = BABYLON.MeshBuilder.CreateCapsule(npcName + "_collider", { radius: 0.5, height: 2 }, scene);
    npc.position = startPosition; // Use the custom start position
    npc.checkCollisions = true;
    npc.ellipsoid = new BABYLON.Vector3(0.5, 1, 0.5);
    npc.ellipsoidOffset = new BABYLON.Vector3(0, 1, 0);
    npc.isVisible = false;

    let npcMesh = null;
    let npcIdleAnim = null;
    let npcWalkAnim = null;
    let npcCurrentAnim = null;

    const transitionTo = (newAnim) => {
        if (!newAnim || npcCurrentAnim === newAnim) return;
        if (npcCurrentAnim) npcCurrentAnim.stop(); 
        newAnim.start(true, 1.0, newAnim.from, newAnim.to, false); 
        npcCurrentAnim = newAnim;
    };

    const npcResult = await BABYLON.SceneLoader.ImportMeshAsync("", "./", "AuBoyAnimations.0.2.glb", scene);
    npcResult.animationGroups.forEach(anim => anim.stop());

    // Because we are loading multiple NPCs, Babylon might rename "bwalk" to "bwalk 1".
    // .includes() safely finds the correct animation for THIS specific NPC.
    npcIdleAnim = npcResult.animationGroups.find(a => a.name.includes("bidle"));
    npcWalkAnim = npcResult.animationGroups.find(a => a.name.includes("bwalk"));

    npcResult.meshes.forEach((mesh) => {
        if (mesh.material) {
            mesh.material.transparencyMode = BABYLON.PBRMaterial.PBRMATERIAL_OPAQUE;
            mesh.material.backFaceCulling = true;
        }
    });

    npcMesh = npcResult.meshes[0];
    npcMesh.parent = npc;
    npcMesh.position = new BABYLON.Vector3(0, 0, 0);
    npcMesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);
    npcMesh.scaling = new BABYLON.Vector3(1.8, 1.8, 1.8);

    transitionTo(npcWalkAnim);

    let currentWaypoint = 0;
    let isWaiting = false;
    let waitTimer = 0;
    
    // ---> BONUS: Give each NPC a slightly different walking speed so they feel natural
    const npcWalkSpeed = 0.07 + (Math.random() * 0.02); 

    scene.onBeforeRenderObservable.add(() => {
        if (!npcMesh || !npcWalkAnim || !npcIdleAnim) return;

        let deltaTime = scene.getAnimationRatio();
        let velocity = new BABYLON.Vector3(0, scene.gravity.y * deltaTime, 0);

        if (isWaiting) {
            waitTimer -= scene.getEngine().getDeltaTime();
            if (waitTimer <= 0) {
                isWaiting = false;
                transitionTo(npcWalkAnim);
                currentWaypoint++;
                if (currentWaypoint >= waypoints.length) currentWaypoint = 0;
            }
        } else {
            let targetPos = waypoints[currentWaypoint];
            let currentPosXZ = new BABYLON.Vector3(npc.position.x, 0, npc.position.z);
            let targetPosXZ = new BABYLON.Vector3(targetPos.x, 0, targetPos.z);
            let direction = targetPosXZ.subtract(currentPosXZ);
            let distance = direction.length();

            if (distance < 0.5) {
                isWaiting = true;
                // ---> BONUS: Wait a random amount of time between 2 and 4 seconds
                waitTimer = 2000 + (Math.random() * 2000); 
                transitionTo(npcIdleAnim);
            } else {
                direction.normalize();
                velocity.x = direction.x * (npcWalkSpeed * deltaTime);
                velocity.z = direction.z * (npcWalkSpeed * deltaTime);
                
                let targetAngle = Math.atan2(velocity.x, velocity.z);
                npcMesh.rotation.y = targetAngle; 
            }
        }
        npc.moveWithCollisions(velocity);
    });
};