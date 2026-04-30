import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";

export default function CreateGrievance() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({ title: "", description: "", category: "", priority: "Medium" });
    const [files, setFiles] = useState([]);

    useEffect(() => {
        api.get("/categories").then((res) => setCategories(res.data.categories || []));
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        Array.from(files).slice(0, 3).forEach((file) => data.append("attachments", file));
        try {
            const res = await api.post("/grievances", data);
            toast.success("Grievance submitted");
            navigate(`/grievance/${res.data.grievance.grievanceId}`);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to submit grievance");
        }
    };

    return (
        <section className="page-section">
            <div className="page-heading"><h1>Submit Grievance</h1></div>
            <form className="form-panel" onSubmit={submit}>
                <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Select category</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name} - {c.department?.name}</option>)}</select></label>
                <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["Low", "Medium", "High", "Critical"].map((p) => <option key={p}>{p}</option>)}</select></label>
                <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                <label>Attachments<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFiles(e.target.files)} /></label>
                <button className="primary-btn">Submit</button>
            </form>
        </section>
    );
}
