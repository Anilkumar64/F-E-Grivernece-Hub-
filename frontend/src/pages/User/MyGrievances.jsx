import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../../styles/UserStyles/MyGrievances.css";

const PAGE_SIZE = 6;

export default function MyGrievances() {
    const navigate = useNavigate();
    const [grievances, setGrievances] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI controls
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [page, setPage] = useState(1);

    // fetch data
    useEffect(() => {
        fetchMyGrievances();
    }, []);

    useEffect(() => {
        applyFilters();
        setPage(1);
    }, [grievances, search, statusFilter, sortBy]);

    const fetchMyGrievances = async () => {
        setLoading(true);
        try {
            const res = await api.get("/grievances/my");
            const list = Array.isArray(res.data)
                ? res.data
                : res.data?.grievances || [];
            setGrievances(list);
        } catch (err) {
            console.error("fetchMyGrievances:", err);
            toast.error(
                err?.response?.data?.message || "Failed to fetch grievances"
            );
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let list = [...grievances];

        // search by title or trackingId
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (g) =>
                    (g.title && g.title.toLowerCase().includes(q)) ||
                    (g.trackingId &&
                        g.trackingId.toLowerCase().includes(q))
            );
        }

        // status filter
        if (statusFilter !== "all") {
            list = list.filter(
                (g) =>
                    (g.status || "").toLowerCase() ===
                    statusFilter.toLowerCase()
            );
        }

        // sort
        if (sortBy === "newest") {
            list.sort(
                (a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
            );
        } else if (sortBy === "oldest") {
            list.sort(
                (a, b) =>
                    new Date(a.createdAt) - new Date(b.createdAt)
            );
        } else if (sortBy === "priority") {
            const rank = {
                critical: 4,
                high: 3,
                medium: 2,
                low: 1,
            };
            list.sort(
                (a, b) =>
                    (rank[b.priority?.toLowerCase()] || 0) -
                    (rank[a.priority?.toLowerCase()] || 0)
            );
        }

        setFiltered(list);
    };

    // pagination helpers
    const totalPages = Math.max(
        1,
        Math.ceil(filtered.length / PAGE_SIZE)
    );
    const current = filtered.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    const gotoDetails = (trackingId) => {
        navigate(`/user/track/${trackingId}`);
    };

    const getStatusClasses = (status = "") => {
        const s = status.toLowerCase();
        if (s.includes("resolved"))
            return "bg-green-100 text-green-700";
        if (s.includes("pending"))
            return "bg-yellow-100 text-yellow-700";
        if (s.includes("rejected") || s.includes("closed"))
            return "bg-red-100 text-red-700";
        if (s.includes("progress"))
            return "bg-blue-100 text-blue-700";
        return "bg-gray-100 text-gray-700";
    };

    return (
        <div className="mg-container">

            {/* Header */}
            <div className="mg-header">
                <h2 className="mg-title">My Grievances</h2>

                <div className="mg-filters">
                    <input
                        placeholder="Search by title or tracking ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mg-input"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mg-select"
                    >
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="mg-select"
                    >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </div>

            {/* Body */}
            <div className="mg-card">
                {loading ? (
                    <div className="mg-loading">Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="mg-empty">
                        No grievances found.
                        <button
                            onClick={() => navigate("/user/create-grievance")}
                            className="mg-link"
                        >
                            File a grievance
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Cards grid */}
                        <div className="mg-grid">
                            {current.map((g) => (
                                <div key={g._id} className="mg-item">

                                    <div className="mg-item-header">
                                        <div className="mg-item-title">{g.title}</div>

                                        <div className={`mg-status-badge ${g.status?.toLowerCase()}`}>
                                            {g.status || "Pending"}
                                        </div>
                                    </div>

                                    <div className="mg-meta">
                                        <p><b>Tracking:</b> {g.trackingId}</p>
                                        <p><b>Priority:</b> {g.priority}</p>
                                        <p><b>Dept:</b> {g.department?.name || "N/A"}</p>
                                    </div>

                                    <p className="mg-description">
                                        {g.description?.slice(0, 120)}
                                        {g.description?.length > 120 ? "..." : ""}
                                    </p>

                                    <div className="mg-item-footer">
                                        <span className="mg-date">
                                            {new Date(g.updatedAt).toLocaleString()}
                                        </span>

                                        <button
                                            className="mg-details-btn"
                                            onClick={() => gotoDetails(g.trackingId)}
                                        >
                                            View Details →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="mg-pagination">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                            >
                                Prev
                            </button>

                            <span className="mg-page-info">
                                Page {page} / {totalPages}
                            </span>

                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
