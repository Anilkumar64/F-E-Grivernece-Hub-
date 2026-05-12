import jwt from "jsonwebtoken";
import crypto from "crypto";
import tokenBlacklistService from "../services/tokenBlacklistService.js";
import { findAccountByIdAndRole } from "../utils/accounts.js";

/* ── Cookie names per role ── */
export const cookieNames = {
    student: "studentAccessToken",
    admin: "adminAccessToken",
    superadmin: "superadminAccessToken",
};
export const refreshCookieNames = {
    student: "studentRefreshToken",
    admin: "adminRefreshToken",
    superadmin: "superadminRefreshToken",
};

/* ── Token signing ── */
export const signAccessToken = (user) =>
    jwt.sign(
        { _id: user._id.toString(), email: user.email, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m", algorithm: "HS256" }
    );

export const signRefreshToken = (user) =>
    jwt.sign(
        // Include a random jti so refresh rotation always produces a new token,
        // even when called within the same second.
        { _id: user._id.toString(), role: user.role, tokenType: "refresh", jti: crypto.randomUUID() },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d", algorithm: "HS256" }
    );

/* ── Cookie options ── */
export const cookieOptions = (maxAge = 7 * 24 * 60 * 60 * 1000) => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge,
});

const clearCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAMESITE || "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
});

export const setAuthCookies = (res, user, accessToken, refreshToken) => {
    res.cookie(cookieNames[user.role], accessToken, cookieOptions(15 * 60 * 1000));
    res.cookie(refreshCookieNames[user.role], refreshToken, cookieOptions());
};

export const clearAuthCookies = (res) => {
    const allNames = [...Object.values(cookieNames), ...Object.values(refreshCookieNames)];
    allNames.forEach((name) => res.clearCookie(name, clearCookieOptions()));
};

/* ── Token extraction ── */
const extractToken = (req) => {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7);
    return (
        req.cookies?.studentAccessToken ||
        req.cookies?.adminAccessToken ||
        req.cookies?.superadminAccessToken ||
        null
    );
};

/* ── authenticate middleware ── */
export const authenticate = async (req, res, next) => {
    try {
        if (req.method === "OPTIONS") return next();
        const token = extractToken(req);
        if (!token) return res.status(401).json({ message: "Unauthorized: token missing" });

        // Check if token is blacklisted
        const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(token);
        if (isBlacklisted) {
            return res.status(401).json({ message: "Unauthorized: token revoked" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] });
        } catch (err) {
            if (err.name === "TokenExpiredError") {
                // Blacklist expired tokens
                await tokenBlacklistService.blacklistToken(token, 60 * 60); // 1 hour
                return res.status(403).json({ code: "TOKEN_EXPIRED", message: "Token expired" });
            }
            return res.status(401).json({ message: "Unauthorized: Invalid token" });
        }

        const user = await findAccountByIdAndRole(decoded._id, decoded.role);
        if (user) {
            user.password = undefined;
            user.refreshTokenHash = undefined;
        }

        if (!user || !user.isActive) {
            return res.status(401).json({ message: "Unauthorized: account unavailable" });
        }

        req.user = user;
        req.userId = user._id.toString();
        req.role = user.role;
        next();
    } catch (err) {
        next(err);
    }
};

/* ── authorize middleware ── */
export const authorize = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.role)) return res.status(403).json({ message: "Forbidden: insufficient role" });
    next();
};

/* ── Convenience aliases ── */
export const verifyToken = authenticate;
export const verifyAdmin = [authenticate, authorize("admin", "superadmin")];
export const verifySuperAdmin = [authenticate, authorize("superadmin")];
