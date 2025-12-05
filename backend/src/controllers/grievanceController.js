// backend/src/controllers/grievanceController.js
import Grievance from "../models/Grievance.js";
import User from "../models/User.js";
import Department from "../models/Department.js";
import Admin from "../models/Admin.js";
import sendEmail from "../utils/sendEmail.js";

/* ===================== HELPER MAPPERS ===================== */

// Map client → DB status
const normalizeStatusFromClient = (status) => {
    if (!status) return undefined;
    const s = status.toString().trim().toLowerCase();

    // UI words
    if (s === "pending" || s === "submitted") return "submitted";
    if (s === "in progress" || s === "in_progress" || s === "in-progress")
        return "in_progress";
    if (s === "resolved") return "resolved";
    if (s === "rejected") return "rejected";

    // already DB strings
    if (["submitted", "in_progress", "resolved", "rejected"].includes(s))
        return s;

    return undefined;
};

// Map DB → UI status (for pretty display if you want)
export const mapStatusToUi = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
        case "submitted":
            return "Pending";
        case "in_progress":
            return "In Progress";
        case "resolved":
            return "Resolved";
        case "rejected":
            return "Rejected";
        default:
            return status || "Unknown";
    }
};

// Map client → DB priority
const normalizePriorityFromClient = (priority) => {
    if (!priority) return "medium";
    const p = priority.toString().trim().toLowerCase();

    if (["low", "medium", "high", "critical"].includes(p)) return p;

    // UI might send title case
    if (p === "low") return "low";
    if (p === "medium") return "medium";
    if (p === "high") return "high";
    if (p === "critical") return "critical";

    return "medium";
};

// Optional: map DB → UI priority
export const mapPriorityToUi = (priority) => {
    const p = (priority || "").toLowerCase();
    switch (p) {
        case "low":
            return "Low";
        case "medium":
            return "Medium";
        case "high":
            return "High";
        case "critical":
            return "Critical";
        default:
            return priority || "Medium";
    }
};

/* ===================== CONTROLLERS ===================== */

/**
 * @desc Submit a new grievance
 * @route POST /api/grievances or /api/grievances/create
 * @access Private
 */
export const createGrievance = async (req, res) => {
    try {
        const {
            title,
            description,
            department,
            priority,
            isAnonymous,
            complaintType,
        } = req.body;

        if (!title || !description || !department) {
            return res
                .status(400)
                .json({ message: "Title, description, and department are required" });
        }

        const userId = req.user._id;
        const user = await User.findById(userId).select("name email");

        if (!user) return res.status(404).json({ message: "User not found" });

        // ensure department exists
        const dept = await Department.findById(department).populate(
            "headOfDepartment",
            "name email"
        );

        if (!dept) return res.status(404).json({ message: "Department not found" });

        // Normalize priority (UI might send "Medium")
        const normalizedPriority = normalizePriorityFromClient(priority);

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
            complaintType: complaintType || undefined,
            title,
            description,
            priority: normalizedPriority,
            isAnonymous: isAnonymous === "true" || isAnonymous === true,
            attachments,
            status: "submitted",
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

        // send emails (best-effort)
        try {
            const userEmailSubject = "Grievance Submitted Successfully";
            const userEmailBody = `Dear ${user.name},
Your grievance titled "${title}" has been submitted.
Tracking ID: ${grievance.trackingId}
You will receive updates as the grievance progresses.`;

            const deptEmailBody = `New grievance submitted:
Title: ${title}
From: ${grievance.isAnonymous ? "Anonymous" : user.name}
Tracking ID: ${grievance.trackingId}`;

            const emails = [
                sendEmail(user.email, userEmailSubject, userEmailBody),
            ];

            if (dept.email) {
                emails.push(
                    sendEmail(dept.email, `New grievance: ${title}`, deptEmailBody)
                );
            }

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
        } catch (mailErr) {
            console.warn("❌ Email sending failed (ignored):", mailErr.message);
        }

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
 * @route GET /api/grievances/my
 * @access Private
 */
export const getMyGrievances = async (req, res) => {
    try {
        const grievances = await Grievance.find({ user: req.user._id })
            .populate("department", "name")
            .sort({ createdAt: -1 });

        res.json(grievances);
    } catch (error) {
        console.error("getMyGrievances error:", error);
        res.status(500).json({ message: "Failed to fetch grievances" });
    }
};

/**
 * @desc Get grievance by tracking ID (for user track)
 * @route GET /api/grievances/:trackingId  OR /api/grievances/track/:trackingId
 * @access Private
 */
export const getGrievanceByTrackingId = async (req, res) => {
    try {
        const trackingId = req.params.trackingId;
        const grievance = await Grievance.findOne({
            trackingId,
        })
            .populate("user", "name email")
            .populate("department", "name")
            .populate("assignedTo", "name email");

        if (!grievance)
            return res.status(404).json({ message: "Grievance not found" });

        res.json({ grievance });
    } catch (error) {
        console.error("getGrievanceByTrackingId error:", error);
        res.status(500).json({ message: "Failed to fetch grievance details" });
    }
};

/**
 * @desc Update grievance status (admin)
 * @route PUT /api/grievances/:id/status
 * @access Private (Admin)
 */
export const updateGrievanceStatus = async (req, res) => {
    try {
        const { status, adminRemarks, assignedTo } = req.body;

        const normalizedStatus = normalizeStatusFromClient(status);
        if (!normalizedStatus) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const grievance = await Grievance.findById(req.params.id);
        if (!grievance)
            return res.status(404).json({ message: "Grievance not found" });

        // update fields
        grievance.status = normalizedStatus;
        if (adminRemarks) grievance.adminRemarks = adminRemarks;
        if (assignedTo) grievance.assignedTo = assignedTo;

        // add timeline entry
        grievance.timeline.push({
            status: normalizedStatus,
            message: adminRemarks || "",
        });

        // update department counters when resolved / rejected
        if (normalizedStatus === "resolved" || normalizedStatus === "rejected") {
            grievance.resolutionDate = new Date();

            await Department.findByIdAndUpdate(grievance.department, {
                $inc: { activeComplaints: -1, resolvedComplaints: 1 },
            });
        }

        await grievance.save();

        // notify user (best-effort)
        try {
            await sendEmail(
                grievance.userEmail,
                `Grievance Status Updated: ${mapStatusToUi(normalizedStatus)}`,
                `Your grievance titled "${grievance.title}" is now "${mapStatusToUi(
                    normalizedStatus
                )}".`
            );
        } catch (mailErr) {
            console.warn("❌ Email sending failed on status update:", mailErr.message);
        }

        res.json({
            message: "Status updated successfully",
            grievance,
        });
    } catch (error) {
        console.error("updateGrievanceStatus error:", error);
        res.status(500).json({
            message: "Failed to update grievance",
            error: error.message,
        });
    }
};

/**
 * @desc Get admin dashboard stats
 * @route GET /api/grievances/admin/dashboard
 * @access Private (Admin)
 */
export const getAdminDashboardData = async (req, res) => {
    try {
        const adminId = req.user?._id;
        const admin = await Admin.findById(adminId);

        if (!admin) {
            return res.status(403).json({ message: "Admin not found" });
        }

        const query = {};

        // restrict to admin's department if present
        if (admin.department) {
            query.department = admin.department;
        }

        // ---- COUNTS ---- (using DB enums)
        const total = await Grievance.countDocuments(query);
        const pending = await Grievance.countDocuments({
            ...query,
            status: "submitted",
        });
        const inprogress = await Grievance.countDocuments({
            ...query,
            status: "in_progress",
        });
        const resolved = await Grievance.countDocuments({
            ...query,
            status: "resolved",
        });
        const rejected = await Grievance.countDocuments({
            ...query,
            status: "rejected",
        });

        // ---- MONTHLY DATA (last 6 months) ----
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 5);

        const match = {
            ...query,
            createdAt: { $gte: sixMonthsAgo },
        };

        const raw = await Grievance.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1,
                },
            },
        ]);

        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];

        const months = raw.map((item) => ({
            month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
            count: item.count,
        }));

        // Response shape expected by AdminDashboard.jsx
        return res.json({
            counts: {
                total,
                pending,
                inprogress,
                resolved,
                rejected,
            },
            months,
        });
    } catch (error) {
        console.error("Admin dashboard stats error:", error);
        res.status(500).json({ message: "Failed to load admin dashboard" });
    }
};

/**
 * @desc Get latest grievances for admin
 * @route GET /api/grievances/admin/latest
 * @access Private (Admin)
 */
export const getAdminLatestGrievances = async (req, res) => {
    try {
        const adminId = req.user?._id;
        const admin = await Admin.findById(adminId);

        if (!admin) {
            return res.status(403).json({ message: "Admin not found" });
        }

        const query = {};
        if (admin.department) {
            query.department = admin.department;
        }

        const grievances = await Grievance.find(query)
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("user", "name email")
            .populate("department", "name");

        return res.json({ grievances });
    } catch (error) {
        console.error("Admin latest grievances error:", error);
        res.status(500).json({ message: "Failed to fetch latest grievances" });
    }
};

/**
 * @desc Get ALL grievances for the logged-in admin's department
 * @route GET /api/grievances/admin/all
 * @access Private (Admin)
 */

export const assignGrievance = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.body;

        const grievance = await Grievance.findById(id);
        if (!grievance) {
            return res.status(404).json({ message: "Grievance not found" });
        }

        grievance.assignedTo = adminId;
        await grievance.save();

        res.status(200).json({ message: "Grievance assigned successfully" });
    } catch (err) {
        console.error("Assign grievance error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

export const getAdminAllGrievances = async (req, res) => {
    try {
        const adminId = req.user?._id;
        const admin = await Admin.findById(adminId);

        if (!admin) {
            return res.status(403).json({ message: "Admin not found" });
        }

        const query = {};
        if (admin.department) {
            query.department = admin.department;
        }

        const grievances = await Grievance.find(query)
            .sort({ createdAt: -1 })
            .populate("department", "name")
            .populate("user", "name email");

        return res.json({ grievances });
    } catch (error) {
        console.error("Admin all grievances error:", error);
        res.status(500).json({ message: "Failed to fetch grievances" });
    }
};

/**
 * @desc Get only PENDING grievances for the logged-in admin's department
 * @route GET /api/grievances/admin/pending
 * @access Private (Admin)
 */
export const getAdminPendingGrievances = async (req, res) => {
    try {
        const adminId = req.user?._id;
        const admin = await Admin.findById(adminId);

        if (!admin) {
            return res.status(403).json({ message: "Admin not found" });
        }

        const query = {
            status: "submitted",
        };

        if (admin.department) {
            query.department = admin.department;
        }

        const grievances = await Grievance.find(query)
            .sort({ createdAt: -1 })
            .populate("department", "name")
            .populate("user", "name email");

        return res.json({ grievances });
    } catch (error) {
        console.error("Admin pending grievances error:", error);
        res.status(500).json({ message: "Failed to fetch pending grievances" });
    }
};

/**
 * @desc Escalate or forward grievance (admin)
 * @route PATCH /api/grievances/escalate/:id
 * @access Private (Admin)
 */
export const escalateGrievance = async (req, res) => {
    try {
        const { id } = req.params;
        const { escalateToSuper, forwardDeptId } = req.body;

        const grievance = await Grievance.findById(id);
        if (!grievance)
            return res.status(404).json({ message: "Grievance not found" });

        if (escalateToSuper) {
            grievance.escalatedToSuper = true;
        }

        if (forwardDeptId) {
            grievance.forwardedToDept = forwardDeptId;
        }

        await grievance.save();

        res.json({
            message: "Escalation/Forwarding done",
            grievance,
        });
    } catch (err) {
        console.error("Escalation error:", err);
        res.status(500).json({ message: "Failed to escalate grievance" });
    }
};
