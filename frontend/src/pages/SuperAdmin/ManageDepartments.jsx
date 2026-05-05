import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Edit, Plus, Power } from "lucide-react";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";

const initialForm = { name: "", code: "", description: "", headAdmin: "" };

export default function ManageDepartments() {
    const [departments, setDepartments] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(initialForm);

    const load = async () => {
        setLoading(true);
        try {
            const [deptRes, adminRes] = await Promise.all([api.get("/departments"), api.get("/admin/all")]);
            setDepartments(deptRes.data || []);                                          // ← bare array now
            setAdmins((adminRes.data.admins || []).filter((a) => a.role === "admin" && a.isActive));
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load departments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => { setEditing(null); setForm(initialForm); setShowForm(true); };

    const openEdit = (department) => {
        setEditing(department);
        setForm({
            name: department.name || "",
            code: department.code || "",
            description: department.description || "",
            headAdmin: department.headAdmin?._id || "",
        });
        setShowForm(true);
    };

    const submit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.patch(`/departments/${editing._id}`, form);
                toast.success("Department updated");
            } else {
                await api.post("/departments", form);
                toast.success("Department created");
            }
            setShowForm(false);
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to save department");
        }
    };

    const deactivate = async (id) => {
        if (!window.confirm("Deactivate this department?")) return;
        try {
            await api.delete(`/departments/${id}`);
            toast.success("Department deactivated");
            load();
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to deactivate department");
        }
    };

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Departments</h1>
                    <p>Manage academic and operational departments.</p>
                </div>
                <button className="primary-btn" onClick={openCreate}><Plus size={18} /> Add Department</button>
            </div>

            {loading ? <Skeleton rows={4} /> : !departments.length ? (
                <EmptyState icon="🏛" title="No departments yet" subtext="Add departments to start routing grievances." actionLabel="Add Department" onAction={openCreate} />
            ) : (
                <div className="card-grid">
                    {departments.map((department) => (
                        <article className="department-card" key={department._id}>
                            <div className="page-heading">
                                <div>
                                    <h2>{department.name}</h2>
                                    <p>{department.code}</p>
                                </div>
                                <span className={`pill ${department.isActive ? "success" : ""}`}>{department.isActive ? "Active" : "Inactive"}</span>
                            </div>
                            <p>{department.description || "No description added."}</p>
                            <div className="summary-grid">
                                <div><span className="muted">Head Admin</span><strong>{department.headAdmin?.name || "-"}</strong></div>
                                <div><span className="muted">Active Grievances</span><strong>{department.grievanceCount || 0}</strong></div>
                            </div>
                            <div className="split-actions">
                                <button className="secondary-btn" onClick={() => openEdit(department)}><Edit size={16} /> Edit</button>
                                {department.isActive !== false && <button className="danger-btn" onClick={() => deactivate(department._id)}><Power size={16} /> Deactivate</button>}
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="modal-backdrop">
                    <form className="modal" onSubmit={submit}>
                        <div className="page-heading"><h2>{editing ? "Edit Department" : "Add Department"}</h2><button type="button" className="ghost-btn" onClick={() => setShowForm(false)}>Close</button></div>
                        <div className="form-grid">
                            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                            <label>Code<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></label>
                        </div>
                        <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                        <label>Head Admin
                            <select value={form.headAdmin} onChange={(e) => setForm({ ...form, headAdmin: e.target.value })}>
                                <option value="">Select admin</option>
                                {admins.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                            </select>
                        </label>
                        <div className="split-actions">
                            <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button>
                            <button className="primary-btn">{editing ? "Save Changes" : "Create Department"}</button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}