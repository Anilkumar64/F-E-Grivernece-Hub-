import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import "../../styles/SuperAdmin/reports.css";
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

function SuperAdminReports() {
    const [summary, setSummary] = useState(null);
    const [deptData, setDeptData] = useState([]);
    const [statusData, setStatusData] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    const COLORS = ["#0088FE", "#FF8042", "#FFBB28", "#00C49F"];

    const fetchReports = async () => {
        try {
            setLoading(true);

            // axiosInstance already has baseURL: /api and Authorization header
            const res = await api.get("/superadmin/reports");

            const data = res.data || {};

            setSummary(data.summary || {});

            const deptReport = Array.isArray(data.departmentReport)
                ? data.departmentReport
                : [];

            setDeptData(
                deptReport.map((d) => ({
                    department: d.department,
                    total: d.count,
                }))
            );

            const statusReport = Array.isArray(data.statusReport)
                ? data.statusReport
                : [];

            setStatusData(
                statusReport.map((s) => ({
                    name: s.status,
                    value: s.count,
                }))
            );
        } catch (error) {
            console.error(error);
            toast.error(
                error?.response?.data?.message || "Failed to load reports"
            );

            if (error?.response?.status === 401) {
                navigate("/superadmin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading || !summary) {
        return <p className="p-6">Loading reports...</p>;
    }

    return (
        <div className="reports-container">
            <h1 className="reports-title">📊 SuperAdmin Analytics Dashboard</h1>

            {/* Summary Cards */}
            <div className="reports-summary-grid">
                <div className="reports-summary-card">
                    <h2>Total Grievances</h2>
                    <div className="reports-value">{summary.totalGrievances ?? 0}</div>
                </div>

                <div className="reports-summary-card">
                    <h2>Resolved</h2>
                    <div className="reports-value reports-value-green">
                        {summary.resolved ?? 0}
                    </div>
                </div>

                <div className="reports-summary-card">
                    <h2>Avg Resolution Time</h2>
                    <div className="reports-value">
                        {summary.avgResolutionTime ?? 0} hrs
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="reports-chart-grid">

                {/* Pie Chart */}
                <div className="reports-chart-card">
                    <h2 className="reports-chart-title">Grievance Status Breakdown</h2>

                    {statusData.length ? (
                        <PieChart width={400} height={300}>
                            <Pie
                                data={statusData}
                                dataKey="value"
                                nameKey="name"
                                outerRadius={120}
                                label
                            >
                                {statusData.map((entry, index) => (
                                    <Cell
                                        key={index}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    ) : (
                        <p className="reports-empty">No status data available.</p>
                    )}
                </div>

                {/* Bar Chart */}
                <div className="reports-chart-card">
                    <h2 className="reports-chart-title">Department-wise Grievances</h2>

                    {deptData.length ? (
                        <BarChart width={480} height={300} data={deptData}>
                            <XAxis dataKey="department" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total" name="Total Grievances" />
                        </BarChart>
                    ) : (
                        <p className="reports-empty">No department data available.</p>
                    )}
                </div>
            </div>
        </div>
    );

}

export default SuperAdminReports;
