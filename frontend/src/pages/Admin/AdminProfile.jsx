import React, { useContext, useRef, useState } from "react";
import AuthContext from "../../context/AuthCore";
import api from "../../api/axiosInstance";
import "../../styles/AdminStyles/AdminProfile.css";

export default function AdminProfile() {
    const { authUser, updateAuthUser } = useContext(AuthContext);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);

    const name = authUser?.name || "Admin";
    const initials = name.split(" ").map((n) => n[0]?.toUpperCase()).join("").slice(0, 2);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError("");
        setUploading(true);
        try {
            const form = new FormData();
            form.append("profilePhoto", file);
            const res = await api.patch("/users/me/avatar", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            updateAuthUser(res.data.user);
        } catch (err) {
            setError(err.response?.data?.message || "Upload failed. Please try again.");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    return (
        <div className="admin-profile-card">
            <h2 className="admin-profile-title">My Profile</h2>

            {/* Profile Photo */}
            <div className="admin-profile-photo-section">
                <div
                    className="admin-profile-photo-wrapper"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    title="Click to change photo"
                >
                    {authUser?.profilePhoto ? (
                        <img
                            src={authUser.profilePhoto}
                            alt="Profile"
                            className="admin-profile-photo-img"
                        />
                    ) : (
                        <div className="admin-profile-photo-initials">{initials}</div>
                    )}
                    <div className="admin-profile-photo-overlay">
                        {uploading ? "Uploading…" : "Change Photo"}
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
                {error && <p className="admin-profile-error" style={{ marginTop: 8 }}>{error}</p>}
                <p className="admin-profile-photo-hint">JPG or PNG, max 2MB</p>
            </div>

            {/* Info */}
            <div className="admin-profile-info">
                <p><strong>Name:</strong> {authUser?.name}</p>
                <p><strong>Email:</strong> {authUser?.email}</p>
                <p><strong>Staff ID:</strong> {authUser?.staffId || "-"}</p>
                <p><strong>Department:</strong> {authUser?.department?.name || "-"}</p>
                <p><strong>Role:</strong> {authUser?.role}</p>
            </div>
        </div>
    );
}
