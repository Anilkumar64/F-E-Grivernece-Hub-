import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";

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
        <section className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Complaint Categories</h1>
            </div>
            <Card className="space-y-3">
            <form className="grid gap-3 md:grid-cols-5" onSubmit={submit}>
                <Input
                    placeholder="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
                <Input
                    placeholder="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
                <select className="ui-input"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    required
                >
                    <option value="">Department</option>
                    {departments.map((d) => (
                        <option value={d._id} key={d._id}>{d.name}</option>
                    ))}
                </select>
                <Input
                    type="number"
                    min="1"
                    value={form.slaHours}
                    onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })}
                />
                <Button>Add</Button>
            </form>
            </Card>
            <Card className="overflow-hidden p-0">
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
                                <td><Badge className="bg-gray-100 text-gray-700">{c.slaHours}h</Badge></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </Card>
        </section>
    );
}