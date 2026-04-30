import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../api/axiosInstance";

export default function ComplaintTypes() {
    const [categories, setCategories] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ name: "", description: "", department: "", slaHours: 72 });
    const load = () => {
        api.get("/categories").then((res) => setCategories(res.data.categories || []));
        api.get("/departments").then((res) => setDepartments(res.data.departments || []));
    };
    useEffect(load, []);
    const submit = async (e) => {
        e.preventDefault();
        await api.post("/categories", form);
        toast.success("Category created");
        load();
    };
    return (
        <section className="page-section">
            <div className="page-heading"><h1>Complaint Categories</h1></div>
            <form className="filter-row" onSubmit={submit}><input placeholder="Name" onChange={(e) => setForm({ ...form, name: e.target.value })} /><input placeholder="Description" onChange={(e) => setForm({ ...form, description: e.target.value })} /><select onChange={(e) => setForm({ ...form, department: e.target.value })}><option value="">Department</option>{departments.map((d) => <option value={d._id} key={d._id}>{d.name}</option>)}</select><input type="number" min="1" value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} /><button className="primary-btn">Add</button></form>
            <div className="responsive-table"><table><thead><tr><th>Name</th><th>Department</th><th>SLA Hours</th></tr></thead><tbody>{categories.map((c) => <tr key={c._id}><td>{c.name}</td><td>{c.department?.name}</td><td>{c.slaHours}</td></tr>)}</tbody></table></div>
        </section>
    );
}
