import React, { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import AuthContext from "../../context/AuthCore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";

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
    const [removingPhoto, setRemovingPhoto] = useState(false);

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

    const removePhoto = async () => {
        setRemovingPhoto(true);
        try {
            const data = new FormData();
            data.append("removeProfilePhoto", "true");
            const res = await api.patch("/students/profile", data);
            setProfile(res.data.user);
            updateAuthUser(res.data.user);
            toast.success("Profile photo removed");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to remove profile photo");
        } finally {
            setRemovingPhoto(false);
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Profile</h1><Button onClick={() => setEditing(true)}>Edit Profile</Button></div>
            <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
                <Card className="flex flex-col items-center gap-2 text-center">
                    {profile?.profilePhoto ? (
                        <img
                            src={profile.profilePhoto}
                            alt={`${profile?.name || "Student"} profile`}
                            className="h-24 w-24 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-3xl font-semibold text-indigo-700">
                            {profile?.name?.[0] || "S"}
                        </div>
                    )}
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">{profile?.name}</h2>
                    <Badge>Student</Badge>
                    <p className="text-sm text-gray-500">{profile?.course?.name || "Course not assigned"}</p>
                    <p className="text-sm text-gray-500">{profile?.department?.name || "Department not assigned"}</p>
                </Card>
                <Card>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Info label="Roll Number" value={profile?.rollNumber || profile?.studentId} />
                        <Info label="Course" value={profile?.course?.name || "-"} />
                        <Info label="Year" value={profile?.currentYear || profile?.yearOfStudy || "-"} />
                        <Info label="Class" value={profile?.class || "-"} />
                        <Info label="Department" value={profile?.department?.name || "-"} />
                        <Info label="Admission Year" value={profile?.admissionYear || "-"} />
                        <Info label="Contact" value={profile?.contactNumber || profile?.phone || "-"} />
                        <Info label="Email" value={profile?.email || "-"} />
                    </div>
                </Card>
            </div>
            <Modal open={editing} onClose={() => setEditing(false)}>
                    <form className="space-y-3" onSubmit={save}>
                        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight text-gray-900">Edit Profile</h2><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Close</Button></div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Profile Photo<Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} /></label>
                        <div className="flex justify-end">
                            <Button type="button" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={removePhoto} disabled={removingPhoto || !profile?.profilePhoto}>
                                {removingPhoto ? "Removing..." : "Remove Profile Photo"}
                            </Button>
                        </div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Roll Number<Input value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Student ID<Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Department
                            <select className="ui-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Course
                            <select className="ui-input" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}>
                                <option value="">Select Course</option>
                                {courses.map((course) => (
                                    <option key={course._id} value={course._id}>{course.name} ({course.code})</option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Year<Input value={form.yearOfStudy} onChange={(e) => setForm({ ...form, yearOfStudy: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Admission Year<Input value={form.admissionYear} onChange={(e) => setForm({ ...form, admissionYear: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Contact Number<Input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Alternate Email<Input value={form.alternateEmail} onChange={(e) => setForm({ ...form, alternateEmail: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Class<Input value={form.class} onChange={(e) => setForm({ ...form, class: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Address<textarea className="ui-input min-h-20" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
                        <Button>Save Changes</Button>
                    </form>
            </Modal>
        </section>
    );
}

function Info({ label, value }) {
    return <div><span className="text-xs text-gray-500">{label}</span><p className="text-sm font-semibold text-gray-900">{value || "-"}</p></div>;
}   