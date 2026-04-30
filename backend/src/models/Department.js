import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
        code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 12 },
        description: { type: String, trim: true, default: "", maxlength: 500 },
        headAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
