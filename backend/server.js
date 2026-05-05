import express      from "express";
import dotenv        from "dotenv";
import helmet        from "helmet";
import path          from "path";
import cors          from "cors";
import morgan        from "morgan";
import cookieParser  from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp           from "hpp";
import compression   from "compression";
import { fileURLToPath } from "url";
import mongoose      from "mongoose";

import ConnectDB            from "./src/Database/ConnectDB.js";
import authRoutes           from "./src/routes/authRoutes.js";
import userRoutes           from "./src/routes/userRoutes.js";
import adminRoutes          from "./src/routes/adminRoutes.js";
import superAdminRoutes     from "./src/routes/superAdminRoutes.js";
import grievanceRoutes      from "./src/routes/grievanceRoutes.js";
import categoryRoutes       from "./src/routes/categoryRoutes.js";
import departmentRoutes     from "./src/routes/departmentRoutes.js";
import notificationRoutes   from "./src/routes/notificationRoutes.js";
import auditLogRoutes       from "./src/routes/auditLogRoutes.js";
import reportRoutes         from "./src/routes/reportRoutes.js";
import siteRoutes           from "./src/routes/siteRoutes.js";
import landingConfigRoutes  from "./src/routes/landingConfigRoutes.js";
import studentRoutes        from "./src/routes/studentRoutes.js";
import courseRoutes         from "./src/routes/courseRoutes.js";
import { apiLimiter }       from "./src/middleware/rateLimiters.js";
import { authenticate }     from "./src/middleware/authMiddleware.js";
import { notFound, errorHandler } from "./src/middleware/errorHandler.js";
import { startSlaEscalationJob }  from "./src/jobs/slaEscalationJob.js";
import { initCache }        from "./src/utils/cache.js";

dotenv.config();

/* ── Validate required env vars at startup ── */
["MONGODB_URL", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"].forEach((key) => {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    if ((key.includes("SECRET")) && process.env[key].length < 32) {
        throw new Error(`${key} must be at least 32 characters`);
    }
});

const app        = express();
const PORT       = process.env.PORT || 5000;
const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const isProd     = process.env.NODE_ENV === "production";

/* ── CORS ── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174")
    .split(",").map((o) => o.trim()).filter(Boolean);
const allowedOriginSet = new Set(allowedOrigins);

/* ── Global middleware ── */
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
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
        },
    } : false,
}));
app.use(compression());
app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
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
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

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
    const requested  = path.resolve(uploadRoot, "landing", file);
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
    const requested  = path.resolve(uploadRoot, folder, file);
    if (!requested.startsWith(uploadRoot + path.sep))
        return res.status(400).json({ message: "Invalid file path" });
    res.sendFile(requested);
});

/* ── Health endpoints ── */
app.get("/api/health", (_req, res) => res.json({
    status:   "ok",
    uptime:   process.uptime(),
    dbStatus: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    version:  process.env.npm_package_version || "0.0.0",
}));

app.get("/api/ready", (_req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "not_ready" });
});

/* ── API routes ── */
app.use("/api/site",          siteRoutes);
app.use("/api/landing-config", landingConfigRoutes);
app.use("/api/auth",          authRoutes);
app.use("/api/students",      apiLimiter, studentRoutes);
app.use("/api/users",         apiLimiter, userRoutes);
app.use("/api/admin",         apiLimiter, adminRoutes);
app.use("/api/superadmin",    apiLimiter, superAdminRoutes);
app.use("/api/grievances",    apiLimiter, grievanceRoutes);
app.use("/api/departments",   apiLimiter, departmentRoutes);
app.use("/api/courses",       apiLimiter, courseRoutes);
app.use("/api/categories",    apiLimiter, categoryRoutes);
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/audit-logs",    apiLimiter, auditLogRoutes);
app.use("/api/reports",       apiLimiter, reportRoutes);

app.get("/", (_req, res) => res.json({ status: "ok", service: "University E-Grievance API" }));

/* ── Error handling ── */
app.use(notFound);
app.use(errorHandler);

/* ── Graceful shutdown ── */
let serverInstance;

const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully…`);
    try {
        if (serverInstance) await new Promise((resolve) => serverInstance.close(resolve));
        await mongoose.connection.close();
        console.log("Shutdown complete.");
    } catch (err) {
        console.error("Error during shutdown:", err);
    } finally {
        process.exit(0);
    }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("uncaughtException",  (err) => { console.error("Uncaught exception:", err); shutdown("uncaughtException"); });
process.on("unhandledRejection", (err) => { console.error("Unhandled rejection:", err); shutdown("unhandledRejection"); });

/* ── Startup ── */
const startServer = async () => {
    await ConnectDB();
    await initCache().catch((err) => console.warn("Redis/cache unavailable (non-fatal):", err.message));
    startSlaEscalationJob();
    serverInstance = app.listen(PORT, () => console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`));
};

startServer().catch((err) => {
    console.error("Server startup failed:", err);
    process.exit(1);
});
