const request = require('supertest');
const app = require('../../src/app');
const TestHelpers = require('../helpers/testHelpers');
const { setupTestDatabase, teardownTestDatabase } = require('../setup');

describe('API Integration Tests', () => {
    beforeAll(async () => {
        await setupTestDatabase();
    });

    afterAll(async () => {
        await teardownTestDatabase();
    });

    beforeEach(async () => {
        await TestHelpers.cleanDatabase();
    });

    describe('Authentication Flow', () => {
        test('should complete full authentication flow', async () => {
            // Register new user
            const registerResponse = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123',
                    firstName: 'Test',
                    lastName: 'User'
                });

            expect(registerResponse.status).toBe(201);
            expect(registerResponse.body.success).toBe(true);
            expect(registerResponse.body.data.token).toBeTruthy();

            const token = registerResponse.body.data.token;
            const userId = registerResponse.body.data.user.id;

            // Login with same credentials
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(loginResponse.status).toBe(200);
            expect(loginResponse.body.success).toBe(true);

            // Get profile with token
            const profileResponse = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${token}`)
                .set('x-user-id', userId.toString());

            expect(profileResponse.status).toBe(200);
            expect(profileResponse.body.success).toBe(true);
            expect(profileResponse.body.data.email).toBe('test@example.com');
        });
    });

    describe('Investment Flow', () => {
        let authToken, userId;

        beforeEach(async () => {
            // Create and login user
            const user = await TestHelpers.createTestUser({
                cashBalance: 10000.00
            });
            authToken = TestHelpers.generateTestToken(user.id);
            userId = user.id;
        });

        test('should complete full investment flow', async () => {
            // Get initial cash balance
            const balanceResponse = await request(app)
                .get('/api/investments/cash/balance')
                .set('Authorization', `Bearer ${authToken}`)
                .set('x-user-id', userId.toString());

            expect(balanceResponse.status).toBe(200);
            expect(parseFloat(balanceResponse.body.data.cashBalance)).toBe(10000.00);

            // Buy investment
            const buyResponse = await request(app)
                .post('/api/investments/')
                .set('Authorization', `Bearer ${authToken}`)
                .set('x-user-id', userId.toString())
                .send({
                    symbol: 'AAPL',
                    quantity: 10
                });

            expect(buyResponse.status).toBe(200);
            expect(buyResponse.body.success).toBe(true);
            expect(buyResponse.body.data.investment.symbol).toBe('AAPL');

            // Get investments
            const investmentsResponse = await request(app)
                .get('/api/investments/')
                .set('Authorization', `Bearer ${authToken}`)
                .set('x-user-id', userId.toString());

            expect(investmentsResponse.status).toBe(200);
            expect(investmentsResponse.body.success).toBe(true);
            expect(investmentsResponse.body.data.length).toBe(1);

            const investment = investmentsResponse.body.data[0];
            expect(investment.symbol).toBe('AAPL');
            expect(investment.quantity).toBe(10);

            // Sell part of investment
            const sellResponse = await request(app)
                .post(`/api/investments/${investment.id}/sell`)
                .set('Authorization', `Bearer ${authToken}`)
                .set('x-user-id', userId.toString())
                .send({
                    quantity: 5
                });

            expect(sellResponse.status).toBe(200);
            expect(sellResponse.body.success).toBe(true);
            expect(sellResponse.body.data.remainingShares).toBe(5);

            // Verify remaining investment
            const finalInvestmentsResponse = await request(app)
                .get('/api/investments/')
                .set('Authorization', `Bearer ${authToken}`)
                .set('x-user-id', userId.toString());

            expect(finalInvestmentsResponse.body.data[0].quantity).toBe(5);
        });
    });

    describe('Market Data', () => {
        test('should get market data without authentication', async () => {
            const response = await request(app)
                .get('/api/market/market-data');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('indices');
            expect(response.body.data).toHaveProperty('marketStatus');
        });

        test('should get stock price', async () => {
            const response = await request(app)
                .get('/api/market/stock-price/AAPL');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.symbol).toBe('AAPL');
            expect(typeof response.body.data.price).toBe('number');
        });

        test('should search stocks', async () => {
            const response = await request(app)
                .get('/api/market/search-stocks?query=Apple');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('Portfolio Data', () => {
        let authToken, userId, user;

        beforeEach(async () => {
            user = await TestHelpers.createTestUser({
                cashBalance: 5000.00
            });
            authToken = TestHelpers.generateTestToken(user.id);
            userId = user.id;

            // Create test investments
            await TestHelpers.createTestInvestment(userId, {
                symbol: 'AAPL',
                quantity: 10,
                purchasePrice: 150.00,
                currentPrice: 155.00,
                totalInvested: 1500.00
            });

            await TestHelpers.createTestTransaction(userId, {
                symbol: 'AAPL',
                transactionType: 'BUY',
                quantity: 10,
                price: 150.00,
                totalAmount: 1500.00
            });
        });

        test('should get portfolio summary', async () => {
            const response = await request(app)
                .get('/api/portfolio/')
                .set('Authorization', `Bearer ${authToken}`)
                .set('x-user-id', userId.toString());

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('totalInvestment');
            expect(response.body.data).toHaveProperty('totalCurrentValue');
            expect(response.body.data).toHaveProperty('portfolioValue');
            expect(response.body.data.investments.length).toBe(1);
        });

        test('should get transaction history', async () => {
            const response = await request(app)
                .get('/api/investments/transactions/history')
                .set('Authorization', `Bearer ${authToken}`)
                .set('x-user-id', userId.toString());

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.transactions.length).toBe(1);
            expect(response.body.data.transactions[0].symbol).toBe('AAPL');
        });
    });
});
