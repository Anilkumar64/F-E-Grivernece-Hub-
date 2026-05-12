/**
 * OTP Service
 * Handles email and phone verification using OTP codes
 */
import crypto from 'crypto';
import notificationService from './notificationService.js';
import User from '../models/User.js';

class OTPService {
    constructor() {
        this.otpLength = parseInt(process.env.OTP_LENGTH) || 6;
        this.otpExpiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
    }

    /**
     * Generate a secure OTP code
     */
    generateOTP() {
        return crypto.randomInt(0, Math.pow(10, this.otpLength)).toString().padStart(this.otpLength, '0');
    }

    /**
     * Send email verification code
     */
    async sendEmailVerificationCode(user) {
        try {
            const code = this.generateOTP();
            const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

            // Update user with verification code (only if it's a real user)
            if (user._id && typeof user.save === 'function') {
                user.emailVerificationCode = code;
                user.emailVerificationExpires = expiresAt;
                await user.save();
            }

            // Send email notification
            await notificationService.sendNotification({
                userId: user._id,
                type: 'email',
                to: user.email,
                subject: 'Email Verification Code - E-Grievance Portal',
                message: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Email Verification</h2>
                        <p>Hi ${user.name},</p>
                        <p>Your verification code is:</p>
                        <div style="background: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${code}</span>
                        </div>
                        <p>This code will expire in ${this.otpExpiryMinutes} minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 14px;">E-Grievance Portal</p>
                    </div>
                `
            });

            return {
                success: true,
                message: 'Email verification code sent successfully',
                expiresAt
            };
        } catch (error) {
            console.error('Email verification error:', error);
            return {
                success: false,
                message: 'Failed to send email verification code',
                error: error.message
            };
        }
    }

    /**
     * Send phone verification code (SMS)
     */
    async sendPhoneVerificationCode(user) {
        try {
            const code = this.generateOTP();
            const expiresAt = new Date(Date.now() + this.otpExpiryMinutes * 60 * 1000);

            // Update user with verification code (only if it's a real user)
            if (user._id && typeof user.save === 'function') {
                user.phoneVerificationCode = code;
                user.phoneVerificationExpires = expiresAt;
                await user.save();
            }

            // Send SMS notification
            await notificationService.sendNotification({
                userId: user._id,
                type: 'sms',
                message: `Your E-Grievance verification code is: ${code}. Valid for ${this.otpExpiryMinutes} minutes.`
            });

            return {
                success: true,
                message: 'Phone verification code sent successfully',
                expiresAt
            };
        } catch (error) {
            console.error('Phone verification error:', error);
            return {
                success: false,
                message: 'Failed to send phone verification code',
                error: error.message
            };
        }
    }

    /**
     * Verify email code
     */
    async verifyEmailCode(userId, code) {
        try {
            const user = await User.findById(userId)
                .select('+emailVerificationCode +emailVerificationExpires');

            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            if (!user.emailVerificationCode || !user.emailVerificationExpires) {
                return {
                    success: false,
                    message: 'No email verification code found'
                };
            }

            if (Date.now() > user.emailVerificationExpires) {
                return {
                    success: false,
                    message: 'Email verification code has expired'
                };
            }

            if (user.emailVerificationCode !== code) {
                return {
                    success: false,
                    message: 'Invalid verification code'
                };
            }

            // Mark email as verified
            user.emailVerified = true;
            user.emailVerificationCode = null;
            user.emailVerificationExpires = null;
            await user.save();

            return {
                success: true,
                message: 'Email verified successfully'
            };
        } catch (error) {
            console.error('Email verification error:', error);
            return {
                success: false,
                message: 'Email verification failed',
                error: error.message
            };
        }
    }

    /**
     * Verify phone code
     */
    async verifyPhoneCode(userId, code) {
        try {
            const user = await User.findById(userId)
                .select('+phoneVerificationCode +phoneVerificationExpires');

            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            if (!user.phoneVerificationCode || !user.phoneVerificationExpires) {
                return {
                    success: false,
                    message: 'No phone verification code found'
                };
            }

            if (Date.now() > user.phoneVerificationExpires) {
                return {
                    success: false,
                    message: 'Phone verification code has expired'
                };
            }

            if (user.phoneVerificationCode !== code) {
                return {
                    success: false,
                    message: 'Invalid verification code'
                };
            }

            // Mark phone as verified
            user.phoneVerified = true;
            user.phoneVerificationCode = null;
            user.phoneVerificationExpires = null;
            await user.save();

            return {
                success: true,
                message: 'Phone verified successfully'
            };
        } catch (error) {
            console.error('Phone verification error:', error);
            return {
                success: false,
                message: 'Phone verification failed',
                error: error.message
            };
        }
    }

    /**
     * Send verification code based on user preference
     */
    async sendVerificationCode(user, type = null) {
        const verificationType = type || user.preferredVerification;

        if (verificationType === 'phone') {
            if (!user.phone) {
                return {
                    success: false,
                    message: 'Phone number is required for phone verification'
                };
            }
            return await this.sendPhoneVerificationCode(user);
        } else {
            if (!user.email) {
                return {
                    success: false,
                    message: 'Email is required for email verification'
                };
            }
            return await this.sendEmailVerificationCode(user);
        }
    }

    /**
     * Check if verification is required
     */
    async checkVerificationStatus(user) {
        return {
            emailVerified: user.emailVerified,
            phoneVerified: user.phoneVerified,
            preferredVerification: user.preferredVerification,
            requiresVerification: !user.emailVerified && !user.phoneVerified
        };
    }

    /**
     * Resend verification code
     */
    async resendVerificationCode(userId, type) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                return {
                    success: false,
                    message: 'User not found'
                };
            }

            return await this.sendVerificationCode(user, type);
        } catch (error) {
            console.error('Resend verification error:', error);
            return {
                success: false,
                message: 'Failed to resend verification code',
                error: error.message
            };
        }
    }

    /**
     * Test email configuration
     */
    async testEmailConfiguration() {
        try {
            const testEmail = process.env.EMAIL_USER || 'test@example.com';

            await notificationService.sendNotification({
                type: 'email',
                to: testEmail,
                subject: 'Test Email - E-Grievance Portal',
                message: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">Email Configuration Test</h2>
                        <p>This is a test email to verify that the email configuration is working correctly.</p>
                        <p>If you receive this email, the email service is properly configured.</p>
                        <div style="background: #d4edda; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <strong>Test Details:</strong><br>
                            Timestamp: ${new Date().toISOString()}<br>
                            Service: E-Grievance Portal<br>
                            Status: Successful
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 14px;">E-Grievance Portal</p>
                    </div>
                `
            });

            return {
                success: true,
                message: 'Test email sent successfully'
            };
        } catch (error) {
            console.error('Email test error:', error);
            return {
                success: false,
                message: 'Email test failed',
                error: error.message
            };
        }
    }

    /**
     * Test SMS configuration
     */
    async testSMSConfiguration() {
        try {
            const testPhone = process.env.TEST_PHONE_NUMBER || '+1234567890';

            await notificationService.sendNotification({
                type: 'sms',
                to: testPhone,
                message: `Test SMS from E-Grievance Portal. This is a test message to verify SMS configuration. Timestamp: ${new Date().toISOString()}`
            });

            return {
                success: true,
                message: 'Test SMS sent successfully'
            };
        } catch (error) {
            console.error('SMS test error:', error);
            return {
                success: false,
                message: 'SMS test failed',
                error: error.message
            };
        }
    }
}

export default new OTPService();
