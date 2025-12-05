import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import "../../styles/SuperAdmin/superAdminDashboard.css";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Bar,
    LineChart,
    Line,
} from "recharts";
import { toast } from "react-toastify";

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const hasFetched = useRef(false);

    const [stats, setStats] = useState({});
    const [statusData, setStatusData] = useState([]);
    const [deptData, setDeptData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ["#4F46E5", "#22C55E", "#F97316", "#EF4444"];

    const normalizeList = (payload) => {
        if (!payload) return [];
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.items)) return payload.items;
        return [];
    };

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        const fetchAllData = async () => {
            try {
                setLoading(true);

                const [res1, res2, res3, res4] = await Promise.all([
                    api.get("/superadmin/stats"),
                    api.get("/superadmin/grievances-by-status"),
                    api.get("/superadmin/grievances-by-dept"),
                    api.get("/superadmin/grievances-trend"),
                ]);

                setStats(res1.data || {});
                setStatusData(normalizeList(res2.data));
                setDeptData(normalizeList(res3.data));
                setTrendData(normalizeList(res4.data));
            } catch (err) {
                console.error("Dashboard loading error:", err);
                toast.error(
                    err?.response?.data?.message ||
                    "Failed to load SuperAdmin dashboard"
                );

                if (err?.response?.status === 401) {
                    navigate("/superadmin/login");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, []);

    const go = (path) => navigate(path);

    if (loading) {
        return (
            <div className="sa-fullscreen-loader">
                Loading SuperAdmin Dashboard...
            </div>
        );
    }

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("superadmin");
        toast.success("Logged out");
        navigate("/superadmin/login", { replace: true });
    };

    return (
        <div >

            {/* ======================== SIDEBAR ======================== */}

            {/* RIGHT MAIN */}
            <main className="sa-main">
                {/* TOP BAR */}
                <header className="sa-topbar">
                    <div>
                        <h1 className="sa-topbar-title">
                            Welcome, {stats.superAdminName || "Super Admin"} 👋
                        </h1>
                        <p className="sa-topbar-sub">
                            All systems are running smoothly. You have{" "}
                            <span className="sa-highlight">
                                {stats.pending ?? 0} unresolved grievances
                            </span>
                            .
                        </p>
                    </div>

                    <div className="sa-topbar-right">
                        <div className="sa-date-pill">
                            {new Date().toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                        </div>
                    </div>
                </header>

                {/* HERO + STATS CARDS */}
                <section >
                    {/* Left hero panel */}
                    <div >
                        <div >
                            <h2>Campus Snapshot</h2>
                            <p>
                                Track grievances, departments and admin activity in one
                                unified view.
                            </p>
                            <div className="sa-hero-badges">
                                <span>⚡ Live metrics</span>
                                <span>🛡 Transparency</span>
                                <span>🎓 Student focus</span>
                            </div>
                        </div>
                        <div className="sa-hero-graphic">
                            {/* simple placeholder illustration */}
                            <div className="sa-hero-bubble sa-hero-bubble-1" />
                            <div className="sa-hero-bubble sa-hero-bubble-2" />
                            <div className="sa-hero-bubble sa-hero-bubble-3" />
                        </div>
                    </div>

                    {/* Right stat cards */}
                    <div className="sa-stats-grid">
                        <div className="sa-stat-card stat-blue">
                            <span className="sa-stat-label">Total Grievances</span>
                            <span className="sa-stat-value">
                                {stats.totalGrievances ?? 0}
                            </span>
                        </div>
                        <div className="sa-stat-card stat-purple">
                            <span className="sa-stat-label">Pending</span>
                            <span className="sa-stat-value">
                                {stats.pending ?? 0}
                            </span>
                        </div>
                        <div className="sa-stat-card stat-green">
                            <span className="sa-stat-label">Resolved</span>
                            <span className="sa-stat-value">
                                {stats.resolved ?? 0}
                            </span>
                        </div>
                        <div className="sa-stat-card stat-orange">
                            <span className="sa-stat-label">Total Admins</span>
                            <span className="sa-stat-value">
                                {stats.totalAdmins ?? 0}
                            </span>
                        </div>
                    </div>
                </section>

                {/* CHARTS ROW */}
                <section className="sa-charts-row">
                    <div className="sa-chart-card">
                        <div className="sa-chart-header">
                            <h3>Status Breakdown</h3>
                        </div>
                        {statusData.length ? (
                            <PieChart width={320} height={260}>
                                <Pie
                                    data={statusData}
                                    dataKey="count"
                                    nameKey="status"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    label
                                >
                                    {statusData.map((entry, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={COLORS[idx % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        ) : (
                            <p className="sa-empty">No status data available</p>
                        )}
                    </div>

                    <div className="sa-chart-card">
                        <div className="sa-chart-header">
                            <h3>Grievances by Department</h3>
                        </div>
                        {deptData.length ? (
                            <BarChart width={420} height={260} data={deptData}>
                                <XAxis dataKey="department" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" />
                            </BarChart>
                        ) : (
                            <p className="sa-empty">No department data available</p>
                        )}
                    </div>

                    <div className="sa-chart-card">
                        <div className="sa-chart-header">
                            <h3>Grievance Trend (30 days)</h3>
                        </div>
                        {trendData.length ? (
                            <LineChart width={420} height={260} data={trendData}>
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#4F46E5"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        ) : (
                            <p className="sa-empty">No trend data available</p>
                        )}
                    </div>
                </section>

                {/* BOTTOM ROW: INSIGHTS + SYSTEM CONTROL */}
                <section className="sa-bottom-row">
                    <div className="sa-panel-card">
                        <div className="sa-panel-header">
                            <h3>Quick Insights</h3>
                        </div>
                        <div className="sa-insights-grid">
                            <div className="sa-insight-item">
                                <span className="sa-insight-label">
                                    Most Active Department
                                </span>
                                <span className="sa-insight-value">
                                    {stats.mostActiveDept || "N/A"}
                                </span>
                            </div>
                            <div className="sa-insight-item">
                                <span className="sa-insight-label">
                                    Avg Resolution Time
                                </span>
                                <span className="sa-insight-value">
                                    {stats.avgResolutionTime ?? 0} hrs
                                </span>
                            </div>
                            <div className="sa-insight-item">
                                <span className="sa-insight-label">SLA Violations</span>
                                <span className="sa-insight-value sa-text-red">
                                    {stats.slaBreaches ?? 0}
                                </span>
                            </div>
                            <div className="sa-insight-item">
                                <span className="sa-insight-label">
                                    Pending Admin Approvals
                                </span>
                                <span className="sa-insight-value">
                                    {stats.pendingAdmins ?? 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="sa-panel-card">
                        <div className="sa-panel-header">
                            <h3>System Actions</h3>
                        </div>
                        <div className="sa-actions-grid">
                            <button
                                className="sa-action-btn"
                                type="button"
                                onClick={() => go("/superadmin/pending-admins")}
                            >
                                Review Pending Admins
                            </button>
                            <button
                                className="sa-action-btn"
                                type="button"
                                onClick={() => go("/superadmin/manage-departments")}
                            >
                                Manage Departments
                            </button>
                            <button
                                className="sa-action-btn"
                                type="button"
                                onClick={() => go("/superadmin/complaint-types")}
                            >
                                Manage Complaint Types
                            </button>
                            <button
                                className="sa-action-btn"
                                type="button"
                                onClick={() => go("/superadmin/site-config")}
                            >
                                Edit Landing Page
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
