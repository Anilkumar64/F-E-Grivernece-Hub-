const rolePermissions = {
    student: ["grievance.create", "grievance.read.own", "profile.update.own"],
    admin: [
        "grievance.read.department",
        "grievance.update.department",
        "grievance.assign",
        "grievance.escalate",
        "reports.read",
        "profile.update.own",
    ],
    superadmin: ["*"],
};

export const getEffectivePermissions = (user) => {
    const base = rolePermissions[user?.role] || [];
    const custom = Array.isArray(user?.permissions) ? user.permissions : [];
    return Array.from(new Set([...base, ...custom]));
};

export const authorizePermission = (...requiredPermissions) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const effective = getEffectivePermissions(req.user);
    const hasWildcard = effective.includes("*");
    const allowed = requiredPermissions.every((perm) => hasWildcard || effective.includes(perm));
    if (!allowed) return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    return next();
};

