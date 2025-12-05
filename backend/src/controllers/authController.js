import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../utils/generateToken.js";

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

        // store refresh token (keep field name consistent with your schema)
        adminUser.Refreshtoken = refreshToken;
        await adminUser.save({ validateBeforeSave: false });

        return res.status(200).json({
            message: "Login successful",
            token: accessToken, // kept for backward compatibility
            accessToken,
            refreshToken,
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
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }

        // use Admin model, not "admin"
        const adminUser = await Admin.findOne({ Refreshtoken: refreshToken });
        if (!adminUser) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            (err) => {
                if (err) {
                    return res
                        .status(403)
                        .json({ message: "Invalid or expired token" });
                }

                const newAccessToken = generateAccessToken(adminUser);
                return res.json({
                    message: "Access token refreshed",
                    accessToken: newAccessToken,
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
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Admin id is required" });
        }

        const adminUser = await Admin.findById(id);
        if (!adminUser) {
            return res.status(404).json({ message: "Admin not found" });
        }

        adminUser.Refreshtoken = null;
        await adminUser.save({ validateBeforeSave: false });

        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

