import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy } from "lucide-react";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";

export default function MyGrievances() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: "", status: "", category: "", priority: "", sort: "newest" });

    useEffect(() => {
        api.get("/grievances/mine").then((res) => setItems(res.data.grievances || [])).finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        return items
            .filter((g) => `${g.grievanceId} ${g.title}`.toLowerCase().includes(filters.search.toLowerCase()))
            .filter((g) => !filters.status || g.status === filters.status)
            .filter((g) => !filters.priority || g.priority === filters.priority)
            .sort((a, b) => filters.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt));
    }, [items, filters]);

    return (
        <section className="page-section">
            <div className="page-heading">
                <div><h1>My Grievances</h1><p>Search, filter, and track your submitted grievances.</p></div>
                <button className="primary-btn" onClick={() => navigate("/submit-grievance")}>Submit Grievance</button>
            </div>
            <div className="filter-row">
                <input placeholder="Search by ID or title" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All Status</option>{["Pending", "UnderReview", "InProgress", "Resolved", "Escalated"].map((s) => <option key={s}>{s}</option>)}</select>
                <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option value="">All Priority</option>{["Low", "Medium", "High"].map((p) => <option key={p}>{p}</option>)}</select>
                <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
            </div>
            {loading ? <Skeleton rows={4} /> : !filtered.length ? (
                <EmptyState icon="+" title="No grievances yet" actionLabel="Submit Grievance" onAction={() => navigate("/submit-grievance")} />
            ) : (
                <div className="card-grid">
                    {filtered.slice(0, 10).map((g) => (
                        <article className="grievance-card" key={g._id}>
                            <button className="id-badge" onClick={() => navigator.clipboard.writeText(g.grievanceId)}><Copy size={14} /> {g.grievanceId}</button>
                            <h2>{g.title}</h2>
                            <p className="muted">{g.category?.name || "General"} · Submitted {new Date(g.createdAt).toLocaleDateString()}</p>
                            <div><span className={`status-badge ${g.status}`}>{g.status}</span><span className={`priority-badge ${g.priority}`}>{g.priority}</span></div>
                            <p className="muted">Last updated {new Date(g.updatedAt).toLocaleString()}</p>
                            <button className="primary-btn" onClick={() => navigate(`/grievance/${g.grievanceId}`)}>View Details</button>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
