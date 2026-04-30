import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import ConnectDB from "./src/Database/ConnectDB.js";

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(helmet());

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
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

// ---------- Error Handlers ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Start Server ----------
const startServer = async () => {
    try {
        await ConnectDB();
        console.log("MongoDB Connected");

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Server startup failed:", err);
        process.exit(1);
    }
};

startServer();
