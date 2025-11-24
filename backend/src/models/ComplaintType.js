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

    department: {
        type: String,
        required: true,
    },

    defaultPriority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium",
    },
}, { timestamps: true });

export default mongoose.model("ComplaintType", complaintTypeSchema);
