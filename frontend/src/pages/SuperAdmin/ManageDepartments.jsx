import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";

export default function ManageDepartments() {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ name: "", code: "", description: "" });
    const load = () => api.get("/departments").then((res) => setDepartments(res.data.departments || []));
    useEffect(load, []);
    const submit = async (e) => {
        e.preventDefault();
        await api.post("/departments", form);
        toast.success("Department created");
        setForm({ name: "", code: "", description: "" });
        load();
    };
    return (
        <section className="page-section">
            <div className="page-heading"><h1>Departments</h1></div>
            <form className="filter-row" onSubmit={submit}><input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /><input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><button className="primary-btn">Add</button></form>
            <div className="responsive-table"><table><thead><tr><th>Name</th><th>Code</th><th>Description</th></tr></thead><tbody>{departments.map((d) => <tr key={d._id}><td>{d.name}</td><td>{d.code}</td><td>{d.description}</td></tr>)}</tbody></table></div>
        </section>
    );
}
