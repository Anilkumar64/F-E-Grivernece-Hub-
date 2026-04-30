import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const getBearerToken = (req) => {
    const token = req.headers.authorization;
    if (!token || !token.startsWith("Bearer ")) return null;
    return token.split(" ")[1];
};

// Verify any JWT
export const verifyToken = async (req, res, next) => {
    try {
        const token = getBearerToken(req);

        if (!token) {
            return res.status(401).json({ message: "Unauthorized: Token missing" });
        }

        if (!process.env.ACCESS_TOKEN_SECRET) {
            return res.status(500).json({ message: "Auth configuration error" });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
            algorithms: ["HS256"],
        });

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

        const adminRoles = ["admin", "departmentadmin", "superadmin"];
        if (!adminRoles.includes(req.role)) {
            return res.status(403).json({ message: "Access denied: Not an admin" });
        }

        const admin = await Admin.findOne({
            _id: req.userId,
            role: { $in: adminRoles },
            verified: true,
        });

        if (!admin) {
            return res.status(403).json({ message: "Admin account not found or not approved" });
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
        const token = getBearerToken(req);

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!process.env.ACCESS_TOKEN_SECRET) {
            return res.status(500).json({ message: "Auth configuration error" });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
            algorithms: ["HS256"],
        });

        if (decoded.role !== "superadmin") {
            return res.status(403).json({ message: "Access denied: SuperAdmin only" });
        }

        const admin = await Admin.findOne({
            _id: decoded._id,
            role: "superadmin",
            verified: true,
        });

        if (!admin) {
            return res.status(403).json({ message: "Access denied: SuperAdmin only" });
        }

        req.user = decoded;
        req.userId = decoded._id;
        req.role = decoded.role;
        req.admin = admin;
        next();
    } catch (error) {
        console.error("SuperAdmin check error:", error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
