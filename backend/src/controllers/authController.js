import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../utils/generateToken.js";

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

/* ------------------------------------------------------------------
 🧱 REGISTER ADMIN  (probably not used; real registration is in adminController)
------------------------------------------------------------------ */
export const registerAdmin = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already registered" });
        }

        const newAdmin = new Admin({
            email,
            password,
            name,
        });

        await newAdmin.save();

        res.status(201).json({
            message: "Admin registered successfully",
            id: newAdmin._id,
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🧠 LOGIN ADMIN  (email + password)  /api/admin/login
------------------------------------------------------------------ */
export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }

        // find admin by email
        const adminUser = await Admin.findOne({ email });
        if (!adminUser) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // verify password (using your instance method)
        const isPasswordValid = await adminUser.isPasswordCorrect(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // optional: block unapproved admins
        if (adminUser.verified === false) {
            return res
                .status(403)
                .json({ message: "Admin account not approved yet" });
        }

        // generate tokens using your utils
        const accessToken = generateAccessToken(adminUser);
        const refreshToken = generateRefreshToken(adminUser);

        // Store only a hash so a database leak cannot replay refresh tokens.
        adminUser.refreshToken = null;
        adminUser.refreshTokenHash = hashToken(refreshToken);
        await adminUser.save({ validateBeforeSave: false });

        return res.status(200).json({
            message: "Login successful",
            token: accessToken, // kept for backward compatibility
            accessToken,
            refreshToken,
            user: {
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                department: adminUser.department,
                role: adminUser.role,
                verified: adminUser.verified,
            },
            admin: {
                _id: adminUser._id,
                name: adminUser.name,
                email: adminUser.email,
                department: adminUser.department,
                role: adminUser.role,
                verified: adminUser.verified,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🔁 REFRESH TOKEN  /api/admin/refresh
------------------------------------------------------------------ */
export const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }

        const tokenHash = hashToken(refreshToken);
        const adminUser = await Admin.findOne({ refreshTokenHash: tokenHash }).select(
            "+refreshTokenHash"
        );
        if (!adminUser) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            async (err) => {
                if (err) {
                    return res
                        .status(403)
                        .json({ message: "Invalid or expired token" });
                }

                const newAccessToken = generateAccessToken(adminUser);
                const newRefreshToken = generateRefreshToken(adminUser);
                adminUser.refreshTokenHash = hashToken(newRefreshToken);
                adminUser.refreshToken = null;
                await adminUser.save({ validateBeforeSave: false });

                return res.json({
                    message: "Access token refreshed",
                    accessToken: newAccessToken,
                    refreshToken: newRefreshToken,
                });
            }
        );
    } catch (error) {
        console.error("Refresh error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🚪 LOGOUT ADMIN  /api/admin/logout
------------------------------------------------------------------ */
export const logoutAdmin = async (req, res) => {
    try {
        // ✅ Use authenticated user's ID from JWT token, not from request body (prevents IDOR)
        const adminId = req.userId;

        if (!adminId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const adminUser = await Admin.findById(adminId);
        if (!adminUser) {
            return res.status(404).json({ message: "Admin not found" });
        }

        adminUser.refreshToken = null;
        adminUser.refreshTokenHash = null;
        await adminUser.save({ validateBeforeSave: false });

        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
