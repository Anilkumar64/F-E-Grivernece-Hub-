import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
        code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 12 },
        description: { type: String, trim: true, default: "", maxlength: 500 },
        headAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        isActive: { type: Boolean, default: true, index: true },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

departmentSchema.virtual("grievanceCount", {
    ref: "Grievance",
    localField: "_id",
    foreignField: "department",
    count: true,
});

export default mongoose.model("Department", departmentSchema);
