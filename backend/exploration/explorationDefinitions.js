// backend/exploration/explorationDefinitions.js

export const EXPLORATION_REWARD_POINTS = 100;

export const CAMPUS_EXPLORATION_LOCATIONS = Object.freeze([
    { id: "cl_plaza", title: "CL Plaza", position: { x: 0, y: 1.73, z: 0 }, horizontalRadius: 5, verticalTolerance: 1.8 },
    { id: "cl_main_hall", title: "CL Main Hall", position: { x: 0, y: 7.42, z: 0 }, horizontalRadius: 5, verticalTolerance: 1.8 },
    { id: "library_l2", title: "Library Level 2", position: { x: 0, y: 15.34, z: 0 }, horizontalRadius: 5, verticalTolerance: 1.8 },
    { id: "library_l3", title: "Library Level 3", position: { x: 0, y: 19.34, z: 0 }, horizontalRadius: 5, verticalTolerance: 1.8 },
    { id: "library_l4", title: "Library Level 4", position: { x: 0, y: 23.34, z: 0 }, horizontalRadius: 5, verticalTolerance: 1.8 }
]);
