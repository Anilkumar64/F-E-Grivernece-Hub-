/**
 * src/middleware/guards.js
 *
 * Named, reusable route-protection middleware arrays.
 * Built on top of your existing authenticate + authorize.
 *
 * Usage in any route file:
 *   import { guardStudent, guardAdmin, guardSuperAdmin, guardAny } from "../middleware/guards.js";
 *
 *   router.get("/profile",  ...guardStudent,    handler);
 *   router.get("/manage",   ...guardAdmin,       handler);
 *   router.get("/config",   ...guardSuperAdmin,  handler);
 *   router.get("/me",       ...guardAny,         handler);
 *
 *   // Apply to entire router at once:
 *   router.use(...guardSuperAdmin);
 */

import { authenticate, authorize } from "./authMiddleware.js";

/* ── Any logged-in user (student | admin | superadmin) ── */
export const guardAny = [authenticate];

/* ── Student only ── */
export const guardStudent = [authenticate, authorize("student")];

/* ── Admin or SuperAdmin ── */
export const guardAdmin = [authenticate, authorize("admin", "superadmin")];

/* ── SuperAdmin only ── */
export const guardSuperAdmin = [authenticate, authorize("superadmin")];

/* ── Admin only (NOT superadmin) — use rarely ── */
export const guardAdminOnly = [authenticate, authorize("admin")];

/**
 * guardOwner — runtime ownership check.
 * Use when a user should only access their OWN resource.
 *
 * Usage:
 *   router.get("/:userId/data", ...guardStudent, guardOwner("userId"), handler);
 *
 * @param {string} paramKey - req.params key that holds the owner's userId
 *                            SuperAdmins always bypass this check.
 */
export const guardOwner = (paramKey = "userId") => (req, res, next) => {
    if (req.role === "superadmin") return next();           // superadmin sees all
    if (req.params[paramKey] !== req.userId) {
        return res.status(403).json({ message: "Forbidden: you do not own this resource" });
    }
    next();
};

/**
 * guardSelf — use on /me-style routes where the resource ID
 * comes from the body or a query param instead of req.params.
 *
 * Usage:
 *   router.patch("/update", ...guardAny, guardSelf("targetId"), handler);
 */
export const guardSelf = (bodyOrQueryKey = "targetId") => (req, res, next) => {
    if (req.role === "superadmin") return next();
    const target = req.body?.[bodyOrQueryKey] || req.query?.[bodyOrQueryKey];
    if (!target || target !== req.userId) {
        return res.status(403).json({ message: "Forbidden: cannot modify another user's data" });
    }
    next();
};