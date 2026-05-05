import React, { useContext, useEffect, useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";
import Skeleton from "../../components/common/Skeleton";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

export default function AdminDashboard() {
    const { authUser } = useContext(AuthContext);
    const [data, setData] = useState(null);
    useEffect(() => { api.get("/grievances/analytics").then((res) => setData(res.data)); }, []);
    if (!data) return <Skeleton rows={4} />;

    const count = (status) => data.statusDistribution.find((item) => item._id === status)?.count || 0;
    const trend = (data.recent || []).map((item) => ({ date: new Date(item.createdAt).toLocaleDateString(), count: 1 }));

    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{authUser?.department?.name || "Department"} Dashboard</h1>
                <p className="text-sm text-gray-600">Monitor assigned grievances and SLA risk.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Assigned</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.totals.total}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pending</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{count("Pending")}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">In Progress</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{count("InProgress")}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Resolved</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{count("Resolved")}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Escalated</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{data.totals.escalated}</p></Card>
                <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Overdue SLA</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{(data.slaWarnings || []).filter((g) => new Date(g.slaDeadline) < new Date()).length}</p></Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <Card><h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Grievances by Category</h2><ResponsiveContainer width="100%" height={260}><BarChart data={data.byCategory}><XAxis dataKey="_id" hide /><YAxis /><Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
                <Card><h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-900">Recent Submissions</h2><ResponsiveContainer width="100%" height={260}><LineChart data={trend}><XAxis dataKey="date" hide /><YAxis /><Line type="monotone" dataKey="count" stroke="#4f46e5" strokeWidth={2} /></LineChart></ResponsiveContainer></Card>
            </div>
            <Card className="space-y-4">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">Approaching SLA Deadline</h2>
                <div className="responsive-table"><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Due</th></tr></thead><tbody>{(data.slaWarnings || []).map((g) => <tr key={g._id}><td>{g.grievanceId}</td><td>{g.title}</td><td><Badge className={g.status === "Resolved" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}>{g.status}</Badge></td><td>{new Date(g.slaDeadline).toLocaleString()}</td></tr>)}</tbody></table></div>
            </Card>
        </section>
    );
}
