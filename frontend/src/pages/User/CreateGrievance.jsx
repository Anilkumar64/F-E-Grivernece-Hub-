import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Copy, FileText, X } from "lucide-react";
import api from "../../api/axiosInstance";

export default function CreateGrievance() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({ title: "", description: "", category: "", priority: "Medium" });
    const [files, setFiles] = useState([]);
    const [submitted, setSubmitted] = useState(null);

    useEffect(() => {
        api.get("/categories").then((res) => setCategories(res.data.categories || [])).catch(() => toast.error("Unable to load categories"));
    }, []);

    const descriptionCount = form.description.length;
    const valid = useMemo(() => form.title.trim().length > 0 && form.title.length <= 100 && descriptionCount >= 50 && form.category, [form, descriptionCount]);

    const addFiles = (incoming) => {
        const accepted = Array.from(incoming).filter((file) => ["application/pdf", "image/jpeg", "image/png"].includes(file.type) && file.size <= 5 * 1024 * 1024);
        if (accepted.length !== incoming.length) toast("Only PDF, JPG, PNG under 5MB are allowed");
        setFiles((current) => [...current, ...accepted].slice(0, 3));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!valid) return toast.error("Please complete all required fields");
        const data = new FormData();
        Object.entries(form).forEach(([key, value]) => data.append(key, value));
        files.forEach((file) => data.append("attachments", file));
        try {
            const res = await api.post("/grievances", data);
            setSubmitted(res.data.grievance);
            toast.success("Grievance submitted");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Failed to submit grievance");
        }
    };

    if (submitted) {
        return (
            <section className="page-section">
                <div className="card">
                    <h1>Grievance Submitted</h1>
                    <p>Your grievance has been recorded successfully.</p>
                    <button className="id-badge" onClick={() => navigator.clipboard.writeText(submitted.grievanceId)}><Copy size={14} /> {submitted.grievanceId}</button>
                    <div className="split-actions">
                        <button className="primary-btn" onClick={() => navigate(`/grievance/${submitted.grievanceId}`)}>View Details</button>
                        <button className="secondary-btn" onClick={() => navigate("/my-grievances")}>My Grievances</button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>Submit Grievance</h1>
                    <p>Provide clear details so the right department can respond quickly.</p>
                </div>
            </div>
            <form className="form-panel" onSubmit={submit}>
                <label>Title<input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
                <label>Description<textarea minLength={50} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required /></label>
                <p className={descriptionCount < 50 ? "muted" : "pill success"}>{descriptionCount}/50 minimum characters</p>
                <div className="form-grid">
                    <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required><option value="">Select category</option>{categories.map((c) => <option key={c._id} value={c._id}>{c.name} - {c.department?.name}</option>)}</select></label>
                    <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{["Low", "Medium", "High"].map((p) => <option key={p}>{p}</option>)}</select></label>
                </div>
                <label>Supporting Evidence<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => addFiles(e.target.files)} /></label>
                <div className="file-list">
                    {files.map((file, index) => (
                        <span className="pill" key={`${file.name}-${index}`}><FileText size={14} /> {file.name}<button type="button" className="ghost-btn" onClick={() => setFiles(files.filter((_, i) => i !== index))}><X size={14} /></button></span>
                    ))}
                </div>
                <button className="primary-btn" disabled={!valid}>Submit Grievance</button>
            </form>
        </section>
    );
}
