import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import EmptyState from "../../components/common/EmptyState";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

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
        <section className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">{fixedStatus ? `${fixedStatus} Grievances` : "All Grievances"}</h1>
                    <p className="text-sm text-gray-600">Review, assign, reply, and update grievance status.</p>
                </div>
            </div>

            <Card className="grid gap-3 md:grid-cols-5">
                <Input
                    placeholder="Search by ID, title, student"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {!fixedStatus && (
                    <select className="ui-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All Status</option>
                        {["Pending", "UnderReview", "InProgress", "Resolved", "Escalated", "Closed"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                )}
                <select className="ui-input" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
                    <option value="">All Priority</option>
                    {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
                </select>
                <select className="ui-input" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="priority">Priority</option>
                    <option value="slaDeadline">SLA Deadline</option>
                </select>
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={filters.urgentOnly}
                        onChange={(e) => setFilters({ ...filters, urgentOnly: e.target.checked })}
                    />
                    Urgent queue
                </label>
            </Card>

            {loading ? <Skeleton rows={4} /> : !items.length ? (
                <EmptyState icon="📋" title="No grievances found" subtext="Try adjusting your filters." />
            ) : (
                <Card className="overflow-hidden p-0">
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
                                    <td><Badge className="bg-gray-100 text-gray-700">{g.priority}</Badge></td>
                                    <td>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge>{g.status}</Badge>
                                            {g.isAcademicUrgent && <Badge className="bg-rose-50 text-rose-700">Urgent</Badge>}
                                        </div>
                                    </td>
                                    <td>{g.assignedTo?.name || "-"}</td>
                                    <td>{new Date(g.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <Button variant="outline" onClick={() => navigate(`/admin/grievance/${g.grievanceId}`)}>View</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </Card>
            )}
        </section>
    );
}