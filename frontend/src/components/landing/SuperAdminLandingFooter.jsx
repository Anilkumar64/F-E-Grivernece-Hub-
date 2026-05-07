import React from "react";
import BrandMark from "../common/BrandMark";
import { useBranding } from "../../hooks/useBranding";

export default function SuperAdminFooter() {
    const { universityName } = useBranding();
    return (
        <footer className="border-t border-gray-100 bg-white">
            <div className="app-container flex flex-col gap-3 py-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <BrandMark />
                </div>
                <div className="flex items-center gap-2">
                    <span className="ui-badge">SuperAdmin Panel</span>
                    <span>© {new Date().getFullYear()} {universityName}</span>
                </div>
            </div>
        </footer>
    );
}
