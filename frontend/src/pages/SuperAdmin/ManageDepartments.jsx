// src/pages/SuperAdmin/ManageDepartments.jsx

import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

/**
 * SuperAdmin - Manage Departments
 *
 * Expected backend endpoints (adjust if different):
 * GET    /superadmin/departments
 *        -> [{ _id, name, code, description, createdAt }, ...]
 *
 * POST   /superadmin/departments
 *        body: { name, code?, description? }
 *
 * DELETE /superadmin/departments/:id
 */

export default function ManageDepartments() {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");

    const navigate = useNavigate();

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const res = await api.get("/superadmin/departments");
            const data = res.data?.departments || res.data || [];
            setDepartments(data);
        } catch (err) {
            console.error("fetchDepartments:", err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to load departments"
            );
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
            return;
        }

        try {
            setSaving(true);
            await api.post("/superadmin/departments", {
                name: name.trim(),
                code: code.trim() || undefined,
                description: description.trim() || undefined,
            });

            toast.success("Department added");
            setName("");
            setCode("");
            setDescription("");
            fetchDepartments();
        } catch (err) {
            console.error("create dept:", err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to add department"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this department?")) return;

        try {
            setSaving(true);
            await api.delete(`/superadmin/departments/${id}`);
            toast.success("Department deleted");
            fetchDepartments();
        } catch (err) {
            console.error("delete dept:", err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to delete department"
            );
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="p-6">
                <p>Loading departments...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">
                Manage Departments
            </h1>

            {/* Add Department */}
            <div className="mb-6 border rounded-lg bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold mb-3">
                    Add New Department
                </h2>

                <div className="grid gap-3 md:grid-cols-3">
                    <input
                        className="border p-2 rounded w-full"
                        placeholder="Department name *"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                    />
                    <input
                        className="border p-2 rounded w-full"
                        placeholder="Department code (optional)"
                        value={code}
                        onChange={(e) =>
                            setCode(e.target.value)
                        }
                    />
                    <input
                        className="border p-2 rounded w-full md:col-span-1"
                        placeholder="Description (optional)"
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
                    />
                </div>

                <button
                    onClick={handleCreate}
                    disabled={saving}
                    className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-60"
                >
                    {saving ? "Saving..." : "Add Department"}
                </button>
            </div>

            {/* List Departments */}
            <div className="border rounded-lg bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold mb-3">
                    Existing Departments
                </h2>

                {departments.length === 0 && (
                    <p className="text-sm text-gray-500">
                        No departments found.
                    </p>
                )}

                <div className="space-y-2">
                    {departments.map((dept) => {
                        const createdText = dept.createdAt
                            ? new Date(
                                dept.createdAt
                            ).toLocaleString()
                            : "-";

                        return (
                            <div
                                key={dept._id}
                                className="flex flex-col md:flex-row md:items-center justify-between border-b last:border-b-0 py-2 gap-2"
                            >
                                <div>
                                    <p className="font-semibold">
                                        {dept.name}{" "}
                                        {dept.code && (
                                            <span className="text-xs text-gray-500">
                                                ({dept.code})
                                            </span>
                                        )}
                                    </p>
                                    {dept.description && (
                                        <p className="text-sm text-gray-600">
                                            {dept.description}
                                        </p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                        Created: {createdText}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() =>
                                            handleDelete(dept._id)
                                        }
                                        disabled={saving}
                                        className="text-red-600 text-sm font-semibold disabled:opacity-60"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
