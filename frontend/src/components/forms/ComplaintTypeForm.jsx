import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";
import toast from "react-hot-toast";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";

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
            toast("Name is required");
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
            <Card className="mx-auto max-w-2xl">
                <p className="text-sm text-gray-500">Loading...</p>
            </Card>
        );
    }

    return (
        <Card className="mx-auto max-w-2xl space-y-5">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
                {isEdit ? "Edit Complaint Type" : "Add Complaint Type"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Ex: Hostel, Cafeteria, Academics"
                        required
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                        Description
                    </label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Optional description or instructions"
                        className="ui-input"
                    />
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                        id="isActive"
                        type="checkbox"
                        name="isActive"
                        checked={form.isActive}
                        onChange={handleChange}
                        className="h-4 w-4"
                    />
                    <label
                        htmlFor="isActive"
                        className="text-sm text-gray-700"
                    >
                        Active (students can select this type)
                    </label>
                </div>

                <div className="mt-4 flex justify-between gap-3">
                    <Button
                        type="button"
                        onClick={() =>
                            navigate("/superadmin/complaint-types")
                        }
                        variant="outline"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={saving}
                    >
                        {saving
                            ? isEdit
                                ? "Updating..."
                                : "Saving..."
                            : isEdit
                                ? "Update"
                                : "Save"}
                    </Button>
                </div>
            </form>
        </Card>
    );
}
