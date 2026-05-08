/**
 * AI Routes — /api/ai/*
 * Thin authenticated proxy from the Node.js backend to the Python AI service.
 * All responses include { available: true/false } — frontend handles gracefully.
 */
import express from "express";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiters.js";
import {
    analyzeGrievance,
    improveDescription,
    detectDuplicates,
    suggestResponse,
    getGrievanceSummary,
    chatFaq,
    findSimilar,
    semanticSearch,
    getSlaRisk,
    getClusters,
    getAnomalies,
    getForecast,
    getAdminScores,
    checkAiHealth,
} from "../services/aiClient.js";

const router = express.Router();

// All AI routes require authentication
router.use(authenticate);
router.use(aiLimiter);

/* ── Health ── */
router.get("/health", async (_req, res) => {
    const result = await checkAiHealth();
    res.json(result);
});

/* ── Phase 1: Student + Admin LLM Features ── */

/**
 * POST /api/ai/analyze
 * Analyze grievance for category, priority, urgency, sentiment, spam, content flags.
 * Called client-side before final submission.
 */
router.post("/analyze", async (req, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title || !description)
            return res.status(400).json({ message: "title and description are required" });
        const result = await analyzeGrievance(title, description);
        res.json(result);
    } catch (err) { next(err); }
});

/**
 * POST /api/ai/improve
 * Rewrite a grievance description professionally.
 */
router.post("/improve", async (req, res, next) => {
    try {
        const { description } = req.body;
        if (!description)
            return res.status(400).json({ message: "description is required" });
        const result = await improveDescription(description);
        res.json(result);
    } catch (err) { next(err); }
});

/**
 * POST /api/ai/duplicates
 * Detect semantically similar existing grievances.
 */
router.post("/duplicates", async (req, res, next) => {
    try {
        const { title, description, department_id } = req.body;
        if (!title || !description)
            return res.status(400).json({ message: "title and description are required" });
        const result = await detectDuplicates(title, description, department_id || "");
        res.json(result);
    } catch (err) { next(err); }
});

/**
 * POST /api/ai/suggest-response
 * Generate a professional admin response draft for a grievance.
 * Restricted to admin and superadmin roles.
 */
router.post(
    "/suggest-response",
    authorize("admin", "superadmin"),
    async (req, res, next) => {
        try {
            const { grievance_mongo_id } = req.body;
            if (!grievance_mongo_id)
                return res.status(400).json({ message: "grievance_mongo_id is required" });
            const result = await suggestResponse(grievance_mongo_id);
            res.json(result);
        } catch (err) { next(err); }
    }
);

/**
 * GET /api/ai/summary/:id
 * Get AI-generated summary + sentiment for a grievance.
 * Restricted to admin and superadmin.
 */
router.get(
    "/summary/:id",
    authorize("admin", "superadmin"),
    async (req, res, next) => {
        try {
            const result = await getGrievanceSummary(req.params.id);
            res.json(result);
        } catch (err) { next(err); }
    }
);

/**
 * POST /api/ai/chat
 * Student FAQ chatbot.
 */
router.post("/chat", async (req, res, next) => {
    try {
        const { message, history = [] } = req.body;
        if (!message) return res.status(400).json({ message: "message is required" });
        const result = await chatFaq(message, history);
        res.json(result);
    } catch (err) { next(err); }
});

/* ── Phase 2: Similarity & Semantic Search ── */

/**
 * GET /api/ai/similar/:id
 * Find grievances semantically similar to a given one.
 */
router.get("/similar/:id", async (req, res, next) => {
    try {
        const result = await findSimilar(req.params.id);
        res.json(result);
    } catch (err) { next(err); }
});

/**
 * POST /api/ai/search
 * Semantic or NL-filter-based grievance search.
 * Restricted to admin and superadmin.
 */
router.post(
    "/search",
    authorize("admin", "superadmin"),
    async (req, res, next) => {
        try {
            const { query, mode = "semantic", limit = 10 } = req.body;
            if (!query) return res.status(400).json({ message: "query is required" });
            const result = await semanticSearch(query, mode, limit);
            res.json(result);
        } catch (err) { next(err); }
    }
);

/* ── Phase 3: Insights (superadmin only) ── */

router.get(
    "/sla-risk",
    authorize("admin", "superadmin"),
    async (req, res, next) => {
        try {
            const dept = req.role === "admin" ? req.user.department?.toString() : (req.query.department_id || "");
            const result = await getSlaRisk(dept);
            res.json(result);
        } catch (err) { next(err); }
    }
);

router.get(
    "/insights/clusters",
    authorize("superadmin"),
    async (_req, res, next) => {
        try { res.json(await getClusters()); } catch (err) { next(err); }
    }
);

router.get(
    "/insights/anomalies",
    authorize("superadmin"),
    async (_req, res, next) => {
        try { res.json(await getAnomalies()); } catch (err) { next(err); }
    }
);

router.get(
    "/insights/forecast",
    authorize("superadmin"),
    async (_req, res, next) => {
        try { res.json(await getForecast()); } catch (err) { next(err); }
    }
);

router.get(
    "/insights/admin-scores",
    authorize("superadmin"),
    async (_req, res, next) => {
        try { res.json(await getAdminScores()); } catch (err) { next(err); }
    }
);

export default router;
