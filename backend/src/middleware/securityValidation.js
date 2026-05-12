import crypto from 'crypto';

// Security validation middleware for environment variables
export const validateSecurityConfig = () => {
    const errors = [];
    const warnings = [];

    // Validate JWT secrets
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    const aiServiceSecret = process.env.AI_SERVICE_SECRET;

    if (!accessTokenSecret || accessTokenSecret.length < 64) {
        errors.push('ACCESS_TOKEN_SECRET must be at least 64 characters');
    }
    if (!refreshTokenSecret || refreshTokenSecret.length < 64) {
        errors.push('REFRESH_TOKEN_SECRET must be at least 64 characters');
    }
    if (!aiServiceSecret || aiServiceSecret.length < 32) {
        errors.push('AI_SERVICE_SECRET must be at least 32 characters');
    }

    // Check for default/weak secrets
    const weakPatterns = [
        /change-me/i,
        /default/i,
        /secret/i,
        /password/i,
        /123456/,
        /admin/i,
        /test/i
    ];

    [accessTokenSecret, refreshTokenSecret, aiServiceSecret].forEach((secret, index) => {
        const names = ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'AI_SERVICE_SECRET'];
        if (secret && weakPatterns.some(pattern => pattern.test(secret))) {
            const message = `${names[index]} appears to be a weak/default value`;
            if (process.env.NODE_ENV === 'test') {
                warnings.push(message);
            } else {
                errors.push(message);
            }
        }
    });

    // Validate database credentials
    const mongoUrl = process.env.MONGODB_URL;
    if (!mongoUrl) {
        errors.push('MONGODB_URL is required');
    } else if (mongoUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
        warnings.push('Using localhost MongoDB in production environment');
    }

    // Validate CORS origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS;
    if (!allowedOrigins) {
        errors.push('ALLOWED_ORIGINS is required');
    } else if (allowedOrigins.includes('*') || allowedOrigins.includes('localhost')) {
        if (process.env.NODE_ENV === 'production') {
            errors.push('ALLOWED_ORIGINS cannot contain "*" or "localhost" in production');
        }
    }

    // Validate email configuration
    const emailEnabled = process.env.EMAIL_ENABLED === 'true';
    if (emailEnabled) {
        const emailHost = process.env.EMAIL_HOST;
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;

        if (!emailHost || !emailUser || !emailPass) {
            warnings.push('Email is enabled but missing required configuration');
        }
    }

    return { errors, warnings };
};

// Runtime security validation
export const securityCheck = (req, res, next) => {
    const { errors, warnings } = validateSecurityConfig();
    
    if (errors.length > 0) {
        console.error('Security configuration errors:', errors);
        if (process.env.NODE_ENV === 'production') {
            return res.status(500).json({
                message: 'Server security misconfiguration',
                errors: errors
            });
        }
    }
    
    if (warnings.length > 0) {
        console.warn('Security configuration warnings:', warnings);
    }
    
    next();
};

// Generate secure random strings
export const generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Validate password strength
export const validatePasswordStrength = (password) => {
    const minLength = 12;
    const errors = [];
    
    if (!password || password.length < minLength) {
        errors.push(`Password must be at least ${minLength} characters`);
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    
    if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    
    // Check for common patterns
    const commonPatterns = [
        /password/i,
        /123456/,
        /qwerty/i,
        /admin/i,
        /letmein/i,
        /welcome/i
    ];
    
    if (commonPatterns.some(pattern => pattern.test(password))) {
        errors.push('Password contains common patterns that are easily guessed');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};
