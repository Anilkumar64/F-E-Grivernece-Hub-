import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EmptyState from "../../components/common/EmptyState";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

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
        <section className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Drafts</h1>
                    <p className="text-sm text-gray-600">Resume, edit, or delete saved grievance drafts.</p>
                </div>
                <Button onClick={() => navigate("/submit-grievance")}>New Grievance</Button>
            </div>

            {!drafts.length ? (
                <EmptyState icon="📝" title="No drafts saved yet" actionLabel="Create Draft" onAction={() => navigate("/submit-grievance")} />
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {drafts.map((d) => (
                        <Card className="space-y-3" key={d.id}>
                            <h2 className="text-base font-semibold tracking-tight text-gray-900">{d.title || "Untitled Draft"}</h2>
                            <p className="text-sm text-gray-600">{(d.description || "").slice(0, 140) || "No description yet"}</p>
                            <p className="text-xs text-gray-500">Updated: {d.updatedAt ? new Date(d.updatedAt).toLocaleString() : "-"}</p>
                            <div className="flex gap-3">
                                <Button onClick={() => navigate(`/submit-grievance?draft=${d.id}`)}>Resume</Button>
                                <Button variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => removeDraft(d.id)}>Delete</Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </section>
    );
}
