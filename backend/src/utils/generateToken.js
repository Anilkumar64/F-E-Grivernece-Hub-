// import jwt from "jsonwebtoken";

// /**
//  * Generate a short-lived JWT access token for an admin user
//  * @param {Object} admin - Admin document with _id, email, role
//  * @returns {string} Signed JWT token valid for ACCESS_TOKEN_EXPIRY duration
//  * @throws {Error} If ACCESS_TOKEN_SECRET is not configured
//  */
// export const generateAccessToken = (admin) => {
//     if (!process.env.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET.length < 32) {
//         throw new Error("ACCESS_TOKEN_SECRET must be at least 32 characters");
//     }
//     return jwt.sign(
//         {
//             _id: admin._id,
//             email: admin.email,
//             role: admin.role,
//         },
//         process.env.ACCESS_TOKEN_SECRET,
//         { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" }
//     );
// };

// /**
//  * Generate a long-lived JWT refresh token for an admin user
//  * @param {Object} admin - Admin document with _id, email, role
//  * @returns {string} Signed JWT token valid for REFRESH_TOKEN_EXPIRY duration
//  * @throws {Error} If REFRESH_TOKEN_SECRET is not configured
//  */
// export const generateRefreshToken = (admin) => {
//     if (!process.env.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET.length < 32) {
//         throw new Error("REFRESH_TOKEN_SECRET must be at least 32 characters");
//     }
//     return jwt.sign(
//         {
//             _id: admin._id,
//             email: admin.email,
//             role: admin.role,
//         },
//         process.env.REFRESH_TOKEN_SECRET,
//         { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
//     );
// };

// /**
//  * Verify and decode a JWT token
//  * @param {string} token - JWT token to verify
//  * @param {string} type - Token type: "access" or "refresh"
//  * @returns {Object|null} Decoded token payload or null if verification fails
//  */
// export const verifyToken = (token, type = "access") => {
//     try {
//         const secret =
//             type === "access"
//                 ? process.env.ACCESS_TOKEN_SECRET
//                 : process.env.REFRESH_TOKEN_SECRET;

//         if (!secret) {
//             throw new Error(`${type.toUpperCase()}_TOKEN_SECRET is not configured`);
//         }

//         return jwt.verify(token, secret);
//     } catch (err) {
//         console.error("Token verification failed:", err.message);
//         return null;
//     }
// };

/**
 * generateToken.js — DEPRECATED / DEAD CODE
 *
 * Bug #4: This file duplicates signAccessToken / signRefreshToken that are already
 * exported from src/middleware/authMiddleware.js and is not imported anywhere
 * meaningful in the codebase.
 *
 * ACTION REQUIRED: Delete this file and import token utilities directly from
 * authMiddleware.js wherever they are needed:
 *
 *   import { signAccessToken, signRefreshToken } from "../middleware/authMiddleware.js";
 *
 * The file is intentionally left empty (except this comment) to surface the
 * deprecation clearly.  Remove it entirely once you have confirmed no external
 * consumer depends on it.
 */