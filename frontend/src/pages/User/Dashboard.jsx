import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";
import { useNotifications } from "../../hooks/useNotifications";

export default function Dashboard() {
    const navigate = useNavigate();
    const { authUser } = useContext(AuthContext);
    const { notifications } = useNotifications();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/grievances/mine?limit=100").then((res) => setGrievances(res.data.grievances || [])).finally(() => setLoading(false));
    }, []);

    const count = (status) => grievances.filter((item) => item.status === status).length;
    const recent = grievances.slice(0, 5);

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Welcome back, {authUser?.name || "Student"}</h1>
                    <p>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <button className="primary-btn" onClick={() => navigate("/submit-grievance")}>Submit New Grievance</button>
            </div>
            {loading ? <Skeleton rows={3} /> : (
                <>
                    <div className="summary-grid">
                        <div className="metric-card"><span>Total Submitted</span><strong>{grievances.length}</strong></div>
                        <div className="metric-card"><span>Pending</span><strong>{count("Pending")}</strong></div>
                        <div className="metric-card"><span>In Progress</span><strong>{count("InProgress")}</strong></div>
                        <div className="metric-card"><span>Resolved</span><strong>{count("Resolved")}</strong></div>
                    </div>
                    <div className="dashboard-grid">
                        <div className="card">
                            <h2>Recent Grievances</h2>
                            {!recent.length ? <EmptyState icon="+" title="No grievances submitted" actionLabel="Submit Grievance" onAction={() => navigate("/submit-grievance")} /> : (
                                <div className="responsive-table">
                                    <table>
                                        <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Updated</th><th /></tr></thead>
                                        <tbody>{recent.map((g) => <tr key={g._id}><td>{g.grievanceId}</td><td>{g.title}</td><td><span className={`status-badge ${g.status}`}>{g.status}</span></td><td>{new Date(g.updatedAt).toLocaleDateString()}</td><td><button className="secondary-btn" onClick={() => navigate(`/grievance/${g.grievanceId}`)}>View</button></td></tr>)}</tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="card">
                            <h2>Unread Notifications</h2>
                            {!notifications.length ? <p className="muted">No notifications yet.</p> : notifications.slice(0, 5).map((item) => <div className={`notification-row ${item.isRead ? "" : "unread"}`} key={item._id}><strong>{item.title || item.type}</strong><p>{item.message}</p></div>)}
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
