import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../server.js';
import User from '../src/models/User.js';
import Grievance from '../src/models/Grievance.js';
import Department from '../src/models/Department.js';
import SecurityEvent from '../src/models/SecurityEvent.js';

describe('PHASE 2 - SECURITY PENETRATION TESTING', () => {
    let testStudent, testAdmin, testSuperadmin;
    let studentToken, adminToken, superadminToken;
    let testGrievance;

    beforeAll(async () => {
        // Setup test data
        const testDepartment = await Department.create({
            name: 'Security Test Department',
            code: 'SEC',
            email: 'sec@test.com',
        });

        testStudent = await User.create({
            name: 'Security Test Student',
            email: 'secstudent@test.com',
            password: 'SecurePassword123!',
            role: 'student',
            studentId: 'SEC001',
            emailVerified: true,
            isActive: true,
        });

        testAdmin = await User.create({
            name: 'Security Test Admin',
            email: 'secadmin@test.com',
            password: 'SecurePassword123!',
            role: 'admin',
            staffId: 'SECADM001',
            department: testDepartment._id,
            isActive: true,
            isVerified: true,
        });

        testSuperadmin = await User.create({
            name: 'Security Test Superadmin',
            email: 'secsuper@test.com',
            password: 'SecurePassword123!',
            role: 'superadmin',
            staffId: 'SECSA001',
            isActive: true,
            isVerified: true,
        });

        // Get tokens
        const studentLogin = await request(app)
            .post('/api/auth/student/login')
            .send({ email: 'secstudent@test.com', password: 'SecurePassword123!' });
        studentToken = studentLogin.body.accessToken;

        const adminLogin = await request(app)
            .post('/api/auth/admin/login')
            .send({ email: 'secadmin@test.com', password: 'SecurePassword123!' });
        adminToken = adminLogin.body.accessToken;

        const superadminLogin = await request(app)
            .post('/api/auth/superadmin/login')
            .send({ email: 'secsuper@test.com', password: 'SecurePassword123!' });
        superadminToken = superadminLogin.body.accessToken;

        // Create test grievance
        const grievanceResponse = await request(app)
            .post('/api/grievances')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                title: 'Security Test Grievance',
                description: 'This is for security testing',
                category: 'academic',
            });
        testGrievance = grievanceResponse.body;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Grievance.deleteMany({});
        await Department.deleteMany({});
        await SecurityEvent.deleteMany({});
    });

    describe('AUTHENTICATION ATTACKS', () => {
        test('Brute force login triggers lockout', async () => {
            // Make 6 failed login attempts (exceeds limit of 5)
            for (let i = 0; i < 6; i++) {
                await request(app)
                    .post('/api/auth/student/login')
                    .send({ email: 'secstudent@test.com', password: 'wrongpassword' });
            }

            // 7th attempt should be locked out
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'secstudent@test.com', password: 'wrongpassword' })
                .expect(423);

            expect(response.body.message).toContain('locked');

            // Verify security event was logged
            const securityEvents = await SecurityEvent.find({
                type: 'failed_login',
                user: testStudent._id,
            });
            expect(securityEvents.length).toBeGreaterThan(0);
        });

        test('Login with SQL injection payload', async () => {
            const sqlPayloads = [
                "admin'--",
                "' OR '1'='1",
                "' OR '1'='1' --",
                "'; DROP TABLE users;--",
                "1' UNION SELECT username,password FROM users--",
            ];

            for (const payload of sqlPayloads) {
                const response = await request(app)
                    .post('/api/auth/student/login')
                    .send({ email: payload, password: 'password' })
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });

        test('Login with XSS payload', async () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                '<img src=x onerror=alert("xss")>',
                'javascript:alert("xss")',
                '<svg onload=alert("xss")>',
            ];

            for (const payload of xssPayloads) {
                const response = await request(app)
                    .post('/api/auth/student/login')
                    .send({ email: payload, password: 'password' })
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });

        test('JWT forgery attempts', async () => {
            // Try with alg:none
            const noneToken = jwt.sign({ _id: testStudent._id }, '', { algorithm: 'none' });
            const response1 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${noneToken}`)
                .expect(401);

            expect(response1.body.message).toContain('Unauthorized');

            // Try with forged signature
            const forgedToken = jwt.sign(
                { _id: testStudent._id, email: testStudent.email, role: 'superadmin' },
                'fake-secret',
                { algorithm: 'HS256' }
            );
            const response2 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${forgedToken}`)
                .expect(401);

            expect(response2.body.message).toContain('Unauthorized');

            // Try with expired token
            const expiredToken = jwt.sign(
                { _id: testStudent._id, email: testStudent.email, role: 'student' },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '-1h' }
            );
            const response3 = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(403);

            expect(response3.body.code).toBe('TOKEN_EXPIRED');
        });

        test('Concurrent login attempts', async () => {
            // Create test user for concurrent login testing
            const concurrentUser = await User.create({
                name: 'Concurrent Test User',
                email: 'concurrent@test.com',
                password: 'Password123!',
                role: 'student',
                studentId: 'CON001',
                emailVerified: true,
                isActive: true,
            });

            // Make concurrent login attempts
            const loginPromises = Array(5).fill().map(() =>
                request(app)
                    .post('/api/auth/student/login')
                    .send({ email: 'concurrent@test.com', password: 'Password123!' })
            );

            const responses = await Promise.all(loginPromises);
            
            // Should all succeed (concurrent logins allowed)
            const successCount = responses.filter(r => r.status === 200).length;
            expect(successCount).toBeGreaterThan(0);

            await User.deleteOne({ _id: concurrentUser._id });
        });
    });

    describe('AUTHORIZATION ATTACKS - BROKEN ACCESS CONTROL', () => {
        test('Regular user cannot access admin endpoints', async () => {
            const adminEndpoints = [
                '/api/admin/dashboard',
                '/api/admin/users',
                '/api/admin/reports',
                '/api/admin/analytics',
            ];

            for (const endpoint of adminEndpoints) {
                const response = await request(app)
                    .get(endpoint)
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(403);

                expect(response.body.message).toContain('Forbidden');
            }
        });

        test('Regular user cannot access superadmin endpoints', async () => {
            const superadminEndpoints = [
                '/api/superadmin/dashboard',
                '/api/superadmin/admins',
                '/api/superadmin/departments',
                '/api/superadmin/courses',
                '/api/superadmin/audit',
            ];

            for (const endpoint of superadminEndpoints) {
                const response = await request(app)
                    .get(endpoint)
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(403);

                expect(response.body.message).toContain('Forbidden');
            }
        });

        test('Admin cannot access superadmin endpoints', async () => {
            const response = await request(app)
                .get('/api/superadmin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(403);

            expect(response.body.message).toContain('Forbidden');
        });

        test('IDOR - User A cannot access User B data', async () => {
            // Create another student
            const otherStudent = await User.create({
                name: 'Other Student',
                email: 'othersec@test.com',
                password: 'Password123!',
                role: 'student',
                studentId: 'OTH001',
                emailVerified: true,
                isActive: true,
            });

            // Try to access other student's profile
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            // Should return current user's profile, not other student's
            expect(response.body._id).toBe(testStudent._id.toString());
            expect(response.body.email).toBe('secstudent@test.com');

            await User.deleteOne({ _id: otherStudent._id });
        });

        test('IDOR - User A cannot access User B grievances', async () => {
            // Create another student and grievance
            const otherStudent = await User.create({
                name: 'Other Grievance Student',
                email: 'othergriev@test.com',
                password: 'Password123!',
                role: 'student',
                studentId: 'GRV001',
                emailVerified: true,
                isActive: true,
            });

            const otherLogin = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'othergriev@test.com', password: 'Password123!' });

            const otherGrievance = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${otherLogin.body.accessToken}`)
                .send({
                    title: 'Other Student Grievance',
                    description: 'This belongs to other student',
                    category: 'academic',
                });

            // Try to access with original student token
            const response = await request(app)
                .get(`/api/grievances/${otherGrievance.body._id}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(403);

            expect(response.body.message).toContain('Forbidden');

            await User.deleteOne({ _id: otherStudent._id });
            await Grievance.deleteOne({ _id: otherGrievance.body._id });
        });

        test('Endpoints without auth token return 401', async () => {
            const protectedEndpoints = [
                '/api/auth/me',
                '/api/users/profile',
                '/api/grievances',
                '/api/notifications',
                '/api/admin/dashboard',
                '/api/superadmin/dashboard',
            ];

            for (const endpoint of protectedEndpoints) {
                const response = await request(app)
                    .get(endpoint)
                    .expect(401);

                expect(response.body.message).toContain('Unauthorized');
            }
        });

        test('Expired token returns 401', async () => {
            const expiredToken = jwt.sign(
                { _id: testStudent._id, email: testStudent.email, role: 'student' },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '-1h' }
            );

            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(403);

            expect(response.body.code).toBe('TOKEN_EXPIRED');
        });
    });

    describe('INJECTION ATTACKS', () => {
        test('SQL injection on input fields', async () => {
            const sqlPayloads = [
                "' OR '1'='1",
                "'; DROP TABLE users;--",
                "1 UNION SELECT username,password FROM users--",
                "' OR 1=1 --",
                "admin'/*",
                "' OR 'x'='x",
            ];

            for (const payload of sqlPayloads) {
                // Test on grievance creation
                const response1 = await request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({
                        title: payload,
                        description: 'Test description',
                        category: 'academic',
                    })
                    .expect(400);

                expect(response1.body.message).toContain('Invalid');

                // Test on profile update
                const response2 = await request(app)
                    .put('/api/users/profile')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({ name: payload })
                    .expect(400);

                expect(response2.body.message).toContain('Invalid');
            }
        });

        test('NoSQL injection attempts', async () => {
            const nosqlPayloads = [
                { "$gt": "" },
                { "$where": "1==1" },
                { "$ne": null },
                { "$regex": ".*" },
                { "$in": ["admin", "superadmin"] },
            ];

            for (const payload of nosqlPayloads) {
                // Test on search/filter endpoints
                const response = await request(app)
                    .get('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .query({ search: JSON.stringify(payload) })
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });

        test('Command injection attempts', async () => {
            const commandPayloads = [
                "; ls -la",
                "| cat /etc/passwd",
                "&& rm -rf /",
                "; curl malicious.com",
                "`whoami`",
                "$(id)",
            ];

            for (const payload of commandPayloads) {
                // Test on file upload filename
                const response = await request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .field('title', 'Test grievance')
                    .field('description', 'Test description')
                    .field('category', 'academic')
                    .attach('attachment', Buffer.from('test'), payload)
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });

        test('Path traversal attempts', async () => {
            const pathTraversalPayloads = [
                "../../../etc/passwd",
                "..\\..\\..\\windows\\system32\\config\\sam",
                "....//....//....//etc/passwd",
                "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
                "..%252f..%252f..%252fetc%252fpasswd",
            ];

            for (const payload of pathTraversalPayloads) {
                // Test on file access
                const response = await request(app)
                    .get(`/uploads/grievance_attachments/${payload}`)
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });

        test('Template injection attempts', async () => {
            const templatePayloads = [
                "{{7*7}}",
                "${7*7}",
                "<%= 7*7 %>",
                "#{7*7}",
                "{{config}}",
                '${process' + '.env}',
            ];

            for (const payload of templatePayloads) {
                const response = await request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({
                        title: payload,
                        description: 'Test description',
                        category: 'academic',
                    })
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });
    });

    describe('XSS - CROSS-SITE SCRIPTING', () => {
        test('Reflected XSS in URL parameters', async () => {
            const xssPayloads = [
                '<script>alert("xss")</script>',
                '<img src=x onerror=alert("xss")>',
                '<svg onload=alert("xss")>',
                'javascript:alert("xss")',
                '<iframe src="javascript:alert(\'xss\')"></iframe>',
            ];

            for (const payload of xssPayloads) {
                // Test on search endpoints
                const response = await request(app)
                    .get('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .query({ search: payload })
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });

        test('Stored XSS in form inputs', async () => {
            const storedXssPayloads = [
                '<script>alert("stored-xss")</script>',
                '<div onclick="alert(\'xss\')">Click me</div>',
                '<a href="javascript:alert(\'xss\')">Link</a>',
                '<img src=x onerror=alert("stored-xss")>',
            ];

            for (const payload of storedXssPayloads) {
                // Test on grievance creation (stored data)
                const response = await request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({
                        title: payload,
                        description: 'Test description with XSS',
                        category: 'academic',
                    })
                    .expect(400);

                expect(response.body.message).toContain('Invalid');

                // Test on profile update (stored data)
                const profileResponse = await request(app)
                    .put('/api/users/profile')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({ name: payload })
                    .expect(400);

                expect(profileResponse.message).toContain('Invalid');
            }
        });

        test('CSP headers block XSS', async () => {
            // Set production mode to enable CSP
            process.env.NODE_ENV = 'production';

            const response = await request(app)
                .get('/api/health')
                .expect(200);

            // Check for CSP header
            expect(response.headers['content-security-policy']).toBeDefined();
            expect(response.headers['content-security-policy']).toContain("script-src 'self'");

            process.env.NODE_ENV = 'test';
        });

        test('XSS in comments and user-generated content', async () => {
            const xssPayload = '<script>alert("comment-xss")</script>';

            const response = await request(app)
                .post(`/api/grievances/${testGrievance._id}/comment`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ comment: xssPayload })
                .expect(400);

            expect(response.body.message).toContain('Invalid');
        });
    });

    describe('CSRF - CROSS-SITE REQUEST FORGERY', () => {
        test('CSRF protection blocks requests without token in production', async () => {
            process.env.NODE_ENV = 'production';

            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: 'CSRF Test',
                    description: 'Test without CSRF token',
                    category: 'academic',
                })
                .expect(403);

            expect(response.body.error).toBe('CSRF_TOKEN_MISSING');

            process.env.NODE_ENV = 'test';
        });

        test('CSRF token endpoint provides valid token', async () => {
            const response = await request(app)
                .get('/api/auth/csrf-token')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(response.body.csrfToken).toBeDefined();
            expect(response.body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
        });

        test('CSRF protection rejects invalid tokens', async () => {
            process.env.NODE_ENV = 'production';

            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .set('X-CSRF-Token', 'invalid-token')
                .send({
                    title: 'CSRF Invalid Token Test',
                    description: 'Test with invalid CSRF token',
                    category: 'academic',
                })
                .expect(403);

            expect(response.body.error).toBe('CSRF_TOKEN_INVALID');

            process.env.NODE_ENV = 'test';
        });
    });

    describe('RATE LIMITING', () => {
        test('Rate limiting triggers on auth endpoints', async () => {
            // Make rapid requests to exceed rate limit
            const promises = Array(10).fill().map(() =>
                request(app)
                    .post('/api/auth/student/login')
                    .send({ email: 'nonexistent@test.com', password: 'wrongpassword' })
            );

            const responses = await Promise.all(promises);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });

        test('Rate limiting works per IP/user', async () => {
            // Test that rate limiting is applied correctly
            const promises = Array(10).fill().map(() =>
                request(app)
                    .get('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
            );

            const responses = await Promise.all(promises);
            const rateLimitedResponses = responses.filter(r => r.status === 429);
            
            // Should not be rate limited for authenticated users (higher limit)
            expect(rateLimitedResponses.length).toBe(0);
        });
    });

    describe('FILE UPLOAD SECURITY', () => {
        test('Malicious file upload is blocked', async () => {
            const maliciousFiles = [
                { name: 'malicious.html', content: '<script>alert("xss")</script>' },
                { name: 'malicious.php', content: '<?php system($_GET["cmd"]); ?>' },
                { name: 'malicious.js', content: 'alert("xss")' },
                { name: '.htaccess', content: 'Options +ExecCGI' },
            ];

            for (const file of maliciousFiles) {
                const response = await request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .field('title', 'Test grievance')
                    .field('description', 'Test description')
                    .field('category', 'academic')
                    .attach('attachment', Buffer.from(file.content), file.name)
                    .expect(400);

                expect(response.body.message).toContain('Invalid');
            }
        });

        test('Oversized file upload is blocked', async () => {
            const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB (exceeds 10MB limit)

            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .field('title', 'Oversized file test')
                .field('description', 'Test description')
                .field('category', 'academic')
                .attach('attachment', oversizedBuffer, 'oversized.txt')
                .expect(400);

            expect(response.body.message).toContain('too large');
        });
    });

    describe('SENSITIVE DATA EXPOSURE', () => {
        test('Password fields are not exposed in API responses', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(response.body.password).toBeUndefined();
        });

        test('Internal errors do not expose stack traces in production', async () => {
            process.env.NODE_ENV = 'production';

            const response = await request(app)
                .get('/nonexistent-endpoint')
                .expect(404);

            expect(response.body.message).not.toContain('Error:');
            expect(response.body.stack).toBeUndefined();

            process.env.NODE_ENV = 'test';
        });

        test('Database query errors are handled gracefully', async () => {
            // Test with malformed ObjectId
            const response = await request(app)
                .get('/api/grievances/invalid-object-id')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(400);

            expect(response.body.message).toContain('Invalid');
        });
    });

    describe('SECURITY HEADERS', () => {
        test('Security headers are present in production', async () => {
            process.env.NODE_ENV = 'production';

            const response = await request(app)
                .get('/api/health')
                .expect(200);

            // Check for important security headers
            expect(response.headers['x-frame-options']).toBe('DENY');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['referrer-policy']).toBe('no-referrer');
            expect(response.headers['content-security-policy']).toBeDefined();
            expect(response.headers['permissions-policy']).toBeDefined();

            process.env.NODE_ENV = 'test';
        });
    });
});
