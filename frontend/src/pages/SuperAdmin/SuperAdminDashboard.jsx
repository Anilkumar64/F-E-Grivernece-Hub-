import React, { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

const COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2"];

export default function SuperAdminDashboard() {
    const [data, setData] = useState(null);
    const [statusData, setStatusData] = useState([]);

    useEffect(() => {
        // ✅ was /grievances/analytics — that's admin-only dept-scoped data
        // superadmin stats live at /superadmin/stats
        api.get("/superadmin/stats").then((res) => setData(res.data));
        api.get("/superadmin/grievances-by-status").then((res) => setStatusData(res.data || []));
    }, []);

    if (!data) return <Skeleton rows={4} />;

    // grievances-by-status returns [{ status, count }]
    // grievances-by-dept returns [{ department, count }] — fetch inline
    return (
        <section className="page-section">
            <div className="page-heading"><h1>Dashboard</h1></div>

            <div className="summary-grid">
                <div className="metric-card">
                    <span>Total Grievances</span>
                    <strong>{data.totalGrievances}</strong>          {/* ✅ was data.totals.total */}
                </div>
                <div className="metric-card">
                    <span>Pending</span>
                    <strong>{data.pending}</strong>
                </div>
                <div className="metric-card">
                    <span>In Progress</span>
                    <strong>{data.inProgress}</strong>
                </div>
                <div className="metric-card">
                    <span>Resolved</span>
                    <strong>{data.resolved}</strong>                  {/* ✅ was data.totals.resolved */}
                </div>
                <div className="metric-card danger">
                    <span>Escalated</span>
                    <strong>{data.escalated}</strong>                 {/* ✅ was data.totals.escalated */}
                </div>
                <div className="metric-card">
                    <span>Total Students</span>
                    <strong>{data.totalStudents}</strong>
                </div>
                <div className="metric-card">
                    <span>Total Admins</span>
                    <strong>{data.totalAdmins}</strong>
                </div>
                <div className="metric-card">
                    <span>SLA Breaches</span>
                    <strong>{data.slaBreaches}</strong>
                </div>
                <div className="metric-card">
                    <span>Avg Resolution</span>
                    <strong>{data.avgResolutionTime}h</strong>
                </div>
                <div className="metric-card">
                    <span>Pending Approvals</span>
                    <strong>{data.pendingAdmins}</strong>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="chart-panel">
                    <h2>Status Distribution</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                dataKey="count"
                                nameKey="status"
                                label={({ status, count }) => `${status}: ${count}`}
                            >
                                {statusData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-panel">
                    <h2>Most Active Department</h2>
                    <div className="metric-card" style={{ marginTop: 16 }}>
                        <span>Most Active</span>
                        <strong>{data.mostActiveDept}</strong>
                    </div>
                    <div className="metric-card" style={{ marginTop: 8 }}>
                        <span>Avg Resolution Time</span>
                        <strong>{data.avgResolutionTime} hours</strong>
                    </div>
                </div>
            </div>
        </section>
    );
}