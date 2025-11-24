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

            // axiosInstance already handles baseURL + Authorization header
            const res = await api.get("/admin/pending");
            const data = res.data.admins || res.data || [];
            setPendingAdmins(data);
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message || "Failed to load pending admins"
            );

            if (err?.response?.status === 401) {
                // if this page is for superadmin:
                // navigate("/superadmin/login");
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
            toast.error(
                err?.response?.data?.message || "Approval failed"
            );
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
            toast.error(
                err?.response?.data?.message || "Rejection failed"
            );
        }
    };

    useEffect(() => {
        fetchPendingAdmins();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getIdCardUrl = (idCardFile) => {
        if (!idCardFile) return null;

        if (idCardFile.startsWith("http")) return idCardFile;

        const BASE_URL =
            import.meta.env.VITE_API_URL || "http://localhost:4400";
        return `${BASE_URL}${idCardFile.startsWith("/") ? "" : "/"}${idCardFile}`;
    };

    if (loading) {
        return (
            <div className="p-6">
                <p>Loading pending admins...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
                Pending Admin Approvals
            </h1>

            {pendingAdmins.length === 0 && (
                <p>No pending admins 🎉</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pendingAdmins.map((admin) => {
                    const createdText = admin.createdAt
                        ? new Date(admin.createdAt).toLocaleString()
                        : "-";

                    const idCardUrl = getIdCardUrl(admin.idCardFile);

                    return (
                        <div
                            key={admin._id}
                            className="border p-4 rounded shadow bg-white"
                        >
                            <h3 className="text-lg font-bold mb-2">
                                {admin.name}
                            </h3>

                            <p>
                                <strong>Email:</strong> {admin.email}
                            </p>
                            <p>
                                <strong>Staff ID:</strong> {admin.staffId}
                            </p>
                            <p>
                                <strong>Department:</strong>{" "}
                                {admin.department || "—"}
                            </p>
                            <p>
                                <strong>Applied On:</strong>{" "}
                                {createdText}
                            </p>

                            {idCardUrl && (
                                <div className="mt-3">
                                    <p>
                                        <strong>ID Card:</strong>
                                    </p>
                                    <img
                                        src={idCardUrl}
                                        alt="ID Card"
                                        className="w-48 border rounded"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() =>
                                        approveAdmin(admin._id)
                                    }
                                    className="bg-green-600 text-white px-4 py-2 rounded"
                                >
                                    Approve
                                </button>

                                <button
                                    onClick={() =>
                                        rejectAdmin(admin._id)
                                    }
                                    className="bg-red-600 text-white px-4 py-2 rounded"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ApproveAdmins;
