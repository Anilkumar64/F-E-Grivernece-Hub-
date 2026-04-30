import jwt from "jsonwebtoken";
import User from "../models/User.js";

const cookieNames = {
    student: "studentAccessToken",
    admin: "adminAccessToken",
    superadmin: "superadminAccessToken",
};

export const refreshCookieNames = {
    student: "studentRefreshToken",
    admin: "adminRefreshToken",
    superadmin: "superadminRefreshToken",
};

const getBearerToken = (req) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    return header.slice(7);
};

const getAccessToken = (req) =>
    getBearerToken(req) ||
    req.cookies?.studentAccessToken ||
    req.cookies?.adminAccessToken ||
    req.cookies?.superadminAccessToken;

export const signAccessToken = (user) => {
    return jwt.sign(
        { _id: user._id.toString(), email: user.email, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m", algorithm: "HS256" }
    );
};

export const signRefreshToken = (user) => {
    return jwt.sign(
        { _id: user._id.toString(), role: user.role, tokenType: "refresh" },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d", algorithm: "HS256" }
    );
};

export const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
});

export const setAuthCookies = (res, user, accessToken, refreshToken) => {
    res.cookie(cookieNames[user.role], accessToken, { ...cookieOptions(), maxAge: 15 * 60 * 1000 });
    res.cookie(refreshCookieNames[user.role], refreshToken, cookieOptions());
};

export const clearAuthCookies = (res) => {
    [...Object.values(cookieNames), ...Object.values(refreshCookieNames)].forEach((name) => {
        res.clearCookie(name, cookieOptions());
    });
};

export const authenticate = async (req, res, next) => {
    try {
        const token = getAccessToken(req);
        if (!token) return res.status(401).json({ message: "Unauthorized: token missing" });

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] });
        const user = await User.findById(decoded._id).select("-password -refreshTokenHash");

        if (!user || !user.isActive) {
            return res.status(401).json({ message: "Unauthorized: account unavailable" });
        }

        req.user = user;
        req.userId = user._id.toString();
        req.role = user.role;
        next();
    } catch {
        return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
    }
};

export const authorize = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.role)) return res.status(403).json({ message: "Forbidden: insufficient role" });
    next();
};

export const verifyToken = authenticate;
export const verifyAdmin = authorize("admin", "superadmin");
export const verifySuperAdmin = [authenticate, authorize("superadmin")];
