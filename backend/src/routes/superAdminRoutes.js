import express from "express";
import { verifySuperAdmin } from "../middleware/authMiddleware.js";
import { getSuperAdminReports } from "../controllers/superAdminController.js";

const router = express.Router();

import {
    getPendingAdmins,
    approveAdmin,
    rejectAdmin,
} from "../controllers/adminController.js";

import {
    getSuperAdminStats,
    grievancesByStatus,
    grievancesByDept,
    grievancesTrend,
} from "../controllers/superAdminController.js";

import {
    getDepartments,
    createDepartment,
    deleteDepartment,
} from "../controllers/departmentController.js";


// analytics / dashboard
router.get("/stats", verifySuperAdmin, getSuperAdminStats);
router.get("/grievances-by-status", verifySuperAdmin, grievancesByStatus);
router.get("/grievances-by-dept", verifySuperAdmin, grievancesByDept);
router.get("/grievances-trend", verifySuperAdmin, grievancesTrend);
router.get("/reports", verifySuperAdmin, getSuperAdminReports);

// pending admin approvals
router.get("/pending", verifySuperAdmin, getPendingAdmins);
router.get("/pending-admins", verifySuperAdmin, getPendingAdmins);
router.patch("/approve/:id", verifySuperAdmin, approveAdmin);
router.delete("/reject/:id", verifySuperAdmin, rejectAdmin);

// departments
router.get("/departments", verifySuperAdmin, getDepartments);
router.post("/departments", verifySuperAdmin, createDepartment);
router.delete("/departments/:id", verifySuperAdmin, deleteDepartment);

export default router;
