import express from "express";
import {
    registerAdmin,
    loginAdmin,
    refreshAccessToken,
    logoutAdmin,
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🧾 Register admin (simple JSON: username + password)
router.post("/register", registerAdmin);

// 🔐 Login, token refresh, and logout
router.post("/login", loginAdmin);
router.post("/refresh", refreshAccessToken);
router.post("/logout", verifyToken, logoutAdmin);

export default router;
