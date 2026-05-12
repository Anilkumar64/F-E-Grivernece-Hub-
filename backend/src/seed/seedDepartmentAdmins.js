import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import Department from "../models/Department.js";
import Admin from "../models/Admin.js";
import { generateDepartmentStaffId } from "../utils/staffId.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", "..", "..", ".env") });

const DEFAULT_DEPARTMENTS = [
    { name: "Computer Science Engineering", code: "CSE", description: "Software, systems, and computing workflows." },
    { name: "Information Technology", code: "IT", description: "IT operations, network systems, and support services." },
    { name: "Electronics & Communication", code: "ECE", description: "Electronics, communication circuits, and embedded systems." },
    { name: "Electrical & Electronics", code: "EEE", description: "Electrical machines, power systems, and controls." },
    { name: "Mechanical Engineering", code: "MECH", description: "Manufacturing, thermal systems, and mechanical design." },
    { name: "Civil Engineering", code: "CIVIL", description: "Construction, structures, and infrastructure planning." },
];

const seededAdminEmail = (code) => `${code.toLowerCase()}.admin@university.ac.in`;
const seededAdminName = (departmentName) => `${departmentName} Admin`;
const adminPassword = process.env.DEPT_ADMIN_PASSWORD || process.env.DEV_LOGIN_PASSWORD || "Admin@12345";

const ensureDepartments = async () => {
    await Promise.all(
        DEFAULT_DEPARTMENTS.map((department) =>
            Department.updateOne(
                { code: department.code },
                {
                    $set: { isActive: true },
                    $setOnInsert: department,
                },
                { upsert: true }
            )
        )
    );
};

const ensureDepartmentAdmin = async (department) => {
    const currentHead = department.headAdmin
        ? await Admin.findOne({ _id: department.headAdmin })
        : null;

    const admin =
        currentHead ||
        (await Admin.findOne({ department: department._id }).sort({ createdAt: 1 }));

    if (admin) {
        admin.department = department._id;
        admin.password = adminPassword;
        admin.isActive = true;
        admin.isVerified = true;
        if (!admin.staffId) {
            admin.staffId = await generateDepartmentStaffId(Admin, department.code);
        }
        await admin.save();
        await Department.updateOne({ _id: department._id }, { $set: { headAdmin: admin._id, isActive: true } });
        return { action: "updated", admin };
    }

    const created = await Admin.create({
        name: seededAdminName(department.name),
        email: seededAdminEmail(department.code),
        password: adminPassword,
        staffId: await generateDepartmentStaffId(Admin, department.code),
        department: department._id,
        role: "admin",
        isActive: true,
        isVerified: true,
        permissions: [],
    });

    await Department.updateOne({ _id: department._id }, { $set: { headAdmin: created._id, isActive: true } });
    return { action: "created", admin: created };
};

const run = async () => {
    if (!process.env.MONGODB_URL) {
        throw new Error("MONGODB_URL is required");
    }
    if (adminPassword.length < 8) {
        throw new Error("DEPT_ADMIN_PASSWORD or DEV_LOGIN_PASSWORD must be at least 8 characters");
    }

    await mongoose.connect(process.env.MONGODB_URL, {
        dbName: process.env.MONGODB_DB || "EgrievanceHub",
    });

    await ensureDepartments();
    const departments = await Department.find({ isActive: { $ne: false } }).sort({ name: 1 });
    const results = [];

    for (const department of departments) {
        const { action, admin } = await ensureDepartmentAdmin(department);
        results.push({
            department: `${department.name} (${department.code})`,
            action,
            name: admin.name,
            email: admin.email,
            staffId: admin.staffId,
        });
    }

    console.log("Department admin seed complete.");
    console.table(results);
    console.log(`Password for all listed department admins: ${adminPassword}`);

    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error("Department admin seed failed:", err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
