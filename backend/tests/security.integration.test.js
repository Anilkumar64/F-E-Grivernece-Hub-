import request from 'supertest';
import { app } from '../server.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

describe('Security Integration Tests', () => {
    describe('Complete Authentication Flow Security', () => {
        test('Should maintain security throughout full user lifecycle', async () => {
            const userData = {
                name: 'Integration Test User',
                email: `integration${Date.now()}@test.com`,
                password: 'SecureIntegrationTest123!',
                studentId: `INT${Date.now()}`,
            };

            // 1. Register user
            const registerResponse = await request(app)
                .post('/api/auth/student/register')
                .send(userData)
                .expect(201);

            expect(registerResponse.body.userId).toBeDefined();

            // 2. Login with correct credentials
            const loginResponse = await request(app)
                .post('/api/auth/student/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                })
                .expect(200);

            const { accessToken, user } = loginResponse.body;
            expect(accessToken).toBeDefined();
            expect(user.email).toBe(userData.email.toLowerCase());

            // 3. Access protected endpoint
            const meResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(meResponse.body.user.email).toBe(userData.email.toLowerCase());

            // 4. Refresh token
            const refreshResponse = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', loginResponse.headers['set-cookie'].find(c => c.includes('studentRefreshToken')))
                .expect(200);

            expect(refreshResponse.body.accessToken).toBeDefined();
            expect(refreshResponse.body.accessToken).not.toBe(accessToken);

            // 5. Logout
            await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
                .expect(200);

            // 6. Verify old tokens are invalidated
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
                .expect(401);

            // Cleanup
            await mongoose.connection.db.collection('users').deleteOne({ email: userData.email.toLowerCase() });
        });
    });

    describe('Concurrent Security', () => {
        test('Should handle concurrent requests safely', async () => {
            const loginPromises = Array(20).fill().map(() =>
                request(app)
                    .post('/api/auth/student/login')
                    .send({
                        email: 'nonexistent@test.com',
                        password: 'wrongpassword',
                    })
            );

            const responses = await Promise.all(loginPromises);
            
            // Should not crash the server
            expect(responses.every(r => [401, 429].includes(r.status))).toBe(true);
            
            // Rate limiting should kick in
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            expect(rateLimitedCount).toBeGreaterThan(0);
        });
    });

    describe('Memory and Resource Security', () => {
        test('Should not leak memory on repeated failed auth attempts', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // Perform many failed login attempts
            for (let i = 0; i < 100; i++) {
                await request(app)
                    .post('/api/auth/student/login')
                    .send({
                        email: `test${i}@test.com`,
                        password: 'wrongpassword',
                    });
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // Memory increase should be reasonable (less than 50MB)
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        });
    });

    describe('Database Security', () => {
        test('Should prevent NoSQL injection', async () => {
            const maliciousPayload = {
                email: { $ne: null },
                password: { $ne: null },
            };

            const response = await request(app)
                .post('/api/auth/student/login')
                .send(maliciousPayload)
                .expect(400);

            expect(response.body.message).toContain('required');
        });

        test('Should sanitize query parameters', async () => {
            const maliciousQuery = '?email[$ne]=null&password[$ne]=null';
            
            const response = await request(app)
                .get(`/api/grievances${maliciousQuery}`)
                .set('Authorization', `Bearer ${jwt.sign({ _id: 'fake' }, process.env.ACCESS_TOKEN_SECRET)}`)
                .expect(401);

            // Should not expose database information
            expect(response.body.message).not.toContain('$');
        });
    });

    describe('Session Security', () => {
        test('Should invalidate all sessions on password change', async () => {
            // Create user and login
            const userData = {
                name: 'Session Test User',
                email: `session${Date.now()}@test.com`,
                password: 'OriginalPassword123!',
                studentId: `SES${Date.now()}`,
            };

            await request(app)
                .post('/api/auth/student/register')
                .send(userData);

            const loginResponse = await request(app)
                .post('/api/auth/student/login')
                .send({
                    email: userData.email,
                    password: userData.password,
                })
                .expect(200);

            const originalToken = loginResponse.body.accessToken;

            // Change password (this would require a password change endpoint)
            // For now, simulate by updating user directly
            await mongoose.connection.db.collection('users').updateOne(
                { email: userData.email.toLowerCase() },
                { $set: { password: 'NewPassword123!' } }
            );

            // Old token should be invalid
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${originalToken}`)
                .expect(401);

            // Cleanup
            await mongoose.connection.db.collection('users').deleteOne({ email: userData.email.toLowerCase() });
        });
    });

    describe('File Upload Security', () => {
        test('Should prevent malicious file uploads', async () => {
            const maliciousFile = Buffer.from('<script>alert("xss")</script>');
            
            const response = await request(app)
                .post('/api/grievances')
                .field('title', 'Test grievance')
                .field('description', 'Test description')
                .field('category', 'academic')
                .attach('attachment', maliciousFile, 'malicious.html')
                .expect(400);

            expect(response.body.message).toContain('Invalid');
        });
    });

    describe('API Security', () => {
        test('Should reject requests with missing required headers', async () => {
            const response = await request(app)
                .post('/api/grievances')
                .send({
                    title: 'Test grievance',
                    description: 'Test description',
                    category: 'academic',
                })
                .expect(401);

            expect(response.body.message).toContain('Unauthorized');
        });

        test('Should handle malformed JSON gracefully', async () => {
            const response = await request(app)
                .post('/api/grievances')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);

            expect(response.body.message).toBeDefined();
        });
    });

    describe('Rate Limiting Integration', () => {
        test('Should apply different rate limits to different endpoints', async () => {
            // Test auth endpoint (5 req/min)
            const authPromises = Array(10).fill().map(() =>
                request(app)
                    .post('/api/auth/student/login')
                    .send({ email: 'test@test.com', password: 'wrong' })
            );

            const authResponses = await Promise.all(authPromises);
            const authRateLimited = authResponses.filter(r => r.status === 429).length;
            expect(authRateLimited).toBeGreaterThan(0);

            // Test API endpoint (100 req/min) - should not be rate limited with 10 requests
            const apiPromises = Array(10).fill().map(() =>
                request(app)
                    .get('/api/health')
            );

            const apiResponses = await Promise.all(apiPromises);
            const apiRateLimited = apiResponses.filter(r => r.status === 429).length;
            expect(apiRateLimited).toBe(0);
        });
    });

    describe('Error Consistency', () => {
        test('Should return consistent error format across endpoints', async () => {
            const endpoints = [
                { method: 'get', path: '/api/auth/me' },
                { method: 'post', path: '/api/grievances' },
                { method: 'get', path: '/api/users/profile' },
            ];

            for (const endpoint of endpoints) {
                const response = await request(app)[endpoint.method](endpoint.path);
                
                if (response.status >= 400) {
                    expect(response.body).toHaveProperty('message');
                    expect(response.body).toHaveProperty('requestId');
                    expect(response.body).toHaveProperty('timestamp');
                }
            }
        });
    });
});
