import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URL, {
            dbName: "EgrievanceHub", // cleaner and centralized naming
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${connection.connection.host}`);
    } catch (error) {
        console.error(" MongoDB Connection Error:", error.message);
        process.exit(1);
    }

    // Optional: handle runtime disconnections
    mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
    });
};

export default connectDB;
