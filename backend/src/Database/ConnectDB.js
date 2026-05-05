import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URL, {
            dbName: process.env.MONGODB_DB || "EgrievanceHub",
            maxPoolSize: 10,
        });

        console.log(`MongoDB Connected: ${connection.connection.host}`);

        // Legacy cleanup: old deployments created a unique `trackingId_1` index
        // on `grievances`. Current schema uses `grievanceId` instead, so inserts
        // fail with duplicate key on `trackingId: null`. Drop the stale index once.
        try {
            const grievances = connection.connection.db.collection("grievances");
            const indexes = await grievances.indexes();
            const hasTrackingIdIndex = indexes.some((idx) => idx.name === "trackingId_1");
            if (hasTrackingIdIndex) {
                await grievances.dropIndex("trackingId_1");
                console.log("Dropped legacy index: grievances.trackingId_1");
            }
        } catch (idxErr) {
            console.warn("Could not validate/drop legacy grievances trackingId index:", idxErr.message);
        }
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
