import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Course from "../models/Course.js";
import Department from "../models/Department.js";
import User from "../models/User.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

const TARGET_STUDENTS_PER_DEPARTMENT = Number(process.env.SEED_STUDENTS_PER_DEPARTMENT || 210);
const STUDENT_PASSWORD = process.env.STUDENT_SEED_PASSWORD || "Student@12345";

const boyNames = [
    "Aadhavan", "Aarav", "Abhinav", "Adithya", "Akash", "Amar", "Anirudh", "Aravind", "Arjun", "Ashwin",
    "Bala", "Bharath", "Charan", "Darshan", "Deepak", "Dhanush", "Gautham", "Harish", "Hariharan", "Karthik",
    "Kavin", "Krishna", "Madhav", "Manikandan", "Manoj", "Mithun", "Mohan", "Naveen", "Nikhil", "Pranav",
    "Praveen", "Rahul", "Rajesh", "Ram", "Rithvik", "Rohan", "Sai", "Sanjay", "Sarath", "Sathvik",
    "Shankar", "Siddharth", "Sriram", "Surya", "Teja", "Varun", "Venkatesh", "Vignesh", "Vikram", "Vishnu",
];

const girlNames = [
    "Aadhya", "Aishwarya", "Akshara", "Amrutha", "Ananya", "Anika", "Anitha", "Bhavana", "Deepika", "Divya",
    "Gayathri", "Harini", "Indu", "Janani", "Kavya", "Keerthana", "Lakshmi", "Lavanya", "Meghana", "Meera",
    "Nandhini", "Niharika", "Pavithra", "Pooja", "Pranathi", "Priya", "Ramya", "Revathi", "Ritika", "Sahithi",
    "Sailaja", "Sandhya", "Sangeetha", "Shalini", "Shravya", "Sneha", "Sowmya", "Sreeja", "Sruthi", "Swathi",
    "Tanvi", "Tejaswini", "Vaishnavi", "Varsha", "Vasavi", "Vidya", "Yamini",
];

const surnames = [
    "Acharya", "Bhat", "Chary", "Gowda", "Hegde", "Iyer", "Kannan", "Krishnan", "Kumar", "Menon",
    "Murthy", "Naidu", "Nair", "Nambiar", "Pillai", "Raghavan", "Raj", "Raman", "Rao", "Reddy",
    "Shetty", "Subramanian", "Varma", "Venkataraman",
];

const cities = [
    { city: "Hyderabad", state: "Telangana", areas: ["Kukatpally", "Madhapur", "Ameerpet", "Begumpet", "Kondapur"] },
    { city: "Vijayawada", state: "Andhra Pradesh", areas: ["Benz Circle", "Governorpet", "Patamata", "Poranki", "Gollapudi"] },
    { city: "Visakhapatnam", state: "Andhra Pradesh", areas: ["MVP Colony", "Gajuwaka", "Dwaraka Nagar", "Madhurawada", "Seethammadhara"] },
    { city: "Bengaluru", state: "Karnataka", areas: ["Jayanagar", "Indiranagar", "Whitefield", "Basavanagudi", "Malleshwaram"] },
    { city: "Mysuru", state: "Karnataka", areas: ["Vijayanagar", "Kuvempunagar", "Jayalakshmipuram", "Gokulam", "Saraswathipuram"] },
    { city: "Chennai", state: "Tamil Nadu", areas: ["Adyar", "Velachery", "Anna Nagar", "Tambaram", "T Nagar"] },
    { city: "Coimbatore", state: "Tamil Nadu", areas: ["Gandhipuram", "Peelamedu", "RS Puram", "Saibaba Colony", "Singanallur"] },
    { city: "Kochi", state: "Kerala", areas: ["Edappally", "Kakkanad", "Fort Kochi", "Vyttila", "Panampilly Nagar"] },
    { city: "Thiruvananthapuram", state: "Kerala", areas: ["Pattom", "Kowdiar", "Kazhakootam", "Vellayambalam", "Peroorkada"] },
];

const sections = ["A", "B", "C", "D"];
const personalDomains = ["gmail.com", "outlook.com", "yahoo.com", "proton.me"];

const pick = (items, index, salt = 0) => items[(index + salt) % items.length];
const pad = (value, length) => String(value).padStart(length, "0");
const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
const ordinal = (value) => `${value}${value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th"} Year`;

const admissionYearForIndex = (index) => 2022 + (index % 4);
const yearOfStudyForAdmission = (admissionYear) => ordinal(Math.max(1, Math.min(4, 2026 - admissionYear)));

const phoneFor = (deptIndex, sequence) => {
    const prefix = [9, 8, 7, 6][(deptIndex + sequence) % 4];
    const tail = 100000000 + (deptIndex * 1000000) + sequence;
    return `${prefix}${String(tail).slice(-9)}`;
};

const addressFor = (index) => {
    const location = pick(cities, index, 3);
    const area = pick(location.areas, index, 5);
    const house = `${(index % 48) + 1}-${((index * 7) % 300) + 10}/${((index * 13) % 90) + 1}`;
    const pincode = 500000 + ((index * 37) % 90000);
    return `${house}, ${area}, ${location.city}, ${location.state} - ${pincode}`;
};

const existingSequenceForDepartment = async (departmentCode) => {
    const regex = new RegExp(`^STU-${departmentCode}-(\\d+)$`);
    const students = await User.find({ studentId: { $regex: `^STU-${departmentCode}-` } }).select("studentId").lean();
    return students.reduce((max, student) => {
        const match = String(student.studentId || "").match(regex);
        return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
};

const buildStudent = ({ department, courses, deptIndex, sequence, passwordHash }) => {
    const isBoy = sequence % 2 === 1;
    const firstName = isBoy ? pick(boyNames, sequence, deptIndex) : pick(girlNames, sequence, deptIndex);
    const lastName = pick(surnames, sequence, deptIndex * 2);
    const admissionYear = admissionYearForIndex(sequence);
    const studentId = `STU-${department.code}-${pad(sequence, 4)}`;
    const rollNumber = `${department.code}${String(admissionYear).slice(-2)}${pad(sequence, 4)}`;
    const emailBase = `${slug(firstName)}.${slug(lastName)}.${department.code.toLowerCase()}${pad(sequence, 4)}`;
    const course = courses.length ? pick(courses, sequence, deptIndex) : null;
    const phone = phoneFor(deptIndex, sequence);

    return {
        name: `${firstName} ${lastName}`,
        email: `${emailBase}@student.university.ac.in`,
        password: passwordHash,
        role: "student",
        studentId,
        rollNumber,
        class: `${department.code}-${yearOfStudyForAdmission(admissionYear).replace(" Year", "")}-${pick(sections, sequence, deptIndex)}`,
        admissionYear,
        course: course?._id || null,
        department: department._id,
        phone,
        contactNumber: phone,
        alternateEmail: `${emailBase}@${pick(personalDomains, sequence, deptIndex)}`,
        emailVerified: true,
        phoneVerified: true,
        preferredVerification: sequence % 3 === 0 ? "phone" : "email",
        address: addressFor((deptIndex * TARGET_STUDENTS_PER_DEPARTMENT) + sequence),
        yearOfStudy: yearOfStudyForAdmission(admissionYear),
        isActive: true,
        isVerified: true,
    };
};

const run = async () => {
    if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is required");
    if (TARGET_STUDENTS_PER_DEPARTMENT < 200) throw new Error("SEED_STUDENTS_PER_DEPARTMENT must be at least 200");
    if (STUDENT_PASSWORD.length < 8) throw new Error("STUDENT_SEED_PASSWORD must be at least 8 characters");

    await mongoose.connect(process.env.MONGODB_URL, {
        dbName: process.env.MONGODB_DB || "EgrievanceHub",
    });

    const departments = await Department.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    const courses = await Course.find({ isActive: { $ne: false } }).select("_id department").lean();
    const coursesByDepartment = new Map();
    courses.forEach((course) => {
        const key = course.department?.toString() || "";
        coursesByDepartment.set(key, [...(coursesByDepartment.get(key) || []), course]);
    });

    const passwordHash = await bcrypt.hash(STUDENT_PASSWORD, 12);
    const results = [];

    for (const [deptIndex, department] of departments.entries()) {
        const currentCount = await User.countDocuments({ role: "student", department: department._id });
        const toCreate = Math.max(0, TARGET_STUDENTS_PER_DEPARTMENT - currentCount);
        const startSequence = await existingSequenceForDepartment(department.code);
        const docs = [];

        for (let offset = 1; offset <= toCreate; offset += 1) {
            docs.push(buildStudent({
                department,
                courses: coursesByDepartment.get(department._id.toString()) || [],
                deptIndex,
                sequence: startSequence + offset,
                passwordHash,
            }));
        }

        if (docs.length) {
            await User.insertMany(docs, { ordered: false });
        }

        results.push({
            department: `${department.name} (${department.code})`,
            existing: currentCount,
            created: docs.length,
            total: currentCount + docs.length,
        });
    }

    console.log("Student seed complete.");
    console.table(results);
    console.log(`Password for newly seeded students: ${STUDENT_PASSWORD}`);

    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error("Student seed failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
