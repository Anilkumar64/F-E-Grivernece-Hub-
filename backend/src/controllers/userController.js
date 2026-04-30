import mongoose from "mongoose";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const generateToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            email: user.email,
            role: user.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d" }
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

        // Basic validation
        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ message: "Name, email and password are required" });
        }

        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
        }

        // Check if email already exists
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Department: your schema expects ObjectId, but frontend is sending "CSE"/"IT"
        // So for now, store null unless it's already a valid ObjectId
        const deptId = mongoose.Types.ObjectId.isValid(department)
            ? department
            : null;

        // Password will be hashed by userSchema.pre("save")
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

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Verify password
        const isPasswordValid = await user.matchPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate tokens
        const accessToken = generateToken(user);

        // ✅ Standardized response format
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

export const forgotPassword = (req, res) => {
    return res
        .status(501)
        .json({ message: "Forgot password is not implemented right now" });
};

export const verifyResetOTP = (req, res) => {
    return res
        .status(501)
        .json({ message: "Reset OTP is not implemented right now" });
};

export const resetPassword = (req, res) => {
    return res
        .status(501)
        .json({ message: "Reset password is not implemented right now" });
};

export const verifyOTP = (req, res) => {
    return res
        .status(501)
        .json({ message: "Signup OTP is not used anymore" });
};
