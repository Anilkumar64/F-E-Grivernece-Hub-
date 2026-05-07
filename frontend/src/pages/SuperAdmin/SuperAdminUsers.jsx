import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";
import StepUpModal from "../../components/common/StepUpModal";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

export default function SuperAdminUsers() {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ role: "", isActive: "", q: "" });
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const load = useCallback(async () => {
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
    }, [filters]);

    useEffect(() => {
        const t = window.setTimeout(load, 0);
        return () => window.clearTimeout(t);
    }, [load]);

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
        <section className="space-y-6">
            <div className="space-y-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">User Lifecycle Management</h1>
                    <p className="text-sm text-gray-600">Search users, suspend/reactivate accounts, reset passwords, and manage assignments.</p>
                </div>
            </div>

            <Card className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-gray-700">Role
                    <select className="ui-input" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
                        <option value="">All roles</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Super Admin</option>
                    </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-gray-700">Status
                    <select className="ui-input" value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}>
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-gray-700">Search
                    <input className="ui-input"
                        value={filters.q}
                        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                        placeholder="Name, email, student/staff ID"
                    />
                </label>
            </Card>
            <div><Button variant="outline" onClick={load}>Apply Filters</Button></div>

            {loading ? <Skeleton rows={5} /> : (
                <Card className="overflow-hidden p-0">
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
                                        <select className="ui-input"
                                            value={user.department?._id || ""}
                                            onChange={(e) => updateAssignments(user, e.target.value, user.course?._id || "")}
                                        >
                                            <option value="">None</option>
                                            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <select className="ui-input"
                                            value={user.course?._id || ""}
                                            onChange={(e) => updateAssignments(user, user.department?._id || "", e.target.value)}
                                        >
                                            <option value="">None</option>
                                            {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </td>
                                    <td>
                                        <Badge className={user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => toggleStatus(user)}>
                                                {user.isActive ? "Suspend" : "Reactivate"}
                                            </Button>
                                            <Button variant="outline" onClick={() => resetPassword(user)}>
                                                Reset Password
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </Card>
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

