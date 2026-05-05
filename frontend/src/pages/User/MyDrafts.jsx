import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";

const DRAFTS_KEY = "student_grievance_drafts_v2";

export default function MyDrafts() {
    const navigate = useNavigate();
    const [version, setVersion] = useState(0);

    const drafts = useMemo(() => {
        try {
            const raw = localStorage.getItem(DRAFTS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) : [];
        } catch {
            return [];
        }
    }, [version]);

    const removeDraft = (id) => {
        const next = drafts.filter((d) => d.id !== id);
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
        setVersion((v) => v + 1);
    };

    return (
        <section className="page-section">
            <div className="page-heading">
                <div>
                    <h1>My Drafts</h1>
                    <p>Resume, edit, or delete saved grievance drafts.</p>
                </div>
                <button className="primary-btn" onClick={() => navigate("/submit-grievance")}>New Grievance</button>
            </div>

            {!drafts.length ? (
                <EmptyState icon="📝" title="No drafts saved yet" actionLabel="Create Draft" onAction={() => navigate("/submit-grievance")} />
            ) : (
                <div className="card-grid">
                    {drafts.map((d) => (
                        <article className="card" key={d.id}>
                            <h2>{d.title || "Untitled Draft"}</h2>
                            <p className="muted">{(d.description || "").slice(0, 140) || "No description yet"}</p>
                            <p className="muted">Updated: {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "-"}</p>
                            <div className="split-actions">
                                <button className="primary-btn" onClick={() => navigate(`/submit-grievance?draft=${d.id}`)}>Resume</button>
                                <button className="danger-btn" onClick={() => removeDraft(d.id)}>Delete</button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
