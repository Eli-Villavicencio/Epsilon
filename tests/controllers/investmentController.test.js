const { User, Investment } = require('../../src/models');
const { buyInvestment, sellInvestment, getInvestments } = require('../../src/controllers/investmentController');
const TestHelpers = require('../helpers/testHelpers');
const { setupTestDatabase, teardownTestDatabase } = require('../setup');

// Mock financeAPI
jest.mock('../../src/services/financeAPI', () => ({
    getStockPrice: jest.fn(() => Promise.resolve({
        symbol: 'AAPL',
        price: 150.00,
        shortName: 'Apple Inc.'
    }))
}));

describe('Investment Controller', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await TestHelpers.cleanDatabase();
    });

    describe('buyInvestment', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await TestHelpers.createTestUser({
                cashBalance: 5000.00
            });
        });

        test('should buy stock successfully', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    symbol: 'AAPL',
                    quantity: 10
                },
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await buyInvestment(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Successfully purchased 10 shares of AAPL',
                    data: expect.objectContaining({
                        investment: expect.objectContaining({
                            symbol: 'AAPL',
                            quantity: 10
                        }),
                        remainingCash: 3500.00 // 5000 - (150 * 10)
                    })
                })
            );

            // Verify investment was created
            const investment = await Investment.findOne({
                where: { userId: testUser.id, symbol: 'AAPL' }
            });
            expect(investment).toBeTruthy();
            expect(investment.quantity).toBe(10);

            // Verify cash balance was updated
            await testUser.reload();
            expect(parseFloat(testUser.cashBalance)).toBe(3500.00);
        });

        test('should fail with insufficient funds', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    symbol: 'AAPL',
                    quantity: 100 // 100 * 150 = 15000, but user only has 5000
                },
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await buyInvestment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Insufficient funds to complete this purchase'
                })
            );
        });

        test('should update existing investment', async () => {
            // Create existing investment
            await TestHelpers.createTestInvestment(testUser.id, {
                symbol: 'AAPL',
                quantity: 5,
                purchasePrice: 140.00,
                totalInvested: 700.00
            });

            const req = TestHelpers.mockRequest({
                body: {
                    symbol: 'AAPL',
                    quantity: 10
                },
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await buyInvestment(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        investment: expect.objectContaining({
                            symbol: 'AAPL',
                            quantity: 15 // 5 + 10
                        })
                    })
                })
            );

            // Verify investment was updated, not duplicated
            const investments = await Investment.findAll({
                where: { userId: testUser.id, symbol: 'AAPL' }
            });
            expect(investments).toHaveLength(1);
            expect(investments[0].quantity).toBe(15);
        });

        test('should fail with invalid quantity', async () => {
            const req = TestHelpers.mockRequest({
                body: {
                    symbol: 'AAPL',
                    quantity: 0
                },
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await buyInvestment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Symbol and valid quantity are required'
                })
            );
        });
    });

    describe('sellInvestment', () => {
        let testUser, testInvestment;

        beforeEach(async () => {
            testUser = await TestHelpers.createTestUser({
                cashBalance: 1000.00
            });
            testInvestment = await TestHelpers.createTestInvestment(testUser.id, {
                symbol: 'AAPL',
                quantity: 20,
                purchasePrice: 140.00,
                totalInvested: 2800.00
            });
        });

        test('should sell stock successfully', async () => {
            const req = TestHelpers.mockRequest({
                params: { id: testInvestment.id },
                body: { quantity: 10 },
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await sellInvestment(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Successfully sold 10 shares of AAPL',
                    data: expect.objectContaining({
                        saleDetails: expect.objectContaining({
                            symbol: 'AAPL',
                            quantitySold: 10,
                            totalReceived: 1500.00 // 10 * 150
                        }),
                        remainingShares: 10
                    })
                })
            );

            // Verify investment was updated
            await testInvestment.reload();
            expect(testInvestment.quantity).toBe(10);

            // Verify cash balance was updated
            await testUser.reload();
            expect(parseFloat(testUser.cashBalance)).toBe(2500.00); // 1000 + 1500
        });

        test('should delete investment when selling all shares', async () => {
            const req = TestHelpers.mockRequest({
                params: { id: testInvestment.id },
                body: { quantity: 20 }, // Sell all shares
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await sellInvestment(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: expect.objectContaining({
                        remainingShares: 0
                    })
                })
            );

            // Verify investment was deleted
            const investment = await Investment.findByPk(testInvestment.id);
            expect(investment).toBeNull();
        });

        test('should fail when selling more shares than owned', async () => {
            const req = TestHelpers.mockRequest({
                params: { id: testInvestment.id },
                body: { quantity: 25 }, // More than the 20 owned
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await sellInvestment(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Cannot sell 25 shares. You only own 20 shares.'
                })
            );
        });

        test('should fail when investment not found', async () => {
            const req = TestHelpers.mockRequest({
                params: { id: 999999 }, // Non-existent investment
                body: { quantity: 10 },
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await sellInvestment(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'Investment not found'
                })
            );
        });
    });

    describe('getInvestments', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await TestHelpers.createTestUser();
        });

        test('should return empty array when no investments', async () => {
            const req = TestHelpers.mockRequest({
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await getInvestments(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'No investments found',
                    data: []
                })
            );
        });

        test('should return user investments with calculated values', async () => {
            await TestHelpers.createTestInvestment(testUser.id, {
                symbol: 'AAPL',
                quantity: 10,
                purchasePrice: 140.00,
                currentPrice: 150.00,
                totalInvested: 1400.00
            });

            await TestHelpers.createTestInvestment(testUser.id, {
                symbol: 'GOOGL',
                quantity: 5,
                purchasePrice: 2000.00,
                currentPrice: 2100.00,
                totalInvested: 10000.00
            });

            const req = TestHelpers.mockRequest({
                user: { id: testUser.id }
            });
            const res = TestHelpers.mockResponse();

            await getInvestments(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Investments retrieved successfully',
                    data: expect.arrayContaining([
                        expect.objectContaining({
                            symbol: 'AAPL',
                            quantity: 10,
                            currentValue: 1500.00,
                            gainLoss: 100.00,
                            gainLossPercent: expect.any(Number)
                        }),
                        expect.objectContaining({
                            symbol: 'GOOGL',
                            quantity: 5,
                            currentValue: 10500.00,
                            gainLoss: 500.00
                        })
                    ])
                })
            );
        });
    });
});
