// backend/quiz/quizDefinitions.js

export const CAMPUS_QUIZ_ROOM = "campus_quiz_survival";

export const CAMPUS_QUIZ_PORTAL = Object.freeze({
    // In front of the Campus Quiz waiting/spectator platforms.
    x: 165.56,
    y: 0.00,
    z: -20.58,
    radius: 3.0
});

export const CAMPUS_QUIZ_RETURN_POSITION = Object.freeze({
    // Near the Quiz playground, outside the portal trigger radius.
    x: 165.56,
    y: 0.30,
    z: -14.58
});

export const CAMPUS_QUIZ_ARENA = Object.freeze({
    x: 165.56,
    y: -0.30,
    z: -48.58
});

export const CAMPUS_QUIZ_WAITING_SPAWN = Object.freeze({
    // Center of compact 48x5 starting ground.
    x: 165.56,
    y: 0.30,
    z: -39.08
});

export const CAMPUS_QUIZ_SPECTATOR_SPAWN = Object.freeze({
    // Slightly forward, still safely inside the compact platform.
    x: 165.56,
    y: 0.30,
    z: -37.58
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
export const CAMPUS_QUIZ_QUESTIONS_PER_ROUND = 15;
export const CAMPUS_QUIZ_QUESTION_TIME_MS = 12_000;
export const CAMPUS_QUIZ_REVEAL_TIME_MS = 3_000;
export const CAMPUS_QUIZ_RESULTS_TIME_MS = 7_000;
export const CAMPUS_QUIZ_STARTING_LIVES = 3;
export const CAMPUS_QUIZ_MAX_SCORE = 100;
export const CAMPUS_QUIZ_SURVIVOR_REWARD_POINTS = 0;

export const CAMPUS_QUIZ_QUESTIONS = Object.freeze([
    Object.freeze({
        id: "library_location",
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Buildings",
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
        category: "Assumption University",
        subcategory: "Buildings",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "History",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Events",
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
        category: "Assumption University",
        subcategory: "Facilities",
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
        category: "Assumption University",
        subcategory: "Events",
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
,

    Object.freeze({
        id: "au_founded",
        category: "Assumption University",
        question: "In which year did AU begin as the Assumption School of Business?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "1969" }),
            Object.freeze({ id: "b", text: "1959" }),
            Object.freeze({ id: "c", text: "1989" }),
            Object.freeze({ id: "d", text: "1999" })
        ]),
        correctOptionId: "a",
        explanation: "AU began as the Assumption School of Business in 1969.",
        source: "https://admissions.au.edu/?page_id=927"
    }),

    Object.freeze({
        id: "au_status",
        category: "Assumption University",
        question: "In which year was ABAC granted university status?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "1990" }),
            Object.freeze({ id: "b", text: "1970" }),
            Object.freeze({ id: "c", text: "1980" }),
            Object.freeze({ id: "d", text: "2000" })
        ]),
        correctOptionId: "a",
        explanation: "ABAC became Assumption University in 1990.",
        source: "https://admissions.au.edu/?page_id=927"
    }),

    Object.freeze({
        id: "au_abac",
        category: "Assumption University",
        question: "What does the historical abbreviation ABAC stand for?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Assumption Business Administration College" }),
            Object.freeze({ id: "b", text: "Asian Business and Arts College" }),
            Object.freeze({ id: "c", text: "Assumption Bangkok Academic Center" }),
            Object.freeze({ id: "d", text: "Advanced Business Accounting College" })
        ]),
        correctOptionId: "a",
        explanation: "ABAC stands for Assumption Business Administration College.",
        source: "https://admissions.au.edu/?page_id=927"
    }),

    Object.freeze({
        id: "au_original_campus",
        category: "Assumption University",
        question: "Which is the original AU campus in Bangkok?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Hua Mak" }),
            Object.freeze({ id: "b", text: "Suvarnabhumi" }),
            Object.freeze({ id: "c", text: "Chiang Mai" }),
            Object.freeze({ id: "d", text: "Phuket" })
        ]),
        correctOptionId: "a",
        explanation: "Hua Mak is the original campus in Bangkok.",
        source: "https://www.au.edu/visit-hua-mak-campus/"
    }),

    Object.freeze({
        id: "au_asb",
        category: "Assumption University",
        question: "What was the name of AU when it began in 1969?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Assumption School of Business" }),
            Object.freeze({ id: "b", text: "Assumption School of Medicine" }),
            Object.freeze({ id: "c", text: "Bangkok Engineering College" }),
            Object.freeze({ id: "d", text: "Suvarnabhumi Arts Academy" })
        ]),
        correctOptionId: "a",
        explanation: "The original name was Assumption School of Business.",
        source: "https://admissions.au.edu/?page_id=927"
    }),

    Object.freeze({
        id: "gk_ocean",
        category: "General Knowledge",
        question: "Which is the largest ocean on Earth?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Pacific Ocean" }),
            Object.freeze({ id: "b", text: "Atlantic Ocean" }),
            Object.freeze({ id: "c", text: "Indian Ocean" }),
            Object.freeze({ id: "d", text: "Arctic Ocean" })
        ]),
        correctOptionId: "a",
        explanation: "The Pacific Ocean is the largest ocean.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "gk_shakespeare",
        category: "General Knowledge",
        question: "Who wrote Romeo and Juliet?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "William Shakespeare" }),
            Object.freeze({ id: "b", text: "Charles Dickens" }),
            Object.freeze({ id: "c", text: "Jane Austen" }),
            Object.freeze({ id: "d", text: "Mark Twain" })
        ]),
        correctOptionId: "a",
        explanation: "William Shakespeare wrote Romeo and Juliet.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "gk_japan",
        category: "General Knowledge",
        question: "What is the capital of Japan?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Tokyo" }),
            Object.freeze({ id: "b", text: "Kyoto" }),
            Object.freeze({ id: "c", text: "Osaka" }),
            Object.freeze({ id: "d", text: "Nagoya" })
        ]),
        correctOptionId: "a",
        explanation: "Tokyo is the capital of Japan.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "gk_chess",
        category: "General Knowledge",
        question: "How many squares are on a standard chessboard?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "64" }),
            Object.freeze({ id: "b", text: "48" }),
            Object.freeze({ id: "c", text: "72" }),
            Object.freeze({ id: "d", text: "100" })
        ]),
        correctOptionId: "a",
        explanation: "A chessboard has 8 rows and 8 columns: 64 squares.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "gk_continent",
        category: "General Knowledge",
        question: "On which continent is Egypt located primarily?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Africa" }),
            Object.freeze({ id: "b", text: "Asia" }),
            Object.freeze({ id: "c", text: "Europe" }),
            Object.freeze({ id: "d", text: "South America" })
        ]),
        correctOptionId: "a",
        explanation: "Most of Egypt is in Africa; the Sinai Peninsula is in Asia.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "cs_binary",
        category: "Computer Science",
        question: "Which digits are used in the binary number system?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "0 and 1" }),
            Object.freeze({ id: "b", text: "1 and 2" }),
            Object.freeze({ id: "c", text: "0 through 7" }),
            Object.freeze({ id: "d", text: "0 through 9" })
        ]),
        correctOptionId: "a",
        explanation: "Binary uses only the digits 0 and 1.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "cs_stack",
        category: "Computer Science",
        question: "Which data structure follows last in, first out (LIFO)?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Stack" }),
            Object.freeze({ id: "b", text: "Queue" }),
            Object.freeze({ id: "c", text: "Set" }),
            Object.freeze({ id: "d", text: "Graph" })
        ]),
        correctOptionId: "a",
        explanation: "A stack removes the most recently added item first.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "cs_byte",
        category: "Computer Science",
        question: "How many bits are in a byte?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "8" }),
            Object.freeze({ id: "b", text: "4" }),
            Object.freeze({ id: "c", text: "16" }),
            Object.freeze({ id: "d", text: "32" })
        ]),
        correctOptionId: "a",
        explanation: "A byte contains 8 bits.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "cs_html",
        category: "Computer Science",
        question: "What does HTML stand for?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "HyperText Markup Language" }),
            Object.freeze({ id: "b", text: "High Transfer Machine Language" }),
            Object.freeze({ id: "c", text: "Hyperlink Text Management Logic" }),
            Object.freeze({ id: "d", text: "Home Tool Markup Language" })
        ]),
        correctOptionId: "a",
        explanation: "HTML stands for HyperText Markup Language.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "cs_search",
        category: "Computer Science",
        question: "What is the worst-case time complexity of binary search on a sorted array?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "O(log n)" }),
            Object.freeze({ id: "b", text: "O(n)" }),
            Object.freeze({ id: "c", text: "O(n squared)" }),
            Object.freeze({ id: "d", text: "O(2 to the n)" })
        ]),
        correctOptionId: "a",
        explanation: "Binary search halves the search range at each step.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "math_product",
        category: "Mathematics",
        question: "What is 12 multiplied by 8?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "96" }),
            Object.freeze({ id: "b", text: "84" }),
            Object.freeze({ id: "c", text: "108" }),
            Object.freeze({ id: "d", text: "88" })
        ]),
        correctOptionId: "a",
        explanation: "12 multiplied by 8 equals 96.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "math_triangle",
        category: "Mathematics",
        question: "What is the sum of the interior angles of a triangle in Euclidean geometry?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "180 degrees" }),
            Object.freeze({ id: "b", text: "90 degrees" }),
            Object.freeze({ id: "c", text: "270 degrees" }),
            Object.freeze({ id: "d", text: "360 degrees" })
        ]),
        correctOptionId: "a",
        explanation: "The interior angles of a Euclidean triangle sum to 180 degrees.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "math_prime",
        category: "Mathematics",
        question: "Which of these numbers is prime?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "29" }),
            Object.freeze({ id: "b", text: "21" }),
            Object.freeze({ id: "c", text: "27" }),
            Object.freeze({ id: "d", text: "33" })
        ]),
        correctOptionId: "a",
        explanation: "29 has exactly two positive divisors: 1 and 29.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "math_root",
        category: "Mathematics",
        question: "What is the positive square root of 144?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "12" }),
            Object.freeze({ id: "b", text: "14" }),
            Object.freeze({ id: "c", text: "16" }),
            Object.freeze({ id: "d", text: "18" })
        ]),
        correctOptionId: "a",
        explanation: "12 squared equals 144.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "math_percent",
        category: "Mathematics",
        question: "What is 25 percent of 200?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "50" }),
            Object.freeze({ id: "b", text: "25" }),
            Object.freeze({ id: "c", text: "75" }),
            Object.freeze({ id: "d", text: "100" })
        ]),
        correctOptionId: "a",
        explanation: "One quarter of 200 is 50.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "science_water",
        category: "Science",
        question: "What is the chemical formula for water?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "H2O" }),
            Object.freeze({ id: "b", text: "CO2" }),
            Object.freeze({ id: "c", text: "O2" }),
            Object.freeze({ id: "d", text: "NaCl" })
        ]),
        correctOptionId: "a",
        explanation: "A water molecule contains two hydrogen atoms and one oxygen atom.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "science_red_planet",
        category: "Science",
        question: "Which planet is known as the Red Planet?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Mars" }),
            Object.freeze({ id: "b", text: "Venus" }),
            Object.freeze({ id: "c", text: "Jupiter" }),
            Object.freeze({ id: "d", text: "Mercury" })
        ]),
        correctOptionId: "a",
        explanation: "Iron oxides on its surface give Mars its reddish appearance.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "science_photosynthesis",
        category: "Science",
        question: "Which gas do plants absorb for photosynthesis?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Carbon dioxide" }),
            Object.freeze({ id: "b", text: "Helium" }),
            Object.freeze({ id: "c", text: "Nitrogen" }),
            Object.freeze({ id: "d", text: "Hydrogen" })
        ]),
        correctOptionId: "a",
        explanation: "Plants use carbon dioxide and water during photosynthesis.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "science_force",
        category: "Science",
        question: "What force keeps planets in orbit around the Sun?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Gravity" }),
            Object.freeze({ id: "b", text: "Friction" }),
            Object.freeze({ id: "c", text: "Buoyancy" }),
            Object.freeze({ id: "d", text: "Magnetism" })
        ]),
        correctOptionId: "a",
        explanation: "Gravity attracts planets toward the Sun.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "science_atom",
        category: "Science",
        question: "Which particle in an atom has a negative electric charge?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Electron" }),
            Object.freeze({ id: "b", text: "Proton" }),
            Object.freeze({ id: "c", text: "Neutron" }),
            Object.freeze({ id: "d", text: "Nucleus" })
        ]),
        correctOptionId: "a",
        explanation: "Electrons have a negative electric charge.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "th_bangkok",
        category: "Thailand",
        question: "What is the capital of Thailand?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Bangkok" }),
            Object.freeze({ id: "b", text: "Chiang Mai" }),
            Object.freeze({ id: "c", text: "Phuket" }),
            Object.freeze({ id: "d", text: "Pattaya" })
        ]),
        correctOptionId: "a",
        explanation: "Bangkok is the capital of Thailand.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "th_currency",
        category: "Thailand",
        question: "What is the currency of Thailand?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Baht" }),
            Object.freeze({ id: "b", text: "Yen" }),
            Object.freeze({ id: "c", text: "Ringgit" }),
            Object.freeze({ id: "d", text: "Dong" })
        ]),
        correctOptionId: "a",
        explanation: "Thailand uses the baht.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "th_songkran",
        category: "Thailand",
        question: "Which festival celebrates the traditional Thai New Year?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Songkran" }),
            Object.freeze({ id: "b", text: "Loy Krathong" }),
            Object.freeze({ id: "c", text: "Mid-Autumn Festival" }),
            Object.freeze({ id: "d", text: "Dragon Boat Festival" })
        ]),
        correctOptionId: "a",
        explanation: "Songkran celebrates the traditional Thai New Year in April.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "th_flag",
        category: "Thailand",
        question: "Which three colors appear on the Thai national flag?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Red, white, and blue" }),
            Object.freeze({ id: "b", text: "Red, yellow, and green" }),
            Object.freeze({ id: "c", text: "Blue, white, and black" }),
            Object.freeze({ id: "d", text: "Orange, white, and green" })
        ]),
        correctOptionId: "a",
        explanation: "The Thai flag has red, white, and blue horizontal stripes.",
        source: "General educational knowledge"
    }),

    Object.freeze({
        id: "th_region",
        category: "Thailand",
        question: "Thailand is part of which region of Asia?",
        options: Object.freeze([
            Object.freeze({ id: "a", text: "Southeast Asia" }),
            Object.freeze({ id: "b", text: "Central Asia" }),
            Object.freeze({ id: "c", text: "East Asia" }),
            Object.freeze({ id: "d", text: "South Asia" })
        ]),
        correctOptionId: "a",
        explanation: "Thailand is located in Southeast Asia.",
        source: "General educational knowledge"
    })
]);
