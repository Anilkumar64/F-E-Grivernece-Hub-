// backend/src/controllers/superAdminController.js
// ✅ FIX C-04: Grievance status enums in this codebase are Title-Case ("Pending", "Resolved", …)
//    The original queries used lowercase strings ("submitted", "resolved") which never matched,
//    so totals always returned 0.
// ✅ FIX C-05: avgResolutionTime was computed from updatedAt instead of resolvedAt.
//    updatedAt changes on every save (comments, assigns, etc.) so the figure was meaningless.
//    Now uses grievance.resolvedAt with a fallback to resolutionDate if the field name varies.
// ✅ FIX C-06: slaBreaches used wrong status strings AND a fragile time heuristic.
//    Now uses the slaDeadline field (set at submission time) and correct Title-Case statuses.

import Grievance from "../models/Grievance.js";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

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
            Grievance.countDocuments({}),
            // ✅ FIX C-04: was "submitted" — correct value is "Pending"
            Grievance.countDocuments({ status: "Pending" }),
            // ✅ FIX C-04: was "resolved" — correct value is "Resolved"
            Grievance.countDocuments({ status: "Resolved" }),
            User.countDocuments({ role: "student", isActive: true }),
            Admin.countDocuments({}),
        ]);

        // ✅ FIX C-05: use resolvedAt (set when status transitions to Resolved).
        //    Original code used updatedAt which changes on every document save.
        const resolvedDocs = await Grievance.find(
            { status: "Resolved" },
            { createdAt: 1, resolvedAt: 1, resolutionDate: 1 }
        ).lean();

        let avgResolutionTime = 0;
        if (resolvedDocs.length > 0) {
            const validDocs = resolvedDocs.filter((g) => {
                const resolvedAt = g.resolvedAt || g.resolutionDate;
                return resolvedAt && new Date(resolvedAt) > new Date(g.createdAt);
            });
            if (validDocs.length > 0) {
                const totalMs = validDocs.reduce((sum, g) => {
                    const resolvedAt = new Date(g.resolvedAt || g.resolutionDate).getTime();
                    return sum + (resolvedAt - new Date(g.createdAt).getTime());
                }, 0);
                avgResolutionTime = +(totalMs / validDocs.length / (1000 * 60 * 60)).toFixed(2);
            }
        }

        // ✅ FIX C-06: original used wrong status strings AND a 7-day time heuristic.
        //    Now uses the slaDeadline field (correct) and Title-Case terminal statuses.
        const slaBreaches = await Grievance.countDocuments({
            status: { $nin: ["Resolved", "Closed"] },
            slaDeadline: { $lt: new Date() },
        });

        // Most active department
        const deptAgg = await Grievance.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 },
            {
                $lookup: {
                    from: "departments",
                    localField: "_id",
                    foreignField: "_id",
                    as: "dept",
                },
            },
        ]);
        const mostActiveDept = deptAgg[0]?.dept?.[0]?.name || "N/A";

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
            { $group: { _id: "$status", count: { $sum: 1 } } },
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
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            {
                $lookup: {
                    from: "departments",
                    localField: "_id",
                    foreignField: "_id",
                    as: "dept",
                },
            },
        ]);

        const data = agg.map((row) => ({
            department: row.dept?.[0]?.name || row._id || "Unknown",
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
            { $match: { createdAt: { $gte: thirtyDaysAgo, $lte: today } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json(agg.map((row) => ({ date: row._id, count: row.count })));
    } catch (err) {
        next(err);
    }
};

export const getSuperAdminReports = async (req, res, next) => {
    try {
        const [totalGrievances, resolved] = await Promise.all([
            Grievance.countDocuments({}),
            // ✅ FIX C-04: was lowercase "resolved"
            Grievance.countDocuments({ status: "Resolved" }),
        ]);

        // ✅ FIX C-05: use resolvedAt / resolutionDate, not updatedAt
        const resolvedDocs = await Grievance.find(
            { status: "Resolved" },
            { createdAt: 1, resolvedAt: 1, resolutionDate: 1 }
        ).lean();

        let avgResolutionTime = 0;
        if (resolvedDocs.length > 0) {
            const validDocs = resolvedDocs.filter((g) => {
                const resolvedAt = g.resolvedAt || g.resolutionDate;
                return resolvedAt && new Date(resolvedAt) > new Date(g.createdAt);
            });
            if (validDocs.length > 0) {
                const totalMs = validDocs.reduce((sum, g) => {
                    const resolvedAt = new Date(g.resolvedAt || g.resolutionDate).getTime();
                    return sum + (resolvedAt - new Date(g.createdAt).getTime());
                }, 0);
                avgResolutionTime = +(totalMs / validDocs.length / (1000 * 60 * 60)).toFixed(2);
            }
        }

        const deptAgg = await Grievance.aggregate([
            { $group: { _id: "$department", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            {
                $lookup: {
                    from: "departments",
                    localField: "_id",
                    foreignField: "_id",
                    as: "dept",
                },
            },
        ]);

        const statusAgg = await Grievance.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        return res.json({
            summary: { totalGrievances, resolved, avgResolutionTime },
            departmentReport: deptAgg.map((row) => ({
                department: row.dept?.[0]?.name || "Unknown",
                count: row.count,
            })),
            statusReport: statusAgg.map((row) => ({
                status: row._id || "Unknown",
                count: row.count,
            })),
        });
    } catch (err) {
        next(err);
    }
};