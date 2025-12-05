import express from "express";
import { verifySuperAdmin } from "../middleware/authMiddleware.js";
import { getAllAdmins } from "../controllers/adminController.js";


import Admin from "../models/Admin.js";

import {
    getSuperAdminStats,
    grievancesByStatus,
    grievancesByDept,
    grievancesTrend,
    getSuperAdminReports,
} from "../controllers/superAdminController.js";

import {
    getPendingAdmins,
    approveAdmin,
    rejectAdmin,
} from "../controllers/adminController.js";

import {
    getDepartments,
    createDepartment,
    deleteDepartment,
} from "../controllers/departmentController.js";

import {
    getSiteConfig,
    updateSiteConfig,
} from "../controllers/siteConfigController.js";

const router = express.Router();

// analytics / dashboard
router.get("/stats", verifySuperAdmin, getSuperAdminStats);
router.get("/admins", verifySuperAdmin, getAllAdmins);
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

router.get("/admins", verifySuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({ verified: true }).select(
            "-password"
        );
        res.json({ admins });
    } catch (err) {
        console.error("All admins fetch error:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
// landing page config
router.get("/site-config", verifySuperAdmin, getSiteConfig);
router.put("/site-config", verifySuperAdmin, updateSiteConfig);

export default router;
