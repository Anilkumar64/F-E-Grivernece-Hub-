/**
 * Webhook Log Model
 * Stores delivery logs for webhooks
 */
import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema({
  webhookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  response: {
    status: Number,
    statusText: String,
    headers: mongoose.Schema.Types.Mixed,
    data: mongoose.Schema.Types.Mixed
  },
  attempt: {
    type: Number,
    required: true,
    default: 1
  },
  success: {
    type: Boolean,
    required: true
  },
  error: {
    type: String,
    default: null
  },
  duration: {
    type: Number, // in milliseconds
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
webhookLogSchema.index({ webhookId: 1, timestamp: -1 });
webhookLogSchema.index({ eventType: 1, timestamp: -1 });
webhookLogSchema.index({ success: 1, timestamp: -1 });
webhookLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days TTL

export default mongoose.model('WebhookLog', webhookLogSchema);
