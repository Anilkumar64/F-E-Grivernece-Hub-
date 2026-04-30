import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";

export default function Profile() {
    const { authUser } = useContext(AuthContext);
    const [profile, setProfile] = useState(authUser);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ contactNumber: "", alternateEmail: "", address: "", class: "" });
    const [photo, setPhoto] = useState(null);

    useEffect(() => {
        api.get("/students/profile").then((res) => {
            setProfile(res.data.user);
            setForm({
                contactNumber: res.data.user.contactNumber || res.data.user.phone || "",
                alternateEmail: res.data.user.alternateEmail || "",
                address: res.data.user.address || "",
                class: res.data.user.class || "",
            });
        }).catch(() => {});
    }, []);

    const save = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        if (photo) data.append("profilePhoto", photo);
        try {
            const res = await api.patch("/students/profile", data);
            setProfile(res.data.user);
            setEditing(false);
            toast.success("Profile updated");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to update profile");
        }
    };

    return (
        <section className="page-section">
            <div className="page-heading"><h1>Profile</h1><button className="primary-btn" onClick={() => setEditing(true)}>Edit Profile</button></div>
            <div className="detail-layout">
                <aside className="profile-card">
                    <div className="avatar" style={{ width: 96, height: 96, fontSize: 32 }}>{profile?.name?.[0] || "S"}</div>
                    <h2>{profile?.name}</h2>
                    <span className="role-pill">Student</span>
                    <p className="muted">{profile?.department?.name || "Department not assigned"}</p>
                </aside>
                <div className="card">
                    <div className="summary-grid">
                        <Info label="Roll Number" value={profile?.rollNumber || profile?.studentId} />
                        <Info label="Course" value={profile?.course?.name || "-"} />
                        <Info label="Year" value={profile?.currentYear || profile?.yearOfStudy || "-"} />
                        <Info label="Class" value={profile?.class || "-"} />
                        <Info label="Department" value={profile?.department?.name || "-"} />
                        <Info label="Admission Year" value={profile?.admissionYear || "-"} />
                        <Info label="Contact" value={profile?.contactNumber || profile?.phone || "-"} />
                        <Info label="Email" value={profile?.email || "-"} />
                    </div>
                </div>
            </div>
            {editing && (
                <div className="modal-backdrop">
                    <form className="modal" onSubmit={save}>
                        <div className="page-heading"><h2>Edit Profile</h2><button type="button" className="ghost-btn" onClick={() => setEditing(false)}>Close</button></div>
                        <label>Profile Photo<input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} /></label>
                        <label>Contact Number<input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></label>
                        <label>Alternate Email<input value={form.alternateEmail} onChange={(e) => setForm({ ...form, alternateEmail: e.target.value })} /></label>
                        <label>Class<input value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} /></label>
                        <label>Address<textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                        <button className="primary-btn">Save Changes</button>
                    </form>
                </div>
            )}
        </section>
    );
}

function Info({ label, value }) {
    return <div><span className="muted">{label}</span><strong>{value || "-"}</strong></div>;
}
