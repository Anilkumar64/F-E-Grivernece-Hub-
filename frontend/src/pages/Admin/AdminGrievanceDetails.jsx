import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import TrackGrievance from "../User/TrackGrievance";

export default function AdminGrievanceDetails() {
    const { id } = useParams();
    const [grievance, setGrievance] = useState(null);
    const [status, setStatus] = useState("");

    const load = () => api.get(`/grievances/${id}`).then((res) => { setGrievance(res.data.grievance); setStatus(res.data.grievance.status); });
    useEffect(() => { load(); }, [id]);

    const updateStatus = async () => {
        await api.patch(`/grievances/${grievance._id}/status`, { status, message: "Status updated by admin" });
        toast.success("Status updated");
        load();
    };

    return (
        <>
            <section className="admin-action-bar">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>{["Pending", "InProgress", "UnderReview", "Resolved", "Closed", "Escalated"].map((s) => <option key={s}>{s}</option>)}</select>
                <button className="primary-btn" onClick={updateStatus} disabled={!grievance}>Update Status</button>
            </section>
            <TrackGrievance />
        </>
    );
}
