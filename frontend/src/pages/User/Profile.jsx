import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";

export default function Profile() {
    const { authUser, updateAuthUser } = useContext(AuthContext);
    const [profile, setProfile] = useState(authUser);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        rollNumber: "", studentId: "", course: "", yearOfStudy: "", class: "",
        department: "", admissionYear: "", contactNumber: "", alternateEmail: "", address: "",
    });
    const [photo, setPhoto] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        // BUG FIX #1: /students/profile was throwing 404 because server.js never mounted
        // studentRoutes at /api/students. The route is correct; the missing mount is the bug.
        // We keep /students/profile (NOT /users/me) because it:
        //   (a) populates department + course for display
        //   (b) accepts contactNumber, alternateEmail, class on PATCH
        //   (c) supports profilePhoto multipart upload via userUploads middleware
        api.get("/students/profile").then((res) => {
            setProfile(res.data.user);
            updateAuthUser(res.data.user);
            setForm({
                rollNumber: res.data.user.rollNumber || "",
                studentId: res.data.user.studentId || "",
                course: res.data.user.course?._id || "",
                yearOfStudy: res.data.user.yearOfStudy || "",
                department: res.data.user.department?._id || "",
                admissionYear: res.data.user.admissionYear || "",
                contactNumber: res.data.user.contactNumber || res.data.user.phone || "",
                alternateEmail: res.data.user.alternateEmail || "",
                address: res.data.user.address || "",
                class: res.data.user.class || "",
            });
        }).catch(() => { });
        api.get("/departments").then((res) => setDepartments(res.data || [])).catch(() => { });
    }, [updateAuthUser]);

    useEffect(() => {
        const departmentId = form.department;
        const url = departmentId ? `/courses?department=${departmentId}` : "/courses";
        api.get(url).then((res) => setCourses(res.data?.courses || [])).catch(() => setCourses([]));
    }, [form.department]);

    const save = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        if (photo) data.append("profilePhoto", photo);
        try {
            const res = await api.patch("/students/profile", data);
            setProfile(res.data.user);
            updateAuthUser(res.data.user);
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
                    {profile?.profilePhoto ? (
                        <img
                            src={profile.profilePhoto}
                            alt={`${profile?.name || "Student"} profile`}
                            className="avatar"
                            style={{ width: 96, height: 96, fontSize: 32, objectFit: "cover" }}
                        />
                    ) : (
                        <div className="avatar" style={{ width: 96, height: 96, fontSize: 32 }}>
                            {profile?.name?.[0] || "S"}
                        </div>
                    )}
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
                        <label>Roll Number<input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></label>
                        <label>Student ID<input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /></label>
                        <label>Department
                            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                                ))}
                            </select>
                        </label>
                        <label>Course
                            <select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                                <option value="">Select Course</option>
                                {courses.map((course) => (
                                    <option key={course._id} value={course._id}>{course.name} ({course.code})</option>
                                ))}
                            </select>
                        </label>
                        <label>Year<input value={form.yearOfStudy} onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })} /></label>
                        <label>Admission Year<input value={form.admissionYear} onChange={(e) => setForm({ ...form, admissionYear: e.target.value })} /></label>
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