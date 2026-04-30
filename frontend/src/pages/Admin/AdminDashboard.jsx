import React, { useContext, useEffect, useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";
import Skeleton from "../../components/common/Skeleton";

export default function AdminDashboard() {
    const { authUser } = useContext(AuthContext);
    const [data, setData] = useState(null);
    useEffect(() => { api.get("/grievances/analytics").then((res) => setData(res.data)); }, []);
    if (!data) return <Skeleton rows={4} />;

    const count = (status) => data.statusDistribution.find((item) => item._id === status)?.count || 0;
    const trend = (data.recent || []).map((item) => ({ date: new Date(item.createdAt).toLocaleDateString(), count: 1 }));

    return (
        <section className="page-section">
            <div className="page-heading">
                <div><h1>{authUser?.department?.name || "Department"} Dashboard</h1><p>Monitor assigned grievances and SLA risk.</p></div>
            </div>
            <div className="summary-grid">
                <div className="metric-card"><span>Total Assigned</span><strong>{data.totals.total}</strong></div>
                <div className="metric-card"><span>Pending</span><strong>{count("Pending")}</strong></div>
                <div className="metric-card"><span>In Progress</span><strong>{count("InProgress")}</strong></div>
                <div className="metric-card"><span>Resolved</span><strong>{count("Resolved")}</strong></div>
                <div className="metric-card"><span>Escalated</span><strong>{data.totals.escalated}</strong></div>
                <div className="metric-card"><span>Overdue SLA</span><strong>{(data.slaWarnings || []).filter((g) => new Date(g.slaDeadline) < new Date()).length}</strong></div>
            </div>
            <div className="dashboard-grid">
                <div className="chart-panel"><h2>Grievances by Category</h2><ResponsiveContainer width="100%" height={260}><BarChart data={data.byCategory}><XAxis dataKey="_id" hide /><YAxis /><Bar dataKey="count" fill="#2563EB" /></BarChart></ResponsiveContainer></div>
                <div className="chart-panel"><h2>Recent Submissions</h2><ResponsiveContainer width="100%" height={260}><LineChart data={trend}><XAxis dataKey="date" hide /><YAxis /><Line type="monotone" dataKey="count" stroke="#2563EB" /></LineChart></ResponsiveContainer></div>
            </div>
            <div className="card">
                <h2>Approaching SLA Deadline</h2>
                <div className="responsive-table"><table><thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Due</th></tr></thead><tbody>{(data.slaWarnings || []).map((g) => <tr key={g._id}><td>{g.grievanceId}</td><td>{g.title}</td><td><span className={`status-badge ${g.status}`}>{g.status}</span></td><td>{new Date(g.slaDeadline).toLocaleString()}</td></tr>)}</tbody></table></div>
            </div>
        </section>
    );
}
