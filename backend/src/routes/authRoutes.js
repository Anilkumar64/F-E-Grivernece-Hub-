import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Notification from "../models/Notification.js"; // Bug #6 fix: needed for superadmin alerts
import {
    clearAuthCookies, refreshCookieNames,
    setAuthCookies, signAccessToken, signRefreshToken,
} from "../middleware/authMiddleware.js";
import { guardAny, guardStudent, guardAdmin, guardSuperAdmin } from "../middleware/guards.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { writeAuditLog } from "../utils/audit.js";
import sendEmail from "../utils/sendEmail.js"; // Bug #6 fix: email superadmins
import userUploads from "../middleware/userUploads.js"; // FIX B3: parse multipart/form-data from admin signup

const router = express.Router();
const hashToken = (t) => crypto.createHash("sha256").update(t).digest("hex");

const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    staffId: user.staffId,
    department: user.department,
    isActive: user.isActive,
    isVerified: user.isVerified,
    profilePhoto: user.profilePhoto,
    avatar: user.avatar,
});

/* ── login factory ── */
const loginForRole = (role) => async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "Email and password are required" });

        const user = await User.findOne({ email: email.toLowerCase().trim(), role })
            .select("+password +refreshTokenHash")
            .populate("department", "name code");

        // FIX B4: check credentials first, then isVerified — prevents info leak and wrong error
        if (!user || !user.isActive || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (role === "admin" && !user.isVerified) {
            return res.status(403).json({ message: "Admin account not yet approved by SuperAdmin" });
        }

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        user.refreshTokenHash = hashToken(refreshToken);
        await user.save({ validateBeforeSave: false });
        setAuthCookies(res, user, accessToken, refreshToken);

        req.user = user;
        await writeAuditLog(req, "LOGIN", "User", user._id, { role });

        return res.json({ message: "Login successful", accessToken, user: publicUser(user) });
    } catch (err) {
        next(err);
    }
};

/* ── Public: student registration ── */
router.post("/student/register", authLimiter, async (req, res, next) => {
    try {
        const {
            name, email, password, studentId, rollNumber, department, course,
            phone, contactNumber, address, yearOfStudy, class: className, admissionYear,
        } = req.body;
        if (!name || !email || !password || !studentId)
            return res.status(400).json({ message: "Name, email, password, and student ID are required" });

        // FIX B5: lowercase email before saving so login lookup always matches
        const user = await User.create({
            name,
            email: email.toLowerCase().trim(),
            password,
            studentId,
            rollNumber: rollNumber || "",
            department: department || null,
            course: course || null,
            phone,
            contactNumber: contactNumber || phone || "",
            address,
            yearOfStudy,
            class: className || "",
            admissionYear: admissionYear || null,
            role: "student",
        });

        await writeAuditLog(req, "STUDENT_REGISTERED", "User", user._id);
        return res.status(201).json({ message: "Student registered successfully", userId: user._id });
    } catch (err) {
        next(err);
    }
});

/* ── Public: admin self-registration ── */
router.post("/admin/register", authLimiter, userUploads.single("idCardFile"), async (req, res, next) => {
    try {
        const { name, email, staffId, department, password } = req.body;
        if (!name || !email || !staffId || !department || !password)
            return res.status(400).json({ message: "All fields are required" });

        const existing = await User.findOne({ $or: [{ email: email.toLowerCase().trim() }, { staffId }] });
        if (existing)
            return res.status(409).json({ message: "Admin already registered with this email or staff ID" });

        const idCardFile = req.file
            ? `/uploads/user_idcards/${req.file.filename}`
            : null;

        const admin = await User.create({
            name,
            email: email.toLowerCase().trim(),
            staffId,
            department,
            password,
            role: "admin",
            isVerified: false,
            idCardFile,
        });

        await writeAuditLog(req, "ADMIN_SELF_REGISTERED", "User", admin._id);

        /* ── Bug #6 fix: alert all active superadmins ── */
        const superAdmins = await User.find({ role: "superadmin", isActive: true }).select("_id email name");

        if (superAdmins.length) {
            // In-app notifications (bulk insert for efficiency)
            await Notification.insertMany(
                superAdmins.map((sa) => ({
                    recipient: sa._id,
                    type: "info",
                    title: "New admin registration pending approval",
                    message: `${name} (${email}, Staff ID: ${staffId}) has self-registered as an admin and is awaiting your approval.`,
                }))
            );

            // Email each superadmin (fire-and-forget; non-fatal if it fails)
            superAdmins.forEach((sa) => {
                sendEmail(
                    sa.email,
                    "Action Required – New Admin Registration",
                    `Hello ${sa.name},\n\nA new admin has registered and requires your approval:\n\n` +
                    `  Name:     ${name}\n  Email:    ${email}\n  Staff ID: ${staffId}\n\n` +
                    `Please log in to the SuperAdmin portal to review and approve or reject this request.`
                ).catch(() => { /* non-fatal */ });
            });
        }

        return res.status(201).json({
            message: "Registration submitted. Pending SuperAdmin approval.",
            adminId: admin._id,
        });
    } catch (err) {
        next(err);
    }
});

/* ── Public: login endpoints ── */
router.post("/student/login", authLimiter, loginForRole("student"));
router.post("/admin/login", authLimiter, loginForRole("admin"));
router.post("/superadmin/login", authLimiter, loginForRole("superadmin"));

/* ── Public: token refresh ── */
router.post("/refresh", async (req, res, next) => {
    try {
        const token =
            req.cookies?.studentRefreshToken ||
            req.cookies?.adminRefreshToken ||
            req.cookies?.superadminRefreshToken ||
            req.body?.refreshToken;

        if (!token) return res.status(401).json({ message: "Refresh token missing" });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, { algorithms: ["HS256"] });
        } catch {
            return res.status(403).json({ message: "Invalid or expired refresh token" });
        }

        const user = await User.findById(decoded._id).select("+refreshTokenHash");
        if (!user || !user.isActive || user.refreshTokenHash !== hashToken(token)) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        user.refreshTokenHash = hashToken(refreshToken);
        await user.save({ validateBeforeSave: false });
        setAuthCookies(res, user, accessToken, refreshToken);

        return res.json({ accessToken, user: publicUser(user) });
    } catch (err) {
        next(err);
    }
});

/* ── Protected: logout (any logged-in user) ── */
router.post("/logout", ...guardAny, async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.userId, { refreshTokenHash: null });
        await writeAuditLog(req, "LOGOUT", "User", req.userId);
        clearAuthCookies(res);
        return res.json({ message: "Logged out successfully" });
    } catch (err) {
        next(err);
    }
});

/* ── Protected: current user (any logged-in user) ── */
router.get("/me", ...guardAny, (req, res) => res.json({ user: publicUser(req.user) }));

/* ── Protected: role-check helpers ── */
router.get("/role-check/student", ...guardStudent, (_req, res) => res.json({ ok: true }));
router.get("/role-check/admin", ...guardAdmin, (_req, res) => res.json({ ok: true }));
router.get("/role-check/superadmin", ...guardSuperAdmin, (_req, res) => res.json({ ok: true }));

export default router;