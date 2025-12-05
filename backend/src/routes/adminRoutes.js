import express from "express";
import upload from "../middleware/upload.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
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
import Admin from "../models/Admin.js";

const router = express.Router();

// Admin registration (SuperAdmin approves later)
router.post("/register", upload.single("idCardFile"), registerAdmin);

// Admin auth
router.post("/login", loginAdmin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", verifyToken, logoutAdmin);

// SuperAdmin – manage admins
router.get("/pending", verifySuperAdmin, getPendingAdmins);
router.patch("/approve/:id", verifySuperAdmin, approveAdmin);
router.delete("/reject/:id", verifySuperAdmin, rejectAdmin);

// router.get("/all", verifySuperAdmin, async (req, res) => {
//     try {
//         const admins = await Admin.find({ verified: true }).select("-password");
//         res.json({ admins });
//     } catch (err) {
//         console.error("Error fetching all admins:", err);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// });

// Current admin profile
router.get("/me", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const admin = await Admin.findById(req.user._id)
            .select("-password")
            .populate("department", "name");

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.status(200).json({
            message: "Admin profile fetched successfully",
            admin,
        });
    } catch (error) {
        console.error("Profile fetch error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/admins", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const admins = await Admin.find().select("-password");
        res.json({ admins });
    } catch (err) {
        console.error("Admin list fetch error:", err);
        res.status(500).json({ message: "Failed to load admins" });
    }
});

export default router;
