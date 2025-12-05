import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../../styles/UserStyles/CreateGrievance.css";

export default function CreateGrievance() {
    const navigate = useNavigate();

    const [departments, setDepartments] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        title: "",
        description: "",
        department: "",
        complaintType: "",
        // ✅ keep in DB format (lowercase)
        priority: "medium",
        isAnonymous: false,
    });

    const [attachments, setAttachments] = useState([]);

    // Normalize backend response (supports multiple shapes)
    const normalizeList = (data, key) => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (Array.isArray(data[key])) return data[key];
        if (Array.isArray(data.data)) return data.data; // e.g. { data: [...] }
        if (Array.isArray(data.items)) return data.items;
        return [];
    };

    // Fetch Departments + Complaint Types
    useEffect(() => {
        const load = async () => {
            try {
                const [deptRes, typeRes] = await Promise.all([
                    api.get("/departments"),
                    api.get("/complaint-types"),
                ]);

                setDepartments(normalizeList(deptRes.data, "departments"));
                setTypes(normalizeList(typeRes.data, "types"));
            } catch (err) {
                console.error("FORM LOAD ERROR", err);
                toast.error("Failed to load form details");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleFileChange = (e) => {
        setAttachments(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.title.trim()) return toast.error("Title is required");
        if (!form.description.trim()) return toast.error("Description is required");
        if (!form.department) return toast.error("Select a department");
        if (!form.complaintType) return toast.error("Select a complaint type");

        const data = new FormData();

        // form is already in correct backend format (priority lowercase)
        Object.keys(form).forEach((key) => {
            data.append(key, form[key]);
        });

        attachments.forEach((file) => data.append("attachments", file));

        try {
            await api.post("/grievances", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Grievance submitted successfully!");
            navigate("/user/dashboard");
        } catch (err) {
            console.error("GRIEVANCE SUBMIT ERROR", err);
            toast.error(err.response?.data?.message || "Failed to submit grievance");
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <p>Loading form...</p>
            </div>
        );
    }

    return (
        <div className="grievance-page">
            <div className="grievance-card">
                <h2 className="grievance-title">
                    <span>📝</span> File New Grievance
                </h2>

                <form onSubmit={handleSubmit} className="grievance-form">
                    {/* Title */}
                    <div className="form-group">
                        <label>Grievance Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={handleChange}
                            className="form-input"
                            placeholder="Enter grievance title"
                        />
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label>Description *</label>
                        <textarea
                            name="description"
                            rows="5"
                            value={form.description}
                            onChange={handleChange}
                            className="form-textarea"
                            placeholder="Explain your issue clearly"
                        />
                    </div>

                    {/* Department */}
                    <div className="form-group">
                        <label>Department *</label>
                        <select
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option value="">Select Department</option>
                            {departments.map((d) => (
                                <option key={d._id} value={d._id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Complaint Type */}
                    <div className="form-group">
                        <label>Complaint Type *</label>
                        <select
                            name="complaintType"
                            value={form.complaintType}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option value="">Select Complaint Type</option>
                            {types.map((t) => (
                                <option key={t._id} value={t._id}>
                                    {t.type || t.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div className="form-group">
                        <label>Priority</label>
                        <select
                            name="priority"
                            value={form.priority}
                            onChange={handleChange}
                            className="form-select"
                        >
                            {/* ✅ values in lowercase (DB), labels pretty */}
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    {/* Anonymous */}
                    <div className="form-group-inline">
                        <input
                            type="checkbox"
                            name="isAnonymous"
                            checked={form.isAnonymous}
                            onChange={handleChange}
                        />
                        <label>Submit anonymously</label>
                    </div>

                    {/* Attachments */}
                    <div className="form-group">
                        <label>Attachments (optional)</label>
                        <input type="file" multiple onChange={handleFileChange} />
                        {attachments.length > 0 && (
                            <p>{attachments.length} file(s) selected</p>
                        )}
                    </div>

                    <button type="submit" className="btn-primary">
                        Submit Grievance
                    </button>
                </form>
            </div>
        </div>
    );
}
