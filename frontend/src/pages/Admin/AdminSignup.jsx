import React, { useState, useEffect } from "react";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../../components/landing/AdminLandingNavbar";
import "../../styles/AdminStyles/AdminSignup.css";

function AdminSignup() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "",
        email: "",
        staffId: "",
        department: "",
        password: "",
    });

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);

    // 👇 FETCH DEPARTMENTS FROM BACKEND
    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const res = await api.get("/departments");
                setDepartments(res.data.departments || []);
            } catch (err) {
                console.error("Failed to load departments:", err);
                toast.error("Unable to load departments");
            }
        };

        loadDepartments();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();

        if (!form.email.endsWith(".ac.in")) {
            toast.error("Please use your official college email (.ac.in)");
            return;
        }

        if (!form.department) {
            toast.error("Please select a department");
            return;
        }

        const data = new FormData();
        data.append("name", form.name);
        data.append("email", form.email);
        data.append("staffId", form.staffId);
        data.append("department", form.department); // department = ObjectId
        data.append("password", form.password);

        if (file) data.append("idCardFile", file);

        try {
            setLoading(true);
            await api.post("/admin/register", data);
            toast.success("Admin request submitted. Pending approval.");
            navigate("/admin/login");
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-signup-wrapper">
            <AdminNavbar />
            <div className="admin-signup-container">
                <div className="admin-signup-right">
                    <form onSubmit={handleSignup} className="admin-signup-form">
                        <h1 className="admin-signup-title">Admin Signup</h1>

                        <input
                            className="admin-input"
                            name="name"
                            placeholder="Full Name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />

                        <input
                            className="admin-input"
                            name="email"
                            type="email"
                            placeholder="College Email (.ac.in)"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />

                        <input
                            className="admin-input"
                            name="staffId"
                            placeholder="Staff ID"
                            value={form.staffId}
                            onChange={handleChange}
                            required
                        />

                        {/* 🔥 NEW DROPDOWN */}
                        <select
                            className="admin-input"
                            name="department"
                            value={form.department}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option key={dept._id} value={dept._id}>
                                    {dept.name} ({dept.code})
                                </option>
                            ))}
                        </select>

                        <input
                            className="admin-input"
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="admin-input-file"
                        />

                        <button type="submit" className="admin-btn" disabled={loading}>
                            {loading ? "Submitting..." : "Submit"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminSignup;
