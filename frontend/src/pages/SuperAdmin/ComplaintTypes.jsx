import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import "../../styles/SuperAdmin/complaintTypes.css";

export default function ComplaintTypes() {
    const [types, setTypes] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [type, setType] = useState("");
    const [department, setDepartment] = useState("");
    const [subTypes, setSubTypes] = useState("");
    const [defaultPriority, setDefaultPriority] = useState("medium");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [typeRes, deptRes] = await Promise.all([
                api.get("/complaint-types"),
                api.get("/superadmin/departments")  // MUST use your backend route
            ]);

            setTypes(typeRes.data?.types || []);
            setDepartments(deptRes.data?.departments || []);
        } catch (err) {
            console.error("Load error:", err);
            toast.error("Failed to load complaint types data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!type.trim() || !department.trim()) {
            toast.error("Type and Department are required");
            return;
        }

        const payload = {
            type,
            department, // MUST be department NAME (String)
            subTypes: subTypes
                ? subTypes.split(",").map(s => s.trim())
                : [],
            defaultPriority
        };

        try {
            setSaving(true);
            await api.post("/complaint-types", payload);

            toast.success("Complaint Type Added!");
            setType("");
            setDepartment("");
            setSubTypes("");
            setDefaultPriority("medium");

            loadData();
        } catch (err) {
            console.error("Create error:", err.response?.data || err);
            toast.error(err?.response?.data?.message || "Failed to create complaint type");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this complaint type?")) return;

        try {
            await api.delete(`/complaint-types/${id}`);
            toast.success("Deleted!");
            loadData();
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Failed to delete complaint type");
        }
    };

    return (
        <div className="ct-container">
            <h1 className="ct-title">Manage Complaint Types</h1>

            {/* CREATE */}
            <div className="ct-box">
                <h2 className="ct-subtitle">Add New Type</h2>

                <input
                    className="ct-input"
                    placeholder="Complaint Type Name *"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                />

                <select
                    className="ct-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                >
                    <option value="">Select Department *</option>

                    {departments.map((d) => (
                        <option key={d._id} value={d.name}>
                            {d.name}
                        </option>
                    ))}
                </select>

                <input
                    className="ct-input"
                    placeholder="Sub Types (comma separated)"
                    value={subTypes}
                    onChange={(e) => setSubTypes(e.target.value)}
                />

                <select
                    className="ct-input"
                    value={defaultPriority}
                    onChange={(e) => setDefaultPriority(e.target.value)}
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>

                <button
                    className="ct-btn"
                    disabled={saving}
                    onClick={handleCreate}
                >
                    {saving ? "Saving..." : "Create Complaint Type"}
                </button>
            </div>

            {/* LIST */}
            <div className="ct-box">
                <h2 className="ct-subtitle">Existing Types</h2>

                {loading ? (
                    <p>Loading...</p>
                ) : types.length === 0 ? (
                    <p className="ct-empty">No complaint types found.</p>
                ) : (
                    <div className="ct-list">
                        {types.map((t) => (
                            <div key={t._id} className="ct-item">
                                <div>
                                    <p className="ct-item-name">
                                        {t.type} — <span className="ct-dept">{t.department}</span>
                                    </p>

                                    {t.subTypes?.length > 0 && (
                                        <p className="ct-item-desc">
                                            Subtypes: {t.subTypes.join(", ")}
                                        </p>
                                    )}

                                    <p className="ct-item-time">
                                        Priority: {t.defaultPriority}
                                    </p>
                                </div>

                                <button
                                    className="ct-delete"
                                    onClick={() => handleDelete(t._id)}
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
