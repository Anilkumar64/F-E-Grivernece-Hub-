import request from 'supertest';
import { app } from '../server.js';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Grievance from '../src/models/Grievance.js';
import Department from '../src/models/Department.js';

describe('PHASE 3 - PERFORMANCE & LOAD TESTING', () => {
    let testUsers = [];
    let testAdmins = [];
    let testDepartment;
    let userTokens = [];
    let adminTokens = [];

    beforeAll(async () => {
        // Create test department
        testDepartment = await Department.create({
            name: 'Performance Test Department',
            code: 'PERF',
            email: 'perf@test.com',
        });

        // Create multiple test users for load testing
        for (let i = 0; i < 50; i++) {
            const user = await User.create({
                name: `Performance Test User ${i}`,
                email: `perfuser${i}@test.com`,
                password: 'PerfPassword123!',
                role: 'student',
                studentId: `PERF${i.toString().padStart(3, '0')}`,
                emailVerified: true,
                isActive: true,
            });
            testUsers.push(user);

            // Get auth token for each user
            const loginResponse = await request(app)
                .post('/api/auth/student/login')
                .send({ email: `perfuser${i}@test.com`, password: 'PerfPassword123!' });
            userTokens.push(loginResponse.body.accessToken);
        }

        // Create multiple test admins
        for (let i = 0; i < 5; i++) {
            const admin = await User.create({
                name: `Performance Test Admin ${i}`,
                email: `perfadmin${i}@test.com`,
                password: 'PerfPassword123!',
                role: 'admin',
                staffId: `PERFADM${i}`,
                department: testDepartment._id,
                isActive: true,
                isVerified: true,
            });
            testAdmins.push(admin);

            const loginResponse = await request(app)
                .post('/api/auth/admin/login')
                .send({ email: `perfadmin${i}@test.com`, password: 'PerfPassword123!' });
            adminTokens.push(loginResponse.body.accessToken);
        }
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Grievance.deleteMany({});
        await Department.deleteMany({});
    });

    describe('LOAD TESTS - CONCURRENT USERS', () => {
        test('100 concurrent authentication requests', async () => {
            const startTime = Date.now();
            
            // Create 100 concurrent login requests
            const promises = Array(100).fill().map((_, index) => {
                const userIndex = index % testUsers.length;
                return request(app)
                    .post('/api/auth/student/login')
                    .send({ 
                        email: `perfuser${userIndex}@test.com`, 
                        password: 'PerfPassword123!' 
                    });
            });

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Analyze results
            const successCount = responses.filter(r => r.status === 200).length;
            const errorCount = responses.filter(r => r.status >= 400).length;
            const avgResponseTime = duration / 100;

            console.log(`100 concurrent auth requests:`);
            console.log(`- Success: ${successCount}, Errors: ${errorCount}`);
            console.log(`- Total duration: ${duration}ms`);
            console.log(`- Average response time: ${avgResponseTime}ms`);

            expect(successCount).toBeGreaterThan(80); // At least 80% success rate
            expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
            expect(avgResponseTime).toBeLessThan(500); // Average response time under 500ms
        });

        test('100 concurrent grievance creation requests', async () => {
            const startTime = Date.now();
            
            const promises = Array(100).fill().map((_, index) => {
                const tokenIndex = index % userTokens.length;
                return request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${userTokens[tokenIndex]}`)
                    .send({
                        title: `Performance Test Grievance ${index}`,
                        description: `This is grievance number ${index} for performance testing`,
                        category: 'academic',
                        priority: 'medium',
                    });
            });

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = responses.filter(r => r.status === 201).length;
            const errorCount = responses.filter(r => r.status >= 400).length;
            const avgResponseTime = duration / 100;

            console.log(`100 concurrent grievance creations:`);
            console.log(`- Success: ${successCount}, Errors: ${errorCount}`);
            console.log(`- Total duration: ${duration}ms`);
            console.log(`- Average response time: ${avgResponseTime}ms`);

            expect(successCount).toBeGreaterThan(80);
            expect(duration).toBeLessThan(15000);
            expect(avgResponseTime).toBeLessThan(1000);
        });

        test('500 concurrent user profile requests', async () => {
            const startTime = Date.now();
            
            const promises = Array(500).fill().map((_, index) => {
                const tokenIndex = index % userTokens.length;
                return request(app)
                    .get('/api/users/profile')
                    .set('Authorization', `Bearer ${userTokens[tokenIndex]}`);
            });

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = responses.filter(r => r.status === 200).length;
            const errorCount = responses.filter(r => r.status >= 400).length;
            const avgResponseTime = duration / 500;

            console.log(`500 concurrent profile requests:`);
            console.log(`- Success: ${successCount}, Errors: ${errorCount}`);
            console.log(`- Total duration: ${duration}ms`);
            console.log(`- Average response time: ${avgResponseTime}ms`);

            expect(successCount).toBeGreaterThan(400);
            expect(duration).toBeLessThan(20000);
            expect(avgResponseTime).toBeLessThan(200);
        });

        test('1000 concurrent health check requests', async () => {
            const startTime = Date.now();
            
            const promises = Array(1000).fill().map(() =>
                request(app).get('/api/health')
            );

            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = responses.filter(r => r.status === 200).length;
            const avgResponseTime = duration / 1000;

            console.log(`1000 concurrent health checks:`);
            console.log(`- Success: ${successCount}`);
            console.log(`- Total duration: ${duration}ms`);
            console.log(`- Average response time: ${avgResponseTime}ms`);

            expect(successCount).toBe(1000); // Health checks should all succeed
            expect(duration).toBeLessThan(10000);
            expect(avgResponseTime).toBeLessThan(50);
        });
    });

    describe('STRESS TESTS', () => {
        test('Database performance with 10,000 grievances', async () => {
            // Create 10,000 grievances
            const grievances = [];
            for (let i = 0; i < 10000; i++) {
                grievances.push({
                    title: `Stress Test Grievance ${i}`,
                    description: `Description for grievance ${i}`,
                    category: 'academic',
                    priority: 'medium',
                    status: 'pending',
                    submittedBy: testUsers[i % testUsers.length]._id,
                    department: testDepartment._id,
                    createdAt: new Date(Date.now() - i * 1000), // Stagger creation times
                });
            }

            const insertStartTime = Date.now();
            await Grievance.insertMany(grievances);
            const insertEndTime = Date.now();
            const insertDuration = insertEndTime - insertStartTime;

            console.log(`Inserted 10,000 grievances in ${insertDuration}ms`);

            // Test query performance
            const queryStartTime = Date.now();
            const response = await request(app)
                .get('/api/grievances')
                .set('Authorization', `Bearer ${adminTokens[0]}`)
                .query({ page: 1, limit: 50 });
            const queryEndTime = Date.now();
            const queryDuration = queryEndTime - queryStartTime;

            console.log(`Queried grievances in ${queryDuration}ms`);

            expect(insertDuration).toBeLessThan(30000); // Should insert within 30 seconds
            expect(queryDuration).toBeLessThan(1000); // Should query within 1 second
            expect(response.status).toBe(200);
            expect(response.body.grievances.length).toBe(50);
        });

        test('Memory usage under sustained load', async () => {
            const initialMemory = process.memoryUsage();
            console.log('Initial memory usage:', {
                rss: Math.round(initialMemory.rss / 1024 / 1024) + 'MB',
                heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
            });

            // Sustained load for 30 seconds
            const loadDuration = 30000; // 30 seconds
            const startTime = Date.now();
            
            while (Date.now() - startTime < loadDuration) {
                const promises = Array(50).fill().map((_, index) => {
                    const tokenIndex = index % userTokens.length;
                    return request(app)
                        .get('/api/users/profile')
                        .set('Authorization', `Bearer ${userTokens[tokenIndex]}`);
                });
                
                await Promise.all(promises);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between batches
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

            console.log('Final memory usage:', {
                rss: Math.round(finalMemory.rss / 1024 / 1024) + 'MB',
                heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB',
            });
            console.log('Memory increase:', Math.round(memoryIncrease / 1024 / 1024) + 'MB');

            // Memory increase should be reasonable (less than 100MB)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        });

        test('Database connection pool exhaustion', async () => {
            // Create many simultaneous database operations
            const promises = Array(200).fill().map((_, index) => {
                const tokenIndex = index % adminTokens.length;
                return request(app)
                    .get('/api/grievances')
                    .set('Authorization', `Bearer ${adminTokens[tokenIndex]}`)
                    .query({ page: 1, limit: 20 });
            });

            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = responses.filter(r => r.status === 200).length;

            console.log(`200 simultaneous DB queries:`);
            console.log(`- Success: ${successCount}/200`);
            console.log(`- Duration: ${duration}ms`);

            expect(successCount).toBeGreaterThan(180);
            expect(duration).toBeLessThan(30000);
        });

        test('File upload performance under load', async () => {
            const fileContent = Buffer.alloc(1024 * 1024); // 1MB file
            
            const promises = Array(20).fill().map((_, index) => {
                const tokenIndex = index % userTokens.length;
                return request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${userTokens[tokenIndex]}`)
                    .field('title', `File Upload Test ${index}`)
                    .field('description', 'Testing file upload performance')
                    .field('category', 'academic')
                    .attach('attachment', fileContent, `test-${index}.txt`);
            });

            const startTime = Date.now();
            const responses = await Promise.all(promises);
            const endTime = Date.now();
            const duration = endTime - startTime;

            const successCount = responses.filter(r => r.status === 201).length;

            console.log(`20 concurrent file uploads:`);
            console.log(`- Success: ${successCount}/20`);
            console.log(`- Duration: ${duration}ms`);
            console.log(`- Average per upload: ${duration / 20}ms`);

            expect(successCount).toBeGreaterThan(15);
            expect(duration).toBeLessThan(60000);
        });
    });

    describe('SPIKE TESTS', () => {
        test('Spike from 0 to 1000 requests per second', async () => {
            // Baseline: no requests for 2 seconds
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Spike: 1000 requests in 1 second
            const spikeStartTime = Date.now();
            const promises = Array(1000).fill().map((_, index) => {
                const tokenIndex = index % userTokens.length;
                return request(app)
                    .get('/api/health');
            });

            const responses = await Promise.all(promises);
            const spikeEndTime = Date.now();
            const spikeDuration = spikeEndTime - spikeStartTime;

            const successCount = responses.filter(r => r.status === 200).length;

            console.log(`Spike test (1000 requests):`);
            console.log(`- Success: ${successCount}/1000`);
            console.log(`- Duration: ${spikeDuration}ms`);
            console.log(`- Requests per second: ${(1000 / spikeDuration * 1000).toFixed(2)}`);

            expect(successCount).toBeGreaterThan(800);
            expect(spikeDuration).toBeLessThan(5000); // Should handle spike within 5 seconds

            // Recovery: Check if system recovers
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const recoveryResponse = await request(app).get('/api/health');
            expect(recoveryResponse.status).toBe(200);
        });

        test('System recovery after restart simulation', async () => {
            // Simulate restart by making many requests that might overwhelm the system
            const overwhelmingPromises = Array(500).fill().map((_, index) => {
                const tokenIndex = index % userTokens.length;
                return request(app)
                    .post('/api/grievances')
                    .set('Authorization', `Bearer ${userTokens[tokenIndex]}`)
                    .send({
                        title: `Overwhelming Request ${index}`,
                        description: 'This is part of an overwhelming request test',
                        category: 'academic',
                    });
            });

            await Promise.all(overwhelmingPromises);

            // Check if system is still responsive
            const healthCheckResponse = await request(app).get('/api/health');
            expect(healthCheckResponse.status).toBe(200);

            // Check if normal operations still work
            const normalResponse = await request(app)
                .get('/api/users/profile')
                .set('Authorization', `Bearer ${userTokens[0]}`);
            expect(normalResponse.status).toBe(200);
        });
    });

    describe('BENCHMARKS - PER ENDPOINT METRICS', () => {
        test('Authentication endpoint benchmarks', async () => {
            const endpoints = [
                { method: 'post', path: '/api/auth/student/login', data: { email: 'perfuser0@test.com', password: 'PerfPassword123!' } },
                { method: 'post', path: '/api/auth/refresh', token: userTokens[0] },
                { method: 'get', path: '/api/auth/me', token: userTokens[0] },
            ];

            for (const endpoint of endpoints) {
                const times = [];
                
                // Run 50 requests to get statistical data
                for (let i = 0; i < 50; i++) {
                    const startTime = Date.now();
                    
                    let response;
                    if (endpoint.method === 'post') {
                        if (endpoint.path === '/api/auth/refresh') {
                            response = await request(app)
                                .post(endpoint.path)
                                .set('Cookie', `studentRefreshToken=${endpoint.token}`);
                        } else {
                            response = await request(app)
                                .post(endpoint.path)
                                .send(endpoint.data);
                        }
                    } else {
                        response = await request(app)
                            .get(endpoint.path)
                            .set('Authorization', `Bearer ${endpoint.token}`);
                    }
                    
                    const endTime = Date.now();
                    times.push(endTime - startTime);
                    
                    expect([200, 201]).toContain(response.status);
                }

                // Calculate statistics
                times.sort((a, b) => a - b);
                const p50 = times[Math.floor(times.length * 0.5)];
                const p95 = times[Math.floor(times.length * 0.95)];
                const p99 = times[Math.floor(times.length * 0.99)];
                const avg = times.reduce((a, b) => a + b, 0) / times.length;

                console.log(`${endpoint.method.toUpperCase()} ${endpoint.path} benchmarks:`);
                console.log(`- Average: ${avg.toFixed(2)}ms`);
                console.log(`- p50: ${p50}ms`);
                console.log(`- p95: ${p95}ms`);
                console.log(`- p99: ${p99}ms`);

                // Performance assertions
                expect(avg).toBeLessThan(500); // Average under 500ms
                expect(p95).toBeLessThan(1000); // 95th percentile under 1 second
                expect(p99).toBeLessThan(2000); // 99th percentile under 2 seconds
            }
        });

        test('Grievance endpoint benchmarks', async () => {
            const endpoints = [
                { method: 'get', path: '/api/grievances', token: adminTokens[0] },
                { method: 'post', path: '/api/grievances', token: userTokens[0], data: {
                    title: 'Benchmark Grievance',
                    description: 'Testing performance',
                    category: 'academic',
                }},
            ];

            for (const endpoint of endpoints) {
                const times = [];
                
                for (let i = 0; i < 30; i++) {
                    const startTime = Date.now();
                    
                    let response;
                    if (endpoint.method === 'post') {
                        response = await request(app)
                            .post(endpoint.path)
                            .set('Authorization', `Bearer ${endpoint.token}`)
                            .send(endpoint.data);
                    } else {
                        response = await request(app)
                            .get(endpoint.path)
                            .set('Authorization', `Bearer ${endpoint.token}`);
                    }
                    
                    const endTime = Date.now();
                    times.push(endTime - startTime);
                    
                    expect([200, 201]).toContain(response.status);
                }

                times.sort((a, b) => a - b);
                const p50 = times[Math.floor(times.length * 0.5)];
                const p95 = times[Math.floor(times.length * 0.95)];
                const p99 = times[Math.floor(times.length * 0.99)];
                const avg = times.reduce((a, b) => a + b, 0) / times.length;

                console.log(`${endpoint.method.toUpperCase()} ${endpoint.path} benchmarks:`);
                console.log(`- Average: ${avg.toFixed(2)}ms`);
                console.log(`- p50: ${p50}ms`);
                console.log(`- p95: ${p95}ms`);
                console.log(`- p99: ${p99}ms`);

                expect(avg).toBeLessThan(1000);
                expect(p95).toBeLessThan(2000);
                expect(p99).toBeLessThan(5000);
            }
        });

        test('Maximum throughput measurement', async () => {
            let maxThroughput = 0;
            let errorsAtMax = 0;
            
            // Test with increasing concurrent requests
            for (let concurrency of [50, 100, 200, 300, 500]) {
                const startTime = Date.now();
                
                const promises = Array(concurrency).fill().map((_, index) => {
                    const tokenIndex = index % userTokens.length;
                    return request(app)
                        .get('/api/health');
                });

                const responses = await Promise.all(promises);
                const endTime = Date.now();
                const duration = endTime - startTime;

                const successCount = responses.filter(r => r.status === 200).length;
                const errorCount = responses.filter(r => r.status >= 400).length;
                const throughput = (successCount / duration) * 1000; // requests per second

                console.log(`Concurrency ${concurrency}: ${successCount} success, ${errorCount} errors, ${throughput.toFixed(2)} RPS`);

                if (errorCount === 0 && throughput > maxThroughput) {
                    maxThroughput = throughput;
                } else if (errorCount > 0) {
                    errorsAtMax = errorCount;
                    break;
                }
            }

            console.log(`Maximum throughput: ${maxThroughput.toFixed(2)} requests per second`);
            console.log(`Errors at breaking point: ${errorsAtMax}`);

            expect(maxThroughput).toBeGreaterThan(100); // Should handle at least 100 RPS
        });
    });
});
