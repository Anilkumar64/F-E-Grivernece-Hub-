import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../../components/common/BackButton";
import api from "../../api/axiosInstance";
import Timeline from "../../components/grievance/Timeline";
import { toast } from "react-toastify"; // CSS will come next
import "../../styles/AdminStyles/AdminGrievanceDetails.css";

export default function AdminGrievanceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [grievance, setGrievance] = useState(null);
    const [loading, setLoading] = useState(true);

    const [admins, setAdmins] = useState([]);
    const [status, setStatus] = useState("");
    const [priority, setPriority] = useState("");
    const [assignedTo, setAssignedTo] = useState("");
    const [adminNote, setAdminNote] = useState("");
    const [timelineMsg, setTimelineMsg] = useState("");
    const [addingTimeline, setAddingTimeline] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchGrievance();
        fetchAdmins();
    }, [id]);

    const fetchGrievance = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/grievances/admin/grievance/${id}`);
            const data = res.data.grievance || res.data || {};

            setGrievance(data);
            setStatus(data.status || "");
            setPriority(data.priority || "Medium");
            setAssignedTo(data.assignedTo?._id || data.assignedTo || "");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to load grievance");
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmins = async () => {
        try {
            const res = await api.get("/admin/admins");
            setAdmins(res.data.admins || res.data || []);
        } catch (err) {
            console.warn("Could not load admins list", err);
        }
    };

    /* ---------------- Actions ---------------- */

    const handleChangeStatus = async (newStatus) => {
        if (!window.confirm(`Change status to "${newStatus}" ?`)) return;
        setSaving(true);
        try {
            await api.patch(`/grievances/update-status/${grievance._id}`, {
                status: newStatus,
                message: `Status changed to ${newStatus} by admin`,
            });
            toast.success("Status updated");
            await fetchGrievance();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update status");
        } finally {
            setSaving(false);
        }
    };

    const handleAssignAdmin = async () => {
        if (!assignedTo) return toast.warn("Choose an admin");
        setSaving(true);
        try {
            await api.patch(`/grievances/assign/${grievance._id}`, { assignedTo });
            toast.success("Assigned successfully");
            await fetchGrievance();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to assign admin");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePriority = async () => {
        if (!priority) return toast.warn("Choose a priority");
        setSaving(true);
        try {
            await api.patch(`/grievances/update-priority/${grievance._id}`, {
                priority,
            });
            toast.success("Priority updated");
            await fetchGrievance();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update priority");
        } finally {
            setSaving(false);
        }
    };

    const handleAddAdminNote = async () => {
        if (!adminNote.trim()) return toast.warn("Write a note");
        setSaving(true);
        try {
            await api.post(`/grievances/admin-note/${grievance._id}`, {
                note: adminNote,
            });
            toast.success("Admin note added");
            setAdminNote("");
            await fetchGrievance();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to add note");
        } finally {
            setSaving(false);
        }
    };

    const handleAddTimelineEvent = async () => {
        if (!timelineMsg.trim()) return toast.warn("Write timeline message");
        setAddingTimeline(true);
        try {
            await api.post(`/grievances/timeline/${grievance._id}`, {
                status: status || "Update",
                message: timelineMsg,
                date: new Date().toISOString(),
            });
            toast.success("Timeline updated");
            setTimelineMsg("");
            await fetchGrievance();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to add timeline");
        } finally {
            setAddingTimeline(false);
        }
    };

    const handleForwardEscalate = async (opt = {}) => {
        if (!window.confirm("Confirm forward/escalate action?")) return;
        setSaving(true);
        try {
            await api.patch(`/grievances/escalate/${grievance._id}`, opt);
            toast.success("Action completed");
            await fetchGrievance();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to escalate");
        } finally {
            setSaving(false);
        }
    };

    /* ---------------- Render ---------------- */

    if (loading) return <div className="agd-loading">Loading...</div>;
    if (!grievance) return <div className="agd-empty">No grievance found.</div>;

    const {
        title,
        description,
        trackingId,
        status: currentStatus,
        priority: currentPriority,
        attachments = [],
        timeline,
        adminAssigned,
        adminRemarks,
        createdAt,
        updatedAt,
        userEmail,
        department,
        complaintType,
    } = grievance;

    const safeTimeline = Array.isArray(timeline) ? timeline : [];

    return (
        <div className="admin-grievance-details">
            <div className="agd-top">
                {/* LEFT SIDE */}
                <div className="agd-left">
                    <h1 className="agd-title">{title}</h1>

                    <div className="agd-meta">
                        <span className={`agd-badge ${currentStatus || ""}`}>
                            {currentStatus}
                        </span>
                        <span className="agd-meta-item">Priority: {currentPriority}</span>
                        <span className="agd-meta-item">Tracking: {trackingId}</span>
                        <span className="agd-meta-item">
                            Dept: {department?.name || "-"}
                        </span>
                        <span className="agd-meta-item">
                            Type: {complaintType?.type || "-"}
                        </span>
                    </div>

                    <p className="agd-description">{description}</p>

                    <div className="agd-actions-row">
                        <button
                            className="agd-btn"
                            onClick={() => handleChangeStatus("In Progress")}
                        >
                            Start
                        </button>

                        <button
                            className="agd-btn agd-btn-outline"
                            onClick={() => handleChangeStatus("Resolved")}
                        >
                            Resolve
                        </button>

                        <button
                            className="agd-btn agd-btn-danger"
                            onClick={() => handleChangeStatus("Rejected")}
                        >
                            Reject
                        </button>

                        <button className="agd-btn" onClick={() => navigate("/admin/grievances")}>
                            Back
                        </button>
                    </div>

                    {/* ADMIN NOTE */}
                    <section className="agd-section">
                        <h3>Admin Note</h3>
                        <textarea
                            className="agd-textarea"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <button
                            className="agd-btn"
                            onClick={handleAddAdminNote}
                            disabled={!adminNote.trim()}
                        >
                            Add Note
                        </button>

                        {adminRemarks && (
                            <p className="agd-remarks">
                                <b>Last remark:</b> {adminRemarks}
                            </p>
                        )}
                    </section>

                    {/* TIMELINE EDITOR */}
                    <section className="agd-section">
                        <h3>Timeline Editor</h3>
                        <textarea
                            className="agd-textarea"
                            value={timelineMsg}
                            onChange={(e) => setTimelineMsg(e.target.value)}
                        />
                        <div className="agd-row">
                            <select
                                className="agd-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                            >
                                <option value="">Select Status</option>
                                <option>Pending</option>
                                <option>In Progress</option>
                                <option>Resolved</option>
                                <option>Rejected</option>
                            </select>

                            <button
                                className="agd-btn"
                                onClick={handleAddTimelineEvent}
                            >
                                Add Timeline
                            </button>
                        </div>
                    </section>
                </div>

                {/* RIGHT SIDE */}
                <aside className="agd-right">
                    <div className="agd-card">
                        <h4>Submission</h4>
                        <p><b>By:</b> {userEmail || "Anonymous"}</p>
                        <p className="agd-muted">Submitted: {new Date(createdAt).toLocaleString()}</p>
                        <p className="agd-muted">Updated: {new Date(updatedAt).toLocaleString()}</p>
                    </div>

                    {/* ASSIGN ADMIN */}
                    <div className="agd-card">
                        <h4>Assign / Reassign</h4>
                        <select
                            className="agd-select"
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                        >
                            <option value="">-- Select Admin --</option>
                            {admins.map((a) => (
                                <option key={a._id} value={a._id}>
                                    {a.name || a.email}
                                </option>
                            ))}
                        </select>

                        <button className="agd-btn" onClick={handleAssignAdmin}>
                            Assign
                        </button>

                        <p className="agd-muted">
                            Current: {adminAssigned?.name || "Not assigned"}
                        </p>
                    </div>

                    {/* PRIORITY */}
                    <div className="agd-card">
                        <h4>Priority</h4>
                        <select
                            className="agd-select"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                        >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                            <option>Critical</option>
                        </select>

                        <button className="agd-btn" onClick={handleChangePriority}>
                            Save
                        </button>
                    </div>

                    {/* ATTACHMENTS */}
                    <div className="agd-card">
                        <h4>Attachments</h4>
                        {attachments.length ? (
                            <ul className="agd-attachments">
                                {attachments.map((file, idx) => (
                                    <li key={idx}>
                                        <a href={`/uploads/${file}`} target="_blank" rel="noreferrer">
                                            Attachment {idx + 1}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="agd-muted">No attachments</p>
                        )}
                    </div>

                    {/* ESCALATE */}
                    <div className="agd-card">
                        <h4>Forward / Escalate</h4>
                        <button
                            className="agd-btn"
                            onClick={() => handleForwardEscalate({ escalateToSuper: true })}
                        >
                            Escalate to SuperAdmin
                        </button>

                        <button
                            className="agd-btn agd-btn-outline"
                            onClick={() => {
                                const dept = prompt("Enter Department ID");
                                if (dept) handleForwardEscalate({ forwardDeptId: dept });
                            }}
                        >
                            Forward to Dept
                        </button>
                    </div>
                </aside>
            </div>

            {/* TIMELINE */}
            <div className="agd-timeline-area">
                <h3>Timeline</h3>
                <Timeline events={safeTimeline} />
            </div>
        </div>
    );
}
