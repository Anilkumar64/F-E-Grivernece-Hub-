import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import User from "./src/models/User.js";

dotenv.config();

const run = async () => {
    if (!process.env.MONGODB_URL) throw new Error("MONGODB_URL is required");
    await mongoose.connect(process.env.MONGODB_URL, { maxPoolSize: 10 });

    const email = process.env.SUPERADMIN_EMAIL || "superadmin@university.ac.in";
    const exists = await User.findOne({ email, role: "superadmin" });
    if (exists) {
        console.log("Super admin already exists");
        process.exit(0);
    }

    const password = process.env.SUPERADMIN_PASSWORD || crypto.randomBytes(16).toString("hex");
    await User.create({
        name: process.env.SUPERADMIN_NAME || "Super Admin",
        email,
        password,
        staffId: process.env.SUPERADMIN_STAFF_ID || "SA001",
        role: "superadmin",
        isActive: true,
    });

    console.log("Super admin created");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    await mongoose.connection.close();
};

run().catch(async (error) => {
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
});
