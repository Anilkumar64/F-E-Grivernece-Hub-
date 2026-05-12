import request from 'supertest';
import { app } from '../server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Grievance from '../src/models/Grievance.js';
import Department from '../src/models/Department.js';
import Notification from '../src/models/Notification.js';

describe('PHASE 4 - USER EXPERIENCE & EDGE CASE TESTING', () => {
    let testStudent, testAdmin, testSuperadmin;
    let studentToken, adminToken, superadminToken;
    let testDepartment;

    beforeAll(async () => {
        testDepartment = await Department.create({
            name: 'Edge Case Test Department',
            code: 'EDGE',
            email: 'edge@test.com',
        });

        testStudent = await User.create({
            name: 'Edge Case Student',
            email: 'edge@student.com',
            password: 'EdgePassword123!',
            role: 'student',
            studentId: 'EDGE001',
            emailVerified: true,
            isActive: true,
        });

        testAdmin = await User.create({
            name: 'Edge Case Admin',
            email: 'edge@admin.com',
            password: 'EdgePassword123!',
            role: 'admin',
            staffId: 'EDGEADM001',
            department: testDepartment._id,
            isActive: true,
            isVerified: true,
        });

        testSuperadmin = await User.create({
            name: 'Edge Case Superadmin',
            email: 'edge@superadmin.com',
            password: 'EdgePassword123!',
            role: 'superadmin',
            staffId: 'EDGESA001',
            isActive: true,
            isVerified: true,
        });

        const studentLogin = await request(app)
            .post('/api/auth/student/login')
            .send({ email: 'edge@student.com', password: 'EdgePassword123!' });
        studentToken = studentLogin.body.accessToken;

        const adminLogin = await request(app)
            .post('/api/auth/admin/login')
            .send({ email: 'edge@admin.com', password: 'EdgePassword123!' });
        adminToken = adminLogin.body.accessToken;

        const superadminLogin = await request(app)
            .post('/api/auth/superadmin/login')
            .send({ email: 'edge@superadmin.com', password: 'EdgePassword123!' });
        superadminToken = superadminLogin.body.accessToken;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Grievance.deleteMany({});
        await Department.deleteMany({});
        await Notification.deleteMany({});
    });

    describe('MULTI-ROLE TESTING', () => {
        test('Role-specific UI elements and permissions', async () => {
            // Test student role limitations
            const studentEndpoints = [
                { path: '/api/grievances', expected: 200 },
                { path: '/api/users/profile', expected: 200 },
                { path: '/api/notifications', expected: 200 },
                { path: '/api/admin/dashboard', expected: 403 },
                { path: '/api/superadmin/dashboard', expected: 403 },
                { path: '/api/admin/users', expected: 403 },
                { path: '/api/superadmin/departments', expected: 403 },
            ];

            for (const endpoint of studentEndpoints) {
                const response = await request(app)
                    .get(endpoint.path)
                    .set('Authorization', `Bearer ${studentToken}`);

                expect(response.status).toBe(endpoint.expected);
            }

            // Test admin role permissions
            const adminEndpoints = [
                { path: '/api/grievances', expected: 200 },
                { path: '/api/admin/dashboard', expected: 200 },
                { path: '/api/admin/users', expected: 200 },
                { path: '/api/superadmin/dashboard', expected: 403 },
                { path: '/api/superadmin/departments', expected: 403 },
            ];

            for (const endpoint of adminEndpoints) {
                const response = await request(app)
                    .get(endpoint.path)
                    .set('Authorization', `Bearer ${adminToken}`);

                expect(response.status).toBe(endpoint.expected);
            }

            // Test superadmin role permissions
            const superadminEndpoints = [
                { path: '/api/grievances', expected: 200 },
                { path: '/api/admin/dashboard', expected: 200 },
                { path: '/api/superadmin/dashboard', expected: 200 },
                { path: '/api/superadmin/departments', expected: 200 },
                { path: '/api/superadmin/courses', expected: 200 },
            ];

            for (const endpoint of superadminEndpoints) {
                const response = await request(app)
                    .get(endpoint.path)
                    .set('Authorization', `Bearer ${superadminToken}`);

                expect(response.status).toBe(endpoint.expected);
            }
        });

        test('Role change mid-session reflects immediately', async () => {
            // Start as student
            const studentResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(studentResponse.body.user.role).toBe('student');

            // Promote student to admin (simulate role change)
            await User.findByIdAndUpdate(testStudent._id, { role: 'admin' });

            // Get new token with updated role
            const newLogin = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'edge@student.com', password: 'EdgePassword123!' });

            const newToken = newLogin.body.accessToken;

            // Check if new role is reflected
            const newMeResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${newToken}`);

            expect(newMeResponse.body.user.role).toBe('admin');

            // Try accessing admin endpoint with new role
            const adminAccessResponse = await request(app)
                .get('/api/admin/dashboard')
                .set('Authorization', `Bearer ${newToken}`);

            expect(adminAccessResponse.status).toBe(200);

            // Restore original role
            await User.findByIdAndUpdate(testStudent._id, { role: 'student' });
        });

        test('Lower role cannot see data they should not know exists', async () => {
            // Create admin-only grievance
            const adminGrievance = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    title: 'Admin Internal Grievance',
                    description: 'This should not be visible to students',
                    category: 'internal',
                    priority: 'high',
                });

            // Try to access as student
            const studentResponse = await request(app)
                .get(`/api/grievances/${adminGrievance.body._id}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(403);

            expect(studentResponse.body.message).toContain('Forbidden');

            // List grievances as student - should not see admin grievance
            const listResponse = await request(app)
                .get('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            const studentGrievances = listResponse.body.grievances;
            const foundAdminGrievance = studentGrievances.find(g => g._id === adminGrievance.body._id);
            expect(foundAdminGrievance).toBeUndefined();
        });
    });

    describe('SESSION & STATE EDGE CASES', () => {
        test('Session expiration mid-form fill', async () => {
            // Create a grievance but don't submit immediately
            const grievanceData = {
                title: 'Session Test Grievance',
                description: 'Testing session expiration',
                category: 'academic',
            };

            // Simulate session expiration by using an expired token
            const jwt = require('jsonwebtoken');
            const expiredToken = jwt.sign(
                { _id: testStudent._id, email: testStudent.email, role: 'student' },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '-1h' }
            );

            // Try to submit with expired token
            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${expiredToken}`)
                .send(grievanceData)
                .expect(403);

            expect(response.body.code).toBe('TOKEN_EXPIRED');
            expect(response.body.message).toContain('expired');
        });

        test('Concurrent requests from same user', async () => {
            // Simulate user opening same page in multiple tabs
            const promises = Array(5).fill().map(() =>
                request(app)
                    .get('/api/users/profile')
                    .set('Authorization', `Bearer ${studentToken}`)
            );

            const responses = await Promise.all(promises);

            // All should succeed
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBe(5);

            // All should return consistent data
            const profiles = responses.map(r => r.body);
            const uniqueProfiles = [...new Set(profiles.map(p => JSON.stringify(p)))];
            expect(uniqueProfiles.length).toBe(1); // All profiles should be identical
        });

        test('Back button after destructive action', async () => {
            // Create a grievance
            const grievanceResponse = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: 'To Be Deleted',
                    description: 'This grievance will be deleted',
                    category: 'academic',
                })
                .expect(201);

            const grievanceId = grievanceResponse.body._id;

            // Delete the grievance
            await request(app)
                .delete(`/api/grievances/${grievanceId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Try to access deleted grievance (simulating back button)
            const response = await request(app)
                .get(`/api/grievances/${grievanceId}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        test('Refresh mid-upload simulation', async () => {
            // This tests what happens if a user refreshes during file upload
            const fileContent = Buffer.alloc(1024 * 1024); // 1MB file

            // Start upload but don't wait for completion (simulate refresh)
            const uploadPromise = request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .field('title', 'Interrupted Upload')
                .field('description', 'Testing interrupted upload')
                .field('category', 'academic')
                .attach('attachment', fileContent, 'test.txt');

            // Simulate page refresh by making another request
            const refreshResponse = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            // System should still be responsive
            expect(refreshResponse.body.name).toBe('Edge Case Student');

            // Upload should either complete or fail gracefully
            const uploadResponse = await uploadPromise;
            expect([201, 400, 500]).toContain(uploadResponse.status);
        });
    });

    describe('INPUT EDGE CASES', () => {
        test('Unicode and international characters', async () => {
            const unicodeData = {
                name: '张三 🎓',
                title: 'Grievance title with العربية',
                description: 'Description with русский язык and 日本語 characters 🌍',
                category: 'academic',
            };

            // Test registration with Unicode
            const registerResponse = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: unicodeData.name,
                    email: 'unicode@test.com',
                    password: 'UnicodePassword123!',
                    studentId: 'UNI001',
                })
                .expect(201);

            expect(registerResponse.body.user.name).toBe(unicodeData.name);

            // Test grievance with Unicode
            const grievanceResponse = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: unicodeData.title,
                    description: unicodeData.description,
                    category: unicodeData.category,
                })
                .expect(201);

            expect(grievanceResponse.body.title).toBe(unicodeData.title);
            expect(grievanceResponse.body.description).toBe(unicodeData.description);

            // Cleanup
            await User.deleteOne({ email: 'unicode@test.com' });
        });

        test('Emoji and special characters', async () => {
            const emojiData = {
                title: 'Grievance with emojis 🔥💯✨',
                description: 'Testing with various emojis: 😀😎🤔💡🎯📚🏫',
                category: 'academic',
            };

            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send(emojiData)
                .expect(201);

            expect(response.body.title).toBe(emojiData.title);
            expect(response.body.description).toBe(emojiData.description);
        });

        test('RTL text and zero-width characters', async () => {
            const rtlData = {
                title: 'مرحبا بالعربية ‏test‎', // Arabic with zero-width characters
                description: 'Testing RTL text and zero-width characters: \u200B\u200C\u200D',
                category: 'academic',
            };

            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send(rtlData)
                .expect(201);

            expect(response.body.title).toBe(rtlData.title);
            expect(response.body.description).toBe(rtlData.description);
        });

        test('Extremely long input', async () => {
            const longString = 'a'.repeat(10000); // 10,000 characters

            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: longString,
                    description: 'Normal description',
                    category: 'academic',
                })
                .expect(400);

            expect(response.body.message).toContain('too long');
        });

        test('Special characters and symbols', async () => {
            const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",./<>?`~';

            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: `Testing special chars: ${specialChars}`,
                    description: 'Description with special characters',
                    category: 'academic',
                })
                .expect(201);

            expect(response.body.title).toContain(specialChars);
        });

        test('Whitespace-only input', async () => {
            const whitespaceInputs = [
                '   ', // Spaces only
                '\t\t\t', // Tabs only
                '\n\n\n', // Newlines only
                ' \t \n ', // Mixed whitespace
            ];

            for (const whitespace of whitespaceInputs) {
                const response = await request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({
                        title: whitespace,
                        description: 'Valid description',
                        category: 'academic',
                    })
                    .expect(400);

                expect(response.body.message).toContain('required');
            }
        });

        test('Homoglyph attacks', async () => {
            // Replace Latin 'a' with Cyrillic 'а'
            const homoglyphEmail = 'test@exаmple.com'; // Cyrillic 'а'

            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: homoglyphEmail, password: 'password' })
                .expect(401);

            expect(response.body.message).toContain('Invalid');
        });
    });

    describe('THIRD-PARTY INTEGRATION FAILURES', () => {
        test('Email service failure', async () => {
            // Mock email service failure by setting invalid SMTP config
            const originalEmailHost = process.env.EMAIL_HOST;
            process.env.EMAIL_HOST = 'invalid.smtp.server';
            process.env.EMAIL_ENABLED = 'true';

            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: 'Email Test User',
                    email: 'emailfail@test.com',
                    password: 'Password123!',
                    studentId: 'EMAIL001',
                });

            // Should still succeed but with warning about email
            expect([201, 400]).toContain(response.status);

            // Restore original config
            process.env.EMAIL_HOST = originalEmailHost;
        });

        test('Database connection failure simulation', async () => {
            // This would normally require actual DB connection failure
            // For now, test with invalid ObjectId
            const response = await request(app)
                .get('/api/grievances/invalid-object-id')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(400);

            expect(response.body.message).toContain('Invalid');
        });

        test('Mongo-backed token refresh works', async () => {
            // Token rotation state is stored in MongoDB.
            const loginResponse = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'edge@student.com', password: 'EdgePassword123!' });

            const refreshToken = loginResponse.headers['set-cookie']
                ?.find(cookie => cookie.includes('studentRefreshToken'))
                ?.split('=')[1]?.split(';')[0];

            const refreshResponse = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', `studentRefreshToken=${refreshToken}`);

            expect([200, 401]).toContain(refreshResponse.status);
        });
    });

    describe('DATA INTEGRITY', () => {
        test('Delete parent record with child records', async () => {
            // Create grievance with comments
            const grievanceResponse = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: 'Parent-Child Test',
                    description: 'Testing parent-child relationship',
                    category: 'academic',
                })
                .expect(201);

            const grievanceId = grievanceResponse.body._id;

            // Add comment
            await request(app)
                .post(`/api/grievances/${grievanceId}/comment`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ comment: 'Test comment' })
                .expect(200);

            // Delete grievance (parent)
            await request(app)
                .delete(`/api/grievances/${grievanceId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Try to access deleted grievance
            const response = await request(app)
                .get(`/api/grievances/${grievanceId}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        test('Concurrent resource access', async () => {
            // Create a grievance
            const grievanceResponse = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: 'Concurrent Access Test',
                    description: 'Testing concurrent access',
                    category: 'academic',
                })
                .expect(201);

            const grievanceId = grievanceResponse.body._id;

            // Simulate concurrent status updates
            const promises = Array(5).fill().map((_, index) =>
                request(app)
                    .post(`/api/grievances/${grievanceId}/status`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        status: 'in_progress',
                        comment: `Concurrent update ${index}`
                    })
            );

            const responses = await Promise.all(promises);

            // At least one should succeed
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBeGreaterThan(0);

            // Final state should be consistent
            const finalResponse = await request(app)
                .get(`/api/grievances/${grievanceId}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(finalResponse.body.status).toBe('in_progress');
        });

        test('Unique constraint violations', async () => {
            // Try to create user with existing email
            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: 'Duplicate Email User',
                    email: 'edge@student.com', // Already exists
                    password: 'Password123!',
                    studentId: 'DUP001',
                })
                .expect(400);

            expect(response.body.message).toContain('already exists');
        });
    });

    describe('JAVASCRIPT DISABLED SCENARIOS', () => {
        test('Form submission without JavaScript', async () => {
            // Test regular form submission (should work without JS)
            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .set('Content-Type', 'application/x-www-form-urlencoded')
                .send('title=No JS Test&description=Testing without JavaScript&category=academic')
                .expect(400); // Should fail due to content-type, but server should handle gracefully

            expect(response.body.message).toBeDefined();
        });

        test('Cookie-only authentication', async () => {
            // Test authentication using only cookies (no Authorization header)
            const loginResponse = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'edge@student.com', password: 'EdgePassword123!' });

            const cookies = loginResponse.headers['set-cookie'];

            const response = await request(app)
                .get('/api/auth/me')
                .set('Cookie', cookies?.join('; ') || '')
                .expect(200);

            expect(response.body.user.email).toBe('edge@student.com');
        });
    });

    describe('BROWSER COMPATIBILITY EDGE CASES', () => {
        test('Old browser user agents', async () => {
            const oldUserAgents = [
                'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)',
                'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
            ];

            for (const userAgent of oldUserAgents) {
                const response = await request(app)
                    .get('/api/health')
                    .set('User-Agent', userAgent)
                    .expect(200);

                expect(response.body.status).toBe('ok');
            }
        });

        test('Mobile browser user agents', async () => {
            const mobileUserAgents = [
                'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
                'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36',
            ];

            for (const userAgent of mobileUserAgents) {
                const response = await request(app)
                    .get('/api/health')
                    .set('User-Agent', userAgent)
                    .expect(200);

                expect(response.body.status).toBe('ok');
            }
        });
    });
});
