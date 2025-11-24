import mongoose from "mongoose";
import dotenv from "dotenv";
import Admin from "./src/models/Admin.js";

dotenv.config();

console.log("Loaded URI →", process.env.MONGODB_URL);

async function createSuperAdmin() {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to database:", conn.connection.host);

        const exists = await Admin.findOne({ email: "superadmin@university.ac.in" });

        if (exists) {
            console.log("SuperAdmin already exists!");
            process.exit(0);
        }

        const superadmin = new Admin({
            name: "Super Admin",
            email: "superadmin@university.ac.in",
            staffId: "SA001",
            department: "Administration",
            role: "superadmin",
            password: "admin123",
            verified: true
        });

        await superadmin.save();
        console.log("SuperAdmin created successfully!");
        process.exit(0);

    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

createSuperAdmin();
