import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";

export default function AllAdmins() {
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const res = await api.get("/superadmin/admins");
            setAdmins(res.data?.admins || []);
        } catch (err) {
            console.error("fetchAdmins error:", err);
            toast.error(
                err?.response?.data?.message || "Failed to load admin list"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    return (
        <div className="aa-container">
            <h1 className="aa-title">All Admins</h1>

            {loading ? (
                <p className="aa-loading">Loading admins...</p>
            ) : admins.length === 0 ? (
                <p className="aa-empty">No admins found.</p>
            ) : (
                <div className="aa-grid">
                    {admins.map((admin) => {
                        const createdText = admin.createdAt
                            ? new Date(admin.createdAt).toLocaleString()
                            : "-";

                        return (
                            <div key={admin._id} className="aa-card">
                                <div className="aa-left">
                                    <h3 className="aa-name">
                                        {admin.name || admin.username}
                                    </h3>
                                    <p className="aa-meta">{admin.email}</p>
                                    <p className="aa-meta">
                                        Dept: {admin.departmentName || "—"}
                                    </p>

                                    <p className="aa-created">
                                        Joined: {createdText}
                                    </p>
                                </div>

                                <div className="aa-right">
                                    <span
                                        className={
                                            admin.verified
                                                ? "aa-badge verified"
                                                : "aa-badge pending"
                                        }
                                    >
                                        {admin.verified ? "Verified" : "Pending"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
