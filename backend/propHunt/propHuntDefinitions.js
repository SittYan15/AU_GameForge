export const PROP_HUNT_ROOM = "prop_hunt_vme";

export const PROP_HUNT_MIN_PLAYERS = 3;
export const PROP_HUNT_LOBBY_SECONDS = 10;
export const PROP_HUNT_HIDING_MS = 60_000;
export const PROP_HUNT_HUNT_MS = 240_000;
export const PROP_HUNT_RESULTS_MS = 8_000;

export const PROP_HUNT_SEEKER_WIN_POINTS = 100;
export const PROP_HUNT_HIDER_SURVIVE_POINTS = 100;
export const PROP_HUNT_PARTICIPATION_POINTS = 20;

export const PROP_HUNT_FIRE_COOLDOWN_MS = 350;
export const PROP_HUNT_WRONG_SHOT_PENALTY_MS = 800;
export const PROP_HUNT_MAX_BULLETS = 10;
export const PROP_HUNT_MAX_SHOT_RANGE = 55;
export const PROP_HUNT_MAX_AIM_MISS_DISTANCE = 1.8;
export const PROP_HUNT_MAX_HIT_POINT_DISTANCE = 2.6;

export const PROP_HUNT_PORTAL = Object.freeze({
    x: -253.43,
    y: 0.15,
    z: 26.84,
    radius: 5.0
});

// These supplied coordinates were measured on the floor surface.
// The player capsule is 2 units high and its root is centered, so +1.0 Y
// keeps the human model/capsule above the floor instead of half embedded.
export const PROP_HUNT_LOBBY_POSITION = Object.freeze({
    x: -254.06,
    y: 2.20,
    z: 52.64
});

export const PROP_HUNT_RETURN_POSITION = Object.freeze({
    x: -253.25,
    y: 1.17,
    z: 19.74
});

// The VME / VMES streaming configuration in chunkManager.js defines these
// three playable building bands. Keeping them as a union is more accurate
// than one giant rectangle because the portal/return area must stay outside.
export const PROP_HUNT_AREAS = Object.freeze([
    Object.freeze({
        id: "VMES",
        minX: -249.75,
        maxX: -213.75,
        minY: -1.0,
        maxY: 46.5,
        minZ: 20.5,
        maxZ: 103.0
    }),
    Object.freeze({
        id: "VME",
        minX: -293.0,
        maxX: -257.0,
        minY: -1.0,
        maxY: 46.5,
        minZ: 20.5,
        maxZ: 103.0
    }),
    Object.freeze({
        id: "VME_MIDDLE",
        minX: -273.0,
        maxX: -232.0,
        minY: -1.0,
        maxY: 46.5,
        minZ: 48.0,
        maxZ: 130.0
    })
]);

// Values supplied by the project owner are floor-surface Y values.
// The local player capsule root sits 1 unit above the floor surface.
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
    Object.freeze({ id: "VMES_A", building: "VMES", x: -221.35, z: 58.36 }),
    Object.freeze({ id: "VMES_B", building: "VMES", x: -224.09, z: 58.36 }),
    Object.freeze({ id: "VMES_C", building: "VMES", x: -221.35, z: 65.25 }),
    Object.freeze({ id: "VMES_D", building: "VMES", x: -224.09, z: 65.25 }),
    Object.freeze({ id: "VME_A", building: "VME", x: -282.64, z: 58.36 }),
    Object.freeze({ id: "VME_B", building: "VME", x: -285.36, z: 58.36 }),
    Object.freeze({ id: "VME_C", building: "VME", x: -282.64, z: 65.24 }),
    Object.freeze({ id: "VME_D", building: "VME", x: -285.36, z: 65.24 })
]);

export const PROP_HUNT_ELEVATOR_HORIZONTAL_RADIUS = 2.25;
export const PROP_HUNT_ELEVATOR_VERTICAL_TOLERANCE = 1.8;

export const PROP_HUNT_PROP_IDS = Object.freeze([
    "chair",
    "desk",
    "plasticbin",
    "steelbin",
    "tv",
    "wooddesk"
]);
