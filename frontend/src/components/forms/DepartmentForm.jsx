import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";

export default function DepartmentForm() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        code: "",
        description: "",
        hodName: "",
        hodEmail: "",
        isActive: true,
    });

    const isEdit = Boolean(id);

    useEffect(() => {
        if (isEdit) fetchDepartment();
        // eslint-disable-next-line
    }, [id]);

    const fetchDepartment = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/departments/${id}`);
            const d = res.data?.department || res.data || {};
            setForm({
                name: d.name || "",
                code: d.code || "",
                description: d.description || "",
                hodName: d.hodName || "",
                hodEmail: d.hodEmail || "",
                isActive: d.isActive !== false,
            });
        } catch (err) {
            console.error("Fetch department error:", err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to load department"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.warn("Department name is required");
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/departments/${id}`, form);
                toast.success("Department updated");
            } else {
                await api.post("/departments", form);
                toast.success("Department created");
            }
            navigate("/superadmin/departments");
        } catch (err) {
            console.error("Save department error:", err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to save department"
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">Loading...</p>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto bg-white shadow rounded-xl p-6">
            <h2 className="text-2xl font-semibold mb-4">
                {isEdit ? "Edit Department" : "Add Department"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Department Name{" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Ex: Computer Science"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                        required
                    />
                </div>

                {/* Code */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Code
                    </label>
                    <input
                        name="code"
                        type="text"
                        value={form.code}
                        onChange={handleChange}
                        placeholder="Ex: CSE, ECE"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                    />
                </div>

                {/* HOD Name */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        HOD Name
                    </label>
                    <input
                        name="hodName"
                        type="text"
                        value={form.hodName}
                        onChange={handleChange}
                        placeholder="Head of Department"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                    />
                </div>

                {/* HOD Email */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        HOD Email
                    </label>
                    <input
                        name="hodEmail"
                        type="email"
                        value={form.hodEmail}
                        onChange={handleChange}
                        placeholder="hod@example.com"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Description
                    </label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                    />
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                    <input
                        id="isActiveDept"
                        type="checkbox"
                        name="isActive"
                        checked={form.isActive}
                        onChange={handleChange}
                        className="w-4 h-4"
                    />
                    <label
                        htmlFor="isActiveDept"
                        className="text-sm text-gray-700"
                    >
                        Active (available for students)
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-between mt-4">
                    <button
                        type="button"
                        onClick={() => navigate("/superadmin/departments")}
                        className="px-4 py-2 text-sm border rounded-lg text-gray-700 hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {saving
                            ? isEdit
                                ? "Updating..."
                                : "Saving..."
                            : isEdit
                                ? "Update"
                                : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}
