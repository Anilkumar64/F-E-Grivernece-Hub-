/**
 * createSuperAdmin.js
 *
 * Run ONCE to seed the first SuperAdmin user into the database.
 *
 * Usage:
 *   node src/seed/createSuperAdmin.js
 *
 * Or with custom credentials via env vars:
 *   SUPER_EMAIL=admin@uni.ac.in SUPER_PASSWORD=MyStr0ngPass node src/seed/createSuperAdmin.js
 */

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ── Inline a minimal schema so we don't hit the pre-validate hook's
//    staffId/department requirements (which don't apply to superadmin) ──────
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        role: { type: String, default: "superadmin" },
        isActive: { type: Boolean, default: true },
        isVerified: { type: Boolean, default: true },
        refreshTokenHash: { type: String, default: null },
        resetToken: { type: String, default: null },
        resetTokenExpire: { type: Date, default: null },
        studentId: { type: String, default: null, sparse: true },
        staffId: { type: String, default: null },
        department: { type: mongoose.Schema.Types.ObjectId, default: null },
        phone: { type: String, default: "" },
        address: { type: String, default: "" },
        yearOfStudy: { type: String, default: "" },
        avatar: { type: String, default: "" },
        profilePhoto: { type: String, default: "" },
    },
    { timestamps: true }
);

const SUPER_NAME = process.env.SUPER_NAME || "Super Admin";
const SUPER_EMAIL = process.env.SUPER_EMAIL || "superadmin@university.ac.in";
const SUPER_PASSWORD = process.env.SUPER_PASSWORD || "SuperAdmin@123";

const REQUIRED_VARS = ["MONGODB_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];
const missing = REQUIRED_VARS.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`\n❌  Missing env vars: ${missing.join(", ")}`);
    console.error("    Copy env.example → .env and fill in the values.\n");
    process.exit(1);
}

if (SUPER_PASSWORD.length < 8) {
    console.error("\n❌  SUPER_PASSWORD must be at least 8 characters.\n");
    process.exit(1);
}

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URL, {
        dbName: process.env.MONGODB_DB || "EgrievanceHub",
    });

    console.log("✅  Connected to MongoDB");

    // Use a raw model (bypass the full User schema's pre-validate hook)
    const User = mongoose.models.User || mongoose.model("User", userSchema);

    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
        console.log(`\n⚠️   A superadmin already exists: ${existing.email}`);
        console.log("    Delete it first if you want to recreate it.\n");
        await mongoose.disconnect();
        return;
    }

    const hashed = await bcrypt.hash(SUPER_PASSWORD, 12);
    await User.create({
        name: SUPER_NAME,
        email: SUPER_EMAIL.toLowerCase(),
        password: hashed,
        role: "superadmin",
        isActive: true,
        isVerified: true,
    });

    console.log("\n✅  SuperAdmin created successfully!");
    console.log(`    Email:    ${SUPER_EMAIL.toLowerCase()}`);
    console.log(`    Password: ${SUPER_PASSWORD}`);
    console.log("\n⚠️   Change the password immediately after first login.\n");

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error("❌  Seed failed:", err.message);
    process.exit(1);
});