/**
 * Webhook Service
 * Handles webhook delivery, retry logic, and event processing
 */
import crypto from 'crypto';
import axios from 'axios';
import Webhook from '../models/Webhook.js';
import WebhookLog from '../models/WebhookLog.js';

class WebhookService {
  constructor() {
    this.rateLimitMap = new Map(); // Simple in-memory rate limiting
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerEvent(eventType, data, options = {}) {
    try {
      const webhooks = await Webhook.find({
        events: eventType,
        isActive: true
      }).populate('createdBy', 'name email');

      const results = [];

      for (const webhook of webhooks) {
        try {
          const result = await this.deliverWebhook(webhook, eventType, data);
          results.push({
            webhookId: webhook._id,
            webhookName: webhook.name,
            success: result.success,
            delivered: result.delivered,
            attempt: result.attempt,
            error: result.error
          });
        } catch (error) {
          results.push({
            webhookId: webhook._id,
            webhookName: webhook.name,
            success: false,
            error: error.message
          });
        }
      }

      return {
        eventType,
        triggeredAt: new Date(),
        totalWebhooks: webhooks.length,
        successfulDeliveries: results.filter(r => r.success).length,
        failedDeliveries: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Webhook trigger failed:', error);
      throw error;
    }
  }

  /**
   * Deliver webhook with retry logic
   */
  async deliverWebhook(webhook, eventType, data, attempt = 1) {
    const maxRetries = webhook.retryConfig.maxRetries;

    try {
      // Check rate limiting
      if (!this.checkRateLimit(webhook)) {
        throw new Error('Rate limit exceeded');
      }

      // Prepare payload
      const payload = this.preparePayload(webhook, eventType, data);
      
      // Generate signature
      const signature = this.generateSignature(payload, webhook.secret);
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'E-Grievance-Webhook/1.0',
        'X-Webhook-Event': eventType,
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': Date.now().toString(),
        'X-Webhook-ID': crypto.randomUUID(),
        ...Object.fromEntries(webhook.headers)
      };

      // Make request
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: webhook.timeout,
        maxRedirects: 3
      });

      // Log successful delivery
      await this.logWebhookDelivery(webhook._id, eventType, payload, response, attempt, true);

      // Update webhook stats
      await Webhook.findByIdAndUpdate(webhook._id, {
        lastTriggered: new Date(),
        triggerCount: webhook.triggerCount + 1,
        successCount: webhook.successCount + 1,
        lastError: null
      });

      return {
        success: true,
        delivered: true,
        attempt,
        response: {
          status: response.status,
          statusText: response.statusText
        }
      };
    } catch (error) {
      // Log failed delivery
      await this.logWebhookDelivery(webhook._id, eventType, data, null, attempt, false, error);

      // Update webhook stats
      await Webhook.findByIdAndUpdate(webhook._id, {
        lastTriggered: new Date(),
        triggerCount: webhook.triggerCount + 1,
        failureCount: webhook.failureCount + 1,
        lastError: error.message
      });

      // Retry logic
      if (attempt <= maxRetries) {
        const delay = webhook.retryConfig.retryDelay * 
          Math.pow(webhook.retryConfig.backoffMultiplier, attempt - 1);

        console.log(`Webhook delivery failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.deliverWebhook(webhook, eventType, data, attempt + 1);
      }

      return {
        success: false,
        delivered: false,
        attempt,
        error: error.message
      };
    }
  }

  /**
   * Prepare webhook payload
   */
  preparePayload(webhook, eventType, data) {
    const basePayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      webhookId: webhook._id,
      webhookName: webhook.name,
      data: data
    };

    // If custom template is provided, use it
    if (webhook.payloadTemplate) {
      try {
        // Simple template replacement (in production, use a proper template engine)
        let template = webhook.payloadTemplate;
        template = template.replace(/\{\{event\}\}/g, eventType);
        template = template.replace(/\{\{timestamp\}\}/g, new Date().toISOString());
        template = template.replace(/\{\{data\}\}/g, JSON.stringify(data));
        
        return JSON.parse(template);
      } catch (error) {
        console.error('Template parsing failed, using default payload:', error);
      }
    }

    return basePayload;
  }

  /**
   * Generate HMAC signature for webhook
   */
  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Check rate limiting for webhook
   */
  checkRateLimit(webhook) {
    const key = webhook._id.toString();
    const now = Date.now();
    const windowMs = 60000; // 1 minute window

    if (!this.rateLimitMap.has(key)) {
      this.rateLimitMap.set(key, {
        count: 0,
        resetTime: now + windowMs
      });
    }

    const rateLimitData = this.rateLimitMap.get(key);

    // Reset window if expired
    if (now > rateLimitData.resetTime) {
      rateLimitData.count = 0;
      rateLimitData.resetTime = now + windowMs;
    }

    // Check if within limits
    if (rateLimitData.count >= webhook.rateLimit.requestsPerMinute) {
      return false;
    }

    rateLimitData.count++;
    return true;
  }

  /**
   * Log webhook delivery
   */
  async logWebhookDelivery(webhookId, eventType, payload, response, attempt, success, error = null) {
    try {
      await WebhookLog.create({
        webhookId,
        eventType,
        payload,
        response: response ? {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        } : null,
        attempt,
        success,
        error: error ? error.message : null,
        duration: response?.config?.metadata?.duration || null,
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('Failed to log webhook delivery:', logError);
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(webhookData, userId) {
    try {
      // Validate URL
      new URL(webhookData.url); // Will throw if invalid

      const webhook = await Webhook.create({
        ...webhookData,
        createdBy: userId
      });

      return webhook;
    } catch (error) {
      throw new Error(`Invalid webhook configuration: ${error.message}`);
    }
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId, updates, userId) {
    const webhook = await Webhook.findOne({ _id: webhookId, createdBy: userId });
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    if (updates.url) {
      new URL(updates.url); // Validate URL
    }

    // Increment version on update
    updates.version = webhook.version + 1;

    const updated = await Webhook.findByIdAndUpdate(
      webhookId,
      updates,
      { new: true, runValidators: true }
    );

    return updated;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId, userId) {
    const webhook = await Webhook.findOne({ _id: webhookId, createdBy: userId });
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    await Webhook.findByIdAndDelete(webhookId);
    return true;
  }

  /**
   * Test webhook
   */
  async testWebhook(webhookId, userId) {
    const webhook = await Webhook.findOne({ _id: webhookId, createdBy: userId });
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testData = {
      type: 'test',
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString()
    };

    const result = await this.deliverWebhook(webhook, 'webhook.test', testData);
    
    return {
      webhookId,
      webhookName: webhook.name,
      testResult: result
    };
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId, userId, options = {}) {
    const { startDate, endDate } = options;
    
    const webhook = await Webhook.findOne({ _id: webhookId, createdBy: userId });
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const logs = await WebhookLog.find({
      webhookId,
      timestamp: {
        $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        $lte: endDate || new Date()
      }
    });

    const stats = {
      webhookId,
      webhookName: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      totalDeliveries: logs.length,
      successfulDeliveries: logs.filter(log => log.success).length,
      failedDeliveries: logs.filter(log => !log.success).length,
      averageResponseTime: this.calculateAverageResponseTime(logs),
      lastDelivery: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
      successRate: logs.length > 0 ? (logs.filter(log => log.success).length / logs.length * 100).toFixed(2) : 0
    };

    return stats;
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(logs) {
    const validLogs = logs.filter(log => log.duration && log.success);
    if (validLogs.length === 0) return 0;

    const totalTime = validLogs.reduce((sum, log) => sum + log.duration, 0);
    return Math.round(totalTime / validLogs.length);
  }

  /**
   * Get all webhooks for user
   */
  async getUserWebhooks(userId, options = {}) {
    const { page = 1, limit = 20, isActive } = options;
    const query = { createdBy: userId };
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const webhooks = await Webhook.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Webhook.countDocuments(query);

    return {
      webhooks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload, signature, secret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimit() {
    const now = Date.now();
    for (const [key, data] of this.rateLimitMap.entries()) {
      if (now > data.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  /**
   * Get system-wide webhook statistics
   */
  async getSystemStats() {
    const [
      totalWebhooks,
      activeWebhooks,
      totalDeliveries,
      recentDeliveries,
      topEvents
    ] = await Promise.all([
      Webhook.countDocuments(),
      Webhook.countDocuments({ isActive: true }),
      WebhookLog.countDocuments(),
      WebhookLog.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      WebhookLog.aggregate([
        { $match: { timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    return {
      totalWebhooks,
      activeWebhooks,
      totalDeliveries,
      recentDeliveries,
      topEvents,
      successRate: await this.calculateSystemSuccessRate()
    };
  }

  /**
   * Calculate system-wide success rate
   */
  async calculateSystemSuccessRate() {
    const [successful, total] = await Promise.all([
      WebhookLog.countDocuments({ success: true }),
      WebhookLog.countDocuments()
    ]);

    return total > 0 ? (successful / total * 100).toFixed(2) : 0;
  }
}

export default new WebhookService();
