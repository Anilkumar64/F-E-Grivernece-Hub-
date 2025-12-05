import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../../styles/AdminStyles/AdminGrievances.css";


export default function AdminGrievances() {
    const navigate = useNavigate();
    const [grievances, setGrievances] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);

            // axiosInstance already handles baseURL + Authorization header
            const res = await api.get("/grievances/admin/all"); // change endpoint if your backend uses a different one

            const data = res?.data?.grievances || res?.data || [];
            setGrievances(data);
            setFiltered(data);
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message || "Failed to fetch grievances"
            );

            if (err?.response?.status === 401) {
                navigate("/admin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    // 🔍 Search + Filters
    useEffect(() => {
        let g = Array.isArray(grievances) ? [...grievances] : [];

        // search by trackingId or title
        if (search.trim()) {
            const term = search.toLowerCase();
            g = g.filter((x) => {
                const tracking = x.trackingId?.toLowerCase() || "";
                const title = x.title?.toLowerCase() || "";
                return (
                    tracking.includes(term) ||
                    title.includes(term)
                );
            });
        }

        if (statusFilter) {
            g = g.filter((x) => x.status === statusFilter);
        }

        if (priorityFilter) {
            g = g.filter((x) => x.priority === priorityFilter);
        }

        if (sortOrder === "newest") {
            g.sort(
                (a, b) =>
                    new Date(b.createdAt || 0) -
                    new Date(a.createdAt || 0)
            );
        } else {
            g.sort(
                (a, b) =>
                    new Date(a.createdAt || 0) -
                    new Date(b.createdAt || 0)
            );
        }

        setFiltered(g);
    }, [search, statusFilter, priorityFilter, sortOrder, grievances]);

    if (loading) return <div className="ag-loading">Loading...</div>;

    return (
        <div className="admin-grievances-page">
            <h1>Admin Dashboard – Grievances</h1>

            {/* FILTER BAR */}
            <div className="ag-filters">
                <input
                    type="text"
                    placeholder="Search by Tracking ID or Title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                </select>

                <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                </select>

                <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                </select>
            </div>

            {/* TABLE */}
            <div className="ag-table-wrapper">
                <table className="ag-table">
                    <thead>
                        <tr>
                            <th>Tracking ID</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Submitted By</th>
                            <th>Created</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((g) => {
                            const statusText = g.status || "Unknown";
                            const priorityText = g.priority || "Medium";

                            const statusClass = `ag-badge status-${statusText.replace(/\s+/g, "").toLowerCase()
                                }`;
                            const priorityClass = `ag-badge pri-${priorityText
                                .toLowerCase()
                                }`;

                            const createdAtText = g.createdAt
                                ? new Date(g.createdAt).toLocaleString()
                                : "-";

                            return (
                                <tr
                                    key={g._id || g.id}
                                    onClick={() =>
                                        navigate(`/admin/grievance/${g._id}`)
                                    }
                                >
                                    <td>{g.trackingId}</td>
                                    <td>{g.title}</td>

                                    <td>
                                        <span className={statusClass}>
                                            {statusText}
                                        </span>
                                    </td>

                                    <td>
                                        <span className={priorityClass}>
                                            {priorityText}
                                        </span>
                                    </td>

                                    <td>{g.userEmail || "-"}</td>

                                    <td>{createdAtText}</td>
                                </tr>
                            );
                        })}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="6" className="ag-empty">
                                    No grievances found ✨
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
