// frontend/world/campusRoadRoute.js
import * as BABYLON from "@babylonjs/core";

// Full AU campus road loop.
//
// Order:
//   1) New north-side extension
//   2) Original BlueCruiser route
//   3) New east/south extension
//   4) Loop back to the first point
//
// Both BlueCruiser and Campus Road Race use this route.
export const CAMPUS_ROAD_ROUTE_POINTS = Object.freeze([
    // New extension before the original BlueCruiser route.
    Object.freeze({ x: 105.88, y: 0.00, z: -117.38 }),
    Object.freeze({ x: -108.61, y: 0.00, z: -118.09 }),
    Object.freeze({ x: -108.87, y: 0.00, z: -4.34 }),

    // Original BlueCruiser route.
    Object.freeze({ x: -123.99, y: 0.00, z: -6.33 }),
    Object.freeze({ x: -406.43, y: 0.00, z: -4.86 }),
    Object.freeze({ x: -438.58, y: 2.63, z: -3.86 }),
    Object.freeze({ x: -473.45, y: -0.01, z: -4.41 }),
    Object.freeze({ x: -487.27, y: -0.02, z: -7.19 }),
    Object.freeze({ x: -487.88, y: -0.02, z: -68.70 }),
    Object.freeze({ x: -526.67, y: -0.02, z: -80.68 }),
    Object.freeze({ x: -723.18, y: -0.02, z: -79.98 }),
    Object.freeze({ x: -724.72, y: -0.02, z: 79.47 }),
    Object.freeze({ x: -494.83, y: -0.02, z: 78.75 }),
    Object.freeze({ x: -489.07, y: -0.02, z: 5.86 }),
    Object.freeze({ x: -466.02, y: 0.17, z: 4.42 }),
    Object.freeze({ x: -442.86, y: 2.73, z: 3.24 }),
    Object.freeze({ x: -401.93, y: 0.00, z: 5.78 }),
    Object.freeze({ x: -128.06, y: 0.00, z: 6.91 }),

    // New extension after the original BlueCruiser route.
    Object.freeze({ x: -108.20, y: 0.00, z: 6.03 }),
    Object.freeze({ x: -108.93, y: 0.00, z: 119.36 }),
    Object.freeze({ x: 150.37, y: 0.00, z: 117.95 }),
    Object.freeze({ x: 161.05, y: 0.00, z: 102.37 }),
    Object.freeze({ x: 168.04, y: -0.00, z: 19.03 }),
    Object.freeze({ x: 190.24, y: -0.00, z: -1.69 }),
    Object.freeze({ x: 224.90, y: 2.08, z: -2.95 }),
    Object.freeze({ x: 248.10, y: 0.00, z: 1.86 }),
    Object.freeze({ x: 252.39, y: -0.00, z: -10.00 }),
    Object.freeze({ x: 251.42, y: 0.00, z: -53.03 }),
    Object.freeze({ x: 250.82, y: -0.00, z: -116.79 }),
    Object.freeze({ x: 218.12, y: -0.00, z: -117.52 })
]);

export const createCampusRoadRoute = () =>
    CAMPUS_ROAD_ROUTE_POINTS.map(
        ({ x, y, z }) =>
            new BABYLON.Vector3(x, y, z)
    );

// Racers begin at point 0, pass every later route point in sequence,
// then return to point 0 to complete the lap.
export const CAMPUS_ROAD_RACE_CHECKPOINTS = Object.freeze([
    ...CAMPUS_ROAD_ROUTE_POINTS.slice(1),
    CAMPUS_ROAD_ROUTE_POINTS[0]
]);
