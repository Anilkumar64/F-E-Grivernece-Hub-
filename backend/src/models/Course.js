import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
        durationYears: { type: Number, required: true, min: 1, max: 8 },
        department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true, index: true },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
);

courseSchema.index({ department: 1, code: 1 }, { unique: true });

export default mongoose.model("Course", courseSchema);
