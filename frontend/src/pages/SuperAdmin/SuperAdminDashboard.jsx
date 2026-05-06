import React, { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import Card from "../../components/ui/Card";

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
        <section className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">SuperAdmin Dashboard</h1>
                <p className="text-sm text-gray-600">Campus-wide snapshot across grievances, users, approvals, and SLA health.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Grievances</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.totalGrievances}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pending</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.pending}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">In Progress</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.inProgress}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Resolved</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.resolved}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Escalated</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.escalated}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Students</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.totalStudents}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Admins</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.totalAdmins}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">SLA Breaches</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.slaBreaches}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Avg Resolution</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.avgResolutionTime}h</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pending Approvals</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.pendingAdmins}</p></Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Status Distribution</h2>
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
                </Card>

                <Card>
                    <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Most Active Department</h2>
                    <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Most Active</p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{data.mostActiveDept}</p>
                    </div>
                    <div className="mt-3 rounded-xl bg-gray-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Avg Resolution Time</p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{data.avgResolutionTime} hours</p>
                    </div>
                </Card>
            </div>
        </section>
    );
}