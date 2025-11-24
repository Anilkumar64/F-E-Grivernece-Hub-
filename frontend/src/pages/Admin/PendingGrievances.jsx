import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function PendingGrievances() {
    const navigate = useNavigate();

    const [grievances, setGrievances] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [sortOrder, setSortOrder] = useState("newest");

    // Fetch only PENDING grievances
    const fetchPending = async () => {
        try {
            setLoading(true);

            const res = await api.get("/grievances/admin/pending");
            const data = res.data.grievances || res.data || [];

            setGrievances(data);
            setFiltered(data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load pending grievances");

            if (err?.response?.status === 401) {
                navigate("/admin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Filters + Sorting + Search
    useEffect(() => {
        let g = [...grievances];

        // Search by title / trackingId
        if (search.trim()) {
            const term = search.toLowerCase();
            g = g.filter(
                (x) =>
                    x.title?.toLowerCase().includes(term) ||
                    x.trackingId?.toLowerCase().includes(term)
            );
        }

        // Sorting
        if (sortOrder === "newest") {
            g.sort(
                (a, b) =>
                    new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            );
        } else {
            g.sort(
                (a, b) =>
                    new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
            );
        }

        setFiltered(g);
    }, [search, sortOrder, grievances]);

    if (loading) {
        return <div className="ag-loading">Loading Pending Grievances...</div>;
    }

    return (
        <div className="admin-grievances-page">
            <h1>Pending Grievances</h1>

            {/* FILTER BAR */}
            <div className="ag-filters">
                <input
                    type="text"
                    placeholder="Search by Tracking ID / Title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

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
                            <th>Priority</th>
                            <th>Email</th>
                            <th>Created</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtered.map((g) => {
                            const priorityClass = `ag-badge pri-${(
                                g.priority || ""
                            ).toLowerCase()}`;

                            return (
                                <tr
                                    key={g._id}
                                    onClick={() =>
                                        navigate(`/admin/grievance/${g._id}`)
                                    }
                                >
                                    <td>{g.trackingId}</td>
                                    <td>{g.title}</td>

                                    <td>
                                        <span className={priorityClass}>
                                            {g.priority || "Medium"}
                                        </span>
                                    </td>

                                    <td>{g.userEmail || "–"}</td>

                                    <td>
                                        {g.createdAt
                                            ? new Date(
                                                g.createdAt
                                            ).toLocaleString()
                                            : "-"}
                                    </td>
                                </tr>
                            );
                        })}

                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="5" className="ag-empty">
                                    No pending grievances ✨
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
