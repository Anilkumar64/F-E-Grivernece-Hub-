import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Department name is required"],
            unique: true,
            trim: true,
        },
        code: {
            type: String,
            unique: true,
            uppercase: true,
            required: [true, "Department code is required"],
        },
        description: {
            type: String,
            default: "",
        },
        headOfDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },
        email: {
            type: String,
            required: [true, "Department email is required"],
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            default: null,
        },
        totalComplaints: {
            type: Number,
            default: 0,
        },
        activeComplaints: {
            type: Number,
            default: 0,
        },
        resolvedComplaints: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
