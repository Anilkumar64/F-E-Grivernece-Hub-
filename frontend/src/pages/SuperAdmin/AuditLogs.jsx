import React, { useCallback, useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import "../../styles/SuperAdmin/AuditLogs.css";

const CATEGORIES = ["All", "AUTH", "GRIEVANCE", "ADMIN", "SYSTEM", "NAVIGATION"];

const ACTION_CATEGORY = {
    LOGIN: "AUTH", LOGOUT: "AUTH", STUDENT_REGISTERED: "AUTH", ADMIN_SELF_REGISTERED: "AUTH",
    GRIEVANCE_CREATED: "GRIEVANCE", GRIEVANCE_STATUS_CHANGED: "GRIEVANCE",
    GRIEVANCE_ASSIGNED: "GRIEVANCE", GRIEVANCE_PRIORITY_CHANGED: "GRIEVANCE",
    GRIEVANCE_COMMENT_ADDED: "GRIEVANCE", GRIEVANCE_FEEDBACK_SUBMITTED: "GRIEVANCE",
    GRIEVANCE_REOPEN_REQUESTED: "GRIEVANCE", GRIEVANCE_REOPEN_DECISION: "GRIEVANCE",
    GRIEVANCE_EVIDENCE_ADDED: "GRIEVANCE", GRIEVANCE_ESCALATED: "GRIEVANCE",
    ADMIN_CREATED: "ADMIN", ADMIN_APPROVED: "ADMIN", ADMIN_REJECTED: "ADMIN",
    ADMIN_UPDATED: "ADMIN", ADMIN_PASSWORD_RESET: "ADMIN", ADMIN_DEACTIVATED: "ADMIN",
    PASSWORD_RESET: "SYSTEM", CATEGORY_CREATED: "SYSTEM", CATEGORY_UPDATED: "SYSTEM",
    CATEGORY_DELETED: "SYSTEM", DEPARTMENT_CREATED: "SYSTEM", DEPARTMENT_UPDATED: "SYSTEM",
    DEPARTMENT_DEACTIVATED: "SYSTEM", COURSE_CREATED: "SYSTEM", COURSE_DELETED: "SYSTEM",
    PROFILE_PHOTO_UPDATED: "SYSTEM",
    PAGE_VISIT: "NAVIGATION",
};

const CAT_STYLE = {
    AUTH:       { bg: "#dbeafe", text: "#1d4ed8", dot: "#3b82f6" },
    GRIEVANCE:  { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
    ADMIN:      { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
    SYSTEM:     { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
    NAVIGATION: { bg: "#f1f5f9", text: "#475569", dot: "#64748b" },
    DEFAULT:    { bg: "#f3f4f6", text: "#374151", dot: "#6b7280" },
};

const ROLE_STYLE = {
    student:    { bg: "#eff6ff", text: "#1d4ed8" },
    admin:      { bg: "#f0fdf4", text: "#15803d" },
    superadmin: { bg: "#fdf4ff", text: "#7e22ce" },
};

const LIMIT = 50;

function relTime(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
}

function metaPreview(meta, action) {
    if (!meta || typeof meta !== "object") return "";
    if (action === "PAGE_VISIT") return meta.path || "";
    const pairs = Object.entries(meta)
        .filter(([k]) => k !== "userAgent")
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
    return pairs.join("  ·  ").slice(0, 90) || "";
}

function getCatStyle(action) {
    const cat = ACTION_CATEGORY[action] || "DEFAULT";
    return CAT_STYLE[cat] || CAT_STYLE.DEFAULT;
}

export default function AuditLogs() {
    const [logs, setLogs]           = useState([]);
    const [total, setTotal]         = useState(0);
    const [loading, setLoading]     = useState(true);
    const [page, setPage]           = useState(1);
    const [category, setCategory]   = useState("All");
    const [role, setRole]           = useState("");
    const [search, setSearch]       = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [from, setFrom]           = useState("");
    const [to, setTo]               = useState("");
    const [expanded, setExpanded]   = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: LIMIT });
            if (category !== "All") params.set("category", category);
            if (role)   params.set("role", role);
            if (search) params.set("search", search);
            if (from)   params.set("from", from);
            if (to)     params.set("to", to);
            const res = await api.get(`/audit-logs?${params}`);
            setLogs(res.data.logs || []);
            setTotal(res.data.total || 0);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [page, category, role, search, from, to]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!autoRefresh) return;
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, [autoRefresh, load]);

    const applySearch = () => { setSearch(searchInput); setPage(1); };

    const clearFilters = () => {
        setSearch(""); setSearchInput(""); setRole("");
        setFrom(""); setTo(""); setPage(1);
    };

    const hasFilters = search || role || from || to;
    const totalPages = Math.ceil(total / LIMIT);

    const uniqueActors = new Set(logs.map((l) => l.performedBy?._id).filter(Boolean)).size;
    const loginCount   = logs.filter((l) => l.action === "LOGIN").length;
    const visitCount   = logs.filter((l) => l.action === "PAGE_VISIT").length;

    return (
        <div className="al-root">

            {/* ── Header ── */}
            <div className="al-header">
                <div>
                    <h1 className="al-title">Audit Logs</h1>
                    <p className="al-subtitle">
                        Complete activity trail — logins, page visits, grievances, admin actions, system changes
                    </p>
                </div>
                <div className="al-header-actions">
                    <button
                        className={`al-toggle-btn ${autoRefresh ? "on" : ""}`}
                        onClick={() => setAutoRefresh((v) => !v)}
                    >
                        {autoRefresh ? "⏸ Live ON" : "▶ Live OFF"}
                    </button>
                    <button className="al-refresh-btn" onClick={load} disabled={loading}>
                        {loading ? "Loading…" : "↺ Refresh"}
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="al-stats">
                <div className="al-stat-card">
                    <span className="al-stat-val">{total.toLocaleString()}</span>
                    <span className="al-stat-label">Total Records</span>
                </div>
                <div className="al-stat-card">
                    <span className="al-stat-val al-val-blue">{loginCount}</span>
                    <span className="al-stat-label">Logins (this page)</span>
                </div>
                <div className="al-stat-card">
                    <span className="al-stat-val al-val-slate">{visitCount}</span>
                    <span className="al-stat-label">Page Visits (this page)</span>
                </div>
                <div className="al-stat-card">
                    <span className="al-stat-val al-val-green">{uniqueActors}</span>
                    <span className="al-stat-label">Unique Actors (this page)</span>
                </div>
            </div>

            {/* ── Category tabs ── */}
            <div className="al-cat-bar">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        className={`al-cat-tab ${category === cat ? "active" : ""}`}
                        onClick={() => { setCategory(cat); setPage(1); }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ── Filters ── */}
            <div className="al-filters">
                <div className="al-search-wrap">
                    <input
                        className="al-input"
                        placeholder="Search by name or email…"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applySearch()}
                    />
                    <button className="al-search-btn" onClick={applySearch}>Search</button>
                </div>
                <select
                    className="al-select"
                    value={role}
                    onChange={(e) => { setRole(e.target.value); setPage(1); }}
                >
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">SuperAdmin</option>
                </select>
                <input
                    type="date"
                    className="al-input al-date-input"
                    value={from}
                    onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                />
                <span className="al-to-label">to</span>
                <input
                    type="date"
                    className="al-input al-date-input"
                    value={to}
                    onChange={(e) => { setTo(e.target.value); setPage(1); }}
                />
                {hasFilters && (
                    <button className="al-clear-btn" onClick={clearFilters}>✕ Clear</button>
                )}
            </div>

            {/* ── Table ── */}
            <div className="al-table-wrap">
                {loading ? (
                    <div className="al-loading">
                        <div className="al-spinner" />
                        <p>Loading audit logs…</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="al-empty">No logs found for the selected filters.</div>
                ) : (
                    <table className="al-table">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Actor</th>
                                <th>Details</th>
                                <th>IP Address</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => {
                                const cs = getCatStyle(log.action);
                                const rs = ROLE_STYLE[log.performedBy?.role] || {};
                                const isOpen = expanded === log._id;
                                const preview = metaPreview(log.metadata, log.action);

                                return (
                                    <React.Fragment key={log._id}>
                                        <tr
                                            className={`al-row ${isOpen ? "al-row-open" : ""}`}
                                            onClick={() => setExpanded(isOpen ? null : log._id)}
                                        >
                                            <td>
                                                <span
                                                    className="al-badge"
                                                    style={{ background: cs.bg, color: cs.text }}
                                                >
                                                    <span className="al-dot" style={{ background: cs.dot }} />
                                                    {log.action.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td>
                                                {log.performedBy ? (
                                                    <div className="al-actor">
                                                        <span className="al-actor-name">{log.performedBy.name}</span>
                                                        <span
                                                            className="al-role-pill"
                                                            style={{ background: rs.bg, color: rs.text }}
                                                        >
                                                            {log.performedBy.role}
                                                        </span>
                                                        <span className="al-actor-email">{log.performedBy.email}</span>
                                                    </div>
                                                ) : (
                                                    <span className="al-system-label">System</span>
                                                )}
                                            </td>
                                            <td className="al-details-cell">
                                                <span className="al-entity">{log.targetEntity}</span>
                                                {preview && (
                                                    <span className="al-meta-preview">{preview}</span>
                                                )}
                                            </td>
                                            <td className="al-ip">{log.ipAddress || "—"}</td>
                                            <td className="al-time-cell">
                                                <span
                                                    className="al-time-rel"
                                                    title={new Date(log.timestamp).toLocaleString()}
                                                >
                                                    {relTime(log.timestamp)}
                                                </span>
                                                <span className="al-time-abs">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>

                                        {isOpen && (
                                            <tr className="al-expand-row">
                                                <td colSpan={5}>
                                                    <div className="al-expand-body">
                                                        <div className="al-expand-grid">
                                                            <div>
                                                                <strong>Log ID</strong>
                                                                <code>{log._id}</code>
                                                            </div>
                                                            {log.performedBy && (
                                                                <div>
                                                                    <strong>User ID</strong>
                                                                    <code>{log.performedBy._id}</code>
                                                                </div>
                                                            )}
                                                            {log.targetId && (
                                                                <div>
                                                                    <strong>Target ID</strong>
                                                                    <code>{log.targetId}</code>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <strong>Timestamp</strong>
                                                                <span>{new Date(log.timestamp).toISOString()}</span>
                                                            </div>
                                                        </div>
                                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                            <div className="al-metadata-block">
                                                                <strong>Metadata</strong>
                                                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="al-pagination">
                    <button
                        className="al-page-btn"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        ← Previous
                    </button>
                    <span className="al-page-info">
                        Page {page} of {totalPages} &nbsp;·&nbsp; {total.toLocaleString()} total
                    </span>
                    <button
                        className="al-page-btn"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
