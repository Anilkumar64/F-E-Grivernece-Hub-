import request from 'supertest';
import { app } from '../server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Grievance from '../src/models/Grievance.js';
import Department from '../src/models/Department.js';
import Course from '../src/models/Course.js';
import Notification from '../src/models/Notification.js';

describe('PHASE 1 - FUNCTIONAL TESTING', () => {
    let testStudent, testAdmin, testSuperadmin;
    let testDepartment, testCourse;
    let studentToken, adminToken, superadminToken;
    let testGrievance;

    beforeAll(async () => {
        // Create test department
        testDepartment = await Department.create({
            name: 'Computer Science',
            code: 'CS',
            description: 'Computer Science Department',
            email: 'cs@university.edu',
            phone: '123-456-7890',
        });

        // Create test course
        testCourse = await Course.create({
            name: 'Computer Science',
            code: 'CS101',
            department: testDepartment._id,
            duration: 4,
        });

        // Create test student
        testStudent = await User.create({
            name: 'Test Student',
            email: 'student@test.com',
            password: 'TestPassword123!',
            role: 'student',
            studentId: 'STU001',
            department: testDepartment._id,
            course: testCourse._id,
            admissionYear: 2023,
            emailVerified: true,
            isActive: true,
        });

        // Create test admin
        testAdmin = await User.create({
            name: 'Test Admin',
            email: 'admin@test.com',
            password: 'AdminPassword123!',
            role: 'admin',
            staffId: 'ADM001',
            department: testDepartment._id,
            isActive: true,
            isVerified: true,
        });

        // Create test superadmin
        testSuperadmin = await User.create({
            name: 'Test Superadmin',
            email: 'superadmin@test.com',
            password: 'SuperPassword123!',
            role: 'superadmin',
            staffId: 'SA001',
            isActive: true,
            isVerified: true,
        });

        // Get auth tokens
        const studentLogin = await request(app)
            .post('/api/auth/student/login')
            .send({ email: 'student@test.com', password: 'TestPassword123!' });
        studentToken = studentLogin.body.accessToken;

        const adminLogin = await request(app)
            .post('/api/auth/admin/login')
            .send({ email: 'admin@test.com', password: 'AdminPassword123!' });
        adminToken = adminLogin.body.accessToken;

        const superadminLogin = await request(app)
            .post('/api/auth/superadmin/login')
            .send({ email: 'superadmin@test.com', password: 'SuperPassword123!' });
        superadminToken = superadminLogin.body.accessToken;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Grievance.deleteMany({});
        await Department.deleteMany({});
        await Course.deleteMany({});
        await Notification.deleteMany({});
    });

    describe('AUTHENTICATION - HAPPY PATH', () => {
        test('Student registration works correctly', async () => {
            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: 'New Student',
                    email: 'newstudent@test.com',
                    password: 'NewPassword123!',
                    studentId: 'STU002',
                    department: testDepartment._id,
                    course: testCourse._id,
                    admissionYear: 2023,
                })
                .expect(201);

            expect(response.body.userId).toBeDefined();
            expect(response.body.user.email).toBe('newstudent@test.com');
            expect(response.body.user.role).toBe('student');

            // Verify user was created in database
            const user = await User.findOne({ email: 'newstudent@test.com' });
            expect(user).toBeTruthy();
            expect(user.emailVerified).toBe(false);
        });

        test('Student login works correctly', async () => {
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'student@test.com', password: 'TestPassword123!' })
                .expect(200);

            expect(response.body.accessToken).toBeDefined();
            expect(response.body.user.email).toBe('student@test.com');
            expect(response.body.user.role).toBe('student');
        });

        test('Token refresh works correctly', async () => {
            const loginResponse = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'student@test.com', password: 'TestPassword123!' });

            const refreshToken = loginResponse.headers['set-cookie']
                ?.find(cookie => cookie.includes('studentRefreshToken'))
                ?.split('=')[1]?.split(';')[0];

            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', `studentRefreshToken=${refreshToken}`)
                .expect(200);

            expect(response.body.accessToken).toBeDefined();
            expect(response.body.accessToken).not.toBe(loginResponse.body.accessToken);
        });

        test('Logout works correctly', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(response.body.message).toBe('Logged out successfully');

            // Verify token is blacklisted
            const meResponse = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(401);

            expect(meResponse.body.message).toContain('revoked');
        });

        test('Current user endpoint works correctly', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(response.body.user.email).toBe('student@test.com');
            expect(response.body.user.role).toBe('student');
            expect(response.body.user.password).toBeUndefined(); // Password should not be returned
        });
    });

    describe('AUTHENTICATION - NEGATIVE PATH', () => {
        test('Registration fails with missing required fields', async () => {
            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: 'Incomplete Student',
                    // Missing email, password, studentId
                })
                .expect(400);

            expect(response.body.message).toContain('required');
        });

        test('Registration fails with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: 'Invalid Email Student',
                    email: 'invalid-email',
                    password: 'Password123!',
                    studentId: 'STU003',
                })
                .expect(400);

            expect(response.body.message).toContain('email');
        });

        test('Registration fails with weak password', async () => {
            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: 'Weak Password Student',
                    email: 'weak@test.com',
                    password: '123', // Too short
                    studentId: 'STU004',
                })
                .expect(400);

            expect(response.body.message).toContain('password');
        });

        test('Login fails with wrong credentials', async () => {
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'student@test.com', password: 'wrongpassword' })
                .expect(401);

            expect(response.body.message).toContain('Invalid');
        });

        test('Login fails with non-existent user', async () => {
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'nonexistent@test.com', password: 'Password123!' })
                .expect(401);

            expect(response.body.message).toContain('Invalid');
        });

        test('Token refresh fails with invalid token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .set('Cookie', 'studentRefreshToken=invalid-token')
                .expect(401);

            expect(response.body.message).toContain('Invalid');
        });

        test('Protected endpoint fails without token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .expect(401);

            expect(response.body.message).toContain('Unauthorized');
        });

        test('Protected endpoint fails with invalid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.message).toContain('Unauthorized');
        });
    });

    describe('AUTHENTICATION - BOUNDARY CONDITIONS', () => {
        test('Registration fails with maximum length exceeded', async () => {
            const longString = 'a'.repeat(121); // Exceeds name maxlength of 120

            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: longString,
                    email: 'longname@test.com',
                    password: 'Password123!',
                    studentId: 'STU005',
                })
                .expect(400);

            expect(response.body.message).toContain('name');
        });

        test('Registration succeeds with minimum valid input', async () => {
            const response = await request(app)
                .post('/api/auth/student/register')
                .send({
                    name: 'A', // Minimum 1 character
                    email: 'a@test.com',
                    password: 'Password123!',
                    studentId: '1', // Minimum 1 character
                })
                .expect(201);

            expect(response.body.user.name).toBe('A');
            expect(response.body.user.email).toBe('a@test.com');
        });

        test('Login fails with empty strings', async () => {
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: '', password: '' })
                .expect(400);

            expect(response.body.message).toContain('required');
        });

        test('Login fails with null values', async () => {
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: null, password: null })
                .expect(400);

            expect(response.body.message).toContain('required');
        });
    });

    describe('GRIEVANCE MANAGEMENT - HAPPY PATH', () => {
        test('Student can create grievance', async () => {
            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    title: 'Test Grievance',
                    description: 'This is a test grievance for functional testing',
                    category: 'academic',
                    priority: 'medium',
                })
                .expect(201);

            expect(response.body._id).toBeDefined();
            expect(response.body.title).toBe('Test Grievance');
            expect(response.body.status).toBe('pending');
            expect(response.body.submittedBy._id).toBe(testStudent._id.toString());

            testGrievance = response.body;
        });

        test('Student can view their grievances', async () => {
            const response = await request(app)
                .get('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(Array.isArray(response.body.grievances)).toBe(true);
            expect(response.body.grievances.length).toBeGreaterThan(0);
            expect(response.body.grievances[0].submittedBy._id).toBe(testStudent._id.toString());
        });

        test('Student can view grievance details', async () => {
            const response = await request(app)
                .get(`/api/grievances/${testGrievance._id}`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(response.body._id).toBe(testGrievance._id);
            expect(response.body.title).toBe('Test Grievance');
            expect(response.body.submittedBy._id).toBe(testStudent._id.toString());
        });

        test('Admin can view all grievances', async () => {
            const response = await request(app)
                .get('/api/grievances')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(Array.isArray(response.body.grievances)).toBe(true);
            expect(response.body.grievances.length).toBeGreaterThan(0);
        });

        test('Admin can assign grievance', async () => {
            const response = await request(app)
                .post(`/api/grievances/${testGrievance._id}/assign`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ assignedTo: testAdmin._id })
                .expect(200);

            expect(response.body.assignedTo._id).toBe(testAdmin._id.toString());
        });

        test('Admin can update grievance status', async () => {
            const response = await request(app)
                .post(`/api/grievances/${testGrievance._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'in_progress', comment: 'Working on this grievance' })
                .expect(200);

            expect(response.body.status).toBe('in_progress');
        });

        test('Student can add comment to grievance', async () => {
            const response = await request(app)
                .post(`/api/grievances/${testGrievance._id}/comment`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ comment: 'Adding additional information' })
                .expect(200);

            expect(response.body.comments.length).toBeGreaterThan(0);
            expect(response.body.comments[response.body.comments.length - 1].comment).toBe('Adding additional information');
        });
    });

    describe('GRIEVANCE MANAGEMENT - NEGATIVE PATH', () => {
        test('Grievance creation fails without authentication', async () => {
            const response = await request(app)
                .post('/api/grievances')
                .send({
                    title: 'Unauthorized Grievance',
                    description: 'This should fail',
                    category: 'academic',
                })
                .expect(401);

            expect(response.body.message).toContain('Unauthorized');
        });

        test('Grievance creation fails with missing fields', async () => {
            const response = await request(app)
                .post('/api/grievances')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    // Missing title, description, category
                })
                .expect(400);

            expect(response.body.message).toContain('required');
        });

        test('Student cannot access other student grievance', async () => {
            // Create another student and grievance
            const otherStudent = await User.create({
                name: 'Other Student',
                email: 'other@test.com',
                password: 'Password123!',
                role: 'student',
                studentId: 'STU999',
                emailVerified: true,
                isActive: true,
            });

            const otherLogin = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'other@test.com', password: 'Password123!' });

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
        });

        test('Admin cannot delete grievance (not allowed)', async () => {
            const response = await request(app)
                .delete(`/api/grievances/${testGrievance._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(403);

            expect(response.body.message).toContain('Forbidden');
        });
    });

    describe('USER MANAGEMENT - HAPPY PATH', () => {
        test('User can view profile', async () => {
            const response = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(response.body.name).toBe('Test Student');
            expect(response.body.email).toBe('student@test.com');
            expect(response.body.password).toBeUndefined();
        });

        test('User can update profile', async () => {
            const response = await request(app)
                .put('/api/users/profile')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    name: 'Updated Student Name',
                    phone: '123-456-7890',
                })
                .expect(200);

            expect(response.body.name).toBe('Updated Student Name');
            expect(response.body.phone).toBe('123-456-7890');
        });

        test('User can change password', async () => {
            const response = await request(app)
                .put('/api/users/password')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    currentPassword: 'TestPassword123!',
                    newPassword: 'NewPassword123!',
                })
                .expect(200);

            expect(response.body.message).toBe('Password updated successfully');

            // Verify new password works
            const loginResponse = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'student@test.com', password: 'NewPassword123!' })
                .expect(200);

            expect(loginResponse.body.accessToken).toBeDefined();
        });
    });

    describe('NOTIFICATIONS - HAPPY PATH', () => {
        test('User can view notifications', async () => {
            // Create a notification
            await Notification.create({
                userId: testStudent._id,
                title: 'Test Notification',
                message: 'This is a test notification',
                type: 'info',
            });

            const response = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(Array.isArray(response.body.notifications)).toBe(true);
            expect(response.body.notifications.length).toBeGreaterThan(0);
        });

        test('User can mark notification as read', async () => {
            const notification = await Notification.create({
                userId: testStudent._id,
                title: 'Unread Notification',
                message: 'This is unread',
                type: 'info',
                isRead: false,
            });

            const response = await request(app)
                .put(`/api/notifications/${notification._id}/read`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(response.body.isRead).toBe(true);
        });
    });

    describe('SYSTEM ENDPOINTS - HAPPY PATH', () => {
        test('Health check works', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body.status).toBe('ok');
            expect(response.body.service).toBe('University E-Grievance API');
        });

        test('Readiness check works', async () => {
            const response = await request(app)
                .get('/api/ready')
                .expect(200);

            expect(response.body.status).toBe('ready');
        });
    });

    describe('STATE TRANSITIONS', () => {
        test('Grievance status transitions correctly', async () => {
            // Start with pending
            expect(testGrievance.status).toBe('pending');

            // Transition to in_progress
            const response1 = await request(app)
                .post(`/api/grievances/${testGrievance._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'in_progress', comment: 'Starting work' })
                .expect(200);

            expect(response1.body.status).toBe('in_progress');

            // Transition to resolved
            const response2 = await request(app)
                .post(`/api/grievances/${testGrievance._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'resolved', comment: 'Issue resolved' })
                .expect(200);

            expect(response2.body.status).toBe('resolved');
        });

        test('Invalid grievance status transition is rejected', async () => {
            // Try to transition from resolved back to pending (invalid)
            const response = await request(app)
                .post(`/api/grievances/${testGrievance._id}/status`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'pending', comment: 'Trying to revert' })
                .expect(400);

            expect(response.body.message).toContain('Invalid status transition');
        });

        test('User account lockout state transition', async () => {
            // Create a test user for lockout testing
            const lockoutUser = await User.create({
                name: 'Lockout Test',
                email: 'lockout@test.com',
                password: 'Password123!',
                role: 'student',
                studentId: 'LOCK001',
                isActive: true,
            });

            // Make 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/auth/student/login')
                    .send({ email: 'lockout@test.com', password: 'wrongpassword' });
            }

            // 6th attempt should be locked out
            const response = await request(app)
                .post('/api/auth/student/login')
                .send({ email: 'lockout@test.com', password: 'wrongpassword' })
                .expect(423);

            expect(response.body.message).toContain('locked');

            // Verify user is locked
            const lockedUser = await User.findOne({ email: 'lockout@test.com' });
            expect(lockedUser.loginAttempts).toBe(5);
            expect(lockedUser.lockUntil).toBeDefined();

            await User.deleteOne({ _id: lockoutUser._id });
        });
    });
});
