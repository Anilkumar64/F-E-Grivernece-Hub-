import React from "react";

export default function AdminFooter() {
    return (
        <footer className="border-t border-gray-100 bg-white">
            <div className="app-container flex flex-col gap-3 py-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <div className="ku-logo">KU</div>
                    <span className="font-medium text-gray-700">Kernel University</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="ui-badge">Admin Panel</span>
                    <span>© {new Date().getFullYear()} Kernel University</span>
                </div>
            </div>
        </footer>
    );
}
