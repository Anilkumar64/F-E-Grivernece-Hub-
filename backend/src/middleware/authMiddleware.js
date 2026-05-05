import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js"; // Bug #1 fix: import Admin for fallback lookup

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
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m", algorithm: "HS256" }
    );

export const signRefreshToken = (user) =>
    jwt.sign(
        { _id: user._id.toString(), role: user.role, tokenType: "refresh" },
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

/* ── Bug #1 fix: normalise a legacy Admin document into the shape req.user expects ── */
const normalizeAdminDoc = (admin) => ({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    // Admin model uses "departmentadmin"; map to the canonical "admin" role used everywhere else
    role: admin.role === "departmentadmin" ? "admin" : admin.role,
    department: admin.department ?? null,
    staffId: admin.staffId,
    isActive: true,          // Admin model has no isActive field — presence implies active
    isVerified: admin.verified ?? false,
});

/* ── authenticate middleware ── */
export const authenticate = async (req, res, next) => {
    try {
        const token = extractToken(req);
        if (!token) return res.status(401).json({ message: "Unauthorized: token missing" });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] });
        } catch (err) {
            const msg = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
            return res.status(401).json({ message: `Unauthorized: ${msg}` });
        }

        // Primary lookup — unified User collection
        let user = await User.findById(decoded._id).select("-password -refreshTokenHash");

        if (!user || !user.isActive) {
            // Bug #1 fix: fall back to the legacy Admin collection so admins seeded
            // via Admin.js (before the User-consolidation migration) can still authenticate.
            const admin = await Admin.findById(decoded._id);
            if (!admin) {
                return res.status(401).json({ message: "Unauthorized: account unavailable" });
            }
            const normalized = normalizeAdminDoc(admin);
            req.user = normalized;
            req.userId = admin._id.toString();
            req.role = normalized.role;
            return next();
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