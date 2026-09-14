export const PROP_HUNT_PORTAL_POSITION = Object.freeze({
    x: -253.43,
    y: 0.15,
    z: 26.84
});

export const PROP_HUNT_PORTAL_TRIGGER_RADIUS = 5.0;

export const PROP_HUNT_FLOOR_SURFACE_Y = Object.freeze([
    1.25,
    7.27,
    11.27,
    15.27,
    19.27,
    23.27,
    27.27,
    31.27,
    35.27,
    39.27,
    43.27
]);

export const PROP_HUNT_PLAYER_CENTER_OFFSET_Y = 1.0;

export const PROP_HUNT_ELEVATORS = Object.freeze([
    Object.freeze({ id: "VMES_A", label: "VMES A", x: -221.35, z: 58.36 }),
    Object.freeze({ id: "VMES_B", label: "VMES B", x: -224.09, z: 58.36 }),
    Object.freeze({ id: "VMES_C", label: "VMES C", x: -221.35, z: 65.25 }),
    Object.freeze({ id: "VMES_D", label: "VMES D", x: -224.09, z: 65.25 }),
    Object.freeze({ id: "VME_A", label: "VME A", x: -282.64, z: 58.36 }),
    Object.freeze({ id: "VME_B", label: "VME B", x: -285.36, z: 58.36 }),
    Object.freeze({ id: "VME_C", label: "VME C", x: -282.64, z: 65.24 }),
    Object.freeze({ id: "VME_D", label: "VME D", x: -285.36, z: 65.24 })
]);

export const PROP_HUNT_ELEVATOR_HORIZONTAL_RADIUS = 2.25;
export const PROP_HUNT_ELEVATOR_VERTICAL_TOLERANCE = 1.8;

export const PROP_HUNT_PROP_ASSETS = Object.freeze({
    chair: Object.freeze({
        label: "Chair",
        filename: "chair.glb",
        scale: 1.10
    }),
    desk: Object.freeze({
        label: "Desk",
        filename: "desk.glb",
        scale: 0.90
    }),
    plasticbin: Object.freeze({
        label: "Plastic Bin",
        filename: "plasticbin.glb",
        scale: 1.55
    }),
    steelbin: Object.freeze({
        label: "Steel Bin",
        filename: "steelbin.glb",
        scale: 1.00
    }),
    tv: Object.freeze({
        label: "TV",
        filename: "tv.glb",
        scale: 0.82
    }),
    wooddesk: Object.freeze({
        label: "Wood Desk",
        filename: "wooddesk.glb",
        scale: 0.82
    })
});

export const PROP_HUNT_GUN = Object.freeze({
    filename: "low-poly_sks.glb",

    // Smaller view-model scale + stock-anchored normalization keeps the gun
    // in the lower-right instead of stretching sideways across the screen.
    scale: 0.24,

    position: Object.freeze({
        x: 0.32,
        y: -0.28,
        z: 0.92
    }),

    // The GLB's baked long axis is Y. Rotate it into camera depth and keep
    // the barrel pointing away from the player.
    rotation: Object.freeze({
        x: Math.PI / 2,
        y: Math.PI,
        z: -0.035
    })
});
