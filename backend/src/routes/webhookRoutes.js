/**
 * Webhook Routes
 * Provides endpoints for webhook management and testing
 */
import express from "express";
import { guardAdmin, guardSuperAdmin } from "../middleware/guards.js";
import webhookService from "../services/webhookService.js";

const router = express.Router();

// All routes require admin access
router.use(...guardAdmin);

/**
 * POST /api/webhooks
 * Create new webhook
 */
router.post("/", async (req, res, next) => {
  try {
    const webhook = await webhookService.createWebhook(req.body, req.userId);
    res.status(201).json({
      message: "Webhook created successfully",
      webhook
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/webhooks
 * Get user's webhooks
 */
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;
    const webhooks = await webhookService.getUserWebhooks(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined
    });
    res.json(webhooks);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/webhooks/:id
 * Update webhook
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const webhook = await webhookService.updateWebhook(id, req.body, req.userId);
    res.json({
      message: "Webhook updated successfully",
      webhook
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await webhookService.deleteWebhook(id, req.userId);
    res.json({
      message: "Webhook deleted successfully"
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/webhooks/:id/test
 * Test webhook
 */
router.post("/:id/test", async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await webhookService.testWebhook(id, req.userId);
    res.json({
      message: "Webhook test completed",
      result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/webhooks/:id/stats
 * Get webhook statistics
 */
router.get("/:id/stats", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const stats = await webhookService.getWebhookStats(id, req.userId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/webhooks/system/stats
 * Get system-wide webhook statistics (superadmin only)
 */
router.get("/system/stats", ...guardSuperAdmin, async (req, res, next) => {
  try {
    const stats = await webhookService.getSystemStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

export default router;
