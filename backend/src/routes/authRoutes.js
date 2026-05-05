import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import SiteConfig from "../models/SiteConfig.js";
import Notification from "../models/Notification.js"; // Bug #6 fix: needed for superadmin alerts
import SecurityEvent from "../models/SecurityEvent.js";
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
const hashValue = (v) => crypto.createHash("sha256").update(v).digest("hex");

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
            .select("+password +refreshTokenHash +loginAttempts +lockUntil +lastFailedLoginAt")
            .populate("department", "name code");
        const config = await SiteConfig.findOne({ key: "global" }).select("security");
        const maxAttempts = config?.security?.maxLoginAttempts || 5;
        const lockoutMinutes = config?.security?.lockoutMinutes || 15;

        if (user?.lockUntil && user.lockUntil > new Date()) {
            return res.status(423).json({ message: "Account temporarily locked. Try again later." });
        }

        // FIX B4: check credentials first, then isVerified — prevents info leak and wrong error
        if (!user || !user.isActive || !(await user.comparePassword(password))) {
            if (user) {
                const attempts = (user.loginAttempts || 0) + 1;
                user.loginAttempts = attempts;
                user.lastFailedLoginAt = new Date();
                if (attempts >= maxAttempts) {
                    user.lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
                    await SecurityEvent.create({
                        type: "account_locked",
                        severity: "high",
                        user: user._id,
                        message: `${user.email} locked after repeated failed logins`,
                        metadata: { attempts, role },
                        createdBy: null,
                    });
                    if (role === "admin" || role === "superadmin") {
                        const superAdmins = await User.find({ role: "superadmin", isActive: true }).select("_id");
                        if (superAdmins.length) {
                            await Notification.insertMany(
                                superAdmins.map((sa) => ({
                                    recipient: sa._id,
                                    type: "warning",
                                    title: "Privileged account locked",
                                    message: `${user.email} (${role}) was locked after repeated failed login attempts.`,
                                }))
                            );
                        }
                    }
                }
                await user.save({ validateBeforeSave: false });
            }
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (role === "admin" && !user.isVerified) {
            return res.status(403).json({ message: "Admin account not yet approved by SuperAdmin" });
        }

        const accessToken = signAccessToken(user);
        const refreshToken = signRefreshToken(user);
        const sessionId = crypto.randomUUID();
        user.refreshTokenHash = hashToken(refreshToken);
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.activeSessions = [
            ...(user.activeSessions || []).slice(-9),
            {
                sessionId,
                userAgent: req.headers["user-agent"] || "",
                ipAddress: req.ip || "",
                createdAt: new Date(),
                lastSeenAt: new Date(),
            },
        ];
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
        await User.findByIdAndUpdate(req.userId, { refreshTokenHash: null, activeSessions: [] });
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

/* ── Protected: step-up auth for privileged actions ── */
router.post("/step-up/request", ...guardAny, async (req, res, next) => {
    try {
        if (!["admin", "superadmin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Step-up is only available for privileged roles" });
        }
        const actor = await User.findById(req.userId).select("+stepUpCodeHash +stepUpCodeExpiresAt +stepUpVerifiedAt");
        if (!actor) return res.status(404).json({ message: "User not found" });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        actor.stepUpCodeHash = hashValue(code);
        actor.stepUpCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        actor.stepUpVerifiedAt = null;
        await actor.save({ validateBeforeSave: false });

        await sendEmail(
            req.user.email,
            "E-Grievance Step-Up Verification Code",
            `Your verification code is ${code}. It expires in 10 minutes.`
        );
        await writeAuditLog(req, "STEP_UP_CODE_REQUESTED", "User", req.user._id);
        return res.json({ message: "Step-up code sent to your email" });
    } catch (err) {
        next(err);
    }
});

router.post("/step-up/verify", ...guardAny, async (req, res, next) => {
    try {
        const code = req.body?.code?.trim();
        if (!code) return res.status(400).json({ message: "Code is required" });
        const actor = await User.findById(req.userId).select("+stepUpCodeHash +stepUpCodeExpiresAt +stepUpVerifiedAt");
        if (!actor) return res.status(404).json({ message: "User not found" });
        const expected = actor.stepUpCodeHash;
        const isExpired = !actor.stepUpCodeExpiresAt || actor.stepUpCodeExpiresAt < new Date();
        if (!expected || isExpired || expected !== hashValue(code)) {
            return res.status(400).json({ message: "Invalid or expired verification code" });
        }
        actor.stepUpCodeHash = null;
        actor.stepUpCodeExpiresAt = null;
        actor.stepUpVerifiedAt = new Date();
        await actor.save({ validateBeforeSave: false });
        await writeAuditLog(req, "STEP_UP_VERIFIED", "User", actor._id);
        return res.json({ message: "Step-up verification successful" });
    } catch (err) {
        next(err);
    }
});

export default router;