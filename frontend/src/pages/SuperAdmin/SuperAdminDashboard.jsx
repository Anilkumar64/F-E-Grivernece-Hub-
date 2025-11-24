import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line } from "recharts";
import { toast } from "react-toastify";
import "../styles/SuperAdminDashboard.css";

export default function SuperAdminDashboard() {
    const navigate = useNavigate();

    const [stats, setStats] = useState({});
    const [statusData, setStatusData] = useState([]);
    const [deptData, setDeptData] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF4F4F"];

    useEffect(() => {
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

            setStatusData(
                Array.isArray(res2.data?.items || res2.data)
                    ? res2.data.items || res2.data
                    : []
            );

            setDeptData(
                Array.isArray(res3.data?.items || res3.data)
                    ? res3.data.items || res3.data
                    : []
            );

            setTrendData(
                Array.isArray(res4.data?.items || res4.data)
                    ? res4.data.items || res4.data
                    : []
            );
        } catch (err) {
            console.error("Dashboard loading error:", err);
            toast.error(
                err?.response?.data?.message || "Failed to load SuperAdmin dashboard"
            );

            if (err?.response?.status === 401) {
                navigate("/superadmin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="sa-dashboard-loading">Loading SuperAdmin Dashboard...</div>;
    }

    return (
        <div className="sa-dashboard">
            <h1 className="sa-title">SuperAdmin Dashboard</h1>

            {/* Top Cards */}
            <div className="sa-cards">
                <div className="sa-card">
                    <h3>Total Grievances</h3><br />
                    <p>{stats.totalGrievances ?? 0}</p>
                </div>

                <div className="sa-card">
                    <h3>Pending</h3>
                    <p className="yellow">{stats.pending ?? 0}</p>
                </div>

                <div className="sa-card">
                    <h3>Resolved</h3>
                    <p className="green">{stats.resolved ?? 0}</p>
                </div>

                <div className="sa-card">
                    <h3>Total Students</h3>
                    <p>{stats.totalStudents ?? 0}</p>
                </div>

                <div className="sa-card">
                    <h3>Total Admins</h3>
                    <p>{stats.totalAdmins ?? 0}</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="sa-charts">
                {/* Status Pie */}
                <div className="sa-chart-card">
                    <h3>Status Breakdown</h3>
                    {statusData.length ? (
                        <PieChart width={350} height={300}>
                            <Pie
                                data={statusData}
                                dataKey="count"
                                nameKey="status"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
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

                {/* Department Bar Chart */}
                <div className="sa-chart-card">
                    <h3>Grievances by Department</h3>
                    {deptData.length ? (
                        <BarChart width={450} height={300} data={deptData}>
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

                {/* Trend Line Chart */}
                <div className="sa-chart-card">
                    <h3>Grievance Trend (Last 30 days)</h3>
                    {trendData.length ? (
                        <LineChart width={550} height={300} data={trendData}>
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#00C49F"
                                strokeWidth={2}
                            />
                        </LineChart>
                    ) : (
                        <p className="sa-empty">No trend data available</p>
                    )}
                </div>
            </div>

            {/* System overview */}
            <div className="sa-overview">
                <h3>Quick Insights</h3>
                <div className="overview-grid">
                    <div className="ov-box">
                        <h4>Most Active Department</h4>
                        <p>{stats.mostActiveDept || "N/A"}</p>
                    </div>

                    <div className="ov-box">
                        <h4>Average Resolution Time</h4>
                        <p>{stats.avgResolutionTime ?? 0} hrs</p>
                    </div>

                    <div className="ov-box">
                        <h4>SLA Violations</h4>
                        <p className="red">{stats.slaBreaches ?? 0}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
