const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Investment, Transaction } = require('../../src/models');

class TestHelpers {
    // Create test user
    static async createTestUser(userData = {}) {
        const defaultUser = {
            username: 'testuser',
            email: 'test@example.com',
            password: await bcrypt.hash('password123', 12),
            firstName: 'Test',
            lastName: 'User',
            cashBalance: 10000.00
        };

        const user = await User.create({ ...defaultUser, ...userData });
        return user;
    }

    // Generate JWT token for test user
    static generateTestToken(userId) {
        return jwt.sign(
            { userId: userId, email: 'test@example.com' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '24h' }
        );
    }

    // Create test investment
    static async createTestInvestment(userId, investmentData = {}) {
        const defaultInvestment = {
            userId: userId,
            symbol: 'AAPL',
            companyName: 'Apple Inc.',
            quantity: 10,
            purchasePrice: 150.00,
            currentPrice: 155.00,
            totalInvested: 1500.00,
            purchaseDate: new Date()
        };

        const investment = await Investment.create({ ...defaultInvestment, ...investmentData });
        return investment;
    }

    // Create test transaction
    static async createTestTransaction(userId, transactionData = {}) {
        const defaultTransaction = {
            userId: userId,
            symbol: 'AAPL',
            transactionType: 'BUY',
            quantity: 10,
            price: 150.00,
            totalAmount: 1500.00,
            transactionDate: new Date()
        };

        const transaction = await Transaction.create({ ...defaultTransaction, ...transactionData });
        return transaction;
    }

    // Clean test data
    static async cleanDatabase() {
        await Transaction.destroy({ where: {}, force: true });
        await Investment.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
    }

    // Mock request object
    static mockRequest(options = {}) {
        return {
            body: options.body || {},
            params: options.params || {},
            query: options.query || {},
            headers: options.headers || {},
            user: options.user || null
        };
    }

    // Mock response object
    static mockResponse() {
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis()
        };
        return res;
    }

    // Mock next function
    static mockNext() {
        return jest.fn();
    }
}

module.exports = TestHelpers;
