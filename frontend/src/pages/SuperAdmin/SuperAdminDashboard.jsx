import React, { useEffect, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

export default function SuperAdminDashboard() {
    const [data, setData] = useState(null);
    useEffect(() => { api.get("/grievances/analytics").then((res) => setData(res.data)); }, []);
    if (!data) return <Skeleton rows={4} />;
    return (
        <section className="page-section">
            <div className="page-heading"><h1>Dashboard</h1></div>
            <div className="summary-grid">
                <div className="metric-card"><span>Total Grievances</span><strong>{data.totals.total}</strong></div>
                <div className="metric-card"><span>Resolved</span><strong>{data.totals.resolved}</strong></div>
                <div className="metric-card danger"><span>Escalated</span><strong>{data.totals.escalated}</strong></div>
                <div className="metric-card"><span>Avg Rating</span><strong>{data.feedback[0]?.averageRating?.toFixed?.(1) || "-"}</strong></div>
            </div>
            <div className="dashboard-grid">
                <div className="chart-panel"><h2>Status Distribution</h2><ResponsiveContainer height={260}><PieChart><Pie data={data.statusDistribution} dataKey="count" nameKey="_id">{data.statusDistribution.map((_, i) => <Cell key={i} fill={["#2563EB", "#16A34A", "#D97706", "#DC2626"][i % 4]} />)}</Pie></PieChart></ResponsiveContainer></div>
                <div className="chart-panel"><h2>Grievances by Department</h2><ResponsiveContainer height={260}><BarChart data={data.byDepartment}><XAxis dataKey="_id" hide /><YAxis /><Bar dataKey="count" fill="#2563EB" /></BarChart></ResponsiveContainer></div>
            </div>
        </section>
    );
}
