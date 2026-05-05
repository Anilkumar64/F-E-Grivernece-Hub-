import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Navbar from "../../components/common/Navbar";
import "../../styles/UserStyles/UserSignup.css";

const Signup = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "", email: "", password: "", confirmPassword: "",
        studentId: "", rollNumber: "", department: "", course: "",
        admissionYear: "", class: "", phone: "", contactNumber: "", yearOfStudy: "",
    });
    const [departments, setDepartments] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    useEffect(() => {
        api.get("/departments")
            .then((res) => setDepartments(res.data || []))
            .catch(() => { });
    }, []);

    useEffect(() => {
        const departmentId = form.department;
        const url = departmentId ? `/courses?department=${departmentId}` : "/courses";
        api.get(url)
            .then((res) => setCourses(res.data?.courses || []))
            .catch(() => setCourses([]));
    }, [form.department]);

    const admissionYearOptions = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 12 }, (_, idx) => String(current - idx));
    }, []);

    const handleSignup = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const { confirmPassword, ...body } = form;
            await api.post("/auth/student/register", body);   // ← was /users/register
            toast.success("Account created! Please log in.");
            navigate("/login");
        } catch (error) {
            toast.error(error?.response?.data?.message || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup-wrapper">
            <Navbar />
            <div className="signup-main">
                <div className="signup-left">
                    <img src="/src/pages/User/image.png" alt="signup illustration" className="signup-illustration" />
                </div>
                <form className="signup-box" onSubmit={handleSignup}>
                    <h2>Create Account</h2>
                    {[
                        // BUG FIX: phone and yearOfStudy are optional on the backend (no
                        // required validator). Marking them required in HTML blocked signup.
                        { label: "Name", name: "name", type: "text", req: true },
                        { label: "Email", name: "email", type: "email", req: true },
                        { label: "Roll Number", name: "rollNumber", type: "text", req: false },
                        { label: "Password", name: "password", type: "password", req: true },
                        { label: "Confirm Password", name: "confirmPassword", type: "password", req: true },
                        { label: "Student ID", name: "studentId", type: "text", req: true },
                        { label: "Contact", name: "contactNumber", type: "text", req: false },
                        { label: "Phone (optional)", name: "phone", type: "text", req: false },
                        { label: "Class", name: "class", type: "text", req: false },
                        { label: "Year", name: "yearOfStudy", type: "text", req: false },
                    ].map(({ label, name, type, req }) => (
                        <div className="input-group" key={name}>
                            <label>{label}</label>
                            <input type={type} name={name} value={form[name]} onChange={handleChange} required={req} />
                        </div>
                    ))}
                    <div className="input-group">
                        <label>Department</label>
                        <select name="department" value={form.department} onChange={handleChange}>
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Course</label>
                        <select name="course" value={form.course} onChange={handleChange}>
                            <option value="">Select Course</option>
                            {courses.map((course) => (
                                <option key={course._id} value={course._id}>{course.name} ({course.code})</option>
                            ))}
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Admission Year</label>
                        <select name="admissionYear" value={form.admissionYear} onChange={handleChange}>
                            <option value="">Select Year</option>
                            {admissionYearOptions.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <button className="btn-submit" type="submit" disabled={loading}>
                        {loading ? "Signing up..." : "Signup"}
                    </button>
                    <p className="have-account">
                        Already have an account?{" "}
                        <span onClick={() => navigate("/login")} style={{ cursor: "pointer", color: "var(--primary)" }}>Login</span>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Signup;