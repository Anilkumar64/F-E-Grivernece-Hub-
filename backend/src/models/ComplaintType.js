import mongoose from "mongoose";

const complaintTypeSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
    },

    subTypes: [
        {
            type: String,
        },
    ],

    // ✅ Fixed: Changed from String to ObjectId reference
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department",
        required: true,
        index: true,
    },

    defaultPriority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
}, { timestamps: true });

export default mongoose.model("ComplaintType", complaintTypeSchema);
