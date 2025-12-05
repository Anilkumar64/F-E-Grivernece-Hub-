import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../models/Department.js";

dotenv.config();

const departments = [
    { name: "Computer Science Engineering", code: "CSE", email: "cse@college.ac.in" },
    { name: "Information Technology", code: "IT", email: "it@college.ac.in" },
    { name: "Electronics & Communication", code: "ECE", email: "ece@college.ac.in" },
    { name: "Electrical & Electronics", code: "EEE", email: "eee@college.ac.in" },
    { name: "Mechanical Engineering", code: "MECH", email: "mech@college.ac.in" },
    { name: "Civil Engineering", code: "CIVIL", email: "civil@college.ac.in" },
];

async function seed() {
    try {
        await mongoose.connect("mongodb+srv://anil:Anilreddy12345@cluster0.zmtbl.mongodb.net/EgrievanceHub");
        console.log("DB CONNECTED");

        await Department.deleteMany(); // clears old data
        await Department.insertMany(departments);

        console.log("Departments Added Successfully!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
