import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Edit, Plus, Power } from "lucide-react";
import api from "../../api/axiosInstance";
import EmptyState from "../../components/common/EmptyState";
import Skeleton from "../../components/common/Skeleton";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";

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
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Departments</h1>
                    <p className="text-sm text-gray-600">Manage academic and operational departments.</p>
                </div>
                <Button onClick={openCreate}><Plus size={18} /> Add Department</Button>
            </div>

            {loading ? <Skeleton rows={4} /> : !departments.length ? (
                <EmptyState icon="🏛" title="No departments yet" subtext="Add departments to start routing grievances." actionLabel="Add Department" onAction={openCreate} />
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {departments.map((department) => (
                        <Card className="space-y-3" key={department._id}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">{department.name}</h2>
                                    <p className="text-sm text-gray-500">{department.code}</p>
                                </div>
                                <Badge className={department.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}>{department.isActive ? "Active" : "Inactive"}</Badge>
                            </div>
                            <p className="text-sm text-gray-700">{department.description || "No description added."}</p>
                            <div className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                                <div><span className="text-xs text-gray-500">Head Admin</span><p className="text-sm font-semibold text-gray-900">{department.headAdmin?.name || "-"}</p></div>
                                <div><span className="text-xs text-gray-500">Active Grievances</span><p className="text-sm font-semibold text-gray-900">{department.grievanceCount || 0}</p></div>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => openEdit(department)}><Edit size={16} /> Edit</Button>
                                {department.isActive !== false && <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => deactivate(department._id)}><Power size={16} /> Deactivate</Button>}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal open={showForm} onClose={() => setShowForm(false)}>
                    <form className="space-y-4" onSubmit={submit}>
                        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight text-gray-900">{editing ? "Edit Department" : "Add Department"}</h2><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Close</Button></div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Name<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Code<Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required /></label>
                        </div>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Description<textarea className="ui-input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                        <label className="grid gap-2 text-sm font-medium text-gray-700">Head Admin
                            <select className="ui-input" value={form.headAdmin} onChange={(e) => setForm({ ...form, headAdmin: e.target.value })}>
                                <option value="">Select admin</option>
                                {admins.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                            </select>
                        </label>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                            <Button>{editing ? "Save Changes" : "Create Department"}</Button>
                        </div>
                    </form>
            </Modal>
        </section>
    );
}