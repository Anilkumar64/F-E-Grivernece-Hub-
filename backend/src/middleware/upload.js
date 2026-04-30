import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadRoot = path.resolve(__dirname, "..", "..", "uploads");
const attachmentsDir = path.join(uploadRoot, "grievance_attachments");

fs.mkdirSync(attachmentsDir, { recursive: true });

const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, attachmentsDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `attachment-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(ext)) return cb(null, true);
    cb(new Error("Only PDF, JPG, and PNG files are allowed"));
};

export default multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: 3 },
});
