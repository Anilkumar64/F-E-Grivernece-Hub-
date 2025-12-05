import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

// Verify any JWT
export const verifyToken = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized: Token missing" });
        }

        token = token.split(" ")[1];

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        req.user = decoded;        // user = { _id, role }
        req.userId = decoded._id;  // attach userId
        req.role = decoded.role;   // attach role

        next();
    } catch (error) {
        console.error("Auth error:", error);
        return res.status(401).json({ message: "Unauthorized or Token expired" });
    }
};

// Admin OR SuperAdmin
export const verifyAdmin = async (req, res, next) => {
    try {
        if (!req.role) {
            return res.status(403).json({ message: "Admin access denied: No role found" });
        }

        if (req.role !== "admin" && req.role !== "departmentadmin" && req.role !== "superadmin") {
            return res.status(403).json({ message: "Access denied: Not an admin" });
        }

        const admin = await Admin.findById(req.userId);

        if (!admin) {
            return res.status(403).json({ message: "Admin account not found" });
        }

        req.admin = admin;
        next();
    } catch (err) {
        console.error("verifyAdmin error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// SuperAdmin ONLY
export const verifySuperAdmin = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        token = token.split(" ")[1];
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (decoded.role !== "superadmin") {
            return res.status(403).json({ message: "Access denied: SuperAdmin only" });
        }

        req.user = decoded;
        next();
    } catch (error) {
        console.error("SuperAdmin check error:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
