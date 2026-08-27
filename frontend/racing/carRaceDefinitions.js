// frontend/racing/carRaceDefinitions.js
import {
    CAMPUS_ROAD_RACE_CHECKPOINTS,
    CAMPUS_ROAD_ROUTE_POINTS
} from "../world/campusRoadRoute.js";

export const CAR_RACE_PORTAL = Object.freeze({
    ...CAMPUS_ROAD_ROUTE_POINTS[0],
    radius: 4.0
});

export const CAR_RACE_PORTAL_TRIGGER_RADIUS = 3.2;

export const CAR_RACE_RETURN_POSITION = Object.freeze({
    x: 105.88,
    y: 0.50,
    z: -103.50
});

export const CAR_RACE_START = CAMPUS_ROAD_ROUTE_POINTS[0];

export const CAR_RACE_CHECKPOINTS =
    CAMPUS_ROAD_RACE_CHECKPOINTS;

// First road segment goes almost directly toward -X.
export const CAR_RACE_START_HEADING = -Math.PI / 2;
