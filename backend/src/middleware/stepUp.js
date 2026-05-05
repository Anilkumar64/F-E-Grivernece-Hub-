import User from "../models/User.js";
import SiteConfig from "../models/SiteConfig.js";

export const requireStepUp = (maxAgeMinutes = 10) => async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const actor = await User.findById(req.userId).select("+stepUpVerifiedAt");
    if (!actor) return res.status(401).json({ message: "Unauthorized" });
    const verifiedAt = actor.stepUpVerifiedAt ? new Date(actor.stepUpVerifiedAt) : null;
    if (!verifiedAt) return res.status(403).json({ message: "Step-up verification required" });
    const cfg = await SiteConfig.findOne({ key: "global" }).select("security.stepUpWindowMinutes");
    const effectiveWindow = cfg?.security?.stepUpWindowMinutes || maxAgeMinutes;
    const ageMs = Date.now() - verifiedAt.getTime();
    if (ageMs > effectiveWindow * 60 * 1000) {
        return res.status(403).json({ message: "Step-up verification expired" });
    }
    return next();
};

