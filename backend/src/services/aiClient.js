/**
 * HTTP client for communicating with the Python AI microservice.
 * All calls are non-blocking: on any error, returns { available: false }.
 */
import axios from "axios";

const createAiHttp = () => {
    const aiUrl = (process.env.AI_SERVICE_URL || "http://localhost:8000").trimEnd();
    const aiSecret = process.env.AI_SERVICE_SECRET || "";
    const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15_000;

    return axios.create({
        baseURL: aiUrl,
        timeout: timeoutMs,
        headers: {
            "Content-Type": "application/json",
            ...(aiSecret ? { "X-AI-Secret": aiSecret } : {}),
        },
    });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (err) => {
    const status = err?.response?.status;
    return !status || status === 429 || status >= 500;
};

/** Wrap every AI call: return { available: false } on any failure. */
const safe = async (fn) => {
    const maxAttempts = Number(process.env.AI_RETRY_ATTEMPTS) || 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const res = await fn();
            return res.data;
        } catch (err) {
            const msg = err?.response?.data?.detail || err.message;
            const status = err?.response?.status;
            const retry = attempt < maxAttempts && shouldRetry(err);
            console.warn(`[AI] Service call failed${status ? ` (${status})` : ""}, attempt ${attempt}/${maxAttempts}:`, msg);
            if (!retry) {
                return {
                    available: false,
                    error: status === 401 ? "AI service authentication failed" : "AI service unavailable",
                };
            }
            await sleep(250 * attempt);
        }
    }
    return { available: false, error: "AI service unavailable" };
};

// ── Phase 1: LLM calls ────────────────────────────────────────────────────
export const analyzeGrievance = (title, description) =>
    safe(() => createAiHttp().post("/analyze", { title, description }));

export const improveDescription = (description) =>
    safe(() => createAiHttp().post("/improve", { description }));

export const detectDuplicates = (title, description, department_id = "") =>
    safe(() => createAiHttp().post("/duplicates", { title, description, department_id }));

export const suggestResponse = (grievance_mongo_id) =>
    safe(() => createAiHttp().post("/suggest-response", { grievance_mongo_id }));

export const getGrievanceSummary = (grievanceMongoId) =>
    safe(() => createAiHttp().get(`/summary/${grievanceMongoId}`));

export const chatFaq = (message, history = []) =>
    safe(() => createAiHttp().post("/chat", { message, history }));

// ── Phase 2: Similarity & Search ─────────────────────────────────────────
export const findSimilar = (grievanceMongoId) =>
    safe(() => createAiHttp().get(`/similar/${grievanceMongoId}`));

export const semanticSearch = (query, mode = "semantic", limit = 10) =>
    safe(() => createAiHttp().post("/search", { query, mode, limit }));

// ── Phase 3: Analytics & Insights ────────────────────────────────────────
export const getSlaRisk = (department_id = "") =>
    safe(() => createAiHttp().get("/sla-risk", { params: department_id ? { department_id } : {} }));

export const getClusters = () =>
    safe(() => createAiHttp().get("/insights/clusters"));

export const getAnomalies = () =>
    safe(() => createAiHttp().get("/insights/anomalies"));

export const getForecast = () =>
    safe(() => createAiHttp().get("/insights/forecast"));

export const getAdminScores = () =>
    safe(() => createAiHttp().get("/insights/admin-scores"));

// ── Health check ─────────────────────────────────────────────────────────
export const checkAiHealth = () =>
    safe(() => createAiHttp().get("/ready"));
