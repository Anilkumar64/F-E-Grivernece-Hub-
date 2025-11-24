import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";

const GrievanceForm = ({ onSuccess }) => {
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

                setDepartments(
                    Array.isArray(deptRes.data) ? deptRes.data : []
                );
                setTypes(
                    Array.isArray(typeRes.data) ? typeRes.data : []
                );
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

        if (
            !form.title.trim() ||
            !form.description.trim() ||
            !form.department ||
            !form.complaintType
        ) {
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

            setForm({
                title: "",
                description: "",
                department: "",
                complaintType: "",
                priority: "Medium",
                isAnonymous: false,
            });
            setAttachments([]);

            if (onSuccess) onSuccess();
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to file grievance"
            );
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-40">
                <p className="text-gray-500">Loading form...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Grievance Title{" "}
                    <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="title"
                    placeholder="Enter grievance title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Description <span className="text-red-500">*</span>
                </label>
                <textarea
                    name="description"
                    placeholder="Explain your issue clearly..."
                    rows="5"
                    value={form.description}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-300"
                ></textarea>
            </div>

            {/* Department */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Department <span className="text-red-500">*</span>
                </label>
                <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring focus:ring-blue-300"
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
            <div>
                <label className="block text-sm font-medium mb-1">
                    Complaint Type{" "}
                    <span className="text-red-500">*</span>
                </label>
                <select
                    name="complaintType"
                    value={form.complaintType}
                    onChange={handleChange}
                    required
                    className="w-full border rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring focus:ring-blue-300"
                >
                    <option value="">Select Complaint Type</option>
                    {types.map((t) => (
                        <option key={t._id} value={t._id}>
                            {t.name || t.type}
                        </option>
                    ))}
                </select>
            </div>

            {/* Priority */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Priority
                </label>
                <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring focus:ring-blue-300"
                >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                </select>
            </div>

            {/* Anonymous */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isAnonymous"
                    name="isAnonymous"
                    checked={form.isAnonymous}
                    onChange={handleChange}
                    className="w-4 h-4"
                />
                <label
                    htmlFor="isAnonymous"
                    className="text-sm text-gray-700"
                >
                    File as Anonymous
                </label>
            </div>

            {/* Attachments */}
            <div>
                <label className="block text-sm font-medium mb-1">
                    Attachments (Optional)
                </label>
                <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="text-sm text-gray-600"
                />
                {attachments.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                        {attachments.length} file(s) selected
                    </p>
                )}
            </div>

            <button
                type="submit"
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
            >
                Submit Grievance
            </button>
        </form>
    );
};

export default GrievanceForm;
