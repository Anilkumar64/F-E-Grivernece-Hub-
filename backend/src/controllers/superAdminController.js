// backend/src/controllers/superAdminController.js
import Grievance from "../models/Grievance.js"; // adjust name/path if different
import User from "../models/User.js";           // adjust if needed
import Admin from "../models/Admin.js";         // adjust if needed

// GET /api/superadmin/stats
export const getSuperAdminStats = async (req, res, next) => {
    try {
        const [
            totalGrievances,
            pending,
            resolved,
            totalStudents,
            totalAdmins,
        ] = await Promise.all([
            Grievance.countDocuments({}),                  // all
            Grievance.countDocuments({ status: "Pending" }),
            Grievance.countDocuments({ status: "Resolved" }),
            User.countDocuments({}),                       // adjust if you have some filter
            Admin.countDocuments({}),
        ]);

        // average resolution time (in hours) from grievances that have resolvedAt
        const resolvedDocs = await Grievance.find(
            { status: "Resolved", resolvedAt: { $exists: true } },
            { createdAt: 1, resolvedAt: 1 }
        ).lean();

        let avgResolutionTime = 0;
        if (resolvedDocs.length > 0) {
            const totalMs = resolvedDocs.reduce((sum, g) => {
                const created = new Date(g.createdAt).getTime();
                const resolved = new Date(g.resolvedAt).getTime();
                if (!isNaN(created) && !isNaN(resolved) && resolved > created) {
                    return sum + (resolved - created);
                }
                return sum;
            }, 0);

            avgResolutionTime = +(totalMs / resolvedDocs.length / (1000 * 60 * 60)).toFixed(2);
        }

        // very simple SLA breach example: older than 7 days and not resolved
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const slaBreaches = await Grievance.countDocuments({
            status: { $ne: "Resolved" },
            createdAt: { $lt: sevenDaysAgo },
        });

        // most active department (by number of grievances)
        const deptAgg = await Grievance.aggregate([
            {
                $group: {
                    _id: "$department", // adjust if department is nested like { name: "" }
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 1 },
        ]);

        const mostActiveDept =
            deptAgg[0]?.__id ||
            deptAgg[0]?.department ||
            deptAgg[0]?._id ||
            "N/A";

        return res.json({
            totalGrievances,
            pending,
            resolved,
            totalStudents,
            totalAdmins,
            avgResolutionTime,
            slaBreaches,
            mostActiveDept,
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/superadmin/grievances-by-status
export const grievancesByStatus = async (req, res, next) => {
    try {
        const agg = await Grievance.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const data = agg.map((row) => ({
            status: row._id || "Unknown",
            count: row.count,
        }));

        res.json(data);
    } catch (err) {
        next(err);
    }
};

// GET /api/superadmin/grievances-by-dept
export const grievancesByDept = async (req, res, next) => {
    try {
        const agg = await Grievance.aggregate([
            {
                $group: {
                    _id: "$department", // adjust if nested
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const data = agg.map((row) => ({
            department: row._id || "Unknown",
            count: row.count,
        }));

        res.json(data);
    } catch (err) {
        next(err);
    }
};

// GET /api/superadmin/grievances-trend
export const grievancesTrend = async (req, res, next) => {
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        const agg = await Grievance.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo, $lte: today },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const data = agg.map((row) => ({
            date: row._id,
            count: row.count,
        }));

        res.json(data);
    } catch (err) {
        next(err);
    }
};

export const getSuperAdminReports = async (req, res, next) => {
    try {
        // --- SUMMARY ---
        const [totalGrievances, resolved] = await Promise.all([
            Grievance.countDocuments({}),
            Grievance.countDocuments({ status: "Resolved" }),
        ]);

        // average resolution time (in hours) – optional
        const resolvedDocs = await Grievance.find(
            { status: "Resolved", resolvedAt: { $exists: true } },
            { createdAt: 1, resolvedAt: 1 }
        ).lean();

        let avgResolutionTime = 0;
        if (resolvedDocs.length > 0) {
            const totalMs = resolvedDocs.reduce((sum, g) => {
                const created = new Date(g.createdAt).getTime();
                const resolved = new Date(g.resolvedAt).getTime();
                if (!isNaN(created) && !isNaN(resolved) && resolved > created) {
                    return sum + (resolved - created);
                }
                return sum;
            }, 0);

            avgResolutionTime = +(totalMs / resolvedDocs.length / (1000 * 60 * 60)).toFixed(2);
        }

        const summary = {
            totalGrievances,
            resolved,
            avgResolutionTime,
        };

        // --- DEPARTMENT REPORT ---
        const deptAgg = await Grievance.aggregate([
            {
                $group: {
                    _id: "$department", // adjust if department is nested
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const departmentReport = deptAgg.map((row) => ({
            department: row._id || "Unknown",
            count: row.count,
        }));

        // --- STATUS REPORT ---
        const statusAgg = await Grievance.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        const statusReport = statusAgg.map((row) => ({
            status: row._id || "Unknown",
            count: row.count,
        }));

        return res.json({
            summary,
            departmentReport,
            statusReport,
        });
    } catch (err) {
        next(err);
    }
};

