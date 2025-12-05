import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";


export default function PendingAdmins() {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);

    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewName, setPreviewName] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchPending();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPending = async () => {
        setLoading(true);
        try {
            // axiosInstance already sends Authorization header + /api prefix
            const res = await api.get("/superadmin/pending");
            setPending(res.data?.admins || res.data || []);
        } catch (err) {
            console.error("fetchPending:", err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to load pending admins"
            );

            if (err?.response?.status === 401) {
                navigate("/superadmin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Approve this admin?")) return;
        try {
            // match backend route: PATCH /api/superadmin/approve/:id
            await api.patch(`/superadmin/approve/${id}`);
            toast.success("Admin approved ✅");
            fetchPending();
        } catch (err) {
            console.error("approve error:", err);
            toast.error(
                err?.response?.data?.message || "Approval failed"
            );
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Reject and delete this admin request?")) return;
        try {
            // match backend route: DELETE /api/superadmin/reject/:id
            await api.delete(`/superadmin/reject/${id}`);
            toast.success("Admin request rejected ❌");
            fetchPending();
        } catch (err) {
            console.error("reject error:", err);
            toast.error(
                err?.response?.data?.message || "Reject failed"
            );
        }
    };

    const openPreview = (filePath, name) => {
        if (!filePath) {
            toast.warn("No ID card uploaded");
            return;
        }

        const BASE_URL =
            import.meta.env.VITE_API_URL || "http://localhost:4400";

        const url = filePath.startsWith("http")
            ? filePath
            : `${BASE_URL}${filePath.startsWith("/") ? "" : "/"}${filePath}`;

        setPreviewName(name);
        setPreviewUrl(url);
    };

    const closePreview = () => {
        setPreviewUrl(null);
        setPreviewName(null);
    };

    return (
        <div className="pa-container">
            <h2>Pending Admin Approvals</h2>

            {loading ? (
                <div className="pa-loading">Loading pending requests…</div>
            ) : pending.length === 0 ? (
                <div className="pa-empty">
                    No pending admin requests 🎉
                </div>
            ) : (
                <div className="pa-grid">
                    {pending.map((req) => {
                        const createdText = req.createdAt
                            ? new Date(req.createdAt).toLocaleString()
                            : "-";

                        return (
                            <div className="pa-card" key={req._id}>
                                <div className="pa-row">
                                    <div>
                                        <h3>{req.name || req.username || "No name"}</h3>
                                        <div className="pa-meta">
                                            <span className="muted">{req.email}</span>
                                            <span className="muted">
                                                {" "}
                                                | ID: {req.staffId || "—"}
                                            </span>
                                        </div>
                                        <div className="pa-meta">
                                            Dept: {req.department || "—"}
                                        </div>
                                    </div>

                                    <div className="pa-actions">
                                        <button
                                            className="btn small"
                                            onClick={() =>
                                                openPreview(req.idCardFile, req.name)
                                            }
                                        >
                                            View ID
                                        </button>
                                        <button
                                            className="btn approve"
                                            onClick={() => handleApprove(req._id)}
                                        >
                                            Approve
                                        </button>
                                        <button
                                            className="btn reject"
                                            onClick={() => handleReject(req._id)}
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>

                                <div className="pa-footer">
                                    <small>Requested: {createdText}</small>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {previewUrl && (
                <div className="pa-modal" onClick={closePreview}>
                    <div
                        className="pa-modal-inner"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="pa-modal-header">
                            <h4>ID card — {previewName}</h4>
                            <button
                                className="btn small"
                                onClick={closePreview}
                            >
                                Close
                            </button>
                        </div>

                        <div className="pa-modal-body">
                            {/\.(png|jpe?g|gif|webp)$/i.test(previewUrl) ? (
                                <img src={previewUrl} alt="idcard" />
                            ) : (
                                <iframe
                                    title="preview"
                                    src={previewUrl}
                                    style={{ width: "100%", height: "70vh", border: 0 }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
