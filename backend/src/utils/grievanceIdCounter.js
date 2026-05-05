/**
 * Atomically generate the next grievance ID for today.
 * Uses a dedicated counters collection to avoid race conditions
 * when multiple grievances are submitted simultaneously.
 *
 * Format: GRV-YYYYMMDD-XXXX  (e.g. GRV-20260504-0001)
 *
 * ✅ FIX M-10: original schema had no TTL — the Counter collection grew unbounded
 * because one document is created per calendar day and never deleted.
 * Added an `expireAt` field with a TTL index so MongoDB automatically removes
 * counter documents 90 days after the date they represent.
 */
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: { type: String },         // e.g. "grievance:20260504"
    seq: { type: Number, default: 0 },
    // ✅ FIX M-10: TTL field — document expires 90 days after the represented date
    expireAt: { type: Date, index: { expires: 0 } },
});

const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export const nextGrievanceId = async () => {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
    const key = `grievance:${datePart}`;

    // expireAt = midnight of the represented date + 90 days
    const expireAt = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    expireAt.setUTCDate(expireAt.getUTCDate() + 90);

    const doc = await Counter.findOneAndUpdate(
        { _id: key },
        {
            $inc: { seq: 1 },
            // $setOnInsert ensures expireAt is only written once (at creation)
            // so updating an existing counter doesn't reset the TTL clock
            $setOnInsert: { expireAt },
        },
        { upsert: true, new: true }
    );

    return `GRV-${datePart}-${String(doc.seq).padStart(4, "0")}`;
};