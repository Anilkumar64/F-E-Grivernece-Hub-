import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import User from "../src/models/User.js";
import Admin from "../src/models/Admin.js";
import SuperAdmin from "../src/models/SuperAdmin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const confirmed = process.argv.includes("--confirm");
const password = process.env.DEV_LOGIN_PASSWORD || "Password@123";
const nodeEnv = process.env.NODE_ENV || "development";

if (!confirmed) {
    console.error("Refusing to reset passwords without --confirm.");
    process.exit(1);
}

if (nodeEnv === "production") {
    console.error("Refusing to reset passwords while NODE_ENV=production.");
    process.exit(1);
}

if (!process.env.MONGODB_URL) {
    console.error("MONGODB_URL is required.");
    process.exit(1);
}

if (password.length < 8) {
    console.error("DEV_LOGIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
}

try {
    await mongoose.connect(process.env.MONGODB_URL, {
        dbName: process.env.MONGODB_DB || "EgrievanceHub",
        serverSelectionTimeoutMS: 10_000,
    });

    const users = [
        ...(await User.find({ role: "student" }).select("+password +loginAttempts +lockUntil")),
        ...(await Admin.find({}).select("+password +loginAttempts +lockUntil")),
        ...(await SuperAdmin.find({}).select("+password +loginAttempts +lockUntil")),
    ];
    for (const user of users) {
        user.password = password;
        user.isActive = true;
        if (user.role !== "admin" || user.isVerified === undefined) {
            user.isVerified = true;
        }
        user.loginAttempts = 0;
        user.lockUntil = null;
        await user.save();
        console.log(`Reset ${user.role}: ${user.email}`);
    }

    console.log(`\nDone. Development login password for the listed users: ${password}`);
} finally {
    await mongoose.disconnect();
}
