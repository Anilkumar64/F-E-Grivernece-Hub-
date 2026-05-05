import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Edit, KeyRound, Plus, Power } from "lucide-react";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";

const initialForm = { name: "", email: "", staffId: "", department: "", password: "", autoGeneratePassword: true, isActive: true };

export default function AllAdmins() {
    const [admins, setAdmins] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(initialForm);

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
        try {
            if (editing) {
                await api.patch(`/admin/${editing._id}`, form);
                toast.success("Admin updated");
            } else {
                const res = await api.post("/admin/create", { ...form, role: "admin" });
                toast.success(res.data.temporaryPassword ? `Admin created. Password: ${res.data.temporaryPassword}` : "Admin created");
            }
            setShowForm(false);
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to save admin");
        }
    };

    const deactivate = async (id) => {
        if (!window.confirm("Deactivate this admin?")) return;
        try {
            await api.delete(`/admin/${id}`);
            toast.success("Admin deactivated");
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to deactivate admin");
        }
    };

    const resetPassword = async (id) => {
        try {
            const res = await api.patch(`/admin/${id}/reset-password`);
            toast.success(`Temporary password: ${res.data.temporaryPassword}`);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to reset password");
        }
    };

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Manage Admins</h1>
                    <p>Create and manage department admin accounts.</p>
                </div>
                <button className="primary-btn" onClick={openCreate}><Plus size={18} /> Add Admin</button>
            </div>

            {loading ? <Skeleton rows={4} /> : !admins.length ? (
                <EmptyState icon="+" title="No admins yet" subtext="Create your first department admin." actionLabel="Add Admin" onAction={openCreate} />
            ) : (
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
                                    <td><span className={`pill ${admin.isActive ? "success" : ""}`}>{admin.isActive ? "Active" : "Inactive"}</span></td>
                                    <td>
                                        {admin.role === "admin" && (
                                            <div className="split-actions">
                                                <button className="secondary-btn" onClick={() => openEdit(admin)}><Edit size={16} /> Edit</button>
                                                <button className="secondary-btn" onClick={() => resetPassword(admin._id)}><KeyRound size={16} /> Reset</button>
                                                <button className="danger-btn" onClick={() => deactivate(admin._id)}><Power size={16} /> Deactivate</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="modal-backdrop">
                    <form className="modal" onSubmit={submit}>
                        <div className="page-heading"><h2>{editing ? "Edit Admin" : "Add Admin"}</h2><button type="button" className="ghost-btn" onClick={() => setShowForm(false)}>Close</button></div>
                        <label>Full Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
                        <div className="form-grid">
                            <label>Staff ID<input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} required /></label>
                            <label>Department
                                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required>
                                    <option value="">Select department</option>
                                    {departments.filter((d) => d.isActive !== false).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                            </label>
                        </div>
                        {!editing && (
                            <>
                                <label><input type="checkbox" checked={form.autoGeneratePassword} onChange={(e) => setForm({ ...form, autoGeneratePassword: e.target.checked })} /> Auto-generate password</label>
                                {!form.autoGeneratePassword && <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>}
                            </>
                        )}
                        <label><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
                        <div className="split-actions">
                            <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="primary-btn">{editing ? "Save Changes" : "Create Admin"}</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}