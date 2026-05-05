/**
 * HOW TO APPLY guards.js IN EACH ROUTE FILE
 * ==========================================
 * Copy the relevant snippet into the correct route file.
 */

// ─────────────────────────────────────────────────────────────
// 1. adminRoutes.js  — already uses router.use(), just swap import
// ─────────────────────────────────────────────────────────────
import { guardSuperAdmin } from "../middleware/guards.js";

router.use(...guardSuperAdmin);   // replaces: router.use(authenticate, authorize("superadmin"))

// ─────────────────────────────────────────────────────────────
// 2. superAdminRoutes.js — already uses router.use(), just swap
// ─────────────────────────────────────────────────────────────
import { guardSuperAdmin } from "../middleware/guards.js";

router.use(...guardSuperAdmin);   // replaces: router.use(...verifySuperAdmin)

// ─────────────────────────────────────────────────────────────
// 3. notificationRoutes.js — already uses router.use()
// ─────────────────────────────────────────────────────────────
import { guardAny } from "../middleware/guards.js";

router.use(...guardAny);          // replaces: router.use(authenticate)

// ─────────────────────────────────────────────────────────────
// 4. auditLogRoutes.js
// ─────────────────────────────────────────────────────────────
import { guardSuperAdmin } from "../middleware/guards.js";

router.get("/", ...guardSuperAdmin, async (req, res) => { /* existing handler */ });

// ─────────────────────────────────────────────────────────────
// 5. reportRoutes.js
// ─────────────────────────────────────────────────────────────
import { guardSuperAdmin } from "../middleware/guards.js";

router.get("/grievances.csv", ...guardSuperAdmin, async (req, res) => { /* existing handler */ });

// ─────────────────────────────────────────────────────────────
// 6. categoryRoutes.js  — GET is public, write ops are superadmin
// ─────────────────────────────────────────────────────────────
import { guardSuperAdmin } from "../middleware/guards.js";

router.get("/",      /* public — no guard */  handler);
router.post("/", ...guardSuperAdmin, handler);
router.patch("/:id", ...guardSuperAdmin, handler);
router.delete("/:id", ...guardSuperAdmin, handler);

// ─────────────────────────────────────────────────────────────
// 7. departmentRoutes.js  — GET / is public, rest are superadmin
// ─────────────────────────────────────────────────────────────
import { guardSuperAdmin } from "../middleware/guards.js";

router.get("/",       /* public */            handler);
router.get("/:id", ...guardSuperAdmin, handler);
router.post("/", ...guardSuperAdmin, handler);
router.patch("/:id", ...guardSuperAdmin, handler);
router.delete("/:id", ...guardSuperAdmin, handler);

// ─────────────────────────────────────────────────────────────
// 8. grievanceRoutes.js  — mixed per-route guards
// ─────────────────────────────────────────────────────────────
import { guardStudent, guardAdmin, guardAny } from "../middleware/guards.js";

router.post("/", ...guardStudent, uploadLimiter, upload.array("attachments", 3), handler);
router.get("/mine", ...guardStudent, handler);
router.get("/analytics", ...guardAdmin, handler);
router.get("/", ...guardAdmin, handler);
router.get("/track/:id", ...guardAny, handler);
router.get("/:id/pdf", ...guardAny, handler);
router.get("/:id", ...guardAny, handler);
router.patch("/:id/status", ...guardAdmin, handler);
router.patch("/:id/assign", ...guardAdmin, handler);
router.patch("/:id/priority", ...guardAdmin, handler);
router.post("/:id/comments", ...guardAny, handler);
router.patch("/:id/request-close", ...guardStudent, handler);
router.post("/:id/feedback", ...guardStudent, handler);
router.patch("/:id/escalate", ...guardAdmin, handler);

// ─────────────────────────────────────────────────────────────
// 9. userRoutes.js
// ─────────────────────────────────────────────────────────────
import { guardStudent } from "../middleware/guards.js";

router.get("/me", ...guardStudent, handler);
router.patch("/me", ...guardStudent, handler);
router.post("/forgot-password",  /* public */     handler);
router.post("/verify-reset-otp", /* public */     handler);
router.post("/reset-password",   /* public */     handler);

// ─────────────────────────────────────────────────────────────
// 10. authRoutes.js
// ─────────────────────────────────────────────────────────────
import { guardAny, guardStudent, guardAdmin, guardSuperAdmin } from "../middleware/guards.js";

router.post("/student/register",    /* public */         handler);
router.post("/admin/register",      /* public */         handler);
router.post("/student/login", authLimiter, handler);
router.post("/admin/login", authLimiter, handler);
router.post("/superadmin/login", authLimiter, handler);
router.post("/refresh",             /* public */         handler);
router.post("/logout", ...guardAny, handler);
router.get("/me", ...guardAny, handler);
router.get("/role-check/student", ...guardStudent, handler);
router.get("/role-check/admin", ...guardAdmin, handler);
router.get("/role-check/superadmin", ...guardSuperAdmin, handler);