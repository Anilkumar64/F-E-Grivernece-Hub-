// tests/app.js
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";

import authRoutes from "../src/routes/authRoutes.js";
import userRoutes from "../src/routes/userRoutes.js";
import adminRoutes from "../src/routes/adminRoutes.js";
import superAdminRoutes from "../src/routes/superAdminRoutes.js";
import grievanceRoutes from "../src/routes/grievanceRoutes.js";
import categoryRoutes from "../src/routes/categoryRoutes.js";
import departmentRoutes from "../src/routes/departmentRoutes.js";
import notificationRoutes from "../src/routes/notificationRoutes.js";
import auditLogRoutes from "../src/routes/auditLogRoutes.js";
import reportRoutes from "../src/routes/reportRoutes.js";
import siteRoutes from "../src/routes/siteRoutes.js";
import { notFound, errorHandler } from "../src/middleware/errorHandler.js";

const buildApp = () => {
    const app = express();
    app.use(helmet());
    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(mongoSanitize());
    app.use(hpp());

    app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/admin", adminRoutes);
    app.use("/api/superadmin", superAdminRoutes);
    app.use("/api/grievances", grievanceRoutes);
    app.use("/api/departments", departmentRoutes);
    app.use("/api/categories", categoryRoutes);
    app.use("/api/notifications", notificationRoutes);
    app.use("/api/audit-logs", auditLogRoutes);
    app.use("/api/reports", reportRoutes);
    app.use("/api/site", siteRoutes);

    app.use(notFound);
    app.use(errorHandler);
    return app;
};

export default buildApp;