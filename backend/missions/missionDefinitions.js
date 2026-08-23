// backend/missions/missionDefinitions.js

export const DYNAMIC_MISSIONS = Object.freeze([
    Object.freeze({
        id: "cl_plaza",
        type: "visit_area",
        title: "Visit CL Plaza",
        description: "Explore CL Plaza and reach the mission marker.",
        position: Object.freeze({ x: 0, y: 1.73, z: 0 }),
        horizontalRadius: 4.5,
        verticalTolerance: 1.8,
        rewardPoints: 15,
        durationMs: 120_000
    }),

    Object.freeze({
        id: "cl_main_hall",
        type: "visit_area",
        title: "Visit CL Main Hall",
        description: "Head to CL Main Hall and reach the mission marker.",
        position: Object.freeze({ x: 0, y: 7.42, z: 0 }),
        horizontalRadius: 4.5,
        verticalTolerance: 1.8,
        rewardPoints: 20,
        durationMs: 120_000
    }),

    Object.freeze({
        id: "library_l2",
        type: "visit_area",
        title: "Explore Library Level 2",
        description: "Travel to Library Level 2 and find the mission marker.",
        position: Object.freeze({ x: 0, y: 15.34, z: 0 }),
        horizontalRadius: 4.5,
        verticalTolerance: 1.8,
        rewardPoints: 25,
        durationMs: 120_000
    }),

    Object.freeze({
        id: "library_l3",
        type: "visit_area",
        title: "Explore Library Level 3",
        description: "Travel to Library Level 3 and find the mission marker.",
        position: Object.freeze({ x: 0, y: 19.34, z: 0 }),
        horizontalRadius: 4.5,
        verticalTolerance: 1.8,
        rewardPoints: 30,
        durationMs: 120_000
    }),

    Object.freeze({
        id: "library_l4",
        type: "visit_area",
        title: "Explore Library Level 4",
        description: "Travel to Library Level 4 and find the mission marker.",
        position: Object.freeze({ x: 0, y: 23.34, z: 0 }),
        horizontalRadius: 4.5,
        verticalTolerance: 1.8,
        rewardPoints: 35,
        durationMs: 120_000
    })
]);
