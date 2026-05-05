import express from "express";
import Course from "../models/Course.js";
import User from "../models/User.js";
import { guardSuperAdmin } from "../middleware/guards.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

const DEFAULT_COURSES = [
    { name: "B.Tech (Bachelor of Technology)", code: "BTECH", durationYears: 4 },
    { name: "BBA (Bachelor of Business Administration)", code: "BBA", durationYears: 3 },
    { name: "LLB (Bachelor of Laws)", code: "LLB", durationYears: 3 },
    { name: "MBBS (Bachelor of Medicine and Bachelor of Surgery)", code: "MBBS", durationYears: 5 },
    { name: "B.Sc (Bachelor of Science)", code: "BSC", durationYears: 3 },
    { name: "B.Com (Bachelor of Commerce)", code: "BCOM", durationYears: 3 },
    { name: "BA (Bachelor of Arts)", code: "BA", durationYears: 3 },
    { name: "BCA (Bachelor of Computer Applications)", code: "BCA", durationYears: 3 },
    { name: "B.Arch (Bachelor of Architecture)", code: "BARCH", durationYears: 5 },
    { name: "B.Pharm (Bachelor of Pharmacy)", code: "BPHARM", durationYears: 4 },
];

const ensureDefaultCourses = async () => {
    // Upsert each default course so defaults are always available
    // even when some custom courses already exist.
    await Promise.all(
        DEFAULT_COURSES.map((course) =>
            Course.updateOne(
                { code: course.code, department: null },
                {
                    $setOnInsert: {
                        ...course,
                        department: null,
                        isActive: true,
                    },
                },
                { upsert: true }
            )
        )
    );
};

// Public: list active courses, optionally filtered by department
router.get("/", async (req, res, next) => {
    try {
        await ensureDefaultCourses();
        const filter = req.query.department
            ? { isActive: true, $or: [{ department: req.query.department }, { department: null }] }
            : { isActive: true };
        const courses = await Course.find(filter)
            .populate("department", "name code")
            .sort({ name: 1 });
        res.json({ courses });
    } catch (err) {
        next(err);
    }
});

router.post("/", ...guardSuperAdmin, async (req, res, next) => {
    try {
        const { name, code, durationYears = 4, department = null } = req.body;
        if (!name || !code) {
            return res.status(400).json({ message: "Course name and code are required" });
        }
        const existing = await Course.findOne({
            code: String(code).trim().toUpperCase(),
            department: department || null,
        });
        if (existing) return res.status(409).json({ message: "Course already exists for this department" });
        const course = await Course.create({
            name: String(name).trim(),
            code: String(code).trim().toUpperCase(),
            durationYears: Number(durationYears) || 4,
            department: department || null,
            isActive: true,
        });
        await writeAuditLog(req, "COURSE_CREATED", "Course", course._id);
        res.status(201).json({ message: "Course created", course });
    } catch (err) {
        next(err);
    }
});

router.delete("/:id", ...guardSuperAdmin, async (req, res, next) => {
    try {
        if (await User.exists({ course: req.params.id })) {
            return res.status(409).json({ message: "Course is assigned to users and cannot be deleted" });
        }
        const course = await Course.findByIdAndDelete(req.params.id);
        if (!course) return res.status(404).json({ message: "Course not found" });
        await writeAuditLog(req, "COURSE_DELETED", "Course", course._id);
        res.json({ message: "Course deleted" });
    } catch (err) {
        next(err);
    }
});

export default router;
