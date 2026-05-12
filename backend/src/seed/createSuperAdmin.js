import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import SuperAdmin from "../models/SuperAdmin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

const SUPER_NAME = process.env.SUPER_NAME || "Super Admin";
const SUPER_EMAIL = (process.env.SUPER_EMAIL || "superadmin@university.ac.in").toLowerCase().trim();
const SUPER_PASSWORD = process.env.SUPER_PASSWORD || "SuperAdmin@123";
const SUPERADMIN_STAFF_ID = process.env.SUPERADMIN_STAFF_ID || "SA-HQ-0001";

const REQUIRED_VARS = ["MONGODB_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
}

if (SUPER_PASSWORD.length < 8) {
    console.error("SUPER_PASSWORD must be at least 8 characters.");
    process.exit(1);
}

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URL, {
        dbName: process.env.MONGODB_DB || "EgrievanceHub",
    });

    const existing = await SuperAdmin.findOne({ email: SUPER_EMAIL }).select("+password");
    let superadmin;

    if (existing) {
        existing.name = SUPER_NAME;
        existing.password = SUPER_PASSWORD;
        existing.staffId = SUPERADMIN_STAFF_ID;
        existing.role = "superadmin";
        existing.isActive = true;
        existing.isVerified = true;
        existing.department = null;
        superadmin = await existing.save();
        console.log("SuperAdmin updated successfully.");
    } else {
        superadmin = await SuperAdmin.create({
            name: SUPER_NAME,
            email: SUPER_EMAIL,
            password: SUPER_PASSWORD,
            staffId: SUPERADMIN_STAFF_ID,
            role: "superadmin",
            isActive: true,
            isVerified: true,
            department: null,
        });
        console.log("SuperAdmin created successfully.");
    }

    console.log(`Email: ${superadmin.email}`);

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
});
