import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import ConnectDB from "./src/Database/ConnectDB.js";

import adminRoutes from "./src/routes/adminRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import grievanceRoutes from "./src/routes/grievanceRoutes.js";
import complaintTypeRoutes from "./src/routes/complaintTypeRoutes.js";
import departmentRoutes from "./src/routes/departmentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import superAdminRoutes from "./src/routes/superAdminRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";



import { notFound, errorHandler } from "./src/middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- Middlewares ----------
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

if (process.env.NODE_ENV !== "production") {
    app.use(morgan("dev"));
}

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------- Routes ----------
app.use("/api/auth", authRoutes);   // ADMIN auth
app.use("/api/users", userRoutes); // USER auth (registerUser, loginUser)

app.use("/api/superadmin", superAdminRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/complaint-types", complaintTypeRoutes);

app.use("/api/admin", adminRoutes);
app.use("/api/grievances", grievanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/superadmin", superAdminRoutes);

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
