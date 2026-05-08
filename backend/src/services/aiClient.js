/**
 * HTTP client for communicating with the Python AI microservice.
 * All calls are non-blocking: on any error, returns { available: false }.
 */
import axios from "axios";

const AI_URL = (process.env.AI_SERVICE_URL || "http://localhost:8000").trimEnd();
const AI_SECRET = process.env.AI_SERVICE_SECRET || "";
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 15_000;

const aiHttp = axios.create({
    baseURL: AI_URL,
    timeout: TIMEOUT_MS,
    headers: {
        "Content-Type": "application/json",
        ...(AI_SECRET ? { "X-AI-Secret": AI_SECRET } : {}),
    },
});

/** Wrap every AI call: return { available: false } on any failure. */
const safe = async (fn) => {
    try {
        const res = await fn();
        return res.data;
    } catch (err) {
        const msg = err?.response?.data?.detail || err.message;
        console.warn("[AI] Service call failed (non-fatal):", msg);
        return { available: false };
    }
};

// ── Phase 1: LLM calls ────────────────────────────────────────────────────
export const analyzeGrievance = (title, description) =>
    safe(() => aiHttp.post("/analyze", { title, description }));

export const improveDescription = (description) =>
    safe(() => aiHttp.post("/improve", { description }));

export const detectDuplicates = (title, description, department_id = "") =>
    safe(() => aiHttp.post("/duplicates", { title, description, department_id }));

export const suggestResponse = (grievance_mongo_id) =>
    safe(() => aiHttp.post("/suggest-response", { grievance_mongo_id }));

export const getGrievanceSummary = (grievanceMongoId) =>
    safe(() => aiHttp.get(`/summary/${grievanceMongoId}`));

export const chatFaq = (message, history = []) =>
    safe(() => aiHttp.post("/chat", { message, history }));

// ── Phase 2: Similarity & Search ─────────────────────────────────────────
export const findSimilar = (grievanceMongoId) =>
    safe(() => aiHttp.get(`/similar/${grievanceMongoId}`));

export const semanticSearch = (query, mode = "semantic", limit = 10) =>
    safe(() => aiHttp.post("/search", { query, mode, limit }));

// ── Phase 3: Analytics & Insights ────────────────────────────────────────
export const getSlaRisk = (department_id = "") =>
    safe(() => aiHttp.get("/sla-risk", { params: department_id ? { department_id } : {} }));

export const getClusters = () =>
    safe(() => aiHttp.get("/insights/clusters"));

export const getAnomalies = () =>
    safe(() => aiHttp.get("/insights/anomalies"));

export const getForecast = () =>
    safe(() => aiHttp.get("/insights/forecast"));

export const getAdminScores = () =>
    safe(() => aiHttp.get("/insights/admin-scores"));

// ── Health check ─────────────────────────────────────────────────────────
export const checkAiHealth = () =>
    safe(() => aiHttp.get("/health"));
