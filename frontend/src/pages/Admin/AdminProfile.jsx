import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminStyles/AdminProfile.css";

function AdminProfile() {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        try {
            setLoading(true);

            const res = await api.get("/admin/me");
            const adminData = res.data.admin || res.data;
            setAdmin(adminData);

        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to load profile");

            if (err?.response?.status === 401) {
                navigate("/admin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await api.post("/admin/logout", { id: admin?._id });
        } catch (err) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Logout failed");
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("token");
            localStorage.removeItem("admin");

            toast.success("Logged out");
            navigate("/admin/login");
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    if (loading) return <div className="admin-profile-loading">Loading profile...</div>;

    if (!admin) {
        return (
            <div className="admin-profile-card">
                <h1 className="admin-profile-title">Admin Profile</h1>
                <p className="admin-profile-error">Unable to load admin details.</p>

                <button
                    onClick={() => navigate("/admin/login")}
                    className="admin-btn primary"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    let idCardUrl = admin.idCardFile;
    if (idCardUrl && !idCardUrl.startsWith("http")) {
        const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4400";
        idCardUrl = `${BASE_URL}${idCardUrl.startsWith("/") ? "" : "/"}${idCardUrl}`;
    }

    return (
        <div className="admin-profile-card">
            <h1 className="admin-profile-title">Admin Profile</h1>

            <div className="admin-profile-info">
                <p><strong>Name:</strong> {admin.name}</p>
                <p><strong>Email:</strong> {admin.email}</p>
                <p><strong>Staff ID:</strong> {admin.staffId}</p>
                <p><strong>Department:</strong> {admin.department}</p>
                <p><strong>Role:</strong> {admin.role}</p>

                <p>
                    <strong>Status:</strong>{" "}
                    {admin.verified ? (
                        <span className="status-green">Verified</span>
                    ) : (
                        <span className="status-red">Not Verified</span>
                    )}
                </p>
            </div>

            {admin.idCardFile && (
                <div className="admin-profile-idcard">
                    <p className="admin-profile-idlabel">ID Card:</p>
                    <img
                        src={idCardUrl}
                        alt="ID Card"
                        className="admin-profile-id-img"
                    />
                </div>
            )}

            <button onClick={logout} className="admin-btn danger">
                Logout
            </button>
        </div>
    );
}

export default AdminProfile;
