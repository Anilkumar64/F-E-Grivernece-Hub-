import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axiosInstance";
import { Pie, Bar } from "react-chartjs-2";
import "../../styles/AdminStyles/AdminDashBoard.css";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";
import { toast } from "react-toastify";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
);

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [latest, setLatest] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // admin from localStorage
    const storedAdmin = (() => {
        try {
            const raw = localStorage.getItem("admin");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    })();

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadDashboard = async () => {
        try {
            setLoading(true);

            const [statsRes, recentRes] = await Promise.all([
                api.get("/grievances/admin/dashboard"),
                api.get("/grievances/admin/latest"),
            ]);

            setStats(statsRes.data || null);
            setLatest(recentRes.data?.grievances || []);
        } catch (err) {
            console.error("Admin dashboard error:", err);

            if (err?.response?.status === 401) {
                toast.error("Session expired. Please log in again.");
                navigate("/admin/login");
            } else {
                toast.error("Failed to load dashboard");
            }

            setStats(null);
            setLatest([]);
        } finally {
            setLoading(false);
        }
    };

    const handleNav = (path) => {
        navigate(path);
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
        toast.success("Logged out");
        navigate("/admin/login");
    };

    const counts = stats?.counts || {};
    const months = stats?.months || [];

    const pieData = {
        labels: ["Pending", "In Progress", "Resolved", "Rejected"],
        datasets: [
            {
                data: [
                    counts.pending || 0,
                    counts.inprogress || 0,
                    counts.resolved || 0,
                    counts.rejected || 0,
                ],
                backgroundColor: ["#facc15", "#3b82f6", "#22c55e", "#ef4444"],
            },
        ],
    };

    const barData = {
        labels: months.map((m) => m.month),
        datasets: [
            {
                label: "Grievances",
                data: months.map((m) => m.count),
                backgroundColor: "#4f46e5",
            },
        ],
    };

    const totalOpen =
        (counts.pending || 0) + (counts.inprogress || 0) + (counts.rejected || 0);

    const isLoadingState = loading || !stats || !stats.counts || !Array.isArray(stats.months);

    return (
        <div className="admin-shell">
            <main className="admin-shell-main">
                <header className="admin-main-header">
                    <div>
                        <h1 className="admin-main-title">Admin Dashboard</h1>
                        <p className="admin-main-subtitle">
                            Monitor grievances in your department and act quickly.
                        </p>
                    </div>
                </header>

                {isLoadingState ? (
                    <div className="admin-loading-block">
                        <div className="loader">Loading dashboard...</div>
                    </div>
                ) : (
                    <>
                        {/* Metrics */}
                        <section className="admin-metrics">
                            <MetricCard
                                label="Total Grievances"
                                value={counts.total ?? 0}
                                tone="yellow"
                            />
                            <MetricCard
                                label="In Progress"
                                value={counts.inprogress ?? 0}
                                tone="blue"
                            />
                            <MetricCard
                                label="Resolved"
                                value={counts.resolved ?? 0}
                                tone="green"
                            />
                            <MetricCard
                                label="Open (Pending / Rejected)"
                                value={totalOpen}
                                tone="red"
                            />
                        </section>

                        {/* Charts */}
                        <section className="admin-charts">
                            <div className="chart-card glass">
                                <div className="chart-header">
                                    <h4>Status Distribution</h4>
                                    <span className="chart-sub">
                                        Current state of grievances in your department
                                    </span>
                                </div>
                                {counts.total ? (
                                    <Pie data={pieData} />
                                ) : (
                                    <p className="chart-empty">
                                        Not enough data yet to show this chart.
                                    </p>
                                )}
                            </div>

                            <div className="chart-card glass">
                                <div className="chart-header">
                                    <h4>Monthly Complaints</h4>
                                    <span className="chart-sub">
                                        Volume of grievances in recent months
                                    </span>
                                </div>
                                {months.length > 0 ? (
                                    <Bar data={barData} />
                                ) : (
                                    <p className="chart-empty">
                                        No monthly grievance data available.
                                    </p>
                                )}
                            </div>
                        </section>

                        {/* Quick Actions */}
                        <section className="admin-quick-actions glass-soft">
                            <div className="qa-left">
                                <h3>Quick Actions</h3>
                                <p>Jump straight into the queues that matter most.</p>
                            </div>
                            <div className="qa-buttons">
                                <button
                                    className="qa-btn primary"
                                    onClick={() => handleNav("/admin/grievances")}
                                >
                                    View All Grievances
                                </button>
                                <button
                                    className="qa-btn"
                                    onClick={() => handleNav("/admin/pending")}
                                >
                                    Pending Only
                                </button>
                                <button
                                    className="qa-btn"
                                    onClick={() => handleNav("/admin/manage-types")}
                                >
                                    Manage Complaint Types
                                </button>
                            </div>
                        </section>

                        {/* Latest Grievances */}
                        <section className="latest-section glass">
                            <div className="latest-header">
                                <h3>Latest Grievances</h3>
                                <button
                                    className="view-all-link"
                                    onClick={() => handleNav("/admin/grievances")}
                                >
                                    View all
                                </button>
                            </div>

                            {latest.length === 0 ? (
                                <p>No recent grievances found.</p>
                            ) : (
                                <div className="latest-table-wrapper">
                                    <table className="latest-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Student</th>
                                                <th>Status</th>
                                                <th>Priority</th>
                                                <th>Date</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {latest.map((g) => (
                                                <tr key={g._id}>
                                                    <td>{g.title}</td>
                                                    <td>{g.userEmail}</td>

                                                    <td>
                                                        <span
                                                            className={`status-badge ${g.status
                                                                ? g.status
                                                                    .replace(" ", "")
                                                                    .toLowerCase()
                                                                : ""
                                                                }`}
                                                        >
                                                            {g.status}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`priority-badge ${g.priority
                                                                ? g.priority.toLowerCase()
                                                                : ""
                                                                }`}
                                                        >
                                                            {g.priority}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {g.createdAt
                                                            ? new Date(
                                                                g.createdAt
                                                            ).toLocaleDateString()
                                                            : "-"}
                                                    </td>

                                                    <td>
                                                        <button
                                                            className="view-btn"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/admin/grievance/${g._id}`
                                                                )
                                                            }
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

/* ------------ Sidebar component ------------ */

function Sidebar({ admin, collapsed, location, onNav, onLogout, onToggle }) {
    const name =
        admin?.name ||
        admin?.username ||
        admin?.email?.split("@")[0] ||
        "Admin";
    const initials =
        name
            .split(" ")
            .map((n) => n[0]?.toUpperCase())
            .join("")
            .slice(0, 2) || "A";

    const roleLabel =
        admin?.role === "superadmin"
            ? "Super Admin"
            : admin?.role === "departmentadmin"
                ? "Department Admin"
                : "Admin";

    const deptName =
        admin?.department?.name || admin?.department || "Not set";

    const menuItems = [
        { label: "Dashboard", path: "/admin/dashboard" },
        { label: "All Grievances", path: "/admin/grievances" },
        { label: "Pending Grievances", path: "/admin/pending" },
        { label: "Manage Types", path: "/admin/manage-types" },
        { label: "Profile", path: "/admin/profile" },
    ];

    return (
        <aside
            className={`admin-sidebar-glass ${collapsed ? "collapsed" : ""
                }`}
        >
            <div className="admin-sidebar-header">
                {!collapsed && (
                    <div className="admin-sidebar-brand">
                        <span className="brand-dot" />
                        <span className="brand-text">E-Grievance Hub</span>
                    </div>
                )}

                <button className="sidebar-toggle-icon" onClick={onToggle}>
                    {collapsed ? "»" : "«"}
                </button>
            </div>

            <div className="admin-sidebar-profile">
                <div className="admin-avatar-glass">{initials}</div>
                {!collapsed && (
                    <div className="admin-profile-meta">
                        <div className="admin-name">{name}</div>
                        <div className="admin-role">{roleLabel}</div>
                        <div className="admin-dept">
                            Dept: <span>{deptName}</span>
                        </div>
                    </div>
                )}
            </div>

            <nav className="admin-sidebar-menu">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        className={`admin-menu-item ${location.pathname === item.path ? "active" : ""
                            }`}
                        onClick={() => onNav(item.path)}
                    >
                        {!collapsed && <span>{item.label}</span>}
                        {collapsed && (
                            <span className="menu-dot" title={item.label} />
                        )}
                    </button>
                ))}
            </nav>

            <div className="admin-sidebar-footer">
                <button className="admin-logout-btn-glass" onClick={onLogout}>
                    {!collapsed ? "Logout" : "⏏"}
                </button>
            </div>
        </aside>
    );
}

/* ------------ Small metric card ------------ */

function MetricCard({ label, value, tone }) {
    return (
        <div className={`metric-card glass-soft ${tone}`}>
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
        </div>
    );
}
