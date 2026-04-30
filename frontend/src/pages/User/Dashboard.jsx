import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";
import { useNotifications } from "../../hooks/useNotifications";

export default function Dashboard() {
    const navigate = useNavigate();
    const { notifications } = useNotifications();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/grievances/mine?limit=5").then((res) => setGrievances(res.data.grievances || [])).finally(() => setLoading(false));
    }, []);

    const count = (status) => grievances.filter((item) => item.status === status).length;

    return (
        <section className="page-section">
            <div className="page-heading"><h1>Dashboard</h1></div>
            {loading ? <Skeleton rows={3} /> : (
                <>
                    <div className="summary-grid">
                        <div className="metric-card"><span>Total Submitted</span><strong>{grievances.length}</strong></div>
                        <div className="metric-card"><span>Pending</span><strong>{count("Pending")}</strong></div>
                        <div className="metric-card"><span>In Progress</span><strong>{count("InProgress")}</strong></div>
                        <div className="metric-card"><span>Resolved</span><strong>{count("Resolved")}</strong></div>
                    </div>
                    {!grievances.length ? <EmptyState icon="+" title="No grievances submitted" actionLabel="Submit Grievance" onAction={() => navigate("/submit-grievance")} /> : (
                        <div className="responsive-table">
                            <table>
                                <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Updated</th></tr></thead>
                                <tbody>{grievances.map((g) => <tr key={g._id} onClick={() => navigate(`/grievance/${g.grievanceId}`)}><td>{g.grievanceId}</td><td>{g.title}</td><td><span className={`status-badge ${g.status}`}>{g.status}</span></td><td>{new Date(g.updatedAt).toLocaleDateString()}</td></tr>)}</tbody>
                            </table>
                        </div>
                    )}
                    <div className="notification-panel">
                        <h2>Notifications</h2>
                        {notifications.slice(0, 4).map((item) => <p key={item._id}>{item.message}</p>)}
                    </div>
                </>
            )}
        </section>
    );
}
