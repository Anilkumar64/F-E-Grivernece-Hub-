import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticate, authorize, clearAuthCookies, refreshCookieNames, setAuthCookies, signAccessToken, signRefreshToken } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { writeAuditLog } from "../utils/audit.js";

const router = express.Router();

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const publicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId,
    staffId: user.staffId,
    department: user.department,
    isActive: user.isActive,
});

const loginForRole = (role) => async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim(), role }).select("+password +refreshTokenHash").populate("department", "name code");
    if (!user || !user.isActive || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokenHash = hashToken(refreshToken);
    await user.save({ validateBeforeSave: false });
    setAuthCookies(res, user, accessToken, refreshToken);
    req.user = user;
    await writeAuditLog(req, "LOGIN", "User", user._id, { role });

    return res.json({ message: "Login successful", accessToken, user: publicUser(user) });
};

router.post("/student/login", authLimiter, loginForRole("student"));
router.post("/admin/login", authLimiter, loginForRole("admin"));
router.post("/superadmin/login", authLimiter, loginForRole("superadmin"));

router.post("/refresh", async (req, res) => {
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
        return res.status(403).json({ message: "Invalid refresh token" });
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
    res.json({ accessToken, user: publicUser(user) });
});

router.post("/logout", authenticate, async (req, res) => {
    await User.findByIdAndUpdate(req.userId, { refreshTokenHash: null });
    await writeAuditLog(req, "LOGOUT", "User", req.userId);
    clearAuthCookies(res);
    res.json({ message: "Logged out successfully" });
});

router.get("/me", authenticate, (req, res) => {
    res.json({ user: publicUser(req.user) });
});

router.get("/role-check/student", authenticate, authorize("student"), (_req, res) => res.json({ ok: true }));
router.get("/role-check/admin", authenticate, authorize("admin"), (_req, res) => res.json({ ok: true }));
router.get("/role-check/superadmin", authenticate, authorize("superadmin"), (_req, res) => res.json({ ok: true }));

export default router;
