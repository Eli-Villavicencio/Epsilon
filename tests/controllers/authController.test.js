const bcrypt = require('bcryptjs');
const { User } = require('../../src/models');
const { register, login, getProfile } = require('../../src/controllers/authController');
const TestHelpers = require('../helpers/testHelpers');
const { setupTestDatabase, teardownTestDatabase } = require('../setup');

describe('Auth Controller', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await TestHelpers.cleanDatabase();
    });

    describe('register', () => {
        test('should register a new user successfully', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: 'password123',
                    firstName: 'New',
                    lastName: 'User'
                }
            });
            const res = TestHelpers.mockResponse();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'User registered successfully',
                    data: expect.objectContaining({
                        token: expect.any(String),
                        user: expect.objectContaining({
                            username: 'newuser',
                            email: 'newuser@example.com',
                            cashBalance: 10000.00
                        })
                    })
                })
            );

            // Verify user was created in database
            const user = await User.findOne({ where: { email: 'newuser@example.com' } });
            expect(user).toBeTruthy();
            expect(user.username).toBe('newuser');
        });

        test('should fail with missing required fields', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    username: 'testuser'
                    // Missing email and password
                }
            });
            const res = TestHelpers.mockResponse();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Username, email and password are required'
                })
            );
        });

        test('should fail with password too short', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: '123'
                }
            });
            const res = TestHelpers.mockResponse();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Password must be at least 6 characters long'
                })
            );
        });

        test('should fail with duplicate email', async () => {
            // Create existing user
            await TestHelpers.createTestUser({
                email: 'existing@example.com'
            });

            const req = TestHelpers.mockRequest({
                body: {
                    username: 'newuser',
                    email: 'existing@example.com',
                    password: 'password123'
                }
            });
            const res = TestHelpers.mockResponse();

            await register(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'User with this email or username already exists'
                })
            );
        });
    });

    describe('login', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await TestHelpers.createTestUser();
        });

        test('should login successfully with correct credentials', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    email: 'test@example.com',
                    password: 'password123'
                }
            });
            const res = TestHelpers.mockResponse();

            await login(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Login successful',
                    data: expect.objectContaining({
                        token: expect.any(String),
                        user: expect.objectContaining({
                            id: testUser.id,
                            email: 'test@example.com'
                        })
                    })
                })
            );
        });

        test('should fail with incorrect email', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    email: 'wrong@example.com',
                    password: 'password123'
                }
            });
            const res = TestHelpers.mockResponse();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Invalid email or password'
                })
            );
        });

        test('should fail with incorrect password', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    email: 'test@example.com',
                    password: 'wrongpassword'
                }
            });
            const res = TestHelpers.mockResponse();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Invalid email or password'
                })
            );
        });

        test('should fail with missing credentials', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    email: 'test@example.com'
                    // Missing password
                }
            });
            const res = TestHelpers.mockResponse();

            await login(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Email and password are required'
                })
            );
        });
    });

    describe('getProfile', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await TestHelpers.createTestUser();
        });

        test('should return user profile successfully', async () => {
            const req = TestHelpers.mockRequest({
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await getProfile(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        id: testUser.id,
                        username: testUser.username,
                        email: testUser.email
                    })
                })
            );
        });

        test('should fail when user not found', async () => {
            const req = TestHelpers.mockRequest({
                user: { id: 999999 } // Non-existent user ID
            });
            const res = TestHelpers.mockResponse();

            await getProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'User not found'
                })
            );
        });
    });
});
