import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";
import { useNotifications } from "../../hooks/useNotifications";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

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
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Welcome back, {authUser?.name || "Student"}</h1>
                    <p className="text-sm text-gray-600">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
                <Button onClick={() => navigate("/submit-grievance")}>Submit New Grievance</Button>
            </div>
            {loading ? <Skeleton rows={3} /> : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Submitted</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{grievances.length}</p></Card>
                        <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pending</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{count("Pending")}</p></Card>
                        <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">In Progress</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{count("InProgress")}</p></Card>
                        <Card><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Resolved</p><p className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{count("Resolved")}</p></Card>
                    </div>
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <Card className="space-y-4">
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Recent Grievances</h2>
                            {!recent.length ? <EmptyState icon="+" title="No grievances submitted" actionLabel="Submit Grievance" onAction={() => navigate("/submit-grievance")} /> : (
                                <div className="responsive-table">
                                    <table>
                                        <thead><tr><th>ID</th><th>Title</th><th>Status</th><th>Updated</th><th /></tr></thead>
                                        <tbody>{recent.map((g) => <tr key={g._id}><td>{g.grievanceId}</td><td>{g.title}</td><td><Badge className={g.status === "Resolved" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}>{g.status}</Badge></td><td>{new Date(g.updatedAt).toLocaleDateString()}</td><td><Button variant="outline" onClick={() => navigate(`/grievance/${g.grievanceId}`)}>View</Button></td></tr>)}</tbody>
                                    </table>
                                </div>
                            )}
                        </Card>
                        <Card className="space-y-3">
                            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Unread Notifications</h2>
                            {!notifications.length ? <p className="text-sm text-gray-600">No notifications yet.</p> : notifications.slice(0, 5).map((item) => <div className={`notification-row rounded-lg ${item.isRead ? "" : "unread"}`} key={item._id}><strong className="text-sm text-gray-900">{item.title || item.type}</strong><p className="text-sm text-gray-600">{item.message}</p></div>)}
                        </Card>
                    </div>
                </>
            )}
        </section>
    );
}
