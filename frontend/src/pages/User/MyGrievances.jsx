import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";

export default function MyGrievances() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        api.get("/grievances/mine").then((res) => setItems(res.data.grievances || [])).finally(() => setLoading(false));
    }, []);

    const filtered = items.filter((g) => `${g.grievanceId} ${g.title}`.toLowerCase().includes(search.toLowerCase()));

    return (
        <section className="page-section">
            <div className="page-heading">
                <h1>My Grievances</h1>
                <button className="primary-btn" onClick={() => navigate("/submit-grievance")}>Submit Grievance</button>
            </div>
            <input className="search-input" placeholder="Search by grievance ID or title" value={search} onChange={(e) => setSearch(e.target.value)} />
            {loading ? <Skeleton rows={4} /> : !filtered.length ? (
                <EmptyState icon="+" title="No grievances found" actionLabel="Submit Grievance" onAction={() => navigate("/submit-grievance")} />
            ) : (
                <div className="responsive-table">
                    <table>
                        <thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Status</th><th>Priority</th></tr></thead>
                        <tbody>{filtered.map((g) => (
                            <tr key={g._id} onClick={() => navigate(`/grievance/${g.grievanceId}`)}>
                                <td>{g.grievanceId}</td><td>{g.title}</td><td>{g.category?.name}</td><td><span className={`status-badge ${g.status}`}>{g.status}</span></td><td>{g.priority}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
