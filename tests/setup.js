const { sequelize } = require('../src/config/database');
require('dotenv').config();

// Test database setup
const setupTestDatabase = async () => {
    try {
        console.log('Setting up test database...');
        
        // Use test database
        process.env.DB_NAME = process.env.DB_NAME_TEST || 'portfolio_management_test';
        
        // Force sync database for tests
        await sequelize.sync({ force: true });
        
        console.log('Test database setup completed');
    } catch (error) {
        console.error('Test database setup failed:', error);
        throw error;
    }
};

const teardownTestDatabase = async () => {
    try {
        console.log('Tearing down test database...');
        await sequelize.close();
        console.log('Test database closed');
    } catch (error) {
        console.error('Test database teardown failed:', error);
    }
};

module.exports = {
    setupTestDatabase,
    teardownTestDatabase
};
