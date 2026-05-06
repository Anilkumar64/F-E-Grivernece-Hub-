import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy } from "lucide-react";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";

const PAGE_SIZE = 10;
const FILTERS_KEY = "student_my_grievances_filters_v1";

export default function MyGrievances() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState(() => {
        try {
            const raw = localStorage.getItem(FILTERS_KEY);
            return raw ? JSON.parse(raw) : { search: "", status: "", priority: "", sort: "newest" };
        } catch {
            return { search: "", status: "", priority: "", sort: "newest" };
        }
    });

    useEffect(() => {
        api.get("/grievances/mine")
            .then((res) => setItems(res.data.grievances || []))
            .finally(() => setLoading(false));
    }, []);

    // reset to page 1 whenever filters change
    const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
    useEffect(() => {
        localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
    }, [filters]);

    const filtered = useMemo(() => {
        return items
            .filter((g) => `${g.grievanceId} ${g.title}`.toLowerCase().includes(filters.search.toLowerCase()))
            .filter((g) => !filters.status || g.status === filters.status)
            .filter((g) => !filters.priority || g.priority === filters.priority)
            .sort((a, b) =>
                filters.sort === "oldest"
                    ? new Date(a.createdAt) - new Date(b.createdAt)
                    : new Date(b.createdAt) - new Date(a.createdAt)
            );
    }, [items, filters]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Grievances</h1>
                    <p className="text-sm text-gray-600">Search, filter, and track your submitted grievances.</p>
                </div>
                <Button onClick={() => navigate("/submit-grievance")}>Submit Grievance</Button>
            </div>

            <Card className="grid gap-3 md:grid-cols-4">
                <Input
                    placeholder="Search by ID or title"
                    value={filters.search}
                    onChange={(e) => setFilter({ search: e.target.value })}
                />
                <select className="ui-input" value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
                    <option value="">All Status</option>
                    {["Pending", "UnderReview", "InProgress", "Resolved", "Escalated", "Closed"].map((s) => <option key={s}>{s}</option>)}
                </select>
                <select className="ui-input" value={filters.priority} onChange={(e) => setFilter({ priority: e.target.value })}>
                    <option value="">All Priority</option>
                    {["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}
                </select>
                <select className="ui-input" value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                </select>
            </Card>

            {loading ? <Skeleton rows={4} /> : !filtered.length ? (
                <EmptyState icon="+" title="No grievances yet" actionLabel="Submit Grievance" onAction={() => navigate("/submit-grievance")} />
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {paginated.map((g) => (
                            <Card key={g._id} className="space-y-3">
                                <button
                                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50"
                                    onClick={() => navigator.clipboard.writeText(g.grievanceId)}
                                    type="button"
                                >
                                    <Copy size={14} /> {g.grievanceId}
                                </button>
                                <h2 className="text-base font-semibold tracking-tight text-gray-900">{g.title}</h2>
                                <p className="text-sm text-gray-600">{g.category?.name || "General"} · Submitted {new Date(g.createdAt).toLocaleDateString()}</p>
                                <div className="flex flex-wrap gap-2">
                                    <Badge>{g.status}</Badge>
                                    <Badge className="bg-gray-100 text-gray-700">{g.priority}</Badge>
                                    {g.isAcademicUrgent && <Badge className="bg-rose-50 text-rose-700">Academic Urgent</Badge>}
                                </div>
                                <p className="text-sm text-gray-500">Last updated {new Date(g.updatedAt).toLocaleString()}</p>
                                <Button variant="outline" onClick={() => navigate(`/grievance/${g.grievanceId}`)}>View Details</Button>
                            </Card>
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3">
                            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                            <Button variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}