import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";

export default function ComplaintTypes() {
    const [categories, setCategories] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({ name: "", description: "", department: "", slaHours: 72 });

    const load = () => {
        api.get("/categories").then((res) => setCategories(res.data.categories || []));
        // BUG FIX #4: was res.data.departments — /api/departments returns a bare array
        api.get("/departments").then((res) => setDepartments(res.data || []));
    };

    useEffect(load, []);

    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post("/categories", form);
            toast.success("Category created");
            load();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to create category");
        }
    };

    return (
        <section className="page-section">
            <div className="page-heading"><h1>Complaint Categories</h1></div>
            <form className="filter-row" onSubmit={submit}>
                <input
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
                <input
                    placeholder="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    required
                >
                    <option value="">Department</option>
                    {departments.map((d) => (
                        <option value={d._id} key={d._id}>{d.name}</option>
                    ))}
                </select>
                <input
                    type="number"
                    min="1"
                    value={form.slaHours}
                    onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })}
                />
                <button className="primary-btn">Add</button>
            </form>
            <div className="responsive-table">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>SLA Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((c) => (
                            <tr key={c._id}>
                                <td>{c.name}</td>
                                <td>{c.department?.name}</td>
                                <td>{c.slaHours}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}