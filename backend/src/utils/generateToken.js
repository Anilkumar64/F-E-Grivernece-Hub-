import jwt from "jsonwebtoken";

/* ------------------------------------------------------------------
 🟩 Generate Access Token (Short-lived)
------------------------------------------------------------------ */
export const generateAccessToken = (admin) => {
    return jwt.sign(
        {
            _id: admin._id,
            email: admin.email,
            role: admin.role,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
    );
};

/* ------------------------------------------------------------------
 🟦 Generate Refresh Token (Long-lived)
------------------------------------------------------------------ */
export const generateRefreshToken = (admin) => {
    return jwt.sign(
        {
            _id: admin._id,
            email: admin.email,
            role: admin.role,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
    );
};

/* ------------------------------------------------------------------
 🧩 Verify Token Helper (optional)
------------------------------------------------------------------ */
export const verifyToken = (token, type = "access") => {
    try {
        const secret =
            type === "access"
                ? process.env.ACCESS_TOKEN_SECRET
                : process.env.REFRESH_TOKEN_SECRET;

        return jwt.verify(token, secret);
    } catch (err) {
        console.error("Token verification failed:", err.message);
        return null;
    }
};
