import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import Admin from "./src/models/Admin.js";

dotenv.config();

console.log("Loaded URI →", process.env.MONGODB_URL);

async function createSuperAdmin() {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to database:", conn.connection.host);

        const exists = await Admin.findOne({ email: process.env.SUPERADMIN_EMAIL || "superadmin@university.ac.in" });

        if (exists) {
            console.log("SuperAdmin already exists!");
            process.exit(0);
        }

        // ✅ Use environment variable or generate random password instead of hardcoding
        const tempPassword = process.env.SUPERADMIN_PASSWORD || crypto.randomBytes(16).toString("hex");

        const superadmin = new Admin({
            name: "Super Admin",
            email: process.env.SUPERADMIN_EMAIL || "superadmin@university.ac.in",
            staffId: "SA001",
            department: "Administration",
            role: "superadmin",
            password: tempPassword,
            verified: true
        });

        await superadmin.save();
        console.log("🔐 SuperAdmin created successfully!");
        console.log("⚠️  Generated Password:", tempPassword);
        console.log("⚠️  Store this securely and change on first login.");
        process.exit(0);

    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

createSuperAdmin();
