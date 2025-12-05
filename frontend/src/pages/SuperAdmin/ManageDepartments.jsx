import React, { useEffect, useState, useRef } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../../styles/SuperAdmin/ManageDepartment.css";

export default function ManageDepartments() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");

    const [confirmDelete, setConfirmDelete] = useState(null);

    const navigate = useNavigate();
    const nameRef = useRef(null);

    useEffect(() => {
        nameRef.current?.focus();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const res = await api.get("/superadmin/departments");
            const data = res.data?.departments || res.data || [];
            setDepartments(data);
        } catch (err) {
            console.error("fetchDepartments:", err);
            toast.error(err?.response?.data?.message || "Failed to load departments");

            if (err?.response?.status === 401) {
                navigate("/superadmin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            toast.warn("Department name is required");
            nameRef.current?.focus();
            return;
        }

        // prevent duplicates
        if (departments.some((d) => d.name.toLowerCase() === name.trim().toLowerCase())) {
            toast.error("Department already exists");
            return;
        }

        try {
            setSaving(true);

            await api.post("/superadmin/departments", {
                name: name.trim(),
                code: code.trim() || undefined,
                description: description.trim() || undefined,
            });

            toast.success("Department added successfully 🎉");

            setName("");
            setCode("");
            setDescription("");
            nameRef.current?.focus();

            fetchDepartments();
        } catch (err) {
            console.error("create dept:", err);
            toast.error(err?.response?.data?.message || "Failed to add department");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setSaving(true);

            await api.delete(`/superadmin/departments/${id}`);

            toast.success("Department deleted");
            setConfirmDelete(null);
            fetchDepartments();
        } catch (err) {
            console.error("delete dept:", err);
            toast.error(err?.response?.data?.message || "Failed to delete department");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="md-loading">Loading departments...</div>;
    }

    return (
        <div className="md-container">
            <h1 className="md-title">
                Manage Departments <span className="md-count">({departments.length})</span>
            </h1>

            {/* Add Department */}
            <div className="md-card">
                <h2 className="md-card-title">Add New Department</h2>

                <div className="md-grid">
                    <input
                        ref={nameRef}
                        className="md-input"
                        placeholder="Department name *"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    />

                    <input
                        className="md-input"
                        placeholder="Department code (optional)"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />

                    <input
                        className="md-input"
                        placeholder="Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="md-actions">
                    <button
                        onClick={handleCreate}
                        disabled={saving}
                        className="md-btn md-btn-green"
                    >
                        {saving ? "Saving..." : "Add Department"}
                    </button>

                    <button
                        className="md-btn md-btn-gray"
                        type="button"
                        onClick={() => {
                            setName("");
                            setCode("");
                            setDescription("");
                            nameRef.current?.focus();
                        }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* List Departments */}
            <div className="md-card">
                <h2 className="md-card-title">Existing Departments</h2>

                {departments.length === 0 ? (
                    <p className="md-empty">No departments found.</p>
                ) : (
                    <div className="md-list">
                        {departments.map((dept) => {
                            const createdText = dept.createdAt
                                ? new Date(dept.createdAt).toLocaleString()
                                : "-";

                            return (
                                <div key={dept._id} className="md-item">
                                    <div className="md-item-info">
                                        <p className="md-name">
                                            {dept.name}
                                            {dept.code && (
                                                <span className="md-code"> ({dept.code})</span>
                                            )}
                                        </p>

                                        {dept.description && (
                                            <p className="md-desc">{dept.description}</p>
                                        )}

                                        <p className="md-date">Created: {createdText}</p>
                                    </div>

                                    <button
                                        className="md-btn md-btn-red"
                                        disabled={saving}
                                        onClick={() => setConfirmDelete(dept)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {confirmDelete && (
                <div className="md-modal">
                    <div className="md-modal-inner">
                        <h3>Delete Department?</h3>
                        <p>
                            Are you sure you want to delete{" "}
                            <strong>{confirmDelete.name}</strong>?
                            This action cannot be undone.
                        </p>

                        <div className="md-modal-actions">
                            <button
                                className="md-btn md-btn-red"
                                disabled={saving}
                                onClick={() => handleDelete(confirmDelete._id)}
                            >
                                Confirm Delete
                            </button>

                            <button
                                className="md-btn md-btn-gray"
                                onClick={() => setConfirmDelete(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
