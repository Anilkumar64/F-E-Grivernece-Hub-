import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

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

    const gotoDetails = (id, trackingId) => {
        navigate(`/user/track/${id || trackingId}`);
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-2xl font-semibold">
                    My Grievances
                </h2>

                <div className="flex flex-wrap gap-2 items-center">
                    <input
                        placeholder="Search by title or tracking ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm w-full md:w-64 focus:outline-none focus:ring focus:ring-blue-300"
                    />

                    <select
                        value={statusFilter}
                        onChange={(e) =>
                            setStatusFilter(e.target.value)
                        }
                        className="border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        <option value="all">All Status</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) =>
                            setSortBy(e.target.value)
                        }
                        className="border rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:ring focus:ring-blue-300"
                    >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="priority">Priority</option>
                    </select>
                </div>
            </div>

            {/* Body */}
            <div className="bg-white shadow rounded-xl p-4">
                {loading ? (
                    <div className="text-center text-gray-500 text-sm py-6">
                        Loading...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-6">
                        <p>
                            No grievances found.{" "}
                            <button
                                onClick={() =>
                                    navigate("/user/create-grievance")
                                }
                                className="text-blue-600 hover:underline"
                            >
                                File a grievance
                            </button>
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Cards grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {current.map((g) => (
                                <div
                                    key={g._id || g.trackingId}
                                    className="border rounded-xl p-4 shadow-sm flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <div className="font-semibold text-base">
                                                {g.title}
                                            </div>
                                            <div
                                                className={
                                                    "px-2 py-1 rounded-full text-xs font-semibold " +
                                                    getStatusClasses(
                                                        g.status
                                                    )
                                                }
                                            >
                                                {g.status || "Pending"}
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-500 mb-2 space-y-1">
                                            <div>
                                                <strong>
                                                    Tracking:
                                                </strong>{" "}
                                                {g.trackingId ||
                                                    "N/A"}
                                            </div>
                                            <div>
                                                <strong>
                                                    Priority:
                                                </strong>{" "}
                                                {g.priority ||
                                                    "Medium"}
                                            </div>
                                            <div>
                                                <strong>
                                                    Dept:
                                                </strong>{" "}
                                                {g.department?.name ||
                                                    (typeof g.department ===
                                                        "string"
                                                        ? g.department
                                                        : "N/A")}
                                            </div>
                                        </div>

                                        <p className="text-sm text-gray-700">
                                            {g.description
                                                ? g.description
                                                    .toString()
                                                    .slice(
                                                        0,
                                                        120
                                                    ) +
                                                (g.description
                                                    .toString()
                                                    .length > 120
                                                    ? "..."
                                                    : "")
                                                : ""}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                                        <div>
                                            {new Date(
                                                g.updatedAt ||
                                                g.createdAt
                                            ).toLocaleString()}
                                        </div>
                                        <button
                                            className="text-blue-600 hover:underline text-sm"
                                            onClick={() =>
                                                gotoDetails(
                                                    g._id,
                                                    g.trackingId
                                                )
                                            }
                                        >
                                            View Details →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-center items-center gap-4 mt-4 text-sm">
                            <button
                                disabled={page <= 1}
                                onClick={() =>
                                    setPage((p) =>
                                        Math.max(1, p - 1)
                                    )
                                }
                                className="px-3 py-1 border rounded-lg disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <div>
                                Page {page} / {totalPages}
                            </div>
                            <button
                                disabled={page >= totalPages}
                                onClick={() =>
                                    setPage((p) =>
                                        Math.min(
                                            totalPages,
                                            p + 1
                                        )
                                    )
                                }
                                className="px-3 py-1 border rounded-lg disabled:opacity-50"
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
