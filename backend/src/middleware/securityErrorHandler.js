import SecurityEvent from "../models/SecurityEvent.js";
import { writeAuditLog } from "../utils/audit.js";

// Security event logger
export const logSecurityEvent = async (req, type, severity, message, metadata = {}) => {
    try {
        await SecurityEvent.create({
            type,
            severity,
            user: req.userId || null,
            message,
            metadata: {
                ...metadata,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                requestId: req.requestId,
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method,
            },
            createdBy: req.userId || null,
        });

        // Log to console with structured format
        const logEntry = {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
            type: `SECURITY_${type}`,
            severity,
            userId: req.userId,
            ip: req.ip,
            path: req.path,
            method: req.method,
            message,
            metadata,
        };

        if (severity === 'high') {
            console.error('🚨 SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
        } else if (severity === 'medium') {
            console.warn('⚠️  SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
        } else {
            console.info('ℹ️  SECURITY EVENT:', JSON.stringify(logEntry, null, 2));
        }

        // Write audit log for critical events
        if (severity === 'high') {
            await writeAuditLog(req, `SECURITY_${type.toUpperCase()}`, 'SecurityEvent', req.userId || 'anonymous', metadata);
        }
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
};

// Enhanced error handler with security context
export const securityErrorHandler = async (err, req, res, next) => {
    const requestId = req.requestId || 'unknown';

    // Log security-related errors
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        await logSecurityEvent(req, 'unauthorized_access', 'medium', 'Unauthorized access attempt', {
            error: err.message,
            stack: err.stack,
        });
    } else if (err.name === 'ForbiddenError' || err.status === 403) {
        await logSecurityEvent(req, 'forbidden_access', 'medium', 'Forbidden access attempt', {
            error: err.message,
            stack: err.stack,
        });
    } else if (err.status === 429) {
        await logSecurityEvent(req, 'rate_limit_exceeded', 'medium', 'Rate limit exceeded', {
            error: err.message,
            limit: err.limit,
            windowMs: err.windowMs,
        });
    }

    // Don't expose stack traces in production
    const isProd = process.env.NODE_ENV === 'production';

    // Generic error response for security
    const errorResponse = {
        message: isProd ? 'Internal server error' : err.message,
        requestId,
        timestamp: new Date().toISOString(),
    };

    // Add specific error codes for known security issues
    if (err.code === 'TOKEN_EXPIRED') {
        errorResponse.code = 'TOKEN_EXPIRED';
        errorResponse.message = 'Your session has expired. Please log in again.';
    } else if (err.code === 'CSRF_TOKEN_MISSING') {
        errorResponse.code = 'CSRF_TOKEN_MISSING';
        errorResponse.message = 'Security token missing. Please refresh the page.';
    } else if (err.code === 'CSRF_TOKEN_INVALID') {
        errorResponse.code = 'CSRF_TOKEN_INVALID';
        errorResponse.message = 'Invalid security token. Please refresh the page.';
    }

    res.status(err.status || 500).json(errorResponse);
};

// Request logging middleware
export const securityRequestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log request start
    console.info('📝 REQUEST_START', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        userId: req.userId,
    });

    // Override res.end to log completion
    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - startTime;

        console.info('📝 REQUEST_END', {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userId: req.userId,
            timestamp: new Date().toISOString(),
        });

        // Log suspicious activity patterns
        if (duration > 5000) {
            logSecurityEvent(req, 'unusual_activity', 'low', 'Slow request detected', {
                duration,
                statusCode: res.statusCode,
            });
        }

        if (res.statusCode >= 400) {
            logSecurityEvent(req, 'unusual_activity', 'low', 'Error response generated', {
                statusCode: res.statusCode,
                duration,
            });
        }

        originalEnd.apply(this, args);
    };

    next();
};

// Input validation security logger
export const logInputValidationFailure = async (req, field, value, reason) => {
    await logSecurityEvent(req, 'input_validation_failure', 'medium', 'Input validation failed', {
        field,
        value: typeof value === 'string' ? value.substring(0, 100) + '...' : value,
        reason,
    });
};

// Failed login attempt logger
export const logFailedLogin = async (req, email, reason) => {
    await logSecurityEvent(req, 'failed_login', 'medium', 'Failed login attempt', {
        email,
        reason,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });
};

// Suspicious activity detector
export const detectSuspiciousActivity = (req) => {
    const suspiciousPatterns = [
        /\.\./,  // Path traversal
        /<script/i,  // XSS attempt
        /union.*select/i,  // SQL injection
        /javascript:/i,  // JavaScript protocol
        /data:.*base64/i,  // Base64 data URI
    ];

    const suspiciousInQuery = Object.entries(req.query).some(([key, value]) =>
        suspiciousPatterns.some(pattern => pattern.test(value))
    );

    const suspiciousInBody = req.body && Object.entries(req.body).some(([key, value]) =>
        typeof value === 'string' && suspiciousPatterns.some(pattern => pattern.test(value))
    );

    const suspiciousInHeaders = Object.entries(req.headers).some(([key, value]) =>
        suspiciousPatterns.some(pattern => pattern.test(value))
    );

    return suspiciousInQuery || suspiciousInBody || suspiciousInHeaders;
};

// Suspicious activity middleware
export const suspiciousActivityMiddleware = async (req, res, next) => {
    if (detectSuspiciousActivity(req)) {
        await logSecurityEvent(req, 'suspicious_input', 'high', 'Suspicious input patterns detected', {
            query: req.query,
            body: req.body,
            headers: Object.fromEntries(
                Object.entries(req.headers).filter(([key]) =>
                    !['authorization', 'cookie'].includes(key.toLowerCase())
                )
            ),
        });

        // In production, block suspicious requests
        if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({
                message: 'Invalid request format',
                requestId: req.requestId,
            });
        }
    }

    next();
};
