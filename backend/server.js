import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import ConnectDB from "./src/Database/ConnectDB.js";
import { verifyToken } from "./src/middleware/authMiddleware.js";

import adminRoutes from "./src/routes/adminRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import grievanceRoutes from "./src/routes/grievanceRoutes.js";
import complaintTypeRoutes from "./src/routes/complaintTypeRoutes.js";
import departmentRoutes from "./src/routes/departmentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import superAdminRoutes from "./src/routes/superAdminRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import siteRoutes from "./src/routes/siteRoutes.js";

// import superAdminRoutes from "./routes/superAdminRoutes.js";





import { notFound, errorHandler } from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let serverInstance;

// ---------- Middlewares ----------
// ✅ Environment-driven CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_BODY_LIMIT || "1mb" }));
app.use(cookieParser());
app.use(helmet());

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.get("/uploads/:folder/:file", verifyToken, (req, res) => {
    const allowedFolders = new Set(["idcards", "user_idcards", "grievance_attachments"]);
    const { folder, file } = req.params;

    if (!allowedFolders.has(folder) || file.includes("..") || path.isAbsolute(file)) {
        return res.status(400).json({ message: "Invalid file path" });
    }

    const uploadRoot = path.resolve(__dirname, "uploads");
    const requested = path.resolve(uploadRoot, folder, file);
    if (!requested.startsWith(uploadRoot + path.sep)) {
        return res.status(400).json({ message: "Invalid file path" });
    }

    return res.sendFile(requested, (err) => {
        if (err && !res.headersSent) {
            res.status(err.statusCode || 404).json({ message: "File not found" });
        }
    });
});
app.use("/api/site", siteRoutes);

// ---------- Routes ----------
app.use("/api/auth", authRoutes);   // ADMIN auth
app.use("/api/users", userRoutes); // USER auth (registerUser, loginUser)

app.use("/api/superadmin", superAdminRoutes);
// app.use("/api/superadmin", superAdminRoutes);
app.use("/api/departments", departmentRoutes);

app.use("/api/complaint-types", complaintTypeRoutes);
// legacy alias to satisfy old frontend path: /api/complaints/type/all
app.use("/api/complaints/type", complaintTypeRoutes);


app.use("/api/admin", adminRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/notifications", notificationRoutes);


app.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "E-Grievance Hub Backend",
        environment: process.env.NODE_ENV || "development",
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// ---------- Error Handlers ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Start Server ----------
const startServer = async () => {
    try {
        await ConnectDB();
        console.log("MongoDB Connected");

        serverInstance = app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
};

startServer();

const shutdown = (signal) => {
    console.log(`${signal} received. Closing HTTP server...`);
    if (!serverInstance) process.exit(0);
    serverInstance.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
    });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
