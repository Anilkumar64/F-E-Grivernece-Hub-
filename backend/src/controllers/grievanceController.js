import Grievance from "../models/Grievance.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Admin from "../models/Admin.js";
import sendEmail from "../utils/sendEmail.js";

/**
 * @desc Submit a new grievance
 * @route POST /api/grievances/create
 * @access Private
 */

export const createGrievance = async (req, res) => {
    try {
        const { title, description, department, priority, isAnonymous } = req.body;

        const userId = req.user._id;
        const user = await User.findById(userId).select("name email");

        if (!user) return res.status(404).json({ message: "User not found" });

        // ensure department exists
        const dept = await Department.findById(department)
            .populate("headOfDepartment", "name email");

        if (!dept) return res.status(404).json({ message: "Department not found" });

        // Handle attachments from multer
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map((file) => ({
                fileName: file.originalname,
                fileUrl: `/uploads/${file.filename}`,
            }));
        }

        // create grievance
        const grievance = await Grievance.create({
            user: userId,
            userEmail: user.email,
            department,
            title,
            description,
            priority,
            isAnonymous: isAnonymous === "true",
            attachments,
            timeline: [
                {
                    status: "submitted",
                    message: "Grievance submitted",
                },
            ],
        });

        // update department counters
        await Department.findByIdAndUpdate(department, {
            $inc: { totalComplaints: 1, activeComplaints: 1 },
        });

        // send emails
        const userEmailSubject = "Grievance Submitted Successfully";
        const userEmailBody = `Dear ${user.name},
Your grievance titled "${title}" has been submitted.
Tracking ID: ${grievance.trackingId}
You will receive updates as the grievance progresses.`;

        const deptEmailBody = `New grievance submitted:
Title: ${title}
From: ${isAnonymous ? "Anonymous" : user.name}
Tracking ID: ${grievance.trackingId}`;

        const emails = [
            sendEmail(user.email, userEmailSubject, userEmailBody),
            sendEmail(dept.email, `New grievance: ${title}`, deptEmailBody),
        ];

        if (dept.headOfDepartment?.email) {
            emails.push(
                sendEmail(
                    dept.headOfDepartment.email,
                    "New grievance assigned",
                    deptEmailBody
                )
            );
        }

        await Promise.allSettled(emails);

        res.status(201).json({
            message: "Grievance submitted successfully",
            grievance,
        });

    } catch (error) {
        console.error("Create grievance error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

/**
 * @desc Get grievances of logged-in user
 */
export const getMyGrievances = async (req, res) => {
    try {
        const grievances = await Grievance.find({ user: req.user._id })
            .populate("department", "name")
            .sort({ createdAt: -1 });

        res.json(grievances);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch grievances" });
    }
};

/**
 * @desc Get grievance by tracking ID
 */
export const getGrievanceByTrackingId = async (req, res) => {
    try {
        const grievance = await Grievance.findOne({
            trackingId: req.params.trackingId,
        })
            .populate("user", "name email")
            .populate("department", "name")
            .populate("assignedTo", "name email");

        if (!grievance)
            return res.status(404).json({ message: "Grievance not found" });

        res.json(grievance);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch grievance details" });
    }
};

/**
 * @desc Update grievance status (admin)
 * @route PUT /api/grievances/:id/status
 */
export const updateGrievanceStatus = async (req, res) => {
    try {
        const { status, adminRemarks, assignedTo } = req.body;

        const validStatuses = ["submitted", "in_progress", "resolved", "rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const grievance = await Grievance.findById(req.params.id);

        if (!grievance)
            return res.status(404).json({ message: "Grievance not found" });

        // update fields
        grievance.status = status;
        grievance.adminRemarks = adminRemarks || grievance.adminRemarks;

        if (assignedTo) grievance.assignedTo = assignedTo;

        // add timeline entry
        grievance.timeline.push({
            status,
            message: adminRemarks || "",
        });

        // update department counters
        if (status === "resolved" || status === "rejected") {
            grievance.resolutionDate = new Date();

            await Department.findByIdAndUpdate(grievance.department, {
                $inc: { activeComplaints: -1, resolvedComplaints: 1 },
            });
        }

        await grievance.save();

        // notify user
        await sendEmail(
            grievance.userEmail,
            `Grievance Status Updated: ${status}`,
            `Your grievance titled "${grievance.title}" is now "${status}".`
        );

        res.json({
            message: "Status updated successfully",
            grievance,
        });

    } catch (error) {
        res.status(500).json({ message: "Failed to update grievance", error });
    }
};
