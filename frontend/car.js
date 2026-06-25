import * as BABYLON from "@babylonjs/core";

export const createCar = (scene, carName, waypoints, playerMesh) => {
    // 1. Create the Car Collider
    const carCollider = BABYLON.MeshBuilder.CreateBox(carName + "_collider", { width: 2, height: 1.5, depth: 4.5 }, scene);
    carCollider.position = waypoints[0].clone(); 
    carCollider.position.y = 1.53; // Lock it exactly to street height
    
    // Make it solid so the player bumps into it, but DO NOT use moveWithCollisions to drive it!
    carCollider.checkCollisions = true; 
    carCollider.isVisible = false; // Hide the invisible bumper

    // 2. Visible Car Body
    const carBody = BABYLON.MeshBuilder.CreateBox(carName + "_body", { width: 2, height: 1.5, depth: 4.5 }, scene);
    carBody.parent = carCollider;
    const carMat = new BABYLON.StandardMaterial("carMat", scene);
    carMat.diffuseColor = new BABYLON.Color3(0.1, 0.4, 0.8);
    carBody.material = carMat;

    // 3. Variables & Pre-allocated Memory (Prevents FPS stutters)
    let currentWaypoint = 0;
    const maxSpeed = 0.25;
    let currentSpeed = maxSpeed;
    
    let currentPosXZ = BABYLON.Vector3.Zero();
    let targetPosXZ = BABYLON.Vector3.Zero();
    let direction = BABYLON.Vector3.Zero();
    
    // We create a slightly larger invisible box just for the "brakes" sensor
    let sensorBox = new BABYLON.BoundingBox(BABYLON.Vector3.Zero(), BABYLON.Vector3.Zero());
    let frameCounter = 0;
    let playerInFront = false;

    scene.onBeforeRenderObservable.add(() => {
        let deltaTime = scene.getAnimationRatio();
        frameCounter++;

        // ==========================================
        // SUPER CHEAP SENSOR (Every 4 frames)
        // ==========================================
        if (frameCounter % 4 === 0) {
            // Update our invisible "brake zone" (extending 8 units in front of the car)
            sensorBox.reConstruct(
                new BABYLON.Vector3(carCollider.position.x - 2, 0, carCollider.position.z - 2),
                new BABYLON.Vector3(carCollider.position.x + 2, 4, carCollider.position.z + 8)
            );
            
            // Mathematically check if the player's bounding box is inside the brake zone
            playerInFront = sensorBox.intersectsPoint(playerMesh.position);
        }

        // Apply brakes or gas
        if (playerInFront) {
            currentSpeed = BABYLON.Scalar.Lerp(currentSpeed, 0, 0.1 * deltaTime);
        } else {
            currentSpeed = BABYLON.Scalar.Lerp(currentSpeed, maxSpeed, 0.05 * deltaTime);
        }

        // ==========================================
        // DUMB, EFFICIENT MOVEMENT
        // ==========================================
        if (currentSpeed > 0.01) {
            currentPosXZ.set(carCollider.position.x, 0, carCollider.position.z);
            let targetPos = waypoints[currentWaypoint];
            targetPosXZ.set(targetPos.x, 0, targetPos.z);
            
            direction.copyFrom(targetPosXZ).subtractInPlace(currentPosXZ);
            let distance = direction.length();

            if (distance < 2.5) {
                currentWaypoint++;
                if (currentWaypoint >= waypoints.length) currentWaypoint = 0;
            } else {
                direction.normalize();
                
                // CHEAT: Mathematically slide the car instead of using the heavy physics engine
                carCollider.position.x += direction.x * (currentSpeed * deltaTime);
                carCollider.position.z += direction.z * (currentSpeed * deltaTime);

                carCollider.rotation.y = Math.atan2(direction.x, direction.z);
            }
        }
    });

    return carCollider;
};