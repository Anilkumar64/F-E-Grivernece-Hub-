import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import "../../styles/UserStyles/UserDashboard.css";


const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        loadUserFromLocal();
        fetchMyGrievances();
    }, []);

    // Fetch user from localStorage (no /users/me route exists)
    const loadUserFromLocal = () => {
        try {
            const stored = localStorage.getItem("user");
            if (stored) {
                setUser(JSON.parse(stored));
            }
        } catch (err) {
            console.error("Local user parse error:", err);
        }
    };

    // Fetch student's grievances
    const fetchMyGrievances = async () => {
        try {
            const res = await api.get("/grievances/my");
            const list = Array.isArray(res.data)
                ? res.data
                : res.data?.grievances || [];

            setGrievances(list);
        } catch (err) {
            console.error("Error fetching grievances:", err);
        } finally {
            setLoading(false);
        }
    };

    // Badge styling
    const getStatusClasses = (status = "") => {
        const s = status.toLowerCase();
        if (s.includes("resolved")) return "bg-green-100 text-green-700";
        if (s.includes("pending")) return "bg-yellow-100 text-yellow-700";
        if (s.includes("rejected") || s.includes("closed"))
            return "bg-red-100 text-red-700";
        return "bg-gray-100 text-gray-700";
    };

    return (
        <div className="dashboard-container">

            {/* Welcome Box */}
            <div className="welcome-card">
                <h2 className="welcome-title">Hi, {user?.name || "Student"} 👋</h2>
                <p className="welcome-subtext">Welcome to the E-Grievance Portal</p>

                <div className="welcome-info">
                    <p><b>Email:</b> {user?.email || "—"}</p>
                    <p><b>Student ID:</b> {user?.studentId || "—"}</p>
                    <p><b>Total Complaints:</b> {grievances.length}</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">

                <button className="quick-card primary" onClick={() => navigate("/user/create-grievance")}>
                    <div className="quick-icon">📝</div>
                    <h3 className="quick-text">File New Grievance</h3>
                </button>

                <button className="quick-card" onClick={() => navigate("/user/my-grievances")}>
                    <div className="quick-icon">📄</div>
                    <h3 className="quick-text">My Grievances</h3>
                </button>

                <button className="quick-card" onClick={() => navigate("/notifications")}>
                    <div className="quick-icon">🔔</div>
                    <h3 className="quick-text">Notifications</h3>
                </button>

            </div>

            {/* Recent Complaints */}
            <div className="recent-section">
                <h3 className="section-title">Recent Complaints</h3>

                {loading ? (
                    <p className="loading-text">Loading...</p>
                ) : grievances.length === 0 ? (
                    <p className="empty-text">No complaints yet. File your first grievance.</p>
                ) : (
                    <div className="recent-grid">

                        {grievances.slice(0, 4).map((g) => (
                            <div className="complaint-card" key={g._id}>

                                <h4 className="complaint-title">{g.title}</h4>

                                <p className="complaint-description">
                                    {g.description?.slice(0, 80)}...
                                </p>

                                <div className="complaint-tags">
                                    <span className={`status-badge ${getStatusClasses(g.status)}`}>
                                        {g.status}
                                    </span>

                                    <span className="priority-badge">
                                        Priority: {g.priority || "Medium"}
                                    </span>

                                    <span className="tracking-badge">
                                        #{g.trackingId}
                                    </span>
                                </div>

                                <button
                                    className="details-button"
                                    onClick={() => navigate(`/user/track/${g.trackingId}`)}
                                >
                                    View Details →
                                </button>
                            </div>
                        ))}

                    </div>
                )}

            </div>

        </div>
    );
};

export default Dashboard;
