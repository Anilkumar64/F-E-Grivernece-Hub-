import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";

export default function AdminGrievances({ fixedStatus }) {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [committed, setCommitted] = useState("");   // debounced search sent to API
    const [filters, setFilters] = useState({ status: fixedStatus || "", priority: "", sort: "newest", urgentOnly: false });
    const debounceRef = useRef(null);

    // Debounce search: wait 400 ms after the user stops typing
    const handleSearch = (value) => {
        setSearch(value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setCommitted(value), 400);
    };

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (committed) params.set("search", committed);
        if (filters.status) params.set("status", filters.status);
        if (filters.priority) params.set("priority", filters.priority);
        if (filters.urgentOnly) params.set("isAcademicUrgent", "true");
        if (filters.sort) params.set("sort", filters.sort);
        api.get(`/grievances?${params}`)
            .then((res) => setItems(res.data.grievances || []))
            .finally(() => setLoading(false));
    }, [committed, filters]);

    useEffect(() => { load(); }, [load]);

    // cleanup debounce on unmount
    useEffect(() => () => clearTimeout(debounceRef.current), []);

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>{fixedStatus ? `${fixedStatus} Grievances` : "All Grievances"}</h1>
                    <p>Review, assign, reply, and update grievance status.</p>
                </div>
            </div>

            <div className="filter-row">
                <input
                    placeholder="Search by ID, title, student"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {!fixedStatus && (
                    <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All Status</option>
                        {["Pending", "UnderReview", "InProgress", "Resolved", "Escalated", "Closed"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                )}
                <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
                    <option value="">All Priority</option>
                    {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
                </select>
                <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="priority">Priority</option>
                    <option value="slaDeadline">SLA Deadline</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                        type="checkbox"
                        checked={filters.urgentOnly}
                        onChange={(e) => setFilters({ ...filters, urgentOnly: e.target.checked })}
                    />
                    Urgent queue
                </label>
            </div>

            {loading ? <Skeleton rows={4} /> : !items.length ? (
                <EmptyState icon="📋" title="No grievances found" subtext="Try adjusting your filters." />
            ) : (
                <div className="responsive-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th><th>Title</th><th>Student</th><th>Category</th>
                                <th>Priority</th><th>Status</th><th>Assigned To</th><th>Created</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((g) => (
                                <tr key={g._id}>
                                    <td>{g.grievanceId}</td>
                                    <td>{g.title}</td>
                                    <td>{g.submittedBy?.name}</td>
                                    <td>{g.category?.name}</td>
                                    <td><span className={`priority-badge ${g.priority}`}>{g.priority}</span></td>
                                    <td>
                                        <span className={`status-badge ${g.status}`}>{g.status}</span>
                                        {g.isAcademicUrgent && <span className="pill danger" style={{ marginLeft: 8 }}>Urgent</span>}
                                    </td>
                                    <td>{g.assignedTo?.name || "-"}</td>
                                    <td>{new Date(g.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <button className="primary-btn" onClick={() => navigate(`/admin/grievance/${g.grievanceId}`)}>View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}