import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
// import GrievanceForm from "../../components/forms/GrievanceForm"; // (optional)
import "../styles/CreateGrievance.css";

const CreateGrievance = () => {
    const navigate = useNavigate();

    const [departments, setDepartments] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        title: "",
        description: "",
        department: "",
        complaintType: "",
        priority: "Medium",
        isAnonymous: false,
    });

    const [attachments, setAttachments] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [deptRes, typeRes] = await Promise.all([
                    api.get("/departments"),
                    api.get("/complaint-types"),
                ]);

                setDepartments(Array.isArray(deptRes.data) ? deptRes.data : []);
                setTypes(Array.isArray(typeRes.data) ? typeRes.data : []);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load form data");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleFileChange = (e) => {
        setAttachments([...e.target.files]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.title || !form.description || !form.department || !form.complaintType) {
            toast.error("Please fill all required fields");
            return;
        }

        const data = new FormData();
        data.append("title", form.title);
        data.append("description", form.description);
        data.append("department", form.department);
        data.append("complaintType", form.complaintType);
        data.append("priority", form.priority);
        data.append("isAnonymous", String(form.isAnonymous));

        attachments.forEach((file) => {
            data.append("attachments", file);
        });

        try {
            await api.post("/grievances", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Grievance filed successfully!");
            navigate("/user/dashboard");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to file grievance");
        }
    };

    if (loading) {
        return (
            <div className="grievance-loading-wrapper">
                <div className="grievance-loading-card">
                    <p>Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grievance-page">
            <div className="grievance-card">
                <h2 className="grievance-title">
                    <span className="grievance-icon">📝</span>
                    File New Grievance
                </h2>
                <p className="grievance-subtitle">
                    Please provide clear details so the administration can act quickly.
                </p>

                <form onSubmit={handleSubmit} className="grievance-form">
                    {/* Title */}
                    <div className="form-group">
                        <label className="form-label">
                            Grievance Title <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            placeholder="Enter grievance title"
                            value={form.title}
                            onChange={handleChange}
                            required
                            className="form-input"
                        />
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label className="form-label">
                            Description <span className="required">*</span>
                        </label>
                        <textarea
                            name="description"
                            placeholder="Explain your issue clearly..."
                            rows="5"
                            value={form.description}
                            onChange={handleChange}
                            required
                            className="form-textarea"
                        ></textarea>
                    </div>

                    {/* Department */}
                    <div className="form-group">
                        <label className="form-label">
                            Department <span className="required">*</span>
                        </label>
                        <select
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            required
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
                        <label className="form-label">
                            Complaint Type <span className="required">*</span>
                        </label>
                        <select
                            name="complaintType"
                            value={form.complaintType}
                            onChange={handleChange}
                            required
                            className="form-select"
                        >
                            <option value="">Select Complaint Type</option>
                            {types.map((t) => (
                                <option key={t._id} value={t._id}>
                                    {t.type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div className="form-group">
                        <label className="form-label">Priority</label>
                        <select
                            name="priority"
                            value={form.priority}
                            onChange={handleChange}
                            className="form-select"
                        >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                            <option>Critical</option>
                        </select>
                    </div>

                    {/* Anonymous */}
                    <div className="form-group form-group-inline">
                        <label className="form-checkbox-label">
                            <input
                                type="checkbox"
                                id="isAnonymous"
                                name="isAnonymous"
                                checked={form.isAnonymous}
                                onChange={handleChange}
                                className="form-checkbox"
                            />
                            <span>File as Anonymous</span>
                        </label>
                        <p className="helper-text">
                            Your identity will be hidden from department staff.
                        </p>
                    </div>

                    {/* Attachments */}
                    <div className="form-group">
                        <label className="form-label">
                            Attachments (Optional)
                        </label>
                        <input
                            type="file"
                            multiple
                            onChange={handleFileChange}
                            className="form-file-input"
                        />
                        {attachments.length > 0 && (
                            <p className="file-count-text">
                                {attachments.length} file(s) selected
                            </p>
                        )}
                    </div>

                    <button type="submit" className="btn-primary">
                        Submit Grievance
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateGrievance;
