import mongoose from "mongoose";

const grievanceCategorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, default: "", maxlength: 500 },
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true,
            index: true,
        },
        slaHours: { type: Number, default: 72, min: 1, max: 720 },
    },
    { timestamps: true }
);

grievanceCategorySchema.index({ department: 1, name: 1 }, { unique: true });

export default mongoose.model("GrievanceCategory", grievanceCategorySchema);
