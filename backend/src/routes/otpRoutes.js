/**
 * OTP Routes
 * Handles email and phone verification using OTP codes
 */
import express from "express";
import otpService from "../services/otpService.js";
import { guardAny } from "../middleware/guards.js";

const router = express.Router();

/**
 * POST /api/otp/send
 * Send verification code (email or phone)
 */
router.post("/send", ...guardAny, async (req, res, next) => {
    try {
        const { type, userId } = req.body;

        // Get user from authenticated user
        const user = req.user;

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Update preferred verification method if specified
        if (type && ['email', 'phone'].includes(type)) {
            user.preferredVerification = type;
            await user.save();
        }

        const result = await otpService.sendVerificationCode(user, type);

        res.json({
            ...result,
            userId: user._id,
            verificationType: type || user.preferredVerification
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/otp/resend
 * Resend verification code
 */
router.post("/resend", ...guardAny, async (req, res, next) => {
    try {
        const { type } = req.body;
        const userId = req.userId;

        const result = await otpService.resendVerificationCode(userId, type);

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/otp/verify/email
 * Verify email code
 */
router.post("/verify/email", ...guardAny, async (req, res, next) => {
    try {
        const { code } = req.body;
        const userId = req.userId;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Verification code is required"
            });
        }

        const result = await otpService.verifyEmailCode(userId, code);

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/otp/verify/phone
 * Verify phone code
 */
router.post("/verify/phone", ...guardAny, async (req, res, next) => {
    try {
        const { code } = req.body;
        const userId = req.userId;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Verification code is required"
            });
        }

        const result = await otpService.verifyPhoneCode(userId, code);

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/otp/status
 * Check verification status
 */
router.get("/status", ...guardAny, async (req, res, next) => {
    try {
        const user = req.user;

        const status = await otpService.checkVerificationStatus(user);

        res.json({
            ...status,
            userId: user._id,
            email: user.email,
            phone: user.phone
        });
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/otp/test/email
 * Test email configuration (admin only)
 */
router.post("/test/email", async (req, res, next) => {
    try {
        const result = await otpService.testEmailConfiguration();

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/otp/test/sms
 * Test SMS configuration (admin only)
 */
router.post("/test/sms", async (req, res, next) => {
    try {
        const result = await otpService.testSMSConfiguration();

        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/otp/send-code
 * Send verification code to specific email/phone (for admin creation)
 */
router.post("/send-code", async (req, res, next) => {
    try {
        const { email, phone, type } = req.body;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: "Email or phone number is required"
            });
        }

        if (type === 'email' && !email) {
            return res.status(400).json({
                success: false,
                message: "Email is required for email verification"
            });
        }

        if (type === 'phone' && !phone) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required for phone verification"
            });
        }

        // Create a temporary user object for sending verification
        const tempUser = {
            _id: null,
            email: email,
            phone: phone,
            name: 'Test User',
            save: async () => { } // Empty save function for temp user
        };

        const result = await otpService.sendVerificationCode(tempUser, type);

        res.json(result);
    } catch (err) {
        next(err);
    }
});

export default router;
