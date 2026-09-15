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
    }),


    Object.freeze({
        id: "msm_building",
        type: "visit_area",
        title: "Visit MSM building",
        description: "Travel to MSM building and reach the mission area.",
        position: Object.freeze({ x: -146.64, y: 1.25, z: 61.64 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "mse_building",
        type: "visit_area",
        title: "Visit MSE building",
        description: "Travel to MSE building and reach the mission area.",
        position: Object.freeze({ x: -190.96, y: 1.25, z: 62.29 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "vmes_building",
        type: "visit_area",
        title: "Visit VMES building",
        description: "Travel to VMES building and reach the mission area.",
        position: Object.freeze({ x: -231.95, y: 1.25, z: 67.26 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "vms_building",
        type: "visit_area",
        title: "Visit VMS building",
        description: "Travel to VMS building and reach the mission area.",
        position: Object.freeze({ x: -275.27, y: 1.25, z: 62.15 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "mg_building",
        type: "visit_area",
        title: "Visit MG building",
        description: "Travel to MG building and reach the mission area.",
        position: Object.freeze({ x: -300.02, y: 0.15, z: 81.12 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "au_bus_stand",
        type: "visit_area",
        title: "Visit AU Bus Stand",
        description: "Travel to AU Bus Stand and reach the mission area.",
        position: Object.freeze({ x: -166.63, y: 0.00, z: 133.85 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "thai_flight_training",
        type: "visit_area",
        title: "Visit Thai Flight Training",
        description: "Travel to Thai Flight Training and reach the mission area.",
        position: Object.freeze({ x: -246.14, y: 0.00, z: 129.28 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "sc_building",
        type: "visit_area",
        title: "Visit SC building",
        description: "Travel to SC building and reach the mission area.",
        position: Object.freeze({ x: -124.92, y: 0.17, z: -61.88 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "car_park_building",
        type: "visit_area",
        title: "Visit Car Park building",
        description: "Travel to Car Park building and reach the mission area.",
        position: Object.freeze({ x: -177.59, y: 0.14, z: -31.96 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "ar_building",
        type: "visit_area",
        title: "Visit AR building",
        description: "Travel to AR building and reach the mission area.",
        position: Object.freeze({ x: -244.40, y: 1.20, z: -62.15 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "ca_building",
        type: "visit_area",
        title: "Visit CA building",
        description: "Travel to CA building and reach the mission area.",
        position: Object.freeze({ x: -260.78, y: 1.20, z: -62.09 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "communication_arts_studio",
        type: "visit_area",
        title: "Visit Communication Arts Studio",
        description: "Travel to Communication Arts Studio and reach the mission area.",
        position: Object.freeze({ x: -292.91, y: 1.24, z: -61.97 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "president_house",
        type: "visit_area",
        title: "Visit President House",
        description: "Travel to President House and reach the mission area.",
        position: Object.freeze({ x: -370.65, y: 0.15, z: -30.83 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "au_mall",
        type: "visit_area",
        title: "Visit AU Mall",
        description: "Travel to AU Mall and reach the mission area.",
        position: Object.freeze({ x: -474.09, y: 0.67, z: -68.67 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "museum",
        type: "visit_area",
        title: "Visit Museum",
        description: "Travel to Museum and reach the mission area.",
        position: Object.freeze({ x: -514.71, y: 3.17, z: 0.21 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "king_solomon",
        type: "visit_area",
        title: "Visit King Solomon",
        description: "Travel to King Solomon and reach the mission area.",
        position: Object.freeze({ x: -676.87, y: 3.03, z: -55.12 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "queen_of_sheba",
        type: "visit_area",
        title: "Visit Queen of Sheba",
        description: "Travel to Queen of Sheba and reach the mission area.",
        position: Object.freeze({ x: -677.68, y: 3.03, z: 54.68 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "au_aquatic_center",
        type: "visit_area",
        title: "Visit AU Aquatic Center",
        description: "Travel to AU Aquatic Center and reach the mission area.",
        position: Object.freeze({ x: -499.48, y: 0.18, z: 173.54 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "john_paul_ii_sport_center",
        type: "visit_area",
        title: "Visit John Paul II Sport Center",
        description: "Travel to John Paul II Sport Center and reach the mission area.",
        position: Object.freeze({ x: -500.18, y: 0.18, z: 267.74 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "indoor_swimming_pool",
        type: "visit_area",
        title: "Visit Indoor Swimming Pool",
        description: "Travel to Indoor Swimming Pool and reach the mission area.",
        position: Object.freeze({ x: -598.92, y: 0.18, z: 225.33 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "indoor_volleyball_court",
        type: "visit_area",
        title: "Visit Indoor Volleyball Court",
        description: "Travel to Indoor Volleyball Court and reach the mission area.",
        position: Object.freeze({ x: -499.31, y: 0.18, z: 332.43 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "indoor_badminton_court",
        type: "visit_area",
        title: "Visit Indoor Badminton Court",
        description: "Travel to Indoor Badminton Court and reach the mission area.",
        position: Object.freeze({ x: -567.81, y: 0.18, z: 353.78 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "outdoor_car_play",
        type: "visit_area",
        title: "Visit Outdoor Car play",
        description: "Travel to Outdoor Car play and reach the mission area.",
        position: Object.freeze({ x: -449.48, y: -0.02, z: 299.90 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "st_louis_marie_de_montfort_church",
        type: "visit_area",
        title: "Visit St Louis Marie de Montfort's Church",
        description: "Travel to St Louis Marie de Montfort's Church and reach the mission area.",
        position: Object.freeze({ x: 190.27, y: 1.85, z: 161.03 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "john_xxiii_conference_center",
        type: "visit_area",
        title: "Visit John XXIII Conference Center",
        description: "Travel to John XXIII Conference Center and reach the mission area.",
        position: Object.freeze({ x: 238.79, y: 0.75, z: 163.45 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "crystal_restuarant",
        type: "visit_area",
        title: "Visit Crystal Restuarant",
        description: "Travel to Crystal Restuarant and reach the mission area.",
        position: Object.freeze({ x: 283.25, y: 0.50, z: 118.05 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "sala_jaturamuk_paichit",
        type: "visit_area",
        title: "Visit Sala Jaturamuk Paichit",
        description: "Travel to Sala Jaturamuk Paichit and reach the mission area.",
        position: Object.freeze({ x: 114.93, y: 2.75, z: 0.21 }),
        horizontalRadius: 8,
        verticalTolerance: 3,
        rewardPoints: 20,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "igor_ansoff_statue",
        type: "look_at_target",
        targetName: "IGOR ANSOFF",
        title: "Find IGOR ANSOFF Statue",
        description:
            "Find the IGOR ANSOFF statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -162.37, y: 3.76, z: 58.25 }),
        lookTarget: Object.freeze({ x: -162.37, y: 3.76, z: 58.25 }),
        horizontalRadius: 10.0,
        verticalTolerance: 5.0,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "adam_smith_statue",
        type: "look_at_target",
        targetName: "ADAM SMITH",
        title: "Find ADAM SMITH Statue",
        description: "Find the ADAM SMITH statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -165.50, y: 3.39, z: 58.42 }),
        lookTarget: Object.freeze({ x: -165.50, y: 3.39, z: 58.42 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "fw_taylor_statue",
        type: "look_at_target",
        targetName: "F.W. TAYLOR",
        title: "Find F.W. TAYLOR Statue",
        description: "Find the F.W. TAYLOR statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -168.73, y: 3.39, z: 58.25 }),
        lookTarget: Object.freeze({ x: -168.73, y: 3.39, z: 58.25 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "luca_pacioli_statue",
        type: "look_at_target",
        targetName: "LUCA PACIOLI",
        title: "Find LUCA PACIOLI Statue",
        description: "Find the LUCA PACIOLI statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -171.95, y: 3.39, z: 58.27 }),
        lookTarget: Object.freeze({ x: -171.95, y: 3.39, z: 58.27 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "rene_descartes_statue",
        type: "look_at_target",
        targetName: "RENE DESCARTES",
        title: "Find RENE DESCARTES Statue",
        description: "Find the RENE DESCARTES statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -174.99, y: 3.42, z: 58.26 }),
        lookTarget: Object.freeze({ x: -174.99, y: 3.42, z: 58.26 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "kurt_lewin_statue",
        type: "look_at_target",
        targetName: "KURT LEWIN",
        title: "Find KURT LEWIN Statue",
        description: "Find the KURT LEWIN statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -175.20, y: 3.51, z: 65.28 }),
        lookTarget: Object.freeze({ x: -175.20, y: 3.51, z: 65.28 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "galileo_galilei_statue",
        type: "look_at_target",
        targetName: "GALILEO GALILEI",
        title: "Find GALILEO GALILEI Statue",
        description: "Find the GALILEO GALILEI statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -171.87, y: 3.35, z: 65.19 }),
        lookTarget: Object.freeze({ x: -171.87, y: 3.35, z: 65.19 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "philip_kotler_statue",
        type: "look_at_target",
        targetName: "PHILIP KOTLER",
        title: "Find PHILIP KOTLER Statue",
        description: "Find the PHILIP KOTLER statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -168.68, y: 3.41, z: 65.19 }),
        lookTarget: Object.freeze({ x: -168.68, y: 3.41, z: 65.19 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "peter_ducker_statue",
        type: "look_at_target",
        targetName: "PETER DUCKER",
        title: "Find PETER DUCKER Statue",
        description: "Find the PETER DUCKER statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -165.58, y: 3.41, z: 65.22 }),
        lookTarget: Object.freeze({ x: -165.58, y: 3.41, z: 65.22 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

    Object.freeze({
        id: "john_law_statue",
        type: "look_at_target",
        targetName: "JOHN LAW",
        title: "Find JOHN LAW Statue",
        description: "Find the JOHN LAW statue. When you are nearby, look directly at it for 3 seconds.",
        position: Object.freeze({ x: -162.57, y: 3.34, z: 65.28 }),
        lookTarget: Object.freeze({ x: -162.57, y: 3.34, z: 65.28 }),
        horizontalRadius: 10,
        verticalTolerance: 5,
        requiredLookMs: 3_000,
        lookAngleDegrees: 10,
        showMarker: false,
        revealDistance: false,
        rewardPoints: 40,
        durationMs: 180_000
    }),

]);
