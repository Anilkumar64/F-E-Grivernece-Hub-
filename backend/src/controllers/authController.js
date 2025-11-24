import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../utils/generateToken.js";

/* ------------------------------------------------------------------
 🧱 REGISTER ADMIN
------------------------------------------------------------------ */
export const registerAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // ✅ Validate input
        if (!username || !password) {
            return res
                .status(400)
                .json({ message: "Username and password are required" });
        }

        // ✅ Check if admin already exists
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
            return res.status(400).json({ message: "Admin already registered" });
        }

        // ✅ Create new admin (password will hash automatically via pre-save hook)
        const newAdmin = new Admin({ username, password });
        await newAdmin.save();

        res
            .status(201)
            .json({ message: "Admin registered successfully!", id: newAdmin._id });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🧠 LOGIN ADMIN
------------------------------------------------------------------ */
export const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // ✅ Check if Admin exists
        const adminUser = await Admin.findOne({ username });
        if (!adminUser) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // ✅ Validate password
        const isPasswordValid = await adminUser.isPasswordCorrect(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // ✅ Generate tokens using your utils
        const accessToken = generateAccessToken(adminUser);
        const refreshToken = generateRefreshToken(adminUser);

        // ✅ Save refresh token in DB
        adminUser.Refreshtoken = refreshToken;
        await adminUser.save({ validateBeforeSave: false });

        // ✅ Send tokens to client
        res.status(200).json({
            message: "Login successful",
            token: accessToken,   // added
            accessToken,          // existing
            refreshToken,
            admin: adminUser
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/* ------------------------------------------------------------------
 🔁 REFRESH TOKEN
------------------------------------------------------------------ */
export const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }

        // ✅ Find admin with this refresh token
        const adminUser = await admin.findOne({ Refreshtoken: refreshToken });
        if (!adminUser) {
            return res.status(403).json({ message: "Invalid refresh token" });
        }

        // ✅ Verify token validity
        jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
            (err, decoded) => {
                if (err) {
                    return res.status(403).json({ message: "Invalid or expired token" });
                }

                // ✅ Generate new access token
                const newAccessToken = generateAccessToken(adminUser);
                res.json({
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
 🚪 LOGOUT ADMIN
------------------------------------------------------------------ */
export const logoutAdmin = async (req, res) => {
    try {
        const { id } = req.body;

        const adminUser = await admin.findById(id);
        if (!adminUser) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // ✅ Clear refresh token
        adminUser.Refreshtoken = null;
        await adminUser.save();

        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
