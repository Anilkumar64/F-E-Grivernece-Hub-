import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "../../styles/AdminStyles/ManageComplaintTypes.css";


function ManageComplaintTypes() {
    const [types, setTypes] = useState([]);
    const [newType, setNewType] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    const fetchTypes = async () => {
        try {
            setLoading(true);

            // axiosInstance already has baseURL: /api and Authorization header
            const res = await api.get("/complaints/type/all");

            // adjust based on backend: could be res.data.types or res.data
            const data = res.data.types || res.data || [];
            setTypes(data);
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message ||
                "Failed to load complaint types"
            );

            if (err?.response?.status === 401) {
                navigate("/admin/login");
            }
        } finally {
            setLoading(false);
        }
    };

    const createType = async () => {
        if (!newType.trim()) return toast.warning("Enter type name");

        try {
            setSaving(true);

            await api.post("/complaints/type/create", {
                name: newType.trim(),
            });

            toast.success("Complaint type added");
            setNewType("");
            fetchTypes();
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message || "Failed to add type"
            );
        } finally {
            setSaving(false);
        }
    };

    const deleteType = async (id) => {
        if (!window.confirm("Delete this complaint type?")) return;

        try {
            setSaving(true);
            await api.delete(`/complaints/type/${id}`);

            toast.success("Type deleted");
            fetchTypes();
        } catch (err) {
            console.error(err);
            toast.error(
                err?.response?.data?.message || "Failed to delete type"
            );
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="mct-wrapper">
                <p>Loading complaint types...</p>
            </div>
        );
    }

    return (
        <div className="mct-wrapper">
            <h1 className="mct-title">
                Manage Complaint Types
            </h1>

            {/* Add Type */}
            <div className="mct-add-row">
                <input
                    className="mct-input"
                    placeholder="Enter complaint type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                />
                <button
                    onClick={createType}
                    disabled={saving}
                    className="mct-btn"
                >
                    Add
                </button>
            </div>

            {/* List */}
            <div className="mct-card">
                <h2 className="mct-subtitle">
                    Existing Types
                </h2>

                {types.length === 0 && <p>No complaint types found.</p>}

                {types.map((t) => (
                    <div
                        key={t._id}
                        className="mct-type-row"
                    >
                        <p>{t.name}</p>
                        <button
                            onClick={() => deleteType(t._id)}
                            disabled={saving}
                            className="mct-delete-btn"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ManageComplaintTypes;
