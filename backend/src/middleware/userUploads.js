import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const uploadPath = path.join(backendRoot, "uploads", "user_idcards");

fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
    const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".pdf"]);
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".svg" || file.mimetype === "image/svg+xml") {
        return cb(new Error("SVG uploads are not allowed"), false);
    }
    if (allowedTypes.has(file.mimetype) && allowedExtensions.has(ext)) cb(null, true);
    else cb(new Error("Only JPG, PNG or PDF files are allowed"), false);
};

export default multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },
});
