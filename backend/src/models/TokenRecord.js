import mongoose from "mongoose";

const tokenRecordSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, index: true },
        value: { type: String, required: true, default: "1" },
        expiresAt: { type: Date, required: true, index: { expires: 0 } },
    },
    { timestamps: true }
);

export default mongoose.model("TokenRecord", tokenRecordSchema);
