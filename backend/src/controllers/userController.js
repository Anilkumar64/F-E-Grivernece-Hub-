import mongoose from "mongoose";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { generateOTP } from "../utils/generateOTP.js";
import sendEmail from "../utils/sendEmail.js";

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");

const generateToken = (user) => {
    if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
        throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters");
    }

    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            role: user.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        // ✅ FIX C-02: fallback was "7d" — access tokens must be short-lived
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );
};

export const registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            studentId,
            department,
            phone,
            address,
            yearOfStudy,
        } = req.body;

        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ message: "Name, email and password are required" });
        }

        // ✅ FIX M-01: User model enforces minlength 8 — match it here
        if (password.length < 8) {
            return res
                .status(400)
                .json({ message: "Password must be at least 8 characters" });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const deptId = mongoose.Types.ObjectId.isValid(department)
            ? department
            : null;

        const newUser = new User({
            name,
            email,
            password,
            studentId: studentId || null,
            department: deptId,
            phone: phone || null,
            address: address || null,
            yearOfStudy: yearOfStudy || null,
        });

        await newUser.save();

        return res.status(201).json({
            message: "User registered successfully",
            userId: newUser._id,
        });
    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password required" });
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // ✅ FIX M-02: User model has comparePassword, not matchPassword — use the correct method
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const accessToken = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            accessToken,
            token: accessToken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (user) {
            const otp = generateOTP();
            user.resetToken = hashValue(otp);
            user.resetTokenExpire = new Date(Date.now() + 10 * 60 * 1000);
            await user.save({ validateBeforeSave: false });

            await sendEmail(
                user.email,
                "E-Grievance password reset code",
                `Your password reset code is ${otp}. It expires in 10 minutes.`
            );
        }

        return res.json({
            message: "If an account exists for this email, a reset code has been sent.",
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const verifyResetOTP = async (req, res) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();
        const otp = req.body.otp?.trim();
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const user = await User.findOne({
            email,
            resetToken: hashValue(otp),
            resetTokenExpire: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        return res.json({ message: "OTP verified" });
    } catch (error) {
        console.error("Verify reset OTP error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const email = req.body.email?.toLowerCase()?.trim();
        const otp = req.body.otp?.trim();
        const { password } = req.body;

        if (!email || !otp || !password) {
            return res.status(400).json({ message: "Email, OTP and password are required" });
        }

        // ✅ FIX M-01: consistent with User model minlength 8
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const user = await User.findOne({
            email,
            resetToken: hashValue(otp),
            resetTokenExpire: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.password = password;
        user.resetToken = null;
        user.resetTokenExpire = null;
        await user.save();

        return res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

export const verifyOTP = (req, res) => {
    return res
        .status(501)
        .json({ message: "Signup OTP is not used anymore" });
};