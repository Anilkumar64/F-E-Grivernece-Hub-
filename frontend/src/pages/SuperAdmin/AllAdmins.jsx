import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Edit, KeyRound, Plus, Power } from "lucide-react";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";
import StepUpModal from "../../components/common/StepUpModal";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";

const initialForm = { name: "", email: "", staffId: "", department: "", password: "", autoGeneratePassword: true, isActive: true };

export default function AllAdmins() {
    const [admins, setAdmins] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const [adminRes, deptRes] = await Promise.all([api.get("/admin/all"), api.get("/departments")]);
            setAdmins(adminRes.data.admins || []);
            setDepartments(deptRes.data || []);                                          // ← bare array now
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load admins");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm(initialForm); setShowForm(true); };

    const openEdit = (admin) => {
        setEditing(admin);
        setForm({
            name: admin.name || "",
            email: admin.email || "",
            staffId: admin.staffId || "",
            department: admin.department?._id || "",
            password: "",
            autoGeneratePassword: true,
            isActive: admin.isActive,
        });
        setShowForm(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        const run = async () => {
            if (editing) {
                await api.patch(`/admin/${editing._id}`, form);
                toast.success("Admin updated");
            } else {
                const res = await api.post("/admin/create", { ...form, role: "admin" });
                toast.success(res.data.temporaryPassword ? `Admin created. Password: ${res.data.temporaryPassword}` : "Admin created");
            }
            setShowForm(false);
            load();
        };
        try {
            await run();
        } catch (error) {
            if (error?.response?.status === 403 && String(error?.response?.data?.message || "").toLowerCase().includes("step-up")) {
                setPendingAction(() => run);
                setStepUpOpen(true);
                return;
            }
            toast.error(error?.response?.data?.message || "Unable to save admin");
        }
    };

    const deactivate = async (id) => {
        if (!window.confirm("Deactivate this admin?")) return;
        const run = async () => {
            await api.delete(`/admin/${id}`);
            toast.success("Admin deactivated");
            load();
        };
        try {
            await run();
        } catch (error) {
            if (error?.response?.status === 403 && String(error?.response?.data?.message || "").toLowerCase().includes("step-up")) {
                setPendingAction(() => run);
                setStepUpOpen(true);
                return;
            }
            toast.error(error?.response?.data?.message || "Unable to deactivate admin");
        }
    };

    const resetPassword = async (id) => {
        const run = async () => {
            const res = await api.patch(`/admin/${id}/reset-password`);
            toast.success(`Temporary password: ${res.data.temporaryPassword}`);
        };
        try {
            await run();
        } catch (error) {
            if (error?.response?.status === 403 && String(error?.response?.data?.message || "").toLowerCase().includes("step-up")) {
                setPendingAction(() => run);
                setStepUpOpen(true);
                return;
            }
            toast.error(error?.response?.data?.message || "Unable to reset password");
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manage Admins</h1>
                    <p className="text-sm text-gray-600">Create and manage department admin accounts.</p>
                </div>
                <Button onClick={openCreate}><Plus size={18} /> Add Admin</Button>
            </div>

            {loading ? <Skeleton rows={4} /> : !admins.length ? (
                <EmptyState icon="+" title="No admins yet" subtext="Create your first department admin." actionLabel="Add Admin" onAction={openCreate} />
            ) : (
                <Card className="overflow-hidden p-0">
                <div className="responsive-table">
                    <table>
                        <thead><tr><th>Name</th><th>Email</th><th>Staff ID</th><th>Department</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                        <tbody>
                            {admins.map((admin) => (
                                <tr key={admin._id}>
                                    <td>{admin.name}</td>
                                    <td>{admin.email}</td>
                                    <td>{admin.staffId || "-"}</td>
                                    <td>{admin.department?.name || "-"}</td>
                                    <td>{admin.role === "superadmin" ? "Super Admin" : "Department Admin"}</td>
                                    <td><Badge className={admin.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}>{admin.isActive ? "Active" : "Inactive"}</Badge></td>
                                    <td>
                                        {admin.role === "admin" && (
                                            <div className="flex gap-2">
                                                <Button variant="outline" onClick={() => openEdit(admin)}><Edit size={16} /> Edit</Button>
                                                <Button variant="outline" onClick={() => resetPassword(admin._id)}><KeyRound size={16} /> Reset</Button>
                                                <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => deactivate(admin._id)}><Power size={16} /> Deactivate</Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </Card>
            )}

            <Modal open={showForm} onClose={() => setShowForm(false)}>
                    <form className="space-y-4" onSubmit={submit}>
                        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight text-gray-900">{editing ? "Edit Admin" : "Add Admin"}</h2><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Close</Button></div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Full Name<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Email<Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Staff ID<Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} required /></label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Department
                                <select className="ui-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                                    <option value="">Select department</option>
                                    {departments.filter((d) => d.isActive !== false).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </label>
                        </div>
                        {!editing && (
                            <>
                                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.autoGeneratePassword} onChange={(e) => setForm({ ...form, autoGeneratePassword: e.target.checked })} /> Auto-generate password</label>
                                {!form.autoGeneratePassword && <label className="grid gap-2 text-sm font-medium text-gray-700">Password<Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>}
                            </>
                        )}
                        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button>{editing ? "Save Changes" : "Create Admin"}</Button>
                        </div>
                    </form>
            </Modal>
            <StepUpModal
                open={stepUpOpen}
                onClose={() => { setStepUpOpen(false); setPendingAction(null); }}
                onVerified={async () => {
                    if (!pendingAction) return;
                    await pendingAction();
                    setPendingAction(null);
                }}
            />
        </section>
    );
}