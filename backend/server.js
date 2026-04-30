import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import compression from "compression";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import ConnectDB from "./src/Database/ConnectDB.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import grievanceRoutes from "./src/routes/grievanceRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import departmentRoutes from "./src/routes/departmentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import auditLogRoutes from "./src/routes/auditLogRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import siteRoutes from "./src/routes/siteRoutes.js";
import { apiLimiter } from "./src/middleware/rateLimiters.js";
import { authenticate } from "./src/middleware/authMiddleware.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";
import { startSlaEscalationJob } from "./src/jobs/slaEscalationJob.js";

dotenv.config();

const requiredEnv = ["MONGODB_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];
requiredEnv.forEach((key) => {
    if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
});

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(helmet());
app.use(compression());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || "1mb" }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());

if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

app.get("/uploads/:folder/:file", authenticate, (req, res) => {
    const allowedFolders = new Set(["grievance_attachments"]);
    const { folder, file } = req.params;
    if (!allowedFolders.has(folder) || file.includes("..") || path.isAbsolute(file)) {
        return res.status(400).json({ message: "Invalid file path" });
    }
    const uploadRoot = path.resolve(__dirname, "uploads");
    const requested = path.resolve(uploadRoot, folder, file);
    if (!requested.startsWith(uploadRoot + path.sep)) return res.status(400).json({ message: "Invalid file path" });
    res.sendFile(requested);
});

app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime(), dbStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.get("/api/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
});

app.use("/api/site", siteRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/grievances", apiLimiter, grievanceRoutes);
app.use("/api/departments", apiLimiter, departmentRoutes);
app.use("/api/categories", apiLimiter, categoryRoutes);
app.use("/api/complaint-types", apiLimiter, categoryRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/audit-logs", apiLimiter, auditLogRoutes);
app.use("/api/reports", apiLimiter, reportRoutes);

app.get("/", (_req, res) => res.json({ status: "ok", service: "University E-Grievance API" }));

app.use(notFound);
app.use(errorHandler);

let serverInstance;

const shutdown = (signal) => {
    console.log(`${signal} received. Closing HTTP server...`);
    serverInstance?.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
    });
};

const startServer = async () => {
    await ConnectDB();
    startSlaEscalationJob();
    serverInstance = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    shutdown("unhandledRejection");
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startServer().catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
});
