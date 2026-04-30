import React, { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from "recharts";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    useEffect(() => { api.get("/grievances/analytics").then((res) => setData(res.data)); }, []);
    if (!data) return <Skeleton rows={4} />;

    const count = (status) => data.statusDistribution.find((item) => item._id === status)?.count || 0;

    return (
        <section className="page-section">
            <div className="page-heading"><h1>Dashboard</h1></div>
            <div className="summary-grid">
                <div className="metric-card"><span>Total Assigned</span><strong>{data.totals.total}</strong></div>
                <div className="metric-card"><span>Pending</span><strong>{count("Pending")}</strong></div>
                <div className="metric-card"><span>In Progress</span><strong>{count("InProgress")}</strong></div>
                <div className="metric-card"><span>Resolved</span><strong>{count("Resolved")}</strong></div>
                <div className="metric-card danger"><span>Escalated</span><strong>{data.totals.escalated}</strong></div>
            </div>
            <div className="chart-panel"><h2>Grievances by Category</h2><ResponsiveContainer width="100%" height={260}><BarChart data={data.byCategory}><XAxis dataKey="_id" hide /><YAxis /><Bar dataKey="count" fill="#2563EB" /></BarChart></ResponsiveContainer></div>
            <div className="table-card"><h2>SLA Warnings</h2>{data.slaWarnings.map((g) => <p key={g._id}>{g.grievanceId} - {g.title}</p>)}</div>
        </section>
    );
}
