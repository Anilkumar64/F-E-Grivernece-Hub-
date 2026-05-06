import React from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";

export default function EmptyState({ icon = "□", title, subtext, actionLabel, onAction }) {
    return (
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-xl text-indigo-700">
                {icon}
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h3>
            {subtext ? <p className="max-w-xl text-sm text-gray-600">{subtext}</p> : null}
            {actionLabel && <Button onClick={onAction}>{actionLabel}</Button>}
        </Card>
    );
}
