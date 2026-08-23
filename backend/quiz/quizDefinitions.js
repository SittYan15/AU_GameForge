// backend/quiz/quizDefinitions.js

export const CAMPUS_QUIZ_ROOM = "campus_quiz_survival";

export const CAMPUS_QUIZ_PORTAL = Object.freeze({
    x: -120.83,
    y: 0.00,
    z: 6.98,
    radius: 3.0
});

export const CAMPUS_QUIZ_RETURN_POSITION = Object.freeze({
    x: -114.30,
    y: 0.30,
    z: 6.98
});

export const CAMPUS_QUIZ_ARENA = Object.freeze({
    x: 165.56,
    y: -0.30,
    z: -48.58
});

export const CAMPUS_QUIZ_WAITING_SPAWN = Object.freeze({
    x: 165.56,
    y: 0.30,
    z: -32.58
});

export const CAMPUS_QUIZ_SPECTATOR_SPAWN = Object.freeze({
    x: 165.56,
    y: 0.30,
    z: -29.58
});

export const CAMPUS_QUIZ_FLOORS = Object.freeze([
    // campus-quiz-orientation-fix-v2.2
    // Must match frontend/world/campusQuizArena.js exactly.
    Object.freeze({ id: "A", x: 183.56, z: -48.58, halfWidth: 5.5, halfDepth: 5.5 }),
    Object.freeze({ id: "B", x: 171.56, z: -48.58, halfWidth: 5.5, halfDepth: 5.5 }),
    Object.freeze({ id: "C", x: 159.56, z: -48.58, halfWidth: 5.5, halfDepth: 5.5 }),
    Object.freeze({ id: "D", x: 147.56, z: -48.58, halfWidth: 5.5, halfDepth: 5.5 })
]);

export const CAMPUS_QUIZ_LOBBY_SECONDS = 10;
export const CAMPUS_QUIZ_QUESTIONS_PER_ROUND = 8;
export const CAMPUS_QUIZ_QUESTION_TIME_MS = 12_000;
export const CAMPUS_QUIZ_REVEAL_TIME_MS = 3_000;
export const CAMPUS_QUIZ_RESULTS_TIME_MS = 7_000;
export const CAMPUS_QUIZ_STARTING_LIVES = 3;
export const CAMPUS_QUIZ_SCORE_PER_CORRECT = 100;
export const CAMPUS_QUIZ_SURVIVOR_REWARD_POINTS = 50;

export const CAMPUS_QUIZ_QUESTIONS = Object.freeze([
    Object.freeze({
        id: "library_location",
        category: "Facilities",
        question: "At Assumption University's Suvarnabhumi Campus, where is The Cathedral of Learning Library located?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Cathedral of Learning, 2nd floor" }),
            Object.freeze({ id: "b", text: "Queen of Sheba, 2nd floor" }),
            Object.freeze({ id: "c", text: "King David Hall, 2nd floor" }),
            Object.freeze({ id: "d", text: "Car Park Building, 1st floor" })
        ]),
        correctOptionId: "a",
        explanation: "The Cathedral of Learning Library at Suvarnabhumi Campus is located in the CL Building on the 2nd floor.",
        source: "Assumption University Facilities and Services"
    }),

    Object.freeze({
        id: "its_location",
        category: "Facilities",
        question: "Where is Information Technology Services (ITS) located at Suvarnabhumi Campus?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Queen of Sheba, 2nd floor" }),
            Object.freeze({ id: "b", text: "Cathedral of Learning, 2nd floor" }),
            Object.freeze({ id: "c", text: "King Solomon Hall, ground floor" }),
            Object.freeze({ id: "d", text: "Gymnasium, 1st floor" })
        ]),
        correctOptionId: "a",
        explanation: "AU lists the Suvarnabhumi ITS location as Queen of Sheba, 2nd floor.",
        source: "Assumption University Facilities and Services"
    }),

    Object.freeze({
        id: "cspf_location",
        category: "Facilities",
        question: "Which campus facility is the listed location of the Center for Sports and Physical Fitness (CSPF)?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Gymnasium" }),
            Object.freeze({ id: "b", text: "Cathedral of Learning" }),
            Object.freeze({ id: "c", text: "Vincent Mary Center" }),
            Object.freeze({ id: "d", text: "AU Mall" })
        ]),
        correctOptionId: "a",
        explanation: "The Center for Sports and Physical Fitness is listed at the Gymnasium.",
        source: "Assumption University Facilities and Services"
    }),

    Object.freeze({
        id: "residence_halls",
        category: "Buildings",
        question: "Which set names the three AU residence halls at Suvarnabhumi Campus?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "King Solomon, Queen of Sheba, and King David" }),
            Object.freeze({ id: "b", text: "King David, Vincent Mary Center, and Cathedral of Learning" }),
            Object.freeze({ id: "c", text: "Queen of Sheba, St. Gabriel, and De Montfort" }),
            Object.freeze({ id: "d", text: "King Solomon, AU Mall, and Albert Laurence Building" })
        ]),
        correctOptionId: "a",
        explanation: "AU identifies the three dormitories as King Solomon, Queen of Sheba, and King David.",
        source: "Assumption University Facilities and Services"
    }),

    Object.freeze({
        id: "au_plaza_location",
        category: "Buildings",
        question: "Where is AU Plaza located in the Cathedral of Learning building?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Ground floor" }),
            Object.freeze({ id: "b", text: "2nd floor" }),
            Object.freeze({ id: "c", text: "13th floor" }),
            Object.freeze({ id: "d", text: "Top floor" })
        ]),
        correctOptionId: "a",
        explanation: "AU Plaza is located on the ground floor of the Cathedral of Learning building.",
        source: "Assumption University Campus Dining"
    }),

    Object.freeze({
        id: "au_mall_location",
        category: "Facilities",
        question: "AU Mall is located close to which campus area?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "The AU Residence Halls" }),
            Object.freeze({ id: "b", text: "The Hua Mak main gate" }),
            Object.freeze({ id: "c", text: "St. Gabriel's Library" }),
            Object.freeze({ id: "d", text: "The Law Library" })
        ]),
        correctOptionId: "a",
        explanation: "AU describes AU Mall as being located close to the AU Residence Halls.",
        source: "Assumption University Campus Dining"
    }),

    Object.freeze({
        id: "security_location",
        category: "Facilities",
        question: "Where is the Security office listed at Suvarnabhumi Campus?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Car Park Building, 1st floor" }),
            Object.freeze({ id: "b", text: "Queen of Sheba, 2nd floor" }),
            Object.freeze({ id: "c", text: "Cathedral of Learning, 2nd floor" }),
            Object.freeze({ id: "d", text: "King David Hall, 2nd floor" })
        ]),
        correctOptionId: "a",
        explanation: "The Suvarnabhumi Campus Security location is listed at the Car Park Building, 1st floor.",
        source: "Assumption University Facilities and Services"
    }),

    Object.freeze({
        id: "library_babylon_garden",
        category: "Facilities",
        question: "Which floor of the Cathedral of Learning Library has a reading zone associated with the Babylon rock garden?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "3rd floor" }),
            Object.freeze({ id: "b", text: "2nd floor" }),
            Object.freeze({ id: "c", text: "4th floor" }),
            Object.freeze({ id: "d", text: "5th floor" })
        ]),
        correctOptionId: "a",
        explanation: "The library describes its 3rd-floor reading zone as being near the Babylon rock garden.",
        source: "Assumption University Library"
    }),

    Object.freeze({
        id: "library_fourth_floor",
        category: "Facilities",
        question: "Which pair of spaces is described on the 4th floor of the Cathedral of Learning Library?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Happy Space and Performance Space" }),
            Object.freeze({ id: "b", text: "Security Office and Car Park" }),
            Object.freeze({ id: "c", text: "Swimming Pool and Gymnasium" }),
            Object.freeze({ id: "d", text: "ITS Office and Research Lab" })
        ]),
        correctOptionId: "a",
        explanation: "The library's 4th floor includes the Happy Space and Performance Space.",
        source: "Assumption University Library"
    }),

    Object.freeze({
        id: "library_fifth_floor",
        category: "Facilities",
        question: "What is a major purpose of the 5th floor of the Cathedral of Learning Library?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Co-working for research and innovation" }),
            Object.freeze({ id: "b", text: "Vehicle parking" }),
            Object.freeze({ id: "c", text: "Outdoor sports training" }),
            Object.freeze({ id: "d", text: "Residence hall dining" })
        ]),
        correctOptionId: "a",
        explanation: "The 5th floor is described as a co-working environment for research, advanced study, and collaboration.",
        source: "Assumption University Library"
    }),

    Object.freeze({
        id: "library_opened",
        category: "History",
        question: "In which year did the Cathedral of Learning Library at Suvarnabhumi Campus open?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "2000" }),
            Object.freeze({ id: "b", text: "1972" }),
            Object.freeze({ id: "c", text: "1983" }),
            Object.freeze({ id: "d", text: "2014" })
        ]),
        correctOptionId: "a",
        explanation: "The AU Library history states that the Cathedral of Learning Library opened in 2000.",
        source: "Assumption University Library History"
    }),

    Object.freeze({
        id: "main_libraries",
        category: "Facilities",
        question: "Which two are identified as Assumption University's main libraries?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Cathedral of Learning Library and St. Gabriel's Library" }),
            Object.freeze({ id: "b", text: "Science Library and Law Library" }),
            Object.freeze({ id: "c", text: "AU Plaza Library and King David Library" }),
            Object.freeze({ id: "d", text: "Queen of Sheba Library and Vincent Mary Library" })
        ]),
        correctOptionId: "a",
        explanation: "AU Library currently identifies the Cathedral of Learning Library and St. Gabriel's Library as its two main libraries.",
        source: "Assumption University Library History"
    }),

    Object.freeze({
        id: "assumption_day",
        category: "Events",
        question: "On which date is Assumption Day, when AU notes the Crowning Ceremony associated with the university's golden crown?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "15 August" }),
            Object.freeze({ id: "b", text: "1 January" }),
            Object.freeze({ id: "c", text: "5 December" }),
            Object.freeze({ id: "d", text: "13 April" })
        ]),
        correctOptionId: "a",
        explanation: "AU notes the Crowning Ceremony on 15 August, Assumption Day.",
        source: "Assumption University Facilities and Services"
    }),

    Object.freeze({
        id: "sports_facilities",
        category: "Facilities",
        question: "Which sports facilities are specifically mentioned for Suvarnabhumi Campus?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Swimming pools, gymnasium, and outdoor sports facilities" }),
            Object.freeze({ id: "b", text: "Ski slope, ice rink, and climbing park" }),
            Object.freeze({ id: "c", text: "Only a fitness room" }),
            Object.freeze({ id: "d", text: "Only tennis courts" })
        ]),
        correctOptionId: "a",
        explanation: "AU lists swimming pools, a gymnasium, and outdoor sports facilities at Suvarnabhumi Campus.",
        source: "Assumption University Facilities and Services"
    }),

    Object.freeze({
        id: "sports_events",
        category: "Events",
        question: "Which competitive activities are associated with AU's Center for Sports and Physical Fitness?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Thailand University Games, intramural, and intervarsity competitions" }),
            Object.freeze({ id: "b", text: "Only online esports tournaments" }),
            Object.freeze({ id: "c", text: "Only academic debate competitions" }),
            Object.freeze({ id: "d", text: "Only graduation ceremonies" })
        ]),
        correctOptionId: "a",
        explanation: "CSPF lists participation in activities including the Thailand University Games, intramural, and intervarsity competitions.",
        source: "Assumption University Facilities and Services"
    })
]);
