import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        // Department Display Name
        name: {
            type: String,
            required: [true, "Department name is required"],
            trim: true,
            unique: true,
            maxlength: 100,
        },

        // Short code (CSE, IT, ECE...)
        code: {
            type: String,
            required: [true, "Department code is required"],
            unique: true,
            uppercase: true,
            trim: true,
            minlength: 2,
            maxlength: 10,
        },

        // Optional detailed description
        description: {
            type: String,
            default: "",
            maxlength: 500,
        },

        // Department Head (Admin reference)
        headOfDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },

        // Official department email
        email: {
            type: String,
            required: [true, "Department email is required"],
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please enter a valid email address",
            ],
        },

        // Optional contact phone
        phone: {
            type: String,
            trim: true,
            default: null,
            match: [/^[0-9]{10}$/, "Phone must be a valid 10-digit number"],
        },

        // Complaint Statistics
        totalComplaints: {
            type: Number,
            default: 0,
            min: 0,
        },
        activeComplaints: {
            type: Number,
            default: 0,
            min: 0,
        },
        resolvedComplaints: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

/* ----------------------------------------------------
   🔍 Indexing for faster search + uniqueness
-----------------------------------------------------*/
departmentSchema.index({ name: 1 }, { unique: true });
departmentSchema.index({ code: 1 }, { unique: true });

/* ----------------------------------------------------
   🧠 Auto-generate uppercase code if not provided
   Example: "Computer Science" → "COMPUTERSCIENCE"
   (You can disable if you don’t want auto-code)
-----------------------------------------------------*/
departmentSchema.pre("validate", function (next) {
    if (!this.code && this.name) {
        this.code = this.name.replace(/\s+/g, "").substring(0, 10).toUpperCase();
    }
    next();
});

export default mongoose.model("Department", departmentSchema);
