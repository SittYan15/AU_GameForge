// frontend/elevators/elevatorConfig.js

export const ELEVATOR_DEBUG = false;

const PROP_HUNT_PLAYER_CENTER_OFFSET_Y = 1.0;

const VME_FLOOR_SURFACE_Y = Object.freeze([
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

const createFloorLabel = (index) => {
    const floorNumber = index + 1;

    if (floorNumber === 1) return "1st Floor";
    if (floorNumber === 2) return "2nd Floor";
    if (floorNumber === 3) return "3rd Floor";

    return `${floorNumber}th Floor`;
};

const createElevatorFloors = (
    elevatorId,
    x,
    z,
    {
        zoneSizeX = 4.5,
        zoneSizeY = 3.6,
        zoneSizeZ = 4.5
    } = {}
) => {
    return VME_FLOOR_SURFACE_Y.map(
        (surfaceY, index) => {
            const floorNumber =
                index + 1;

            const playerCenterY =
                surfaceY +
                PROP_HUNT_PLAYER_CENTER_OFFSET_Y;

            return {
                id:
                    `${elevatorId}_floor_${floorNumber}`,

                label:
                    String(floorNumber),

                title:
                    createFloorLabel(index),

                zone: {
                    center: {
                        x,
                        y: playerCenterY,
                        z
                    },

                    size: {
                        x: zoneSizeX,
                        y: zoneSizeY,
                        z: zoneSizeZ
                    }
                },

                target: {
                    x,
                    y: playerCenterY,
                    z
                }
            };
        }
    );
};

const ELEVATOR_FLOOR_Y_OFFSETS = Object.freeze([
    0,
    4.39,
    8.39,
    12.39
]);

const createFourFloorElevator = (
    elevatorId,
    elevatorName,
    basePosition,
    {
        zoneSize = { x: 2.8, y: 2.6, z: 2.8 }
    } = {}
) => {
    return {
        id: elevatorId,
        name: elevatorName,
        enabled: true,
        floors: ELEVATOR_FLOOR_Y_OFFSETS.map(
            (yOffset, index) => {
                const floorNumber = index + 1;

                const y =
                    Number(
                        (
                            basePosition.y +
                            yOffset
                        ).toFixed(2)
                    );

                return {
                    id: `${elevatorId}_floor_${floorNumber}`,
                    label: String(floorNumber),
                    title:
                        floorNumber === 1
                            ? "1st Floor"
                            : floorNumber === 2
                                ? "2nd Floor"
                                : floorNumber === 3
                                    ? "3rd Floor"
                                    : `${floorNumber}th Floor`,

                    zone: {
                        center: {
                            x: basePosition.x,
                            y,
                            z: basePosition.z
                        },
                        size: zoneSize
                    },

                    target: {
                        x: basePosition.x,
                        y,
                        z: basePosition.z
                    }
                };
            }
        )
    };
};

// ============================================================
// CL_ELEVATORS_V1
//
// CL has two elevator banks with three separate shafts in each bank.
// Some shafts only serve selected floors, so use explicit floor numbers/Ys.
// ============================================================

const createSelectedFloorElevator = (
    elevatorId,
    elevatorName,
    x,
    z,
    floorStops,
    {
        // The shafts are only ~2.75 units apart, so keep the interaction
        // zones smaller than the normal 2.8-wide elevator zones to avoid
        // neighboring CL shafts overlapping.
        zoneSize = {
            x: 2.2,
            y: 2.6,
            z: 2.2
        }
    } = {}
) => {
    return {
        id:
            elevatorId,

        name:
            elevatorName,

        enabled:
            true,

        floors:
            floorStops.map(
                (
                    {
                        floorNumber,
                        y
                    }
                ) => {
                    const title =
                        floorNumber === 1
                            ? "1st Floor"
                            : floorNumber === 2
                                ? "2nd Floor"
                                : floorNumber === 3
                                    ? "3rd Floor"
                                    : `${floorNumber}th Floor`;

                    return {
                        id:
                            `${elevatorId}_floor_${floorNumber}`,

                        label:
                            String(
                                floorNumber
                            ),

                        title,

                        zone: {
                            center: {
                                x,
                                y,
                                z
                            },

                            size: {
                                ...zoneSize
                            }
                        },

                        target: {
                            x,
                            y,
                            z
                        }
                    };
                }
            )
    };
};

const CL_ELEVATOR_1_FLOORS =
    Object.freeze([
        Object.freeze({
            floorNumber: 1,
            y: 1.73
        }),

        Object.freeze({
            floorNumber: 2,
            y: 7.43
        }),

        Object.freeze({
            floorNumber: 4,
            y: 19.33
        }),

        Object.freeze({
            floorNumber: 5,
            y: 23.35
        })
    ]);

const CL_ELEVATOR_2_FLOORS =
    Object.freeze([
        Object.freeze({
            floorNumber: 2,
            y: 7.43
        }),

        Object.freeze({
            floorNumber: 3,
            y: 15.34
        })
    ]);

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
    },

    // Same building, opposite side / another shaft
    createFourFloorElevator(
        "elevator_2",
        "Elevator 2",
        {
            x: -73.27,
            y: 2.29,
            z: -8.15
        }
    ),

    // North-side elevators
    createFourFloorElevator(
        "elevator_3",
        "Elevator 3",
        {
            x: -8.04,
            y: 2.39,
            z: -73.85
        }
    ),

    createFourFloorElevator(
        "elevator_4",
        "Elevator 4",
        {
            x: 8.04,
            y: 2.39,
            z: -73.85
        }
    ),

    // South-side elevators
    createFourFloorElevator(
        "elevator_5",
        "Elevator 5",
        {
            x: -8.03,
            y: 2.39,
            z: 73.85
        }
    ),

    createFourFloorElevator(
        "elevator_6",
        "Elevator 6",
        {
            x: 8.03,
            y: 2.39,
            z: 73.85
        }
    ),

    // ========================================================
    // CL Building elevators
    //
    // Bank 1:
    //   L1  y=1.73
    //   L2  y=7.43
    //   L4  y=19.33
    //   L5  y=23.35
    //
    // Bank 2:
    //   L2  y=7.43
    //   L3  y=15.34
    //
    // Each supplied X coordinate is a separate physical shaft.
    // ========================================================

    createSelectedFloorElevator(
        "cl_elevator_1_a",
        "CL Elevator 1A",
        -6.89,
        -13.82,
        CL_ELEVATOR_1_FLOORS
    ),

    createSelectedFloorElevator(
        "cl_elevator_1_b",
        "CL Elevator 1B",
        -9.65,
        -13.82,
        CL_ELEVATOR_1_FLOORS
    ),

    createSelectedFloorElevator(
        "cl_elevator_1_c",
        "CL Elevator 1C",
        -12.39,
        -13.82,
        CL_ELEVATOR_1_FLOORS
    ),

    createSelectedFloorElevator(
        "cl_elevator_2_a",
        "CL Elevator 2A",
        -6.89,
        -9.44,
        CL_ELEVATOR_2_FLOORS
    ),

    createSelectedFloorElevator(
        "cl_elevator_2_b",
        "CL Elevator 2B",
        -9.65,
        -9.44,
        CL_ELEVATOR_2_FLOORS
    ),

    createSelectedFloorElevator(
        "cl_elevator_2_c",
        "CL Elevator 2C",
        -12.39,
        -9.44,
        CL_ELEVATOR_2_FLOORS
    ),

    // VMES Building elevator area.
    // Coordinates copied from Prop Hunt VMES elevator coordinates.
    {
        id: "vmes_elevator_a",
        name: "VMES Elevator A",
        enabled: true,
        floors: createElevatorFloors(
            "vmes_elevator_a",
            -221.35,
            58.36
        )
    },

    {
        id: "vmes_elevator_b",
        name: "VMES Elevator B",
        enabled: true,
        floors: createElevatorFloors(
            "vmes_elevator_b",
            -224.09,
            58.36
        )
    },

    {
        id: "vmes_elevator_c",
        name: "VMES Elevator C",
        enabled: true,
        floors: createElevatorFloors(
            "vmes_elevator_c",
            -221.35,
            65.25
        )
    },

    {
        id: "vmes_elevator_d",
        name: "VMES Elevator D",
        enabled: true,
        floors: createElevatorFloors(
            "vmes_elevator_d",
            -224.09,
            65.25
        )
    },

    // VME Building elevator area.
    // Coordinates copied from Prop Hunt VME elevator coordinates.
    {
        id: "vme_elevator_a",
        name: "VME Elevator A",
        enabled: true,
        floors: createElevatorFloors(
            "vme_elevator_a",
            -282.64,
            58.36
        )
    },

    {
        id: "vme_elevator_b",
        name: "VME Elevator B",
        enabled: true,
        floors: createElevatorFloors(
            "vme_elevator_b",
            -285.36,
            58.36
        )
    },

    {
        id: "vme_elevator_c",
        name: "VME Elevator C",
        enabled: true,
        floors: createElevatorFloors(
            "vme_elevator_c",
            -282.64,
            65.24
        )
    },

    {
        id: "vme_elevator_d",
        name: "VME Elevator D",
        enabled: true,
        floors: createElevatorFloors(
            "vme_elevator_d",
            -285.36,
            65.24
        )
    }
]);