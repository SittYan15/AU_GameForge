// frontend/elevators/elevatorConfig.js

export const ELEVATOR_DEBUG = false;

export const ELEVATORS = Object.freeze([
    {
        id: "elevator_1",
        name: "Elevator 1",
        enabled: true,
        floors: [
            {
                id: "floor_1",
                label: "1",
                title: "1st Floor",
                zone: {
                    center: { x: -73.35, y: 3.29, z: 8.15 },
                    size: { x: 2.8, y: 2.6, z: 2.8 }
                },
                target: { x: -73.35, y: 3.29, z: 8.15 }
            },
            {
                id: "floor_2",
                label: "2",
                title: "2nd Floor",
                zone: {
                    center: { x: -73.35, y: 7.68, z: 8.15 },
                    size: { x: 2.8, y: 2.6, z: 2.8 }
                },
                target: { x: -73.35, y: 7.68, z: 8.15 }
            },
            {
                id: "floor_3",
                label: "3",
                title: "3rd Floor",
                zone: {
                    center: { x: -73.35, y: 11.68, z: 8.15 },
                    size: { x: 2.8, y: 2.6, z: 2.8 }
                },
                target: { x: -73.35, y: 11.68, z: 8.15 }
            },
            {
                id: "floor_4",
                label: "4",
                title: "4th Floor",
                zone: {
                    center: { x: -73.35, y: 15.68, z: 8.15 },
                    size: { x: 2.8, y: 2.6, z: 2.8 }
                },
                target: { x: -73.35, y: 15.68, z: 8.15 }
            }
        ]
    }
]);
