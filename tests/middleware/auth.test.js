const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../../src/middleware/auth');
const { User } = require('../../src/models');
const TestHelpers = require('../helpers/testHelpers');
const { setupTestDatabase, teardownTestDatabase } = require('../setup');

describe('Auth Middleware', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await TestHelpers.cleanDatabase();
    });

    describe('authenticateToken', () => {
        let testUser, validToken;

        beforeEach(async () => {
            testUser = await TestHelpers.createTestUser();
            validToken = TestHelpers.generateTestToken(testUser.id);
        });

        test('should authenticate valid JWT token', async () => {
            const req = TestHelpers.mockRequest({
                headers: {
                    'authorization': `Bearer ${validToken}`,
                    'x-user-id': testUser.id.toString()
                }
            });
            const res = TestHelpers.mockResponse();
            const next = TestHelpers.mockNext();

            await authenticateToken(req, res, next);

            expect(req.user).toBeTruthy();
            expect(req.user.id).toBe(testUser.id);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should authenticate with x-user-id header fallback', async () => {
            const req = TestHelpers.mockRequest({
                headers: {
                    'x-user-id': testUser.id.toString()
                }
            });
            const res = TestHelpers.mockResponse();
            const next = TestHelpers.mockNext();

            await authenticateToken(req, res, next);

            expect(req.user).toBeTruthy();
            expect(req.user.id).toBe(testUser.id);
            expect(next).toHaveBeenCalled();
        });

        test('should fail with missing token and user ID', async () => {
            const req = TestHelpers.mockRequest({
                headers: {}
            });
            const res = TestHelpers.mockResponse();
            const next = TestHelpers.mockNext();

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Access denied. No token provided.'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        test('should fail with invalid JWT token', async () => {
            const req = TestHelpers.mockRequest({
                headers: {
                    'authorization': 'Bearer invalid-token',
                    'x-user-id': testUser.id.toString()
                }
            });
            const res = TestHelpers.mockResponse();
            const next = TestHelpers.mockNext();

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Invalid token.'
                })
            );
        });

        test('should fail with non-existent user', async () => {
            const invalidToken = TestHelpers.generateTestToken(999999);
            const req = TestHelpers.mockRequest({
                headers: {
                    'authorization': `Bearer ${invalidToken}`,
                    'x-user-id': '999999'
                }
            });
            const res = TestHelpers.mockResponse();
            const next = TestHelpers.mockNext();

            await authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'User not found.'
                })
            );
        });
    });
});
