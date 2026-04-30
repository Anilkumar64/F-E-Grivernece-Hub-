// backend/src/controllers/complaintType/createType.js

import ComplaintType from "../../models/ComplaintType.js";
import Department from "../../models/Department.js";

export const createType = async (req, res) => {
    try {
        const type = req.body.type || req.body.name;
        const department = req.body.department || req.admin?.department;
        const { subTypes, defaultPriority, description } = req.body;

        // Validation
        if (!type || !department) {
            return res.status(400).json({
                message: "Type and department fields are required",
            });
        }

        const departmentExists = await Department.exists({ _id: department });
        if (!departmentExists) {
            return res.status(400).json({ message: "Invalid department" });
        }

        // Check duplicate
        const exists = await ComplaintType.findOne({ type, department });
        if (exists) {
            return res.status(400).json({
                message: "This complaint type already exists",
            });
        }

        // Create new complaint type
        const newType = await ComplaintType.create({
            type,
            subTypes,
            department,
            defaultPriority: defaultPriority || "medium",
            description: description || "",
        });

        res.status(201).json({
            message: "Complaint type created successfully",
            data: newType,
        });

    } catch (error) {
        console.error("Error in createType:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
