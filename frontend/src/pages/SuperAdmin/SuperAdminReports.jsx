import React from "react";

// BUG FIX #5: was localhost:4400 — backend runs on port 5000
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SuperAdminReports() {
    return (
        <section className="page-section">
            <div className="page-heading">
                <h1>Reports & Analytics</h1>
                <a
                    className="primary-btn"
                    href={`${baseUrl}/api/reports/grievances.csv`}
                    target="_blank"
                    rel="noreferrer"
                >
                    Export CSV
                </a>
            </div>
            <p className="muted">
                Use dashboard analytics for charts and export filtered grievance data for reporting.
            </p>
        </section>
    );
}