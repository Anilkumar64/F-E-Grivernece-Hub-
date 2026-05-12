/**
 * Test Routes
 * Simple test endpoints for debugging
 */
import express from "express";
import notificationService from "../services/notificationService.js";
import nodemailer from "nodemailer";

const router = express.Router();

/**
 * POST /api/test/email
 * Test email configuration
 */
router.post("/email", async (req, res, next) => {
    try {
        const {
            to = process.env.EMAIL_USER || "test@example.com",
            subject = "SMTP test OK",
            text = "SMTP test OK",
            fromName = "E-Grievance Hub",
            fromEmail = process.env.EMAIL_USER,
        } = req.body || {};

        // Create direct email transporter for testing
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const sender = fromEmail ? `${fromName} <${fromEmail}>` : process.env.EMAIL_FROM || process.env.EMAIL_USER;
        const mailOptions = {
            from: sender,
            to,
            subject,
            text,
        };

        const result = await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: "Test email sent successfully",
            to,
            from: sender,
            subject,
            messageId: result.messageId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({
            success: false,
            message: 'Email test failed',
            error: error.message
        });
    }
});

/**
 * POST /api/test/sms
 * Test SMS configuration
 */
router.post("/sms", async (req, res, next) => {
    try {
        const { to = process.env.TEST_PHONE_NUMBER || '+1234567890' } = req.body;

        const result = await notificationService.sendNotification({
            userId: null,
            type: 'sms',
            to: to,
            message: `Test SMS from E-Grievance Portal. This is a test message to verify SMS configuration. Timestamp: ${new Date().toISOString()}`
        });

        res.json({
            success: true,
            message: 'Test SMS sent successfully',
            to: to,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('SMS test error:', error);
        res.status(500).json({
            success: false,
            message: 'SMS test failed',
            error: error.message
        });
    }
});

/**
 * GET /api/test/config
 * Check current configuration
 */
router.get("/config", (req, res) => {
    res.json({
        email: {
            enabled: process.env.EMAIL_ENABLED === 'true',
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            user: process.env.EMAIL_USER ? '***@***' : 'not set',
            from: process.env.EMAIL_FROM
        },
        sms: {
            enabled: process.env.TWILIO_ENABLED === 'true',
            accountSid: process.env.TWILIO_ACCOUNT_SID ? '***' : 'not set',
            phoneNumber: process.env.TWILIO_PHONE_NUMBER ? '***' : 'not set'
        },
        otp: {
            expiryMinutes: process.env.OTP_EXPIRY_MINUTES,
            length: process.env.OTP_LENGTH
        }
    });
});

export default router;
