import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server.js';
import User from '../src/models/User.js';
import SecurityEvent from '../src/models/SecurityEvent.js';

describe('Security Tests', () => {
    let testUser;
    let authToken;
    let refreshToken;

    beforeAll(async () => {
        // Create test user
        testUser = await User.create({
            name: 'Security Test User',
            email: 'security@test.com',
            password: 'SecureTestPassword123!',
            role: 'student',
            studentId: 'SEC001',
            isActive: true,
            isVerified: true,
        });

        // Get auth token
        const loginRes = await request(app)
            .post('/api/auth/student/login')
            .send({
                email: 'security@test.com',
                password: 'SecureTestPassword123!',
            });

        authToken = loginRes.body.accessToken;
        refreshToken = loginRes.headers['set-cookie']?.find(cookie => 
            cookie.includes('studentRefreshToken')
        )?.split('=')[1]?.split(';')[0];
    });

    afterAll(async () => {
        await User.deleteOne({ _id: testUser._id });
        await SecurityEvent.deleteMany({ user: testUser._id });
    });

    describe('Authentication Security', () => {
        test('Should reject requests with invalid JWT token', async () => {
            const invalidToken = jwt.sign({ _id: 'invalid' }, 'invalid-secret');
            
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect(401);

            expect(response.body.message).toContain('Unauthorized');
        });

        test('Should reject requests with expired JWT token', async () => {
            const expiredToken = jwt.sign(
                { _id: testUser._id, email: testUser.email, role: testUser.role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '-1h' }
            );

            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(403);

            expect(response.body.code).toBe('TOKEN_EXPIRED');
        });

        test('Should enforce rate limiting on auth endpoints', async () => {
            const promises = Array(10).fill().map(() =>
                request(app)
                    .post('/api/auth/student/login')
                    .send({
                        email: 'nonexistent@test.com',
                        password: 'wrongpassword',
                    })
            );

            const responses = await Promise.all(promises);
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });

        test('Should lock account after multiple failed login attempts', async () => {
            const lockoutUser = await User.create({
                name: 'Lockout Test User',
                email: 'lockout@test.com',
                password: 'Password123!',
                role: 'student',
                studentId: 'LOCK001',
            });

            // Attempt 6 failed logins (exceeds limit of 5)
            for (let i = 0; i < 6; i++) {
                await request(app)
                    .post('/api/auth/student/login')
                    .send({
                        email: 'lockout@test.com',
                        password: 'wrongpassword',
                    });
            }

            // Try to login with correct password - should be locked
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({
                    email: 'lockout@test.com',
                    password: 'Password123!',
                })
                .expect(423);

            expect(response.body.message).toContain('locked');

            await User.deleteOne({ _id: lockoutUser._id });
        });
    });

    describe('Input Validation Security', () => {
        test('Should reject XSS attempts in input', async () => {
            const xssPayload = '<script>alert("xss")</script>';
            
            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: xssPayload,
                    description: 'Test grievance',
                    category: 'academic',
                })
                .expect(400);

            expect(response.body.message).toContain('Invalid');
        });

        test('Should reject SQL injection attempts', async () => {
            const sqlPayload = "'; DROP TABLE users; --";
            
            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test grievance',
                    description: sqlPayload,
                    category: 'academic',
                })
                .expect(400);

            expect(response.body.message).toContain('Invalid');
        });

        test('Should reject path traversal attempts', async () => {
            const pathTraversalPayload = '../../../etc/passwd';
            
            const response = await request(app)
                .get(`/uploads/grievance_attachments/${pathTraversalPayload}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(response.body.message).toContain('Invalid');
        });
    });

    describe('CSRF Protection', () => {
        test('Should reject state-changing requests without CSRF token in production', async () => {
            process.env.NODE_ENV = 'production';
            
            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'Test grievance',
                    description: 'Test description',
                    category: 'academic',
                })
                .expect(403);

            expect(response.body.error).toBe('CSRF_TOKEN_MISSING');
            
            process.env.NODE_ENV = 'test';
        });

        test('Should provide CSRF token endpoint', async () => {
            const response = await request(app)
                .get('/api/auth/csrf-token')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.csrfToken).toBeDefined();
            expect(response.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('Security Headers', () => {
        test('Should include security headers in production', async () => {
            process.env.NODE_ENV = 'production';
            
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['referrer-policy']).toBe('no-referrer');
            
            process.env.NODE_ENV = 'test';
        });
    });

    describe('Token Security', () => {
        test('Should implement proper token rotation', async () => {
            const refreshResponse = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', `studentRefreshToken=${refreshToken}`)
                .expect(200);

            expect(refreshResponse.body.accessToken).toBeDefined();
            expect(refreshResponse.body.accessToken).not.toBe(authToken);
        });

        test('Should blacklist tokens on logout', async () => {
            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Try to use the same token - should be rejected
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(401);

            expect(response.body.message).toContain('revoked');
        });
    });

    describe('Error Handling Security', () => {
        test('Should not expose stack traces in production', async () => {
            process.env.NODE_ENV = 'production';
            
            const response = await request(app)
                .get('/nonexistent-endpoint')
                .expect(404);

            expect(response.body.message).not.toContain('Error:');
            expect(response.body.stack).toBeUndefined();
            
            process.env.NODE_ENV = 'test';
        });

        test('Should include request ID in error responses', async () => {
            const response = await request(app)
                .get('/nonexistent-endpoint')
                .expect(404);

            expect(response.body.requestId).toBeDefined();
        });
    });

    describe('Security Event Logging', () => {
        test('Should log security events', async () => {
            // Trigger a security event
            await request(app)
                .post('/api/auth/student/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'wrongpassword',
                });

            // Check if event was logged
            const events = await SecurityEvent.find({
                type: 'failed_login',
                user: null,
            });

            expect(events.length).toBeGreaterThan(0);
            expect(events[0].ip).toBeDefined();
            expect(events[0].userAgent).toBeDefined();
        });
    });

    describe('CORS Security', () => {
        test('Should reject requests from unauthorized origins', async () => {
            process.env.ALLOWED_ORIGINS = 'https://example.com';
            
            const response = await request(app)
                .get('/api/health')
                .set('Origin', 'https://malicious.com')
                .expect(403);

            expect(response.text).toContain('CORS');
            
            process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
        });
    });

    describe('Password Security', () => {
        test('Should enforce strong password requirements', async () => {
            const weakPasswords = [
                'password',      // Common password
                '12345678',      // Only numbers
                'abcdefgh',      // Only lowercase
                'ABCDEFGH',      // Only uppercase
                'Abc123',        // Too short
                'Password123',   // No special character
            ];

            for (const password of weakPasswords) {
                const response = await request(app)
                    .post('/api/auth/student/register')
                    .send({
                        name: 'Test User',
                        email: `test${Math.random()}@test.com`,
                        password,
                        studentId: `TEST${Math.random()}`,
                    })
                    .expect(400);

                expect(response.body.message).toContain('password');
            }
        });
    });
});
