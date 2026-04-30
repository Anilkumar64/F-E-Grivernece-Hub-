import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axiosInstance";

export default function AllAdmins() {
    const [admins, setAdmins] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", staffId: "", department: "", password: "" });

    const load = () => {
        api.get("/admin/all").then((res) => setAdmins(res.data.admins || []));
        api.get("/departments").then((res) => setDepartments(res.data.departments || []));
    };
    useEffect(load, []);

    const create = async (e) => {
        e.preventDefault();
        await api.post("/admin/create", form);
        toast.success("Admin created");
        setShowForm(false);
        load();
    };

    const deactivate = async (id) => {
        if (!window.confirm("Deactivate this admin?")) return;
        await api.delete(`/admin/${id}`);
        toast.success("Admin deactivated");
        load();
    };

    return (
        <section className="page-section">
            <div className="page-heading"><h1>Manage Admins</h1><button className="primary-btn" onClick={() => setShowForm(true)}>Add Admin</button></div>
            <div className="responsive-table"><table><thead><tr><th>Name</th><th>Email</th><th>Staff ID</th><th>Department</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{admins.map((admin) => <tr key={admin._id}><td>{admin.name}</td><td>{admin.email}</td><td>{admin.staffId}</td><td>{admin.department?.name || "-"}</td><td>{admin.role}</td><td><span className={`status-badge ${admin.isActive ? "Resolved" : "Closed"}`}>{admin.isActive ? "Active" : "Inactive"}</span></td><td><button className="secondary-btn" onClick={() => deactivate(admin._id)}>Deactivate</button></td></tr>)}</tbody></table></div>
            {showForm && <div className="modal-backdrop"><form className="modal" onSubmit={create}><h2>Add Admin</h2><input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} /><input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} /><input placeholder="Staff ID" onChange={(e) => setForm({ ...form, staffId: e.target.value })} /><select onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Department</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select><input placeholder="Temporary password" onChange={(e) => setForm({ ...form, password: e.target.value })} /><button className="primary-btn">Create</button><button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>Cancel</button></form></div>}
        </section>
    );
}
