import Department from "../models/Department.js";
import Course from "../models/Course.js";

export const DEFAULT_ACADEMIC_CATALOG = [
    {
        name: "Computer Science Engineering",
        code: "CSE",
        description: "Software, systems, artificial intelligence, and computing workflows.",
        courses: [
            { name: "B.Tech Computer Science and Engineering", code: "BTECH-CSE", durationYears: 4 },
            { name: "B.Tech Artificial Intelligence and Machine Learning", code: "BTECH-AIML", durationYears: 4 },
            { name: "B.Tech Data Science", code: "BTECH-DS", durationYears: 4 },
            { name: "M.Tech Computer Science and Engineering", code: "MTECH-CSE", durationYears: 2 },
            { name: "BCA (Bachelor of Computer Applications)", code: "BCA", durationYears: 3 },
            { name: "MCA (Master of Computer Applications)", code: "MCA", durationYears: 2 },
        ],
    },
    {
        name: "Information Technology",
        code: "IT",
        description: "Information systems, cloud, cybersecurity, networks, and enterprise platforms.",
        courses: [
            { name: "B.Tech Information Technology", code: "BTECH-IT", durationYears: 4 },
            { name: "B.Tech Cyber Security", code: "BTECH-CYBER", durationYears: 4 },
            { name: "B.Tech Cloud Computing", code: "BTECH-CLOUD", durationYears: 4 },
            { name: "M.Tech Information Technology", code: "MTECH-IT", durationYears: 2 },
        ],
    },
    {
        name: "Electronics & Communication",
        code: "ECE",
        description: "Electronics, communication circuits, VLSI, and embedded systems.",
        courses: [
            { name: "B.Tech Electronics and Communication Engineering", code: "BTECH-ECE", durationYears: 4 },
            { name: "B.Tech VLSI Design", code: "BTECH-VLSI", durationYears: 4 },
            { name: "B.Tech Internet of Things", code: "BTECH-IOT", durationYears: 4 },
            { name: "M.Tech Embedded Systems", code: "MTECH-ES", durationYears: 2 },
        ],
    },
    {
        name: "Electrical & Electronics",
        code: "EEE",
        description: "Electrical machines, power systems, control systems, and energy engineering.",
        courses: [
            { name: "B.Tech Electrical and Electronics Engineering", code: "BTECH-EEE", durationYears: 4 },
            { name: "B.Tech Electrical Engineering", code: "BTECH-EE", durationYears: 4 },
            { name: "M.Tech Power Systems", code: "MTECH-PS", durationYears: 2 },
            { name: "M.Tech Power Electronics", code: "MTECH-PE", durationYears: 2 },
        ],
    },
    {
        name: "Mechanical Engineering",
        code: "MECH",
        description: "Manufacturing, thermal systems, robotics, and mechanical design.",
        courses: [
            { name: "B.Tech Mechanical Engineering", code: "BTECH-MECH", durationYears: 4 },
            { name: "B.Tech Robotics and Automation", code: "BTECH-RA", durationYears: 4 },
            { name: "M.Tech Thermal Engineering", code: "MTECH-THERMAL", durationYears: 2 },
            { name: "M.Tech CAD/CAM", code: "MTECH-CADCAM", durationYears: 2 },
        ],
    },
    {
        name: "Civil Engineering",
        code: "CIVIL",
        description: "Construction, structures, transportation, and infrastructure planning.",
        courses: [
            { name: "B.Tech Civil Engineering", code: "BTECH-CIVIL", durationYears: 4 },
            { name: "B.Tech Structural Engineering", code: "BTECH-STRUCT", durationYears: 4 },
            { name: "M.Tech Structural Engineering", code: "MTECH-STRUCT", durationYears: 2 },
            { name: "M.Tech Transportation Engineering", code: "MTECH-TRANS", durationYears: 2 },
        ],
    },
    {
        name: "Medical Sciences",
        code: "MED",
        description: "Medicine, nursing, pharmacy, physiotherapy, and allied health sciences.",
        courses: [
            { name: "MBBS (Bachelor of Medicine and Bachelor of Surgery)", code: "MBBS", durationYears: 5 },
            { name: "BDS (Bachelor of Dental Surgery)", code: "BDS", durationYears: 5 },
            { name: "B.Sc Nursing", code: "BSC-NURSING", durationYears: 4 },
            { name: "B.Pharm (Bachelor of Pharmacy)", code: "BPHARM", durationYears: 4 },
            { name: "D.Pharm (Diploma in Pharmacy)", code: "DPHARM", durationYears: 2 },
            { name: "BPT (Bachelor of Physiotherapy)", code: "BPT", durationYears: 4 },
            { name: "B.Sc Medical Laboratory Technology", code: "BSC-MLT", durationYears: 3 },
            { name: "MD General Medicine", code: "MD-GENMED", durationYears: 3 },
            { name: "MS General Surgery", code: "MS-GENSURG", durationYears: 3 },
        ],
    },
    {
        name: "Management Studies",
        code: "MGMT",
        description: "Business administration, finance, marketing, human resources, and analytics.",
        courses: [
            { name: "BBA (Bachelor of Business Administration)", code: "BBA", durationYears: 3 },
            { name: "MBA (Master of Business Administration)", code: "MBA", durationYears: 2 },
            { name: "MBA Business Analytics", code: "MBA-BA", durationYears: 2 },
            { name: "B.Com Business Analytics", code: "BCOM-BA", durationYears: 3 },
        ],
    },
    {
        name: "Commerce",
        code: "COM",
        description: "Accounting, taxation, finance, economics, and commerce education.",
        courses: [
            { name: "B.Com (Bachelor of Commerce)", code: "BCOM", durationYears: 3 },
            { name: "B.Com Computer Applications", code: "BCOM-CA", durationYears: 3 },
            { name: "M.Com (Master of Commerce)", code: "MCOM", durationYears: 2 },
        ],
    },
    {
        name: "Arts & Humanities",
        code: "ARTS",
        description: "Humanities, languages, psychology, journalism, and social sciences.",
        courses: [
            { name: "BA (Bachelor of Arts)", code: "BA", durationYears: 3 },
            { name: "BA Psychology", code: "BA-PSY", durationYears: 3 },
            { name: "BA Journalism and Mass Communication", code: "BA-JMC", durationYears: 3 },
            { name: "MA English", code: "MA-ENG", durationYears: 2 },
            { name: "MSW (Master of Social Work)", code: "MSW", durationYears: 2 },
        ],
    },
    {
        name: "Science",
        code: "SCI",
        description: "Physics, chemistry, mathematics, biotechnology, and life sciences.",
        courses: [
            { name: "B.Sc (Bachelor of Science)", code: "BSC", durationYears: 3 },
            { name: "B.Sc Biotechnology", code: "BSC-BT", durationYears: 3 },
            { name: "B.Sc Mathematics", code: "BSC-MATH", durationYears: 3 },
            { name: "M.Sc Physics", code: "MSC-PHY", durationYears: 2 },
            { name: "M.Sc Chemistry", code: "MSC-CHEM", durationYears: 2 },
        ],
    },
    {
        name: "Law",
        code: "LAW",
        description: "Legal studies, constitutional law, corporate law, and legal practice.",
        courses: [
            { name: "LLB (Bachelor of Laws)", code: "LLB", durationYears: 3 },
            { name: "BA LLB", code: "BA-LLB", durationYears: 5 },
            { name: "BBA LLB", code: "BBA-LLB", durationYears: 5 },
            { name: "LLM (Master of Laws)", code: "LLM", durationYears: 2 },
        ],
    },
    {
        name: "Architecture & Design",
        code: "ARCH",
        description: "Architecture, planning, interior design, and design studies.",
        courses: [
            { name: "B.Arch (Bachelor of Architecture)", code: "BARCH", durationYears: 5 },
            { name: "B.Des (Bachelor of Design)", code: "BDES", durationYears: 4 },
            { name: "M.Arch (Master of Architecture)", code: "MARCH", durationYears: 2 },
        ],
    },
];

let catalogEnsurePromise = null;

export const ensureAcademicCatalog = async () => {
    if (catalogEnsurePromise) return catalogEnsurePromise;
    catalogEnsurePromise = ensureAcademicCatalogOnce().catch((error) => {
        catalogEnsurePromise = null;
        throw error;
    });
    return catalogEnsurePromise;
};

const ensureAcademicCatalogOnce = async () => {
    const departmentsByCode = new Map();

    const departments = await Promise.all(
        DEFAULT_ACADEMIC_CATALOG.map((item) =>
            Department.findOneAndUpdate(
                { code: item.code },
                {
                    $setOnInsert: {
                        name: item.name,
                        code: item.code,
                        description: item.description,
                        isActive: true,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            )
        )
    );

    departments.forEach((department, index) => {
        const item = DEFAULT_ACADEMIC_CATALOG[index];
        departmentsByCode.set(item.code, department);
    });

    const courseOperations = [];
    for (const item of DEFAULT_ACADEMIC_CATALOG) {
        const department = departmentsByCode.get(item.code);
        for (const course of item.courses) {
            courseOperations.push({
                updateOne: {
                    filter: { code: course.code, department: department._id },
                    update: {
                        $setOnInsert: {
                            ...course,
                            department: department._id,
                            isActive: true,
                        },
                    },
                    upsert: true,
                },
            });
        }
    }
    if (courseOperations.length) await Course.bulkWrite(courseOperations, { ordered: false });
};

export const defaultDepartmentCodes = new Set(DEFAULT_ACADEMIC_CATALOG.map((d) => d.code));
