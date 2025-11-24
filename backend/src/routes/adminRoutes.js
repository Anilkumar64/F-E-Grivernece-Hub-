import express from "express";
import upload from "../middleware/upload.js";
import {
    registerAdmin,
    getPendingAdmins,
    approveAdmin,
    rejectAdmin,
} from "../controllers/adminController.js";
import {
    loginAdmin,
    refreshAccessToken,
    logoutAdmin,
} from "../controllers/authController.js";
import { verifyToken, verifySuperAdmin } from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/register", upload.single("idCardFile"), registerAdmin);
router.post("/login", loginAdmin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", verifyToken, logoutAdmin);
router.get("/pending", verifySuperAdmin, getPendingAdmins);
router.patch("/approve/:id", verifySuperAdmin, approveAdmin);
router.delete("/reject/:id", verifySuperAdmin, rejectAdmin);

router.get("/me", verifyToken, async (req, res) => {
    try {
        res.status(200).json({
            message: "Admin profile fetched successfully",
            admin: {
                id: req.admin._id,
                name: req.admin.name,
                email: req.admin.email,
                department: req.admin.department,
                role: req.admin.role,
                verified: req.admin.verified,
            },
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
