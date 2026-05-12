import crypto from 'crypto';
import TokenRecord from '../models/TokenRecord.js';

class CSRFProtection {
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    async storeToken(token, sessionId, expiry = 3600) {
        const key = `csrf:${sessionId}`;
        try {
            await TokenRecord.updateOne(
                { key },
                { $set: { value: token, expiresAt: new Date(Date.now() + Math.max(1, expiry) * 1000) } },
                { upsert: true }
            );
            return true;
        } catch (err) {
            console.error('Failed to store CSRF token:', err);
            return false;
        }
    }

    async validateToken(token, sessionId) {
        const key = `csrf:${sessionId}`;
        try {
            const storedToken = await TokenRecord.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
            return storedToken?.value === token;
        } catch (err) {
            console.error('Failed to validate CSRF token:', err);
            return false;
        }
    }

    async revokeToken(sessionId) {
        const key = `csrf:${sessionId}`;
        try {
            await TokenRecord.deleteOne({ key });
            return true;
        } catch (err) {
            console.error('Failed to revoke CSRF token:', err);
            return false;
        }
    }
}

const csrfProtection = new CSRFProtection();

const csrfMiddleware = (req, res, next) => {
    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip CSRF for API endpoints that use Bearer tokens
    if (req.headers.authorization?.startsWith('Bearer ')) {
        return next();
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionId = req.sessionId || req.cookies?.sessionId || req.ip;

    if (!csrfToken) {
        return res.status(403).json({ 
            message: 'CSRF token missing',
            error: 'CSRF_TOKEN_MISSING'
        });
    }

    csrfProtection.validateToken(csrfToken, sessionId)
        .then(isValid => {
            if (!isValid) {
                return res.status(403).json({ 
                    message: 'Invalid CSRF token',
                    error: 'CSRF_TOKEN_INVALID'
                });
            }
            next();
        })
        .catch(err => {
            console.error('CSRF validation error:', err);
            res.status(500).json({ message: 'CSRF validation failed' });
        });
};

const generateCSRFToken = async (req, res) => {
    const sessionId = req.sessionId || req.cookies?.sessionId || req.ip;
    const token = csrfProtection.generateToken();
    
    await csrfProtection.storeToken(token, sessionId);
    
    return token;
};

export { csrfMiddleware, generateCSRFToken, csrfProtection };
