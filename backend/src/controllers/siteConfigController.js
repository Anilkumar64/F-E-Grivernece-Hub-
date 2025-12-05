import SiteConfig from "../models/SiteConfig.js";

// Ensure we always have at least one config document
const getOrCreateConfig = async () => {
    let config = await SiteConfig.findOne({ key: "global" });
    if (!config) {
        config = await SiteConfig.create({ key: "global" });
    }
    return config;
};

// PUBLIC: for frontend (landing page + banners)
export const getPublicSiteConfig = async (req, res, next) => {
    try {
        const config = await getOrCreateConfig();
        // We only send necessary fields
        res.json({
            landing: config.landing,
            adminBanner: config.adminBanner,
            superAdminBanner: config.superAdminBanner,
        });
    } catch (err) {
        next(err);
    }
};

// SUPERADMIN: get full config (if needed later)
export const getSiteConfig = async (req, res, next) => {
    try {
        const config = await getOrCreateConfig();
        res.json(config);
    } catch (err) {
        next(err);
    }
};

// SUPERADMIN: update config
export const updateSiteConfig = async (req, res, next) => {
    try {
        const { landing, adminBanner, superAdminBanner } = req.body;

        const config = await getOrCreateConfig();

        if (landing) {
            config.landing = { ...config.landing.toObject(), ...landing };
        }
        if (adminBanner) {
            config.adminBanner = {
                ...config.adminBanner.toObject(),
                ...adminBanner,
            };
        }
        if (superAdminBanner) {
            config.superAdminBanner = {
                ...config.superAdminBanner.toObject(),
                ...superAdminBanner,
            };
        }

        await config.save();
        res.json(config);
    } catch (err) {
        next(err);
    }
};
