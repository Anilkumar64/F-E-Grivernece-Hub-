import express from "express";
import { getPublicSiteConfig } from "../controllers/siteConfigController.js";

const router = express.Router();

router.get("/config", getPublicSiteConfig);

export default router;
