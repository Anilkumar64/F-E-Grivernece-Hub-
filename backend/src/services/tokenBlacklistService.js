import crypto from 'crypto';
import TokenRecord from '../models/TokenRecord.js';

class TokenBlacklistService {
    async blacklistToken(token, expiry) {
        const key = `blacklist:${crypto.createHash('sha256').update(token).digest('hex')}`;
        try {
            await this.setMongoValue(key, '1', expiry);
            return true;
        } catch (err) {
            console.error('Failed to blacklist token:', err);
            return false;
        }
    }

    async isTokenBlacklisted(token) {
        const key = `blacklist:${crypto.createHash('sha256').update(token).digest('hex')}`;
        try {
            const result = await this.getMongoValue(key);
            return result === '1';
        } catch (err) {
            console.error('Failed to check token blacklist:', err);
            return false;
        }
    }

    async blacklistUserTokens(userId) {
        const pattern = `refresh_token:${userId}:`;
        try {
            await TokenRecord.deleteMany({ key: { $regex: `^${this.escapeRegex(pattern)}` } });
            return true;
        } catch (err) {
            console.error('Failed to blacklist user tokens:', err);
            return false;
        }
    }

    async storeRefreshToken(userId, jti, expiry) {
        const key = `refresh_token:${userId}:${jti}`;
        try {
            await this.setMongoValue(key, '1', expiry);
            return true;
        } catch (err) {
            console.error('Failed to store refresh token:', err);
            return false;
        }
    }

    async revokeRefreshToken(userId, jti) {
        const key = `refresh_token:${userId}:${jti}`;
        try {
            await TokenRecord.deleteOne({ key });
            return true;
        } catch (err) {
            console.error('Failed to revoke refresh token:', err);
            return false;
        }
    }

    async isRefreshTokenValid(userId, jti) {
        const key = `refresh_token:${userId}:${jti}`;
        try {
            const result = await this.getMongoValue(key);
            return result === '1';
        } catch (err) {
            console.error('Failed to validate refresh token:', err);
            return false;
        }
    }

    async setMongoValue(key, value, expirySeconds) {
        const expiresAt = new Date(Date.now() + Math.max(1, expirySeconds || 1) * 1000);
        await TokenRecord.updateOne(
            { key },
            { $set: { value, expiresAt } },
            { upsert: true }
        );
    }

    async getMongoValue(key) {
        const entry = await TokenRecord.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
        return entry?.value || null;
    }

    escapeRegex(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

export default new TokenBlacklistService();
