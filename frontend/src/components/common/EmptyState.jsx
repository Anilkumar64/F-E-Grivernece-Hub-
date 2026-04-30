import React from "react";

export default function EmptyState({ icon = "□", title, actionLabel, onAction }) {
    return (
        <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <h3>{title}</h3>
            {actionLabel && <button className="primary-btn" onClick={onAction}>{actionLabel}</button>}
        </div>
    );
}
