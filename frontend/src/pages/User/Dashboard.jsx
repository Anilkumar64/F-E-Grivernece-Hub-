import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    useEffect(() => {
        fetchUser();
        fetchMyGrievances();
    }, []);

    // Fetch logged-in user
    const fetchUser = async () => {
        try {
            const res = await api.get("/users/me");
            setUser(res.data.user || res.data || null);
        } catch (err) {
            console.error("Error fetching user:", err);
        }
    };

    // Fetch student's grievances
    const fetchMyGrievances = async () => {
        try {
            const res = await api.get("/grievances/my");
            const data = Array.isArray(res.data) ? res.data : res.data?.grievances || [];
            setGrievances(data);
        } catch (err) {
            console.error("Error fetching grievances:", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusClasses = (status = "") => {
        const s = status.toLowerCase();
        if (s.includes("resolved"))
            return "bg-green-100 text-green-700";
        if (s.includes("pending"))
            return "bg-yellow-100 text-yellow-700";
        if (s.includes("rejected") || s.includes("closed"))
            return "bg-red-100 text-red-700";
        return "bg-gray-100 text-gray-700";
    };

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white shadow rounded-xl p-5">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                    Hi, {user?.name || "Student"} 👋
                </h2>
                <p className="text-gray-600 mt-1">
                    Welcome to the E-Grievance Portal
                </p>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-700">
                    <div>
                        <span className="font-medium">Email: </span>
                        <span>{user?.email || "—"}</span>
                    </div>
                    <div>
                        <span className="font-medium">Student ID: </span>
                        <span>{user?.studentId || "—"}</span>
                    </div>
                    <div>
                        <span className="font-medium">Total Complaints: </span>
                        <span>{grievances.length}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => navigate("/user/create-grievance")}
                    className="bg-blue-600 text-white rounded-xl p-4 shadow hover:bg-blue-700 transition text-left"
                >
                    <div className="text-xl mb-1">📝</div>
                    <h3 className="font-semibold text-lg">File New Grievance</h3>
                    <p className="text-sm text-blue-100 mt-1">
                        Submit a new complaint to the administration.
                    </p>
                </button>

                <button
                    onClick={() => navigate("/user/my-grievances")}
                    className="bg-white border rounded-xl p-4 shadow hover:border-blue-400 transition text-left"
                >
                    <div className="text-xl mb-1">📄</div>
                    <h3 className="font-semibold text-lg">My Grievances</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        View, track, and manage your submitted grievances.
                    </p>
                </button>

                <button
                    onClick={() => navigate("/notifications")}
                    className="bg-white border rounded-xl p-4 shadow hover:border-blue-400 transition text-left"
                >
                    <div className="text-xl mb-1">🔔</div>
                    <h3 className="font-semibold text-lg">Notifications</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        See responses and updates from admins.
                    </p>
                </button>
            </div>

            {/* Recent Complaints */}
            <div>
                <h3 className="text-lg font-semibold mb-3">Recent Complaints</h3>

                {loading ? (
                    <p className="text-gray-500 text-sm">Loading...</p>
                ) : grievances.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                        No complaints filed yet. Start by filing a new grievance.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {grievances.slice(0, 4).map((g) => (
                            <div
                                className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between"
                                key={g._id}
                            >
                                <div>
                                    <h4 className="font-semibold text-base mb-1">
                                        {g.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 mb-2">
                                        {(g.description || "").slice(0, 80)}
                                        {g.description && g.description.length > 80 && "..."}
                                    </p>

                                    <div className="flex flex-wrap gap-2 text-xs items-center">
                                        <span
                                            className={`px-2 py-1 rounded-full ${getStatusClasses(
                                                g.status
                                            )}`}
                                        >
                                            {g.status || "Unknown"}
                                        </span>
                                        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                                            Priority: {g.priority || "Medium"}
                                        </span>
                                        {g.trackingId && (
                                            <span className="text-gray-400">
                                                #{g.trackingId}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    className="mt-3 self-start text-sm text-blue-600 hover:underline"
                                    onClick={() =>
                                        navigate(`/user/track/${g._id || g.trackingId}`)
                                    }
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
