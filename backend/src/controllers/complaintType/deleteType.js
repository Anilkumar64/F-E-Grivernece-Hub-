// backend/src/controllers/complaintType/deleteType.js

import ComplaintType from "../../models/ComplaintType.js";

export const deleteType = async (req, res) => {
    try {
        const { id } = req.params;

        const removed = await ComplaintType.findByIdAndDelete(id);

        if (!removed) {
            return res.status(404).json({
                success: false,
                message: "Complaint type not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Complaint type deleted successfully",
        });

    } catch (error) {
        console.error("Error in deleteType:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
