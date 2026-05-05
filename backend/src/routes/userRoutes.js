import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import { guardStudent } from "../middleware/guards.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import { writeAuditLog } from "../utils/audit.js";
import sendEmail from "../utils/sendEmail.js";
import { generateOTP } from "../utils/generateOTP.js";
import userUploads from "../middleware/userUploads.js";

const router = express.Router();
const hashValue = (v) => crypto.createHash("sha256").update(v).digest("hex");

/* ── Profile (student only) ── */
router.get("/me", ...guardStudent, (req, res) => {
    res.json({ user: req.user });
});

router.patch("/me", ...guardStudent, async (req, res, next) => {
    try {
        const allowed = ["name", "phone", "address", "yearOfStudy", "avatar"];
        const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
        const user = await User.findByIdAndUpdate(req.userId, update, { new: true, runValidators: true });
        res.json({ message: "Profile updated", user });
    } catch (err) { next(err); }
});

/* ── Password reset via OTP (public) ── */
router.post("/forgot-password", authLimiter, async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();
        if (!email) return res.status(400).json({ message: "Email is required" });

        const user = await User.findOne({ email });
        if (user) {
            const otp = generateOTP();
            user.resetToken = hashValue(otp);
            user.resetTokenExpire = new Date(Date.now() + 10 * 60 * 1000);
            await user.save({ validateBeforeSave: false });

            await sendEmail(
                user.email,
                "E-Grievance – Password Reset Code",
                `Your password reset code is: ${otp}\n\nExpires in 10 minutes. Do not share this code.`
            );
        }

        return res.json({ message: "If an account exists for this email, a reset code has been sent." });
    } catch (err) { next(err); }
});

router.post("/verify-reset-otp", authLimiter, async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();
        const otp = req.body.otp?.trim();
        if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

        const user = await User.findOne({
            email,
            resetToken: hashValue(otp),
            resetTokenExpire: { $gt: new Date() },
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });
        return res.json({ message: "OTP verified" });
    } catch (err) { next(err); }
});

router.post("/reset-password", authLimiter, async (req, res, next) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();
        const otp = req.body.otp?.trim();
        const password = req.body.password;

        if (!email || !otp || !password)
            return res.status(400).json({ message: "Email, OTP, and new password are required" });

        if (password.length < 8)
            return res.status(400).json({ message: "Password must be at least 8 characters" });

        const user = await User.findOne({
            email,
            resetToken: hashValue(otp),
            resetTokenExpire: { $gt: new Date() },
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

        user.password = password;
        user.resetToken = null;
        user.resetTokenExpire = null;
        user.refreshTokenHash = null;
        await user.save();

        await writeAuditLog(req, "PASSWORD_RESET", "User", user._id);
        return res.json({ message: "Password reset successfully" });
    } catch (err) { next(err); }
});

export default router;