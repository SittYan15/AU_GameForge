// frontend/racing/carAudioController.js

function createNoiseBuffer(context, seconds = 2) {
    const sampleCount =
        Math.max(
            1,
            Math.floor(
                context.sampleRate *
                seconds
            )
        );

    const buffer =
        context.createBuffer(
            1,
            sampleCount,
            context.sampleRate
        );

    const data =
        buffer.getChannelData(0);

    for (
        let index = 0;
        index < sampleCount;
        index += 1
    ) {
        data[index] =
            Math.random() * 2 -
            1;
    }

    return buffer;
}

export function createCarAudioController() {
    let context = null;
    let master = null;

    let engineOscillatorA = null;
    let engineOscillatorB = null;
    let engineGain = null;
    let engineFilter = null;

    let windSource = null;
    let windGain = null;
    let windFilter = null;

    let tireSource = null;
    let tireGain = null;
    let tireFilter = null;

    let running = false;
    let lastCollisionAt = 0;

    const ensureContext =
        async () => {
            if (!context) {
                const AudioContextClass =
                    window.AudioContext ||
                    window.webkitAudioContext;

                if (!AudioContextClass) {
                    return false;
                }

                context =
                    new AudioContextClass();
            }

            if (
                context.state ===
                "suspended"
            ) {
                try {
                    await context.resume();
                } catch {
                    return false;
                }
            }

            return true;
        };

    const buildGraph =
        () => {
            master =
                context.createGain();

            master.gain.value =
                0.22;

            master.connect(
                context.destination
            );

            engineFilter =
                context.createBiquadFilter();

            engineFilter.type =
                "lowpass";

            engineFilter.frequency.value =
                900;

            engineGain =
                context.createGain();

            engineGain.gain.value =
                0.035;

            engineOscillatorA =
                context.createOscillator();

            engineOscillatorA.type =
                "sawtooth";

            engineOscillatorB =
                context.createOscillator();

            engineOscillatorB.type =
                "triangle";

            const secondaryGain =
                context.createGain();

            secondaryGain.gain.value =
                0.33;

            engineOscillatorA.connect(
                engineFilter
            );

            engineOscillatorB.connect(
                secondaryGain
            );

            secondaryGain.connect(
                engineFilter
            );

            engineFilter.connect(
                engineGain
            );

            engineGain.connect(
                master
            );

            const noiseBuffer =
                createNoiseBuffer(
                    context
                );

            windSource =
                context.createBufferSource();

            windSource.buffer =
                noiseBuffer;

            windSource.loop =
                true;

            windFilter =
                context.createBiquadFilter();

            windFilter.type =
                "highpass";

            windFilter.frequency.value =
                800;

            windGain =
                context.createGain();

            windGain.gain.value =
                0;

            windSource.connect(
                windFilter
            );

            windFilter.connect(
                windGain
            );

            windGain.connect(
                master
            );

            tireSource =
                context.createBufferSource();

            tireSource.buffer =
                noiseBuffer;

            tireSource.loop =
                true;

            tireFilter =
                context.createBiquadFilter();

            tireFilter.type =
                "bandpass";

            tireFilter.frequency.value =
                1450;

            tireFilter.Q.value =
                0.8;

            tireGain =
                context.createGain();

            tireGain.gain.value =
                0;

            tireSource.connect(
                tireFilter
            );

            tireFilter.connect(
                tireGain
            );

            tireGain.connect(
                master
            );

            engineOscillatorA.start();
            engineOscillatorB.start();
            windSource.start();
            tireSource.start();
        };

    const start =
        async () => {
            if (running) {
                await ensureContext();
                return;
            }

            if (
                !await ensureContext()
            ) {
                return;
            }

            buildGraph();
            running = true;
        };

    const tone =
        (
            frequency,
            duration,
            gain = 0.10,
            type = "sine"
        ) => {
            if (
                !running ||
                !context ||
                !master
            ) {
                return;
            }

            const oscillator =
                context.createOscillator();

            const toneGain =
                context.createGain();

            const now =
                context.currentTime;

            oscillator.type =
                type;

            oscillator.frequency.value =
                frequency;

            toneGain.gain.setValueAtTime(
                0.0001,
                now
            );

            toneGain.gain.exponentialRampToValueAtTime(
                Math.max(
                    0.001,
                    gain
                ),
                now + 0.01
            );

            toneGain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + duration
            );

            oscillator.connect(
                toneGain
            );

            toneGain.connect(
                master
            );

            oscillator.start(now);
            oscillator.stop(
                now +
                duration +
                0.03
            );
        };

    const collision =
        (
            intensity = 0.5
        ) => {
            if (
                !running ||
                !context ||
                !master
            ) {
                return;
            }

            const oscillator =
                context.createOscillator();

            const gain =
                context.createGain();

            const filter =
                context.createBiquadFilter();

            const now =
                context.currentTime;

            oscillator.type =
                "triangle";

            oscillator.frequency.setValueAtTime(
                85,
                now
            );

            oscillator.frequency.exponentialRampToValueAtTime(
                38,
                now + 0.16
            );

            filter.type =
                "lowpass";

            filter.frequency.value =
                320;

            gain.gain.setValueAtTime(
                0.14 *
                intensity,
                now
            );

            gain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + 0.20
            );

            oscillator.connect(
                filter
            );

            filter.connect(
                gain
            );

            gain.connect(
                master
            );

            oscillator.start();
            oscillator.stop(
                now + 0.22
            );
        };

    const update =
        (state = {}) => {
            if (
                !running ||
                !context
            ) {
                return;
            }

            const now =
                context.currentTime;

            const speedRatio =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(
                            state.speedRatio
                        ) ||
                        Math.abs(
                            Number(
                                state.speed
                            ) ||
                            0
                        ) /
                        24
                    )
                );

            const throttle =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(
                            state.throttle
                        ) ||
                        0
                    )
                );

            const slip =
                Math.max(
                    0,
                    Math.min(
                        1,
                        Number(
                            state.slipAmount
                        ) ||
                        0
                    )
                );

            const engineFrequency =
                52 +
                speedRatio *
                118 +
                throttle *
                24;

            engineOscillatorA.frequency.setTargetAtTime(
                engineFrequency,
                now,
                0.045
            );

            engineOscillatorB.frequency.setTargetAtTime(
                engineFrequency *
                2.02,
                now,
                0.045
            );

            engineFilter.frequency.setTargetAtTime(
                520 +
                    speedRatio *
                    1250 +
                    throttle *
                    320,
                now,
                0.06
            );

            engineGain.gain.setTargetAtTime(
                0.025 +
                    speedRatio *
                    0.045 +
                    throttle *
                    0.022,
                now,
                0.06
            );

            windGain.gain.setTargetAtTime(
                Math.pow(
                    speedRatio,
                    2
                ) *
                0.048,
                now,
                0.10
            );

            windFilter.frequency.setTargetAtTime(
                700 +
                    speedRatio *
                    1500,
                now,
                0.12
            );

            tireGain.gain.setTargetAtTime(
                slip *
                    speedRatio *
                    0.085,
                now,
                0.04
            );

            tireFilter.frequency.setTargetAtTime(
                1100 +
                    speedRatio *
                    900,
                now,
                0.08
            );

            const severity =
                Number(
                    state.collisionSeverity
                ) ||
                0;

            const nowMs =
                performance.now();

            if (
                severity > 2.4 &&
                nowMs -
                    lastCollisionAt >
                    220
            ) {
                lastCollisionAt =
                    nowMs;

                collision(
                    Math.min(
                        1,
                        severity /
                        10
                    )
                );
            }
        };

    const countdown =
        (count) => {
            if (
                Number(count) <= 3 &&
                Number(count) > 0
            ) {
                tone(
                    520,
                    0.10,
                    0.085,
                    "square"
                );
            }
        };

    const go =
        () => {
            tone(
                880,
                0.18,
                0.11,
                "square"
            );
        };

    const checkpoint =
        () => {
            tone(
                760,
                0.08,
                0.055,
                "sine"
            );
        };

    const finish =
        () => {
            tone(
                660,
                0.12,
                0.09,
                "sine"
            );

            window.setTimeout(
                () =>
                    tone(
                        880,
                        0.18,
                        0.10,
                        "sine"
                    ),
                120
            );
        };

    const stop =
        () => {
            if (
                !running ||
                !context
            ) {
                return;
            }

            running = false;

            const now =
                context.currentTime;

            master?.gain?.setTargetAtTime(
                0.0001,
                now,
                0.04
            );

            const nodes = [
                engineOscillatorA,
                engineOscillatorB,
                windSource,
                tireSource
            ];

            window.setTimeout(
                () => {
                    nodes.forEach(
                        (node) => {
                            try {
                                node?.stop();
                            } catch {
                                // Already stopped.
                            }
                        }
                    );

                    engineOscillatorA = null;
                    engineOscillatorB = null;
                    windSource = null;
                    tireSource = null;
                    engineGain = null;
                    engineFilter = null;
                    windGain = null;
                    windFilter = null;
                    tireGain = null;
                    tireFilter = null;
                    master = null;
                },
                160
            );
        };

    return {
        start,
        update,
        countdown,
        go,
        checkpoint,
        finish,
        collision,
        stop,

        dispose() {
            stop();

            if (context) {
                window.setTimeout(
                    () => {
                        context
                            ?.close?.()
                            .catch?.(
                                () => {}
                            );

                        context = null;
                    },
                    220
                );
            }
        }
    };
}
