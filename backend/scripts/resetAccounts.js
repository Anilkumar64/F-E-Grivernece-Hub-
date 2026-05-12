import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import User from "../src/models/User.js";
import Admin from "../src/models/Admin.js";
import SuperAdmin from "../src/models/SuperAdmin.js";
import Department from "../src/models/Department.js";
import Notification from "../src/models/Notification.js";
import PushSubscription from "../src/models/PushSubscription.js";
import ApprovalRequest from "../src/models/ApprovalRequest.js";
import SecurityEvent from "../src/models/SecurityEvent.js";
import TokenRecord from "../src/models/TokenRecord.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const required = ["MONGODB_URL", "SUPER_EMAIL", "SUPER_PASSWORD"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
}

if (process.env.SUPER_PASSWORD.length < 8) {
    console.error("SUPER_PASSWORD must be at least 8 characters.");
    process.exit(1);
}

const dropCollectionIfExists = async (name) => {
    const collections = await mongoose.connection.db.listCollections({ name }).toArray();
    if (!collections.length) return { dropped: false };
    await mongoose.connection.db.dropCollection(name);
    return { dropped: true };
};

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URL, {
        dbName: process.env.MONGODB_DB || "EgrievanceHub",
    });

    const userDelete = await User.deleteMany({ role: "student" });
    const adminDelete = await Admin.deleteMany({});
    const superAdminDelete = await SuperAdmin.deleteMany({});
    const legacyAdmins = await dropCollectionIfExists("admins");

    await Promise.all([
        Department.updateMany({}, { $set: { headAdmin: null } }),
        Notification.deleteMany({}),
        PushSubscription.deleteMany({}),
        ApprovalRequest.deleteMany({}),
        TokenRecord.deleteMany({}),
        SecurityEvent.updateMany({}, { $set: { user: null, createdBy: null } }),
    ]);

    const superadmin = await SuperAdmin.create({
        name: process.env.SUPER_NAME || "Super Admin",
        email: process.env.SUPER_EMAIL.toLowerCase().trim(),
        password: process.env.SUPER_PASSWORD,
        staffId: process.env.SUPERADMIN_STAFF_ID || "SA-HQ-0001",
        role: "superadmin",
        isActive: true,
        isVerified: true,
        department: null,
        permissions: [],
    });

    const superadminCount = await SuperAdmin.countDocuments({});
    if (superadminCount !== 1) {
        throw new Error(`Expected exactly one superadmin, found ${superadminCount}`);
    }

    console.log("Account reset complete.");
    console.log(`Deleted student documents from users: ${userDelete.deletedCount}`);
    console.log(`Deleted admin documents from admins: ${adminDelete.deletedCount}`);
    console.log(`Deleted superadmin documents from superadmins: ${superAdminDelete.deletedCount}`);
    console.log(`Dropped legacy admins collection: ${legacyAdmins.dropped ? "yes" : "no"}`);
    console.log(`Created single superadmin: ${superadmin.email}`);

    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error("Account reset failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
