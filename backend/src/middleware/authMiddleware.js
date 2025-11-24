import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

export const verifyToken = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized: Token missing" });
        }

        token = token.split(" ")[1];

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        console.error("Auth error:", error);
        return res.status(401).json({ message: "Unauthorized or Token expired" });
    }
};

// SUPERADMIN ONLY
export const verifySuperAdmin = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        token = token.split(" ")[1];
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const admin = await Admin.findById(decoded._id);

        if (!admin || admin.role !== "superadmin") {
            return res.status(403).json({ message: "Access denied: SuperAdmin only" });
        }

        req.user = admin;
        next();
    } catch (error) {
        console.error("SuperAdmin check error:", error);
        res.status(401).json({ message: "Invalid or expired token" });
    }
};
