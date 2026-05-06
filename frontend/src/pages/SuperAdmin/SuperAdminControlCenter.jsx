import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../api/axiosInstance";
import StepUpModal from "../../components/common/StepUpModal";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

const defaultTemplates = [
    { name: "Operations Admin", description: "", permissions: [] },
    { name: "Audit Reviewer", description: "", permissions: [] },
    { name: "Read-only Analyst", description: "", permissions: [] },
];

export default function SuperAdminControlCenter() {
    const [templates, setTemplates] = useState(defaultTemplates);
    const [admins, setAdmins] = useState([]);
    const [selectedAdmin, setSelectedAdmin] = useState("");
    const [permissionsText, setPermissionsText] = useState("");
    const [approvals, setApprovals] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [backup, setBackup] = useState(null);
    const [compliance, setCompliance] = useState([]);
    const [siteConfig, setSiteConfig] = useState(null);
    const [health, setHealth] = useState(null);
    const [stepUpOpen, setStepUpOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    const load = async () => {
        try {
            const [
                templateRes,
                adminRes,
                approvalRes,
                incidentRes,
                sessionRes,
                backupRes,
                complianceRes,
                configRes,
                healthRes,
            ] = await Promise.all([
                api.get("/superadmin/rbac/templates"),
                api.get("/admin/all"),
                api.get("/superadmin/approvals?status=pending"),
                api.get("/superadmin/incidents"),
                api.get("/superadmin/sessions"),
                api.get("/superadmin/backup-status"),
                api.get("/superadmin/compliance-requests"),
                api.get("/superadmin/site-config"),
                api.get("/superadmin/operational-health"),
            ]);
            setTemplates(templateRes.data?.templates?.length ? templateRes.data.templates : defaultTemplates);
            setAdmins((adminRes.data?.admins || []).filter((a) => a.role === "admin"));
            setApprovals(approvalRes.data?.requests || []);
            setIncidents(incidentRes.data?.incidents || []);
            setSessions(sessionRes.data?.sessions || []);
            setBackup(backupRes.data?.status || null);
            setCompliance(complianceRes.data?.requests || []);
            setSiteConfig(configRes.data || null);
            setHealth(healthRes.data || null);
        } catch (error) {
            toast.error(error?.response?.data?.message || "Unable to load control center");
        }
    };

    useEffect(() => { load(); }, []);

    const runStepUpAware = async (fn) => {
        try {
            await fn();
            await load();
        } catch (error) {
            if (error?.response?.status === 403 && String(error?.response?.data?.message || "").toLowerCase().includes("step-up")) {
                setPendingAction(() => fn);
                setStepUpOpen(true);
                return;
            }
            toast.error(error?.response?.data?.message || "Action failed");
        }
    };

    const saveTemplates = async () => {
        await api.put("/superadmin/rbac/templates", { templates });
        toast.success("Role templates saved");
    };

    const applyPermissions = async () => {
        if (!selectedAdmin) return toast.error("Select an admin");
        const permissions = permissionsText.split(",").map((p) => p.trim()).filter(Boolean);
        await api.patch(`/superadmin/rbac/users/${selectedAdmin}/permissions`, { permissions });
        toast.success("Admin permissions updated");
    };

    const decideApproval = async (id, decision) => {
        await runStepUpAware(async () => {
            await api.patch(`/superadmin/approvals/${id}/decision`, { decision, decisionNote: `${decision} from control center` });
            toast.success(`Approval ${decision}`);
        });
    };

    const setIncidentStatus = async (id, status) => {
        await api.patch(`/superadmin/incidents/${id}/status`, { status });
        toast.success("Incident updated");
        load();
    };

    const forceLogout = async (userId) => {
        await runStepUpAware(async () => {
            await api.post(`/superadmin/users/${userId}/force-logout`);
            toast.success("All sessions revoked");
        });
    };

    const updateBackup = async () => {
        await api.put("/superadmin/backup-status", {
            status: backup?.status || "healthy",
            provider: backup?.provider || "mongodb-atlas",
            restoreRunbookUrl: backup?.restoreRunbookUrl || "",
            notes: backup?.notes || "",
            lastSuccessfulBackupAt: backup?.lastSuccessfulBackupAt || new Date().toISOString(),
        });
        toast.success("Backup status updated");
        load();
    };

    const createCompliance = async (type) => {
        const subjectEmail = window.prompt("Enter subject email");
        if (!subjectEmail) return;
        const reason = window.prompt("Enter reason");
        if (!reason) return;
        await api.post("/superadmin/compliance-requests", { requestType: type, subjectEmail, reason });
        toast.success("Compliance request created");
        load();
    };

    const updateCompliance = async (id, status) => {
        await api.patch(`/superadmin/compliance-requests/${id}`, { status, resultNote: `Set to ${status}` });
        toast.success("Compliance request updated");
        load();
    };

    const saveSlaMatrix = async () => {
        await api.put("/superadmin/settings/sla-matrix", { slaMatrix: siteConfig?.slaMatrix || [] });
        toast.success("SLA matrix updated");
    };

    const saveNotificationPolicy = async () => {
        await api.put("/superadmin/settings/notifications", {
            notificationPolicies: siteConfig?.notificationPolicies || {},
            messageTemplates: siteConfig?.messageTemplates || {},
        });
        toast.success("Notification policy updated");
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">SuperAdmin Control Center</h1>
                    <p className="text-sm text-gray-600">RBAC, approvals, incidents, sessions, governance, SLA, notifications, and operations health.</p>
                </div>
                <Button variant="outline" onClick={load}>Refresh</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">Permission Management</h2>
                    {templates.map((tpl, index) => (
                        <div key={tpl.name} className="grid gap-2 md:grid-cols-2">
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Template Name
                                <input className="ui-input" value={tpl.name} onChange={(e) => {
                                    const next = [...templates];
                                    next[index] = { ...tpl, name: e.target.value };
                                    setTemplates(next);
                                }} />
                            </label>
                            <label className="grid gap-2 text-sm font-medium text-gray-700">Permissions (comma separated)
                                <input className="ui-input"
                                    value={(tpl.permissions || []).join(", ")}
                                    onChange={(e) => {
                                        const next = [...templates];
                                        next[index] = { ...tpl, permissions: e.target.value.split(",").map((p) => p.trim()).filter(Boolean) };
                                        setTemplates(next);
                                    }}
                                />
                            </label>
                        </div>
                    ))}
                    <div>
                        <Button onClick={saveTemplates}>Save Templates</Button>
                    </div>
                    <hr />
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Select Admin
                        <select className="ui-input" value={selectedAdmin} onChange={(e) => setSelectedAdmin(e.target.value)}>
                            <option value="">Choose admin</option>
                            {admins.map((a) => <option key={a._id} value={a._id}>{a.name} ({a.email})</option>)}
                        </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Assign Permissions
                        <input className="ui-input" value={permissionsText} onChange={(e) => setPermissionsText(e.target.value)} placeholder="users.read, reports.read" />
                    </label>
                    <Button variant="outline" onClick={applyPermissions}>Apply to Admin</Button>
                </Card>

                <Card className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight text-gray-900">Approval Workflow (4-eyes)</h2>
                    {approvals.slice(0, 8).map((req) => (
                        <div key={req._id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-2">
                            <span>{req.actionType} · {req.reason}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => decideApproval(req._id, "approved")}>Approve</Button>
                                <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => decideApproval(req._id, "rejected")}>Reject</Button>
                            </div>
                        </div>
                    ))}
                    {!approvals.length && <p className="text-sm text-gray-500">No pending approvals.</p>}
                </Card>

                <Card className="space-y-3">
                    <h2>Incident Center</h2>
                    {incidents.slice(0, 8).map((inc) => (
                        <div key={inc._id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-2">
                            <span>{inc.type} · {inc.message}</span>
                            <select className="ui-input" value={inc.status} onChange={(e) => setIncidentStatus(inc._id, e.target.value)}>
                                <option value="open">Open</option>
                                <option value="investigating">Investigating</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                    ))}
                    {!incidents.length && <p className="muted">No incidents found.</p>}
                </Card>

                <Card className="space-y-3">
                    <h2>Session / Device Management</h2>
                    {sessions.slice(0, 8).map((s, i) => (
                        <div key={`${s.userId}-${s.sessionId}-${i}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-2">
                            <span>{s.email} · {s.userAgent?.slice(0, 30) || "unknown device"}</span>
                            <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => forceLogout(s.userId)}>Force Logout All</Button>
                        </div>
                    ))}
                    {!sessions.length && <p className="muted">No active privileged sessions tracked.</p>}
                </Card>

                <Card className="space-y-3">
                    <h2>Backup / Recovery</h2>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Status
                        <select className="ui-input" value={backup?.status || "healthy"} onChange={(e) => setBackup((b) => ({ ...(b || {}), status: e.target.value }))}>
                            <option value="healthy">Healthy</option>
                            <option value="warning">Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Last successful backup
                        <input className="ui-input"
                            type="datetime-local"
                            value={backup?.lastSuccessfulBackupAt ? new Date(backup.lastSuccessfulBackupAt).toISOString().slice(0, 16) : ""}
                            onChange={(e) => setBackup((b) => ({ ...(b || {}), lastSuccessfulBackupAt: new Date(e.target.value).toISOString() }))}
                        />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Restore runbook URL
                        <input className="ui-input"
                            value={backup?.restoreRunbookUrl || ""}
                            onChange={(e) => setBackup((b) => ({ ...(b || {}), restoreRunbookUrl: e.target.value }))}
                        />
                    </label>
                    <Button onClick={updateBackup}>Save Backup Status</Button>
                </Card>

                <Card className="space-y-3">
                    <h2>Data Governance / Compliance</h2>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => createCompliance("data_export")}>New Data Export</Button>
                        <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => createCompliance("data_delete")}>New Data Delete</Button>
                    </div>
                    {compliance.slice(0, 6).map((c) => (
                        <div key={c._id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-2">
                            <span>{c.requestType} · {c.subjectEmail} · {c.status}</span>
                            <select className="ui-input" value={c.status} onChange={(e) => updateCompliance(c._id, e.target.value)}>
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    ))}
                </Card>

                <Card className="space-y-3">
                    <h2>SLA Policy Management</h2>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">SLA Matrix (JSON)
                        <textarea
                            className="ui-input min-h-40"
                            rows={8}
                            value={JSON.stringify(siteConfig?.slaMatrix || [], null, 2)}
                            onChange={(e) => {
                                try {
                                    const parsed = JSON.parse(e.target.value);
                                    setSiteConfig((c) => ({ ...(c || {}), slaMatrix: parsed }));
                                } catch {
                                    // keep user typing
                                }
                            }}
                        />
                    </label>
                    <Button onClick={saveSlaMatrix}>Save SLA Matrix</Button>
                </Card>

                <Card className="space-y-3">
                    <h2>Notification Policy Center</h2>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={Boolean(siteConfig?.notificationPolicies?.lockoutAlerts)}
                            onChange={(e) => setSiteConfig((c) => ({
                                ...(c || {}),
                                notificationPolicies: { ...(c?.notificationPolicies || {}), lockoutAlerts: e.target.checked },
                            }))}
                        /> Lockout alerts
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-gray-700">Lockout template
                        <input className="ui-input"
                            value={siteConfig?.messageTemplates?.lockoutAlert || ""}
                            onChange={(e) => setSiteConfig((c) => ({
                                ...(c || {}),
                                messageTemplates: { ...(c?.messageTemplates || {}), lockoutAlert: e.target.value },
                            }))}
                        />
                    </label>
                    <Button onClick={saveNotificationPolicy}>Save Notification Policy</Button>
                </Card>
            </div>

            <Card className="space-y-3">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">Operational Health</h2>
                {health ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div><span className="text-xs text-gray-500">Backlog</span><p className="text-lg font-semibold text-gray-900">{health.backlog}</p></div>
                        <div><span className="text-xs text-gray-500">Avg First Response (h)</span><p className="text-lg font-semibold text-gray-900">{health.avgFirstResponse}</p></div>
                        <div><span className="text-xs text-gray-500">Avg Resolution (h)</span><p className="text-lg font-semibold text-gray-900">{health.avgResolution}</p></div>
                        <div><span className="text-xs text-gray-500">Breached SLAs</span><p className="text-lg font-semibold text-gray-900">{health.breachedSlas}</p></div>
                    </div>
                ) : <p className="text-sm text-gray-500">No health data available.</p>}
            </Card>

            <StepUpModal
                open={stepUpOpen}
                onClose={() => { setStepUpOpen(false); setPendingAction(null); }}
                onVerified={async () => {
                    if (!pendingAction) return;
                    await pendingAction();
                    setPendingAction(null);
                    await load();
                }}
            />
        </section>
    );
}

