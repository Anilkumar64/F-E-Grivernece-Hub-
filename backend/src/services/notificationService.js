/**
 * Multi-channel notification service
 * Supports Email, SMS, Push notifications, and Webhooks
 */
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import webpush from 'web-push';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

class NotificationService {
  constructor() {
    this.emailTransporter = null;
    this.smsClient = null;
    this.pushVapidKeys = null;
    this.initializeServices();
  }

  initializeServices() {
    // Initialize Email Service
    if (process.env.EMAIL_ENABLED === 'true') {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
        },
      });
    }

    // Initialize SMS Service (Twilio) only when explicitly enabled with real credentials.
    const twilioEnabled = process.env.TWILIO_ENABLED === 'true';
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
    const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
    if (twilioEnabled && twilioSid.startsWith('AC') && twilioToken && twilioToken !== 'your-twilio-token') {
      this.smsClient = twilio(
        twilioSid,
        twilioToken
      );
    } else if (twilioEnabled) {
      console.warn('Twilio SMS is enabled but credentials are invalid; SMS notifications disabled');
    }

    // Initialize Push Notifications
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        'mailto:notifications@egrievance.edu',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      this.pushVapidKeys = {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
      };
    }
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification({
    userId,
    type,
    title,
    message,
    channels = ['email', 'database'],
    data = {},
    priority = 'normal'
  }) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const notificationData = {
      recipient: userId,
      type,
      title,
      message,
      data,
      priority,
      channels,
      createdAt: new Date(),
    };

    const results = { success: [], failed: [] };

    // Database Notification (always sent)
    try {
      const dbNotification = await Notification.create(notificationData);
      results.success.push({ channel: 'database', id: dbNotification._id });
    } catch (error) {
      results.failed.push({ channel: 'database', error: error.message });
    }

    // Email Notification
    if (channels.includes('email') && user.email && this.emailTransporter) {
      try {
        await this.sendEmail(user.email, title, message, data);
        results.success.push({ channel: 'email' });
      } catch (error) {
        results.failed.push({ channel: 'email', error: error.message });
      }
    }

    // SMS Notification
    if (channels.includes('sms') && user.phone && this.smsClient) {
      try {
        await this.sendSMS(user.phone, message);
        results.success.push({ channel: 'sms' });
      } catch (error) {
        results.failed.push({ channel: 'sms', error: error.message });
      }
    }

    // Push Notification
    if (channels.includes('push') && this.pushVapidKeys) {
      try {
        await this.sendPushNotification(userId, title, message, data);
        results.success.push({ channel: 'push' });
      } catch (error) {
        results.failed.push({ channel: 'push', error: error.message });
      }
    }

    return results;
  }

  /**
   * Send email notification
   */
  async sendEmail(email, subject, message, data = {}) {
    const htmlTemplate = this.generateEmailTemplate(subject, message, data);
    
    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html: htmlTemplate,
    });
  }

  /**
   * Send SMS notification
   */
  async sendSMS(phone, message) {
    await this.smsClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, title, message, data = {}) {
    // Get user's push subscriptions
    const subscriptions = await PushSubscription.find({ userId, active: true });
    
    const payload = JSON.stringify({
      title,
      message,
      data,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      timestamp: Date.now(),
    });

    const promises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, payload);
        return { success: true, subscriptionId: subscription._id };
      } catch (error) {
        // Deactivate failed subscriptions
        await PushSubscription.findByIdAndUpdate(subscription._id, { active: false });
        return { success: false, error: error.message };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Generate HTML email template
   */
  generateEmailTemplate(title, message, data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>E-Grievance Portal</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>${message}</p>
            ${data.actionUrl ? `<a href="${data.actionUrl}" class="button">View Details</a>` : ''}
            ${data.grievanceId ? `<p><strong>Grievance ID:</strong> ${data.grievanceId}</p>` : ''}
          </div>
          <div class="footer">
            <p>&copy; 2024 E-Grievance Portal. All rights reserved.</p>
            <p>If you didn't request this notification, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send grievance status update
   */
  async sendGrievanceUpdate(grievance, oldStatus, newStatus, updatedBy) {
    const title = `Grievance #${grievance.grievanceId} Status Update`;
    const message = `Your grievance "${grievance.title}" has been updated from ${oldStatus} to ${newStatus}.`;
    
    await this.sendNotification({
      userId: grievance.student,
      type: 'grievance_update',
      title,
      message,
      channels: ['email', 'database', 'push'],
      data: {
        grievanceId: grievance.grievanceId,
        actionUrl: `${process.env.FRONTEND_URL}/track-grievance/${grievance._id}`,
        oldStatus,
        newStatus,
        updatedBy,
      },
    });
  }

  /**
   * Send SLA breach warning
   */
  async sendSLABreachWarning(grievance, departmentAdmins) {
    const title = `SLA Breach Warning - Grievance #${grievance.grievanceId}`;
    const message = `Grievance "${grievance.title}" is approaching SLA deadline. Immediate attention required.`;
    
    const promises = departmentAdmins.map(adminId => 
      this.sendNotification({
        userId: adminId,
        type: 'sla_warning',
        title,
        message,
        channels: ['email', 'database', 'push'],
        priority: 'high',
        data: {
          grievanceId: grievance.grievanceId,
          actionUrl: `${process.env.FRONTEND_URL}/admin/grievances/${grievance._id}`,
          deadline: grievance.slaDeadline,
        },
      })
    );

    await Promise.all(promises);
  }

  /**
   * Send new grievance notification to admins
   */
  async sendNewGrievanceAlert(grievance, departmentAdmins) {
    const title = `New Grievance Assigned - #${grievance.grievanceId}`;
    const message = `A new grievance "${grievance.title}" has been assigned to your department.`;
    
    const promises = departmentAdmins.map(adminId => 
      this.sendNotification({
        userId: adminId,
        type: 'new_grievance',
        title,
        message,
        channels: ['email', 'database', 'push'],
        data: {
          grievanceId: grievance.grievanceId,
          actionUrl: `${process.env.FRONTEND_URL}/admin/grievances/${grievance._id}`,
          priority: grievance.priority,
          category: grievance.category,
        },
      })
    );

    await Promise.all(promises);
  }
}

export default new NotificationService();
