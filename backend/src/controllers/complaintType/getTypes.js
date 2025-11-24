// backend/src/controllers/complaintType/getTypes.js

import ComplaintType from "../../models/ComplaintType.js";

export const getTypes = async (req, res) => {
    try {
        const types = await ComplaintType.find().sort({ type: 1 }); // alphabetically sorted

        res.status(200).json({
            success: true,
            count: types.length,
            data: types,
        });

    } catch (error) {
        console.error("Error in getTypes:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
