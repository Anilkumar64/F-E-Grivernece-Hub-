import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

export default function AdminGrievances({ fixedStatus }) {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: "", status: fixedStatus || "", priority: "", sort: "newest" });

    useEffect(() => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
        api.get(`/grievances?${params}`).then((res) => setItems(res.data.grievances || [])).finally(() => setLoading(false));
    }, [filters]);

    return (
        <section className="page-section">
            <div className="page-heading"><div><h1>{fixedStatus ? `${fixedStatus} Grievances` : "All Grievances"}</h1><p>Review, assign, reply, and update grievance status.</p></div></div>
            <div className="filter-row">
                <input placeholder="Search by ID, title, student" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                {!fixedStatus && <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All Status</option>{["Pending", "UnderReview", "InProgress", "Resolved", "Escalated"].map((s) => <option key={s}>{s}</option>)}</select>}
                <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option value="">All Priority</option>{["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}</select>
                <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="priority">Priority</option><option value="slaDeadline">SLA Deadline</option></select>
            </div>
            {loading ? <Skeleton rows={4} /> : (
                <div className="responsive-table">
                    <table>
                        <thead><tr><th>ID</th><th>Title</th><th>Student</th><th>Category</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Created</th><th>Actions</th></tr></thead>
                        <tbody>{items.map((g) => <tr key={g._id}><td>{g.grievanceId}</td><td>{g.title}</td><td>{g.submittedBy?.name}</td><td>{g.category?.name}</td><td><span className={`priority-badge ${g.priority}`}>{g.priority}</span></td><td><span className={`status-badge ${g.status}`}>{g.status}</span></td><td>{g.assignedTo?.name || "-"}</td><td>{new Date(g.createdAt).toLocaleDateString()}</td><td><button className="primary-btn" onClick={() => navigate(`/admin/grievance/${g.grievanceId}`)}>View</button></td></tr>)}</tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
