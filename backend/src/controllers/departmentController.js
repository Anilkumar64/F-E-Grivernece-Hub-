// backend/src/controllers/departmentController.js
import Department from "../models/Department.js";

/**
 * GET /api/superadmin/departments
 * Return all departments (for ManageDepartments page)
 */
export const getDepartments = async (req, res, next) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json({ departments });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/superadmin/departments
 * Body: { name, code, email, description?, phone?, headOfDepartment? }
 */
export const createDepartment = async (req, res, next) => {
    try {
        const { name, code, email, description, phone, headOfDepartment } = req.body;

        if (!name || !code || !email) {
            return res.status(400).json({
                message: "Name, code and email are required",
            });
        }

        // Check duplicates
        const existingByName = await Department.findOne({ name });
        if (existingByName) {
            return res.status(400).json({ message: "Department name already exists" });
        }

        const existingByCode = await Department.findOne({ code: code.toUpperCase() });
        if (existingByCode) {
            return res.status(400).json({ message: "Department code already exists" });
        }

        const department = await Department.create({
            name,
            code: code.toUpperCase(),
            email: email.toLowerCase(),
            description: description || "",
            phone: phone || null,
            headOfDepartment: headOfDepartment || null,
            // complaint counters start at 0 as defined in schema
        });

        res.json({
            message: "Department created successfully",
            department,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/superadmin/departments/:id
 */
export const deleteDepartment = async (req, res, next) => {
    try {
        const { id } = req.params;
        await Department.findByIdAndDelete(id);
        res.json({ message: "Department deleted" });
    } catch (err) {
        next(err);
    }
};
