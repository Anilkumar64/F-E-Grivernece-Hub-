/**
 * Webhook Model
 * Stores webhook configurations for external integrations
 */
import mongoose from 'mongoose';
import crypto from 'crypto';

const webhookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  secret: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  events: [{
    type: String,
    required: true,
    enum: [
      'grievance.created',
      'grievance.updated',
      'grievance.assigned',
      'grievance.resolved',
      'grievance.closed',
      'grievance.escalated',
      'user.created',
      'user.updated',
      'user.login',
      'user.logout',
      'system.maintenance',
      'system.backup',
      'compliance.alert',
      'sla.breach'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  retryConfig: {
    maxRetries: { type: Number, default: 3, min: 0, max: 10 },
    retryDelay: { type: Number, default: 5000, min: 1000, max: 60000 }, // ms
    backoffMultiplier: { type: Number, default: 2, min: 1, max: 5 }
  },
  timeout: {
    type: Number,
    default: 10000, // 10 seconds
    min: 1000,
    max: 60000
  },
  headers: {
    type: Map,
    of: String,
    default: new Map()
  },
  payloadTemplate: {
    type: String, // JSON template or handlebars template
    default: null
  },
  rateLimit: {
    requestsPerMinute: { type: Number, default: 60, min: 1, max: 1000 },
    burstSize: { type: Number, default: 10, min: 1, max: 100 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastTriggered: {
    type: Date,
    default: null
  },
  triggerCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },
  lastError: {
    type: String,
    default: null
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes
webhookSchema.index({ createdBy: 1, isActive: 1 });
webhookSchema.index({ events: 1, isActive: 1 });
webhookSchema.index({ lastTriggered: 1 });
webhookSchema.index({ url: 1 });

export default mongoose.model('Webhook', webhookSchema);
