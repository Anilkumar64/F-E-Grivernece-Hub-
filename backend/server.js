import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import compression from "compression";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import ConnectDB from "./src/Database/ConnectDB.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import superAdminRoutes from "./src/routes/superAdminRoutes.js";
import grievanceRoutes from "./src/routes/grievanceRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import departmentRoutes from "./src/routes/departmentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import auditLogRoutes from "./src/routes/auditLogRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import siteRoutes from "./src/routes/siteRoutes.js";
import landingConfigRoutes from "./src/routes/landingConfigRoutes.js";
import studentRoutes from "./src/routes/studentRoutes.js";
import courseRoutes from "./src/routes/courseRoutes.js";
import aiRoutes from "./src/routes/aiRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import workflowRoutes from "./src/routes/workflowRoutes.js";
import knowledgeBaseRoutes from "./src/routes/knowledgeBaseRoutes.js";
import webhookRoutes from "./src/routes/webhookRoutes.js";
import otpRoutes from "./src/routes/otpRoutes.js";
import testRoutes from "./src/routes/testRoutes.js";
import { apiLimiter } from "./src/middleware/rateLimiters.js";
import { authenticate } from "./src/middleware/authMiddleware.js";
import { csrfMiddleware } from "./src/middleware/csrfProtection.js";
import { securityCheck, validateSecurityConfig } from "./src/middleware/securityValidation.js";
import {
    securityErrorHandler,
    securityRequestLogger,
    suspiciousActivityMiddleware
} from "./src/middleware/securityErrorHandler.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";
import { startSlaEscalationJob } from "./src/jobs/slaEscalationJob.js";
import { initCache } from "./src/utils/cache.js";
import { closeCache } from "./src/utils/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

/* ── Validate security configuration at startup ── */
const { errors: securityErrors, warnings: securityWarnings } = validateSecurityConfig();
if (securityErrors.length > 0) {
    console.error("🚨 SECURITY CONFIGURATION ERRORS:");
    securityErrors.forEach(error => console.error(`  ❌ ${error}`));
    throw new Error("Security configuration errors detected. Fix before starting server.");
}
if (securityWarnings.length > 0) {
    console.warn("⚠️  SECURITY CONFIGURATION WARNINGS:");
    securityWarnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
}

/* ── Validate required env vars at startup ── */
["MONGODB_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"].forEach((key) => {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    if ((key.includes("SECRET")) && process.env[key].length < 64) {
        throw new Error(`${key} must be at least 64 characters`);
    }
});

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

const configureFileLogging = () => {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;
    try {
        const logDir = path.resolve(process.env.LOG_DIR || path.join(__dirname, "logs"));
        fs.mkdirSync(logDir, { recursive: true });
        const appLog = fs.createWriteStream(path.join(logDir, "backend.log"), { flags: "a" });
        const errorLog = fs.createWriteStream(path.join(logDir, "backend-error.log"), { flags: "a" });
        const accessLog = fs.createWriteStream(path.join(logDir, "backend-access.log"), { flags: "a" });
        const original = {
            log: console.log.bind(console),
            warn: console.warn.bind(console),
            error: console.error.bind(console),
        };
        const write = (stream, level, args) => {
            stream.write(`${new Date().toISOString()} [${level}] ${args.map((arg) => (
                arg instanceof Error ? arg.stack || arg.message : typeof arg === "string" ? arg : JSON.stringify(arg)
            )).join(" ")}\n`);
        };
        console.log = (...args) => { write(appLog, "INFO", args); original.log(...args); };
        console.warn = (...args) => { write(appLog, "WARN", args); original.warn(...args); };
        console.error = (...args) => {
            write(appLog, "ERROR", args);
            write(errorLog, "ERROR", args);
            original.error(...args);
        };
        return accessLog;
    } catch (err) {
        console.warn("File logging disabled:", err.message);
        return null;
    }
};

const accessLogStream = configureFileLogging();

/* ── CORS ── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174")
    .split(",").map((o) => o.trim()).filter(Boolean);
const allowedOriginSet = new Set(allowedOrigins);

/* ── Global middleware ── */
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: isProd ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    } : false,
    contentSecurityPolicy: isProd ? {
        useDefaults: true,
        directives: {
            defaultSrc: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            imgSrc: ["'self'", "data:", "blob:"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", ...allowedOrigins],
            upgradeInsecureRequests: [],
        },
    } : false,
    referrerPolicy: { policy: "no-referrer" },
    permissionsPolicy: {
        features: {
            geolocation: [],
            camera: [],
            microphone: [],
            payment: [],
            usb: [],
            magnetometer: [],
            gyroscope: [],
            accelerometer: [],
            autoplay: [],
            encryptedMedia: [],
            fullscreen: [],
            pictureInPicture: [],
            screenWakeLock: [],
        },
    },
}));
app.use(compression());
app.use(securityCheck);
app.use((req, res, next) => {
    const requestId = req.get("X-Request-ID") || crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
});
app.use(securityRequestLogger);
app.use(suspiciousActivityMiddleware);
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.use(cookieParser());
if (isProd) {
    // Extra CSRF guard for cookie-authenticated state-changing requests.
    app.use((req, res, next) => {
        const mutatingMethod = !["GET", "HEAD", "OPTIONS"].includes(req.method);
        if (!mutatingMethod) return next();
        const hasAuthCookie = Object.keys(req.cookies || {}).some((k) => k.endsWith("AccessToken") || k.endsWith("RefreshToken"));
        const usesBearerHeader = Boolean(req.headers.authorization?.startsWith("Bearer "));
        if (!hasAuthCookie || usesBearerHeader) return next();

        const origin = req.get("origin");
        if (origin && allowedOriginSet.has(origin)) return next();

        const referer = req.get("referer");
        if (referer) {
            try {
                const refererOrigin = new URL(referer).origin;
                if (allowedOriginSet.has(refererOrigin)) return next();
            } catch {
                // ignored; reject below
            }
        }
        return res.status(403).json({ message: "Forbidden: invalid request origin" });
    });
}
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || "1mb" }));
app.use(mongoSanitize());
app.use(hpp());
if (isProd) {
    app.use(csrfMiddleware);
}
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));
if (accessLogStream) app.use(morgan("combined", { stream: accessLogStream }));

// Keep auth/token responses out of intermediary caches.
app.use((req, res, next) => {
    if (req.path.startsWith("/api/auth")) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }
    next();
});

/* ── Static uploads ── */
// Landing images are public
app.get("/uploads/landing/:file", (req, res) => {
    const { file } = req.params;
    if (file.includes("..") || path.isAbsolute(file))
        return res.status(400).json({ message: "Invalid file path" });
    const uploadRoot = path.resolve(__dirname, "uploads");
    const requested = path.resolve(uploadRoot, "landing", file);
    if (!requested.startsWith(uploadRoot + path.sep))
        return res.status(400).json({ message: "Invalid file path" });
    res.sendFile(requested);
});

// Other uploads require authentication
app.get("/uploads/:folder/:file", authenticate, (req, res) => {
    const ALLOWED_FOLDERS = new Set(["grievance_attachments", "user_idcards"]);
    const { folder, file } = req.params;
    if (!ALLOWED_FOLDERS.has(folder) || file.includes("..") || path.isAbsolute(file))
        return res.status(400).json({ message: "Invalid file path" });
    const uploadRoot = path.resolve(__dirname, "uploads");
    const requested = path.resolve(uploadRoot, folder, file);
    if (!requested.startsWith(uploadRoot + path.sep))
        return res.status(400).json({ message: "Invalid file path" });
    res.sendFile(requested);
});

/* ── Health endpoints ── */
app.get("/api/health", (_req, res) => res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    },
    version: process.env.npm_package_version || "0.0.0",
}));

app.get("/api/ready", (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;
    const ready = databaseReady;
    res.status(ready ? 200 : 503).json({
        status: ready ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        services: {
            database: databaseReady ? "connected" : "disconnected",
        },
    });
});

/* ── API routes ── */
app.use("/api/site", siteRoutes);
app.use("/api/landing-config", landingConfigRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/students", apiLimiter, studentRoutes);
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/admin", apiLimiter, adminRoutes);
app.use("/api/superadmin", apiLimiter, superAdminRoutes);
app.use("/api/grievances", apiLimiter, grievanceRoutes);
app.use("/api/departments", apiLimiter, departmentRoutes);
app.use("/api/courses", apiLimiter, courseRoutes);
app.use("/api/categories", apiLimiter, categoryRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/audit-logs", apiLimiter, auditLogRoutes);
app.use("/api/reports", apiLimiter, reportRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", apiLimiter, analyticsRoutes);
app.use("/api/workflow", apiLimiter, workflowRoutes);
app.use("/api/knowledge", apiLimiter, knowledgeBaseRoutes);
app.use("/api/webhooks", apiLimiter, webhookRoutes);
app.use("/api/otp", apiLimiter, otpRoutes);
app.use("/api/test", testRoutes);

app.get("/", (_req, res) => res.json({ status: "ok", service: "University E-Grievance API" }));

/* ── Error handling ── */
app.use(notFound);
app.use(securityErrorHandler);
app.use(errorHandler);

/* ── Graceful shutdown ── */
let serverInstance;

const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully…`);
    try {
        if (serverInstance) await new Promise((resolve) => serverInstance.close(resolve));
        await closeCache();
        await mongoose.connection.close();
        console.log("Shutdown complete.");
    } catch (err) {
        console.error("Error during shutdown:", err);
    } finally {
        process.exit(0);
    }
};

/* ── Startup ── */
const startServer = async () => {
    await ConnectDB();
    await initCache();
    startSlaEscalationJob();
    serverInstance = app.listen(PORT, () => console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`));
};

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("uncaughtException", (err) => { console.error("Uncaught exception:", err); shutdown("uncaughtException"); });
    process.on("unhandledRejection", (err) => { console.error("Unhandled rejection:", err); shutdown("unhandledRejection"); });

    startServer().catch((err) => {
        console.error("Server startup failed:", err);
        process.exit(1);
    });
}

export { app, startServer };
