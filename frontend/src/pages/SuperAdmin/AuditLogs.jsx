import React, { useEffect, useState } from "react";
import api from "../../api/axiosInstance";
import Skeleton from "../../components/common/Skeleton";

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/audit-logs")
            .then((res) => setLogs(res.data.logs || []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <section className="page-section">
            <div className="page-heading">
                <h1>Audit Logs</h1>
            </div>
            {loading ? <Skeleton rows={4} /> : (
                <div className="responsive-table">
                    <table>
                        <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Time</th></tr></thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log._id}>
                                    <td>{log.action}</td>
                                    <td>{log.performedBy?.name || "System"}</td>
                                    <td>{log.targetEntity}</td>
                                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
