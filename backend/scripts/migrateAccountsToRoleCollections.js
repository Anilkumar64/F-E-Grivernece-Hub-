import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import User from "../src/models/User.js";
import Admin from "../src/models/Admin.js";
import SuperAdmin from "../src/models/SuperAdmin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const copyAccount = async (doc, Model, role) => {
    const account = doc.toObject({ depopulate: true, versionKey: true });
    account.role = role;
    if (role === "superadmin") {
        account.department = null;
        account.staffId = account.staffId || process.env.SUPERADMIN_STAFF_ID || "SA-HQ-0001";
        account.isVerified = true;
    }
    if (role === "admin") {
        delete account.studentId;
        delete account.rollNumber;
        delete account.course;
        delete account.class;
        delete account.admissionYear;
        delete account.yearOfStudy;
    }

    await Model.collection.updateOne(
        { _id: account._id },
        { $set: account },
        { upsert: true }
    );
};

const run = async () => {
    if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is required");
    await mongoose.connect(process.env.MONGODB_URL, {
        dbName: process.env.MONGODB_DB || "EgrievanceHub",
    });

    const [admins, superadmins] = await Promise.all([
        User.find({ role: "admin" }).select("+password +refreshTokenHash +loginAttempts +lockUntil +lastFailedLoginAt +stepUpCodeHash +stepUpCodeExpiresAt +stepUpVerifiedAt +activeSessions"),
        User.find({ role: "superadmin" }).select("+password +refreshTokenHash +loginAttempts +lockUntil +lastFailedLoginAt +stepUpCodeHash +stepUpCodeExpiresAt +stepUpVerifiedAt +activeSessions"),
    ]);

    for (const admin of admins) await copyAccount(admin, Admin, "admin");
    for (const superadmin of superadmins) await copyAccount(superadmin, SuperAdmin, "superadmin");

    const deleteResult = await User.deleteMany({ role: { $in: ["admin", "superadmin"] } });

    console.log("Account role collection migration complete.");
    console.log(`Copied admins: ${admins.length}`);
    console.log(`Copied superadmins: ${superadmins.length}`);
    console.log(`Removed privileged accounts from users: ${deleteResult.deletedCount}`);

    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error("Account migration failed:", err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
