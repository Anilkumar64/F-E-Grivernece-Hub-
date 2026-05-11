import React, { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Brain, TrendingUp, AlertTriangle, Users, RefreshCw, Loader2, Layers, Activity } from "lucide-react";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Skeleton from "../../components/common/Skeleton";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const PERF_COLORS = {
    excellent:          "bg-emerald-100 text-emerald-800",
    good:               "bg-blue-100 text-blue-800",
    average:            "bg-gray-100 text-gray-700",
    needs_improvement:  "bg-rose-100 text-rose-800",
};

/* ── Clusters Panel ──────────────────────────────────────────────────────── */
function ClustersPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/ai/insights/clusters")
            .then((res) => setData(res.data))
            .catch(() => setData({ available: false }))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton rows={3} />;
    if (!data?.available || !data.clusters?.length)
        return <p className="text-sm text-gray-500 italic">No clusters available — submit more grievances.</p>;

    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-500">Analyzed {data.total_analyzed} grievances from the last 30 days.</p>
            {data.clusters.map((c) => (
                <div key={c.cluster_id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-800 text-sm">{c.label}</span>
                        <Badge className="bg-indigo-100 text-indigo-700">{c.size} grievances</Badge>
                    </div>
                    {c.root_cause && <p className="text-xs text-gray-600 italic">{c.root_cause}</p>}
                    <div className="flex flex-wrap gap-1">
                        {c.sample_titles.map((t, i) => (
                            <span key={i} className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-600">{t}</span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ── Anomalies Panel ─────────────────────────────────────────────────────── */
function AnomaliesPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/ai/insights/anomalies")
            .then((res) => setData(res.data))
            .catch(() => setData({ available: false }))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton rows={2} />;
    if (!data?.available || !data.anomalies?.length)
        return <p className="text-sm text-gray-500 italic">No volume spikes detected.</p>;

    return (
        <div className="space-y-3">
            {data.anomalies.map((a, i) => (
                <div
                    key={i}
                    className={`flex items-start justify-between rounded-xl p-4 ${a.severity === "critical" ? "bg-rose-50 border border-rose-200" : "bg-amber-50 border border-amber-200"}`}
                >
                    <div>
                        <p className={`font-semibold text-sm ${a.severity === "critical" ? "text-rose-800" : "text-amber-800"}`}>
                            {a.severity === "critical" ? "🚨" : "⚠️"} {a.department}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                            {a.current_count} grievances this week vs {a.baseline_count} baseline (Z={a.z_score})
                        </p>
                    </div>
                    <Badge className={a.severity === "critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}>
                        {a.severity}
                    </Badge>
                </div>
            ))}
        </div>
    );
}

/* ── Forecast Panel ──────────────────────────────────────────────────────── */
function ForecastPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/ai/insights/forecast")
            .then((res) => setData(res.data))
            .catch(() => setData({ available: false }))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton rows={3} />;
    if (!data?.available || !data.forecast?.length)
        return <p className="text-sm text-gray-500 italic">Not enough data for forecasting (need 7+ days).</p>;

    const chartData = data.forecast.map((f) => ({
        date: f.date.slice(5),   // MM-DD
        count: f.predicted_count,
    }));

    const trendColors = { rising: "text-rose-600", falling: "text-emerald-600", stable: "text-gray-600" };
    const trendIcons = { rising: "📈", falling: "📉", stable: "➡️" };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${trendColors[data.trend]}`}>
                    {trendIcons[data.trend]} Trend: {data.trend}
                </span>
                <span className="text-xs text-gray-500">30-day forecast</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
                    <YAxis tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(v) => [Math.round(v), "Predicted"]}
                    />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Admin Scores Panel ──────────────────────────────────────────────────── */
function AdminScoresPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/ai/insights/admin-scores")
            .then((res) => setData(res.data))
            .catch(() => setData({ available: false }))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Skeleton rows={3} />;
    if (!data?.available || !data.scores?.length)
        return <p className="text-sm text-gray-500 italic">No admin performance data yet.</p>;

    const chartData = data.scores.slice(0, 8).map((s) => ({
        name: s.name.split(" ")[0],
        hours: s.avg_resolution_hours,
        rating: s.avg_feedback_rating,
    }));

    return (
        <div className="space-y-4">
            <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={30} />
                    <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        formatter={(v, n) => [n === "hours" ? `${Math.round(v)}h` : v, n === "hours" ? "Avg resolution" : "Avg rating"]}
                    />
                    <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
                {data.scores.map((s) => (
                    <div key={s.admin_id} className="flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div>
                            <p className="font-medium text-sm text-gray-800">{s.name}</p>
                            <p className="text-xs text-gray-500">
                                {s.total_resolved} resolved · {s.avg_resolution_hours}h avg · {s.avg_feedback_rating > 0 ? `⭐ ${s.avg_feedback_rating}` : "No ratings"}
                            </p>
                            {s.insight && <p className="text-xs text-indigo-600 mt-0.5">{s.insight}</p>}
                        </div>
                        <Badge className={PERF_COLORS[s.performance_label]}>
                            {s.performance_label.replace("_", " ")}
                        </Badge>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function AiInsightsDashboard() {
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = () => setRefreshKey((k) => k + 1);

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Brain size={22} className="text-indigo-600" />
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">AI Insights</h1>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                        ML-powered analysis of grievance patterns, anomalies, forecasts, and admin performance.
                    </p>
                </div>
                <Button variant="outline" className="gap-2" onClick={refresh}>
                    <RefreshCw size={14} /> Refresh Insights
                </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2" key={refreshKey}>
                {/* Root Cause Clusters */}
                <Card className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Layers size={16} className="text-indigo-600" />
                        <h2 className="font-semibold text-gray-900">Root Cause Clusters</h2>
                    </div>
                    <ClustersPanel />
                </Card>

                {/* Anomaly Detection */}
                <Card className="space-y-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-600" />
                        <h2 className="font-semibold text-gray-900">Volume Anomalies</h2>
                    </div>
                    <AnomaliesPanel />
                </Card>

                {/* Volume Forecast */}
                <Card className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Activity size={16} className="text-blue-600" />
                        <h2 className="font-semibold text-gray-900">30-Day Forecast</h2>
                    </div>
                    <ForecastPanel />
                </Card>

                {/* Admin Performance */}
                <Card className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-emerald-600" />
                        <h2 className="font-semibold text-gray-900">Admin Performance</h2>
                    </div>
                    <AdminScoresPanel />
                </Card>
            </div>
        </section>
    );
}
