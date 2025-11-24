import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";

export default function ComplaintTypeForm() {
    const { id } = useParams(); // if present => edit mode
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        description: "",
        isActive: true,
    });

    const isEdit = Boolean(id);

    useEffect(() => {
        if (isEdit) {
            fetchComplaintType();
        }
        // eslint-disable-next-line
    }, [id]);

    const fetchComplaintType = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/complaint-types/${id}`);
            const data = res.data?.type || res.data || {};
            setForm({
                name: data.name || "",
                description: data.description || "",
                isActive: data.isActive !== false,
            });
        } catch (err) {
            console.error("Fetch complaint type error:", err);
            toast.error(
                err?.response?.data?.message || "Failed to load complaint type"
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
            toast.warn("Name is required");
            return;
        }

        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/complaint-types/${id}`, form);
                toast.success("Complaint type updated");
            } else {
                await api.post("/complaint-types", form);
                toast.success("Complaint type created");
            }
            navigate("/superadmin/complaint-types");
        } catch (err) {
            console.error("Save complaint type error:", err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to save complaint type"
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
                {isEdit ? "Edit Complaint Type" : "Add Complaint Type"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-sm font-medium mb-1">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Ex: Hostel, Cafeteria, Academics"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                        required
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
                        placeholder="Optional description or instructions"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                    />
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                    <input
                        id="isActive"
                        type="checkbox"
                        name="isActive"
                        checked={form.isActive}
                        onChange={handleChange}
                        className="w-4 h-4"
                    />
                    <label
                        htmlFor="isActive"
                        className="text-sm text-gray-700"
                    >
                        Active (students can select this type)
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-between mt-4">
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/superadmin/complaint-types")
                        }
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
