import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import LandingPageConfig from "../models/LandingPageConfig.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "..", "..", "uploads", "landing");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `landing-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const imageUpload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) return cb(null, true);
        cb(new Error("Only image files are allowed"));
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

const getOrCreateConfig = async () => {
    let config = await LandingPageConfig.findOne({ key: "student-landing" }).populate("updatedBy", "name email");
    if (!config) config = await LandingPageConfig.create({ key: "student-landing" });
    return config;
};

router.get("/", async (_req, res) => {
    const config = await getOrCreateConfig();
    res.json({ config });
});

router.put("/", authenticate, authorize("superadmin"), async (req, res) => {
    const config = await LandingPageConfig.findOneAndUpdate(
        { key: "student-landing" },
        { ...req.body, key: "student-landing", updatedBy: req.userId },
        { new: true, upsert: true, runValidators: true }
    ).populate("updatedBy", "name email");
    res.json({ message: req.body.isPublished ? "Landing page published" : "Landing page draft saved", config });
});

router.post("/upload", authenticate, authorize("superadmin"), imageUpload.single("image"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Image is required" });
    res.status(201).json({ url: `/uploads/landing/${req.file.filename}` });
});

export default router;
