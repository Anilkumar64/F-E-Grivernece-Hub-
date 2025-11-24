import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
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
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">
                📊 SuperAdmin Analytics Dashboard
            </h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 shadow rounded-lg">
                    <h2 className="text-gray-500">Total Grievances</h2>
                    <h1 className="text-3xl font-semibold">
                        {summary.totalGrievances ?? 0}
                    </h1>
                </div>

                <div className="bg-white p-5 shadow rounded-lg">
                    <h2 className="text-gray-500">Resolved</h2>
                    <h1 className="text-3xl font-semibold text-green-600">
                        {summary.resolved ?? 0}
                    </h1>
                </div>

                <div className="bg-white p-5 shadow rounded-lg">
                    <h2 className="text-gray-500">Avg Resolution Time</h2>
                    <h1 className="text-3xl font-semibold">
                        {summary.avgResolutionTime ?? 0} hrs
                    </h1>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Pie Chart */}
                <div className="bg-white p-6 shadow rounded-lg">
                    <h2 className="text-lg font-semibold mb-4">
                        Grievance Status Breakdown
                    </h2>

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
                                        key={`cell-${index}`}
                                        fill={
                                            COLORS[index % COLORS.length]
                                        }
                                    />
                                ))}
                            </Pie>
                            <Legend />
                            <Tooltip />
                        </PieChart>
                    ) : (
                        <p className="text-sm text-gray-500">
                            No status data available.
                        </p>
                    )}
                </div>

                {/* Department Bar Chart */}
                <div className="bg-white p-6 shadow rounded-lg">
                    <h2 className="text-lg font-semibold mb-4">
                        Department-wise Grievances
                    </h2>

                    {deptData.length ? (
                        <BarChart width={500} height={300} data={deptData}>
                            <XAxis dataKey="department" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="total"
                                name="Total Grievances"
                            />
                        </BarChart>
                    ) : (
                        <p className="text-sm text-gray-500">
                            No department data available.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SuperAdminReports;
