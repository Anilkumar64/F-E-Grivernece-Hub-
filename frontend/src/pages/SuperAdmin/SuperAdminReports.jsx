import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

// BUG FIX #5: was localhost:4400 — backend runs on port 5000
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SuperAdminReports() {
    const [filters, setFilters] = useState({ status: "", priority: "", department: "", from: "", to: "" });
    const [rows, setRows] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const res = await api.get("/departments");
                setDepartments(res.data || []);
            } catch {
                // non-blocking
            }
        };
        loadDepartments();
    }, []);

    const runReport = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([k, v]) => {
                if (v) params.set(k, v);
            });
            const res = await api.get(`/superadmin/reports/filtered?${params.toString()}`);
            setRows(res.data?.grievances || []);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to fetch filtered report");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports & Analytics</h1>
                <a
                    className="ui-btn-primary"
                    href={`${baseUrl}/api/reports/grievances.csv`}
                    target="_blank"
                    rel="noreferrer"
                >
                    Export CSV
                </a>
            </div>
            <p className="text-sm text-gray-600">
                Use dashboard analytics for charts and export filtered grievance data for reporting.
            </p>
            <Card className="grid gap-3 md:grid-cols-5">
                <label className="grid gap-2 text-sm font-medium text-gray-700">Status
                    <select className="ui-input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                        <option value="">All</option>
                        <option value="Pending">Pending</option>
                        <option value="InProgress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-gray-700">Priority
                    <select className="ui-input" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}>
                        <option value="">All</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-gray-700">Department
                    <select className="ui-input" value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}>
                        <option value="">All</option>
                        {departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                        ))}
                    </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-gray-700">From
                    <input className="ui-input" type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-gray-700">To
                    <input className="ui-input" type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
                </label>
            </Card>
            <div>
                <Button variant="outline" onClick={runReport} disabled={loading}>
                    {loading ? "Loading..." : "Run Filtered Report"}
                </Button>
            </div>
            {!!rows.length && (
                <Card className="overflow-hidden p-0">
                <div className="responsive-table">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Department</th>
                                <th>Created By</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row._id}>
                                    <td>{row.grievanceId || row._id}</td>
                                    <td>{row.title}</td>
                                    <td><Badge>{row.status}</Badge></td>
                                    <td><Badge className="bg-gray-100 text-gray-700">{row.priority}</Badge></td>
                                    <td>{row.department?.name || "-"}</td>
                                    <td>{row.createdBy?.name || row.createdBy?.email || "-"}</td>
                                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                </Card>
            )}
        </section>
    );
}