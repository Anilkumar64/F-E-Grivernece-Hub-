import React from "react";
import { resolveBrandAsset, useBranding } from "../../hooks/useBranding";

export default function BrandMark({
    showName = true,
    className = "",
    logoSizeClass = "h-9 w-9",
    nameClassName = "text-sm font-semibold tracking-tight text-gray-900",
}) {
    const { universityName, universityLogo } = useBranding();
    const logoUrl = resolveBrandAsset(universityLogo);
    const initials = (universityName || "KU")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "KU";

    return (
        <span className={`inline-flex items-center gap-3 ${className}`}>
            {logoUrl ? (
                <img src={logoUrl} alt={`${universityName} logo`} className={`${logoSizeClass} rounded-lg border border-gray-200 object-cover`} />
            ) : (
                <span className="ku-logo">{initials}</span>
            )}
            {showName && <span className={nameClassName}>{universityName}</span>}
        </span>
    );
}
