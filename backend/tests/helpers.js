// tests/helpers.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";

// ── Test env ────────────────────────────────────────────────────────
process.env.ACCESS_TOKEN_SECRET = "test_access_secret_that_is_at_least_32_chars!!";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret_that_is_at_least_32_chars!!";
process.env.ACCESS_TOKEN_EXPIRY = "15m";
process.env.REFRESH_TOKEN_EXPIRY = "7d";
process.env.NODE_ENV = "test";
process.env.EMAIL_ENABLED = "false";

let mongod;

// ── Connection ──────────────────────────────────────────────────────
export const connectTestDB = async () => {
    if (mongoose.connection.readyState !== 0) return;
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: "e_grievance_test" });
};

export const disconnectTestDB = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    if (mongod) await mongod.stop();
};

export const clearCollections = async () => {
    const cols = mongoose.connection.collections;
    await Promise.all(Object.values(cols).map((c) => c.deleteMany({})));
};

// ── Token helpers ───────────────────────────────────────────────────
export const tokenFor = (user) =>
    jwt.sign(
        { _id: user._id.toString(), email: user.email, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m", algorithm: "HS256" }
    );

export const expiredTokenFor = (user) =>
    jwt.sign(
        { _id: user._id.toString(), email: user.email, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "-1s", algorithm: "HS256" }
    );

// ── Model imports ───────────────────────────────────────────────────
import User from "../src/models/User.js";
import Department from "../src/models/Department.js";
import GrievanceCategory from "../src/models/GrievanceCategory.js";
import Grievance from "../src/models/Grievance.js";
import Notification from "../src/models/Notification.js";

// ── Seed helpers ────────────────────────────────────────────────────
export const createDepartment = async (overrides = {}) =>
    Department.create({ name: "Computer Science", code: "CSE", ...overrides });

export const createCategory = async (department, overrides = {}) =>
    GrievanceCategory.create({
        name: "Academic",
        department: department._id,
        slaHours: 72,
        ...overrides,
    });

// Plain text — User pre-save hook hashes it once with bcrypt(12)
export const createStudent = async (overrides = {}) =>
    User.create({
        name: "Test Student",
        email: "student@test.com",
        password: "Password123!",
        role: "student",
        studentId: "STU001",
        isActive: true,
        ...overrides,
    });

export const createAdmin = async (department, overrides = {}) =>
    User.create({
        name: "Test Admin",
        email: "admin@test.com",
        password: "Password123!",
        role: "admin",
        staffId: "STF001",
        department: department._id,
        isActive: true,
        isVerified: true,
        ...overrides,
    });

export const createSuperAdmin = async (overrides = {}) =>
    User.create({
        name: "Super Admin",
        email: "superadmin@test.com",
        password: "Password123!",
        role: "superadmin",
        staffId: "SUP001",
        isActive: true,
        isVerified: true,
        ...overrides,
    });

export const createGrievance = async (student, department, category, overrides = {}) =>
    Grievance.create({
        title: "Test Grievance",
        description: "A test grievance description",
        category: category._id,
        department: department._id,
        submittedBy: student._id,
        priority: "Medium",
        slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
        timeline: [{ status: "Pending", message: "Submitted", updatedBy: student._id }],
        ...overrides,
    });