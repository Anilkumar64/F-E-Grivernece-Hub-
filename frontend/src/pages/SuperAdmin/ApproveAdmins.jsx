import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

function ApproveAdmins() {
    const [pendingAdmins, setPendingAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchPendingAdmins = async () => {
        try {
            setLoading(true);

            const res = await api.get("/admin/pending");
            const data = res.data.admins || res.data || [];
            setPendingAdmins(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message || "Failed to load pending admins"
            );

            if (err?.response?.status === 401) {
                navigate("/admin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    const approveAdmin = async (id) => {
        try {
            await api.patch(`/admin/approve/${id}`);
            toast.success("Admin approved");
            fetchPendingAdmins();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Approval failed");
        }
    };

    const rejectAdmin = async (id) => {
        if (!window.confirm("Reject and remove this admin request?")) return;

        try {
            await api.delete(`/admin/reject/${id}`);
            toast.success("Admin rejected and removed");
            fetchPendingAdmins();
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Rejection failed");
        }
    };

    useEffect(() => {
        fetchPendingAdmins();
        // we intentionally don't add fetchPendingAdmins in deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getIdCardUrl = (idCardFile) => {
        if (!idCardFile) return null;
        if (idCardFile.startsWith("http")) return idCardFile;

        const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4400";
        return `${BASE_URL}${idCardFile.startsWith("/") ? "" : "/"}${idCardFile}`;
    };

    const totalPending = pendingAdmins.length;
    const deptSet = new Set(
        pendingAdmins.map((a) => a.department).filter(Boolean)
    );
    const distinctDepartments = deptSet.size;

    if (loading) {
        return (
            <div className="ap-fullscreen-loader">
                Loading pending admins...
            </div>
        );
    }

    return (
        <div className="ap-root">
            {/* HEADER */}
            <header className="ap-header">
                <div>
                    <h1 className="ap-title">Pending Admin Approvals</h1>
                    <p className="ap-subtitle">
                        Review and approve admin requests before they can manage
                        grievances.
                    </p>
                </div>

                <div className="ap-header-meta">
                    <div className="ap-pill">
                        Total pending: <strong>{totalPending}</strong>
                    </div>
                    <div className="ap-pill">
                        Departments involved: <strong>{distinctDepartments}</strong>
                    </div>
                </div>
            </header>

            {/* EMPTY STATE */}
            {totalPending === 0 && (
                <div className="ap-empty-card">
                    <h2>All caught up 🎉</h2>
                    <p>
                        There are no pending admin approval requests at the moment.
                    </p>
                </div>
            )}

            {/* GRID OF REQUEST CARDS */}
            {totalPending > 0 && (
                <section className="ap-grid">
                    {pendingAdmins.map((admin) => {
                        const createdText = admin.createdAt
                            ? new Date(admin.createdAt).toLocaleString()
                            : "-";
                        const idCardUrl = getIdCardUrl(admin.idCardFile);

                        return (
                            <article key={admin._id} className="ap-card">
                                <div className="ap-card-header">
                                    <div className="ap-avatar">
                                        {(admin.name || admin.email || "?")
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="ap-card-name">
                                            {admin.name || "Unnamed Admin"}
                                        </h3>
                                        <p className="ap-card-role">
                                            {admin.department || "No department set"}
                                        </p>
                                    </div>
                                </div>

                                <div className="ap-card-body">
                                    <p>
                                        <span className="ap-label">Email</span>
                                        <span className="ap-value">
                                            {admin.email || "—"}
                                        </span>
                                    </p>
                                    <p>
                                        <span className="ap-label">Staff ID</span>
                                        <span className="ap-value">
                                            {admin.staffId || "—"}
                                        </span>
                                    </p>
                                    <p>
                                        <span className="ap-label">Applied On</span>
                                        <span className="ap-value">
                                            {createdText}
                                        </span>
                                    </p>
                                </div>

                                {idCardUrl && (
                                    <div className="ap-id-card">
                                        <span className="ap-label">ID Card</span>
                                        <img
                                            src={idCardUrl}
                                            alt="ID Card"
                                            className="ap-id-image"
                                        />
                                    </div>
                                )}

                                <div className="ap-card-actions">
                                    <button
                                        type="button"
                                        onClick={() => approveAdmin(admin._id)}
                                        className="ap-btn ap-btn-approve"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => rejectAdmin(admin._id)}
                                        className="ap-btn ap-btn-reject"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}
        </div>
    );
}

export default ApproveAdmins;
