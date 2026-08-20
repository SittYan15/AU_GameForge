import * as BABYLON from "@babylonjs/core";

import "@babylonjs/core/Audio/audioEngine";
import "@babylonjs/core/Audio/audioSceneComponent";

let audioUnlocked = false;

const unlockAudio = () => {
    if (audioUnlocked) return;

    try {
        BABYLON.Engine.audioEngine?.unlock();
        audioUnlocked = true;

        console.log("🔊 Babylon audio unlocked");
    } catch (error) {
        console.warn("Could not unlock audio:", error);
    }
};

document.addEventListener("click", unlockAudio, {
    once: true
});

document.addEventListener("click", () => {
    console.log(
        "Audio engine:",
        BABYLON.Engine.audioEngine,
        "Unlocked:",
        BABYLON.Engine.audioEngine?.unlocked
    );
});

function createExplosionTexture(scene) {
    const texture = new BABYLON.DynamicTexture(
        "rlglExplosionTexture",
        { width: 64, height: 64 },
        scene,
        false
    );

    const ctx = texture.getContext();

    const gradient = ctx.createRadialGradient(
        32, 32, 0,
        32, 32, 32
    );

    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,230,100,1)");
    gradient.addColorStop(0.45, "rgba(255,120,20,1)");
    gradient.addColorStop(1, "rgba(255,40,0,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    texture.update();

    return texture;
}

export function createRlglEffects(scene) {
    const soundBase = `${import.meta.env.BASE_URL}sounds/rlgl/`;

    const sounds = {
        green: new BABYLON.Sound(
            "rlglGreenSound",
            `${soundBase}green-light.mp3`,
            scene,
            () => {
                console.log(
                    "✅ green-light.mp3 loaded"
                );
            },
            {
                autoplay: false,
                loop: false,
                volume: 1
            }
        ),

        red: new BABYLON.Sound(
            "rlglRedSound",
            `${soundBase}red-light.mp3`,
            scene,
            () => {
                console.log(
                    "✅ red-light.mp3 loaded"
                );
            },
            {
                autoplay: false,
                loop: false,
                volume: 1
            }
        ),

        countdown: new BABYLON.Sound(
            "rlglCountdownSound",
            `${soundBase}countdown.mp3`,
            scene,
            null,
            {
                autoplay: false,
                loop: false,
                volume: 0.65
            }
        ),

        eliminated: new BABYLON.Sound(
            "rlglEliminatedSound",
            `${soundBase}eliminated.mp3`,
            scene,
            null,
            {
                autoplay: false,
                loop: false,
                volume: 0.9
            }
        ),

        winner: new BABYLON.Sound(
            "rlglWinnerSound",
            `${soundBase}winner.mp3`,
            scene,
            null,
            {
                autoplay: false,
                loop: false,
                volume: 0.9
            }
        ),

        explosion: new BABYLON.Sound(
            "rlglExplosionSound",
            `${soundBase}explosion.mp3`,
            scene,
            () => {
                console.log(
                    "✅ explosion.mp3 loaded"
                );
            },
            {
                autoplay: false,
                loop: false,
                volume: 1,
                spatialSound: true,
                maxDistance: 60
            }
        ),
    };

    const explosionTexture = createExplosionTexture(scene);

    const play = async (sound, name = "sound") => {

        if (!sound) {
            console.warn(
                `Sound ${name} does not exist`
            );

            return;
        }

        await unlockAudio();

        console.log(
            `Playing ${name}`,
            {
                ready: sound.isReady?.(),
                audioState:
                    BABYLON.Engine.audioEngine
                        ?.audioContext?.state
            }
        );

        try {

            if (sound.isPlaying) {
                sound.stop();
            }

            sound.play();

        } catch (error) {

            console.error(
                `Could not play ${name}:`,
                error
            );
        }
    };

    async function unlockAudio() {
        try {
            const audioEngine = BABYLON.Engine.audioEngine;

            if (!audioEngine) {
                console.warn("Babylon audio engine does not exist.");
                return false;
            }

            const context = audioEngine.audioContext;

            console.log(
                "Audio context before:",
                context?.state
            );

            if (context?.state === "suspended") {
                await context.resume();
            }

            audioEngine.unlock?.();

            console.log(
                "Audio context after:",
                context?.state
            );

            return context?.state === "running";
        } catch (error) {
            console.error(
                "Could not unlock audio:",
                error
            );

            return false;
        }
    }

    const unlockFromInteraction = async () => {
        const unlocked = await unlockAudio();

        if (unlocked) {
            console.log("🔊 AUDIO UNLOCKED");

            document.removeEventListener(
                "pointerup",
                unlockFromInteraction
            );

            document.removeEventListener(
                "keydown",
                unlockFromInteraction
            );
        }
    };

    document.addEventListener(
        "pointerup",
        unlockFromInteraction
    );

    document.addEventListener(
        "keydown",
        unlockFromInteraction
    );

    function flashScreen(color) {
        const flash = document.createElement("div");

        flash.style.position = "fixed";
        flash.style.inset = "0";
        flash.style.pointerEvents = "none";
        flash.style.zIndex = "999";
        flash.style.background = color;
        flash.style.opacity = "0.16";
        flash.style.transition = "opacity 180ms ease-out";

        document.body.appendChild(flash);

        requestAnimationFrame(() => {
            flash.style.opacity = "0";
        });

        setTimeout(() => {
            flash.remove();
        }, 250);
    }

    function createExplosion(position) {
        if (!position) return;

        const effectId = Date.now();

        const emitter =
            new BABYLON.TransformNode(
                `rlglExplosionEmitter_${effectId}`,
                scene
            );

        emitter.position.copyFrom(position);

        // Put center around character torso.
        emitter.position.y += 0.9;

        // ==========================================
        // FIRE PARTICLES
        // ==========================================

        const particles =
            new BABYLON.ParticleSystem(
                `rlglExplosion_${effectId}`,
                260,
                scene
            );

        particles.particleTexture =
            explosionTexture;

        particles.emitter = emitter;

        particles.minEmitBox =
            new BABYLON.Vector3(
                -0.25,
                -0.25,
                -0.25
            );

        particles.maxEmitBox =
            new BABYLON.Vector3(
                0.25,
                0.25,
                0.25
            );

        particles.color1 =
            new BABYLON.Color4(
                1,
                0.9,
                0.25,
                1
            );

        particles.color2 =
            new BABYLON.Color4(
                1,
                0.18,
                0.01,
                1
            );

        particles.colorDead =
            new BABYLON.Color4(
                0.12,
                0.03,
                0.01,
                0
            );

        // Bigger particles
        particles.minSize = 0.4;
        particles.maxSize = 1.8;

        // MUCH longer
        particles.minLifeTime = 0.65;
        particles.maxLifeTime = 1.5;

        particles.minEmitPower = 3;
        particles.maxEmitPower = 9;

        particles.direction1 =
            new BABYLON.Vector3(
                -6,
                1,
                -6
            );

        particles.direction2 =
            new BABYLON.Vector3(
                6,
                9,
                6
            );

        particles.gravity =
            new BABYLON.Vector3(
                0,
                -5,
                0
            );

        particles.blendMode =
            BABYLON.ParticleSystem
                .BLENDMODE_ONEONE;

        // More particles
        particles.manualEmitCount = 200;

        particles.disposeOnStop = true;

        particles.start();

        // Give the burst time to appear.
        setTimeout(() => {
            particles.stop();
        }, 180);

        // ==========================================
        // CENTER FIREBALL
        // ==========================================

        const fireball =
            BABYLON.MeshBuilder.CreateSphere(
                `rlglFireball_${effectId}`,
                {
                    diameter: 1
                },
                scene
            );

        fireball.position.copyFrom(
            emitter.position
        );

        fireball.isPickable = false;
        fireball.checkCollisions = false;

        const fireMaterial =
            new BABYLON.StandardMaterial(
                `rlglFireMaterial_${effectId}`,
                scene
            );

        fireMaterial.disableLighting = true;

        fireMaterial.emissiveColor =
            new BABYLON.Color3(
                1,
                0.25,
                0.01
            );

        fireMaterial.alpha = 0.95;

        fireball.material =
            fireMaterial;

        // ==========================================
        // SHOCKWAVE RING
        // ==========================================

        const shockwave =
            BABYLON.MeshBuilder.CreateTorus(
                `rlglShockwave_${effectId}`,
                {
                    diameter: 2,
                    thickness: 0.12,
                    tessellation: 48
                },
                scene
            );

        shockwave.position.copyFrom(
            emitter.position
        );

        shockwave.rotation.x =
            Math.PI / 2;

        shockwave.isPickable = false;
        shockwave.checkCollisions = false;

        const shockMaterial =
            new BABYLON.StandardMaterial(
                `rlglShockMaterial_${effectId}`,
                scene
            );

        shockMaterial.disableLighting = true;

        shockMaterial.emissiveColor =
            new BABYLON.Color3(
                1,
                0.55,
                0.05
            );

        shockMaterial.alpha = 0.85;

        shockwave.material =
            shockMaterial;

        // ==========================================
        // EXPLOSION LIGHT
        // ==========================================

        const light =
            new BABYLON.PointLight(
                `rlglExplosionLight_${effectId}`,
                emitter.position.clone(),
                scene
            );

        light.diffuse =
            new BABYLON.Color3(
                1,
                0.3,
                0.02
            );

        light.intensity = 12;
        light.range = 22;

        // ==========================================
        // SOUND
        // ==========================================

        try {
            sounds.explosion.stop();

            sounds.explosion.setPosition(
                position
            );

            sounds.explosion.play();
        } catch (error) {
            console.warn(
                "Explosion sound failed:",
                error
            );
        }

        // ==========================================
        // ANIMATION
        // ==========================================

        let elapsed = 0;

        // Make the visible explosion last ~900ms.
        const EXPLOSION_DURATION = 900;

        const observer =
            scene.onBeforeRenderObservable.add(
                () => {

                    elapsed +=
                        scene
                            .getEngine()
                            .getDeltaTime();

                    const t =
                        Math.min(
                            elapsed /
                            EXPLOSION_DURATION,
                            1
                        );

                    // Fast initial growth.
                    const fireScale =
                        0.5 +
                        Math.sin(
                            Math.min(
                                t * 1.5,
                                1
                            ) *
                            Math.PI / 2
                        ) * 4.5;

                    fireball.scaling.setAll(
                        fireScale
                    );

                    fireMaterial.alpha =
                        0.95 *
                        (1 - t);

                    // Shockwave expands much farther.
                    const shockScale =
                        0.4 +
                        t * 7;

                    shockwave.scaling.setAll(
                        shockScale
                    );

                    shockMaterial.alpha =
                        0.85 *
                        (1 - t);

                    // Fade light.
                    light.intensity =
                        12 *
                        (1 - t);

                    if (t >= 1) {

                        scene
                            .onBeforeRenderObservable
                            .remove(observer);

                        fireball.dispose();
                        fireMaterial.dispose();

                        shockwave.dispose();
                        shockMaterial.dispose();

                        light.dispose();

                        // Leave emitter alive long enough
                        // for the particles to finish.
                        setTimeout(() => {
                            emitter.dispose();
                        }, 800);
                    }
                }
            );
    }

    return {
        greenLight() {
            play(sounds.green);
            flashScreen("rgba(0,255,100,0.35)");
        },

        redLight() {
            play(sounds.red);
            flashScreen("rgba(255,0,0,0.40)");
        },

        countdown() {
            play(sounds.countdown);
        },

        eliminated() {
            play(sounds.eliminated);
            flashScreen("rgba(255, 0, 0, 0.75)");

            setTimeout(() => {
                flashScreen(
                    "rgba(255, 50, 0, 0.45)"
                );
            }, 140);
        },

        winner() {
            play(sounds.winner);
        },

        explosion(position) {
            createExplosion(position);
        },

        dispose() {
            Object.values(sounds).forEach(sound => {
                sound.dispose();
            });

            explosionTexture.dispose();
        }
    };
}