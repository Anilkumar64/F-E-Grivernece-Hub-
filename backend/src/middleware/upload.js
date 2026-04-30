import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..", "..");
const uploadDir = path.join(backendRoot, "uploads", "idcards");

// Ensure the upload directory exists (create if missing)
fs.mkdirSync(uploadDir, { recursive: true });

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Example: idcard-1699871234567-123456789.png
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `idcard-${uniqueSuffix}${ext}`);
    },
});

// File filter — only allow images and PDFs
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    const allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (allowedTypes.test(ext) && allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, JPEG, PNG, or PDF files are allowed"));
    }
};

// Limit file size to 2 MB
const limits = {
    fileSize: 2 * 1024 * 1024, // 2 MB
};

// Initialize multer
const upload = multer({ storage, fileFilter, limits });

export default upload;
