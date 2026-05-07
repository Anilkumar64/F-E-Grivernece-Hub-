import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

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
            const { confirmPassword: _confirmPassword, ...body } = form;
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
        <div className="min-h-screen bg-gray-50">
            <div className="app-container py-8">
                <Card className="mx-auto w-full max-w-4xl">
                    <div className="mb-6 space-y-2">
                        <div className="flex w-fit items-center gap-2">
                            <span className="ku-logo">KU</span>
                            <span className="text-sm font-medium text-gray-600">Kernel University</span>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Create Student Account</h2>
                        <p className="text-sm text-gray-600">Register once to submit and track grievances digitally.</p>
                    </div>
                <form className="space-y-5" onSubmit={handleSignup}>
                    <div className="grid gap-4 md:grid-cols-2">
                    {[
                        { label: "Name", name: "name", type: "text", req: true },
                        { label: "Email", name: "email", type: "email", req: true },
                        { label: "Roll Number", name: "rollNumber", type: "text", req: false },
                        { label: "Student ID", name: "studentId", type: "text", req: true },
                        { label: "Password", name: "password", type: "password", req: true },
                        { label: "Confirm Password", name: "confirmPassword", type: "password", req: true },
                        { label: "Contact Number", name: "contactNumber", type: "text", req: false },
                        { label: "Phone (optional)", name: "phone", type: "text", req: false },
                        { label: "Class", name: "class", type: "text", req: false },
                        { label: "Year of Study", name: "yearOfStudy", type: "text", req: false },
                    ].map(({ label, name, type, req }) => (
                        <label className="grid gap-2 text-sm font-medium text-gray-700" key={name}>
                            {label}
                            <Input type={type} name={name} value={form[name]} onChange={handleChange} required={req} />
                        </label>
                    ))}
                    <label className="grid gap-2 text-sm font-medium text-gray-700">
                        Department
                        <select className="ui-input" name="department" value={form.department} onChange={handleChange}>
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option key={dept._id} value={dept._id}>{dept.name} ({dept.code})</option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">
                        Course
                        <select className="ui-input" name="course" value={form.course} onChange={handleChange}>
                            <option value="">Select Course</option>
                            {courses.map((course) => (
                                <option key={course._id} value={course._id}>{course.name} ({course.code})</option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700 md:col-span-2">
                        Admission Year
                        <select className="ui-input" name="admissionYear" value={form.admissionYear} onChange={handleChange}>
                            <option value="">Select Year</option>
                            {admissionYearOptions.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Signing up..." : "Signup"}
                        </Button>
                        <Link className="text-sm font-medium text-indigo-600 transition-all duration-200 hover:text-indigo-500" to="/login">
                            Already have an account? Login
                        </Link>
                    </div>
                </form>
                </Card>
            </div>
        </div>
    );
};

export default Signup;