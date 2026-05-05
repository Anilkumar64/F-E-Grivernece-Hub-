import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import StepUpModal from "../../components/common/StepUpModal";

export default function SuperAdminUsers() {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ role: "", isActive: "", q: "" });
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: "1", limit: "50" });
            if (filters.role) params.set("role", filters.role);
            if (filters.isActive !== "") params.set("isActive", String(filters.isActive));
            if (filters.q) params.set("q", filters.q);

            const [usersRes, deptRes, courseRes] = await Promise.all([
                api.get(`/superadmin/users?${params.toString()}`),
                api.get("/departments"),
                api.get("/courses"),
            ]);
            setUsers(usersRes.data?.users || []);
            setDepartments(deptRes.data || []);
            setCourses(courseRes.data?.courses || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const runProtected = async (action) => {
        try {
            await action();
            await load();
        } catch (error) {
            if (error?.response?.status === 403 && String(error?.response?.data?.message || "").toLowerCase().includes("step-up")) {
                setPendingAction(() => action);
                setStepUpOpen(true);
                return;
            }
            toast.error(error?.response?.data?.message || "Operation failed");
        }
    };

    const toggleStatus = async (user) => {
        await runProtected(async () => {
            await api.patch(`/superadmin/users/${user._id}/status`, { isActive: !user.isActive });
            toast.success("User status updated");
        });
    };

    const resetPassword = async (user) => {
        await runProtected(async () => {
            const res = await api.patch(`/superadmin/users/${user._id}/reset-password`);
            toast.success(`Temporary password: ${res.data.temporaryPassword}`);
        });
    };

    const updateAssignments = async (user, nextDepartment, nextCourse) => {
        try {
            await api.patch(`/superadmin/users/${user._id}/assignments`, {
                department: nextDepartment || null,
                course: nextCourse || null,
            });
            toast.success("Assignments updated");
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to update assignments");
        }
    };

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>User Lifecycle Management</h1>
                    <p>Search users, suspend/reactivate accounts, reset passwords, and manage assignments.</p>
                </div>
            </div>

            <div className="form-grid">
                <label>Role
                    <select value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
                        <option value="">All roles</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                    </select>
                </label>
                <label>Status
                    <select value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}>
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </label>
                <label>Search
                    <input
                        value={filters.q}
                        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                        placeholder="Name, email, student/staff ID"
                    />
                </label>
            </div>
            <div className="split-actions">
                <button className="secondary-btn" onClick={load}>Apply Filters</button>
            </div>

            {loading ? <Skeleton rows={5} /> : (
                <div className="responsive-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Course</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.role}</td>
                                    <td>
                                        <select
                                            value={user.department?._id || ""}
                                            onChange={(e) => updateAssignments(user, e.target.value, user.course?._id || "")}
                                        >
                                            <option value="">None</option>
                                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            value={user.course?._id || ""}
                                            onChange={(e) => updateAssignments(user, user.department?._id || "", e.target.value)}
                                        >
                                            <option value="">None</option>
                                            {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <span className={`pill ${user.isActive ? "success" : ""}`}>{user.isActive ? "Active" : "Inactive"}</span>
                                    </td>
                                    <td>
                                        <div className="split-actions">
                                            <button className="secondary-btn" onClick={() => toggleStatus(user)}>
                                                {user.isActive ? "Suspend" : "Reactivate"}
                                            </button>
                                            <button className="secondary-btn" onClick={() => resetPassword(user)}>
                                                Reset Password
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <StepUpModal
                open={stepUpOpen}
                onClose={() => { setStepUpOpen(false); setPendingAction(null); }}
                onVerified={async () => {
                    if (!pendingAction) return;
                    await pendingAction();
                    setPendingAction(null);
                    await load();
                }}
            />
        </section>
    );
}

