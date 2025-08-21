const { User, Investment, Transaction } = require('../models');
const financeAPI = require('../services/financeAPI');
const { Op } = require('sequelize');

// Get complete portfolio details
const getPortfolioDetails = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's cash balance
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get all investments
        const investments = await Investment.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        // Initialize portfolio metrics with proper numeric values
        let totalInvested = 0;
        let currentPortfolioValue = 0;
        let totalGainLoss = 0;
        const investmentDetails = [];

        // Process each investment
        for (const investment of investments) {
            try {
                // Get current stock price
                const stockData = await financeAPI.getStockPrice(investment.symbol);
                const currentPrice = stockData ? stockData.price : investment.purchasePrice;
                
                // Update investment with current price
                await investment.update({ currentPrice });

                // Ensure numeric values for calculations
                const quantity = parseInt(investment.quantity) || 0;
                const purchasePrice = parseFloat(investment.purchasePrice) || 0;
                const investedAmount = parseFloat(investment.totalInvested) || 0;
                const currentPriceNum = parseFloat(currentPrice) || purchasePrice;

                // Calculate metrics for this investment
                const currentValue = currentPriceNum * quantity;
                const gainLoss = currentValue - investedAmount;
                const gainLossPercent = investedAmount > 0 ? (gainLoss / investedAmount) * 100 : 0;

                // Add to totals (ensure numeric addition)
                totalInvested = (totalInvested || 0) + investedAmount;
                currentPortfolioValue = (currentPortfolioValue || 0) + currentValue;

                investmentDetails.push({
                    id: investment.id,
                    symbol: investment.symbol,
                    companyName: investment.companyName || stockData?.shortName || investment.symbol,
                    quantity: quantity,
                    purchasePrice: parseFloat(purchasePrice.toFixed(2)),
                    currentPrice: parseFloat(currentPriceNum.toFixed(2)),
                    totalInvested: parseFloat(investedAmount.toFixed(2)),
                    currentValue: parseFloat(currentValue.toFixed(2)),
                    gainLoss: parseFloat(gainLoss.toFixed(2)),
                    gainLossPercent: parseFloat(gainLossPercent.toFixed(2)),
                    purchaseDate: investment.purchaseDate
                });
            } catch (error) {
                console.error(`Error processing investment ${investment.symbol}:`, error);
                
                // Use stored values if API fails (with proper numeric conversion)
                const quantity = parseInt(investment.quantity) || 0;
                const purchasePrice = parseFloat(investment.purchasePrice) || 0;
                const investedAmount = parseFloat(investment.totalInvested) || 0;
                const currentValue = purchasePrice * quantity;
                
                totalInvested = (totalInvested || 0) + investedAmount;
                currentPortfolioValue = (currentPortfolioValue || 0) + currentValue;

                investmentDetails.push({
                    id: investment.id,
                    symbol: investment.symbol,
                    companyName: investment.companyName || investment.symbol,
                    quantity: quantity,
                    purchasePrice: parseFloat(purchasePrice.toFixed(2)),
                    currentPrice: parseFloat(purchasePrice.toFixed(2)),
                    totalInvested: parseFloat(investedAmount.toFixed(2)),
                    currentValue: parseFloat(currentValue.toFixed(2)),
                    gainLoss: 0,
                    gainLossPercent: 0,
                    purchaseDate: investment.purchaseDate,
                    priceError: true
                });
            }
        }

        // Ensure all totals are numeric before calculations
        totalInvested = parseFloat(totalInvested) || 0;
        currentPortfolioValue = parseFloat(currentPortfolioValue) || 0;
        totalGainLoss = currentPortfolioValue - totalInvested;
        const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
        
        // User cash balance (ensure numeric)
        const cashBalance = parseFloat(user.cashBalance) || 0;
        const totalPortfolioValue = currentPortfolioValue + cashBalance;

        res.json({
            success: true,
            data: {
                userId: userId,
                cashBalance: parseFloat(cashBalance.toFixed(2)),
                totalInvested: parseFloat(totalInvested.toFixed(2)),
                currentPortfolioValue: parseFloat(currentPortfolioValue.toFixed(2)),
                totalPortfolioValue: parseFloat(totalPortfolioValue.toFixed(2)),
                totalGainLoss: parseFloat(totalGainLoss.toFixed(2)),
                totalGainLossPercent: parseFloat(totalGainLossPercent.toFixed(2)),
                investmentCount: investments.length,
                investments: investmentDetails,
                lastUpdated: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error getting portfolio details:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving portfolio details',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get net investment over time
const getNetInvestment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = '1y' } = req.query;

        // Get transactions for the period
        const transactions = await Transaction.findAll({
            where: { userId },
            order: [['transactionDate', 'ASC']]
        });

        const netInvestmentData = [];
        let cumulativeInvestment = 0;

        transactions.forEach(transaction => {
            if (transaction.transactionType === 'BUY') {
                cumulativeInvestment += parseFloat(transaction.totalAmount);
            } else if (transaction.transactionType === 'SELL') {
                cumulativeInvestment -= parseFloat(transaction.totalAmount);
            }

            netInvestmentData.push({
                date: transaction.transactionDate,
                netInvestment: parseFloat(cumulativeInvestment.toFixed(2)),
                transactionType: transaction.transactionType,
                amount: parseFloat(transaction.totalAmount)
            });
        });

        res.json({
            success: true,
            data: {
                period,
                netInvestmentData,
                currentNetInvestment: parseFloat(cumulativeInvestment.toFixed(2))
            }
        });

    } catch (error) {
        console.error('Error getting net investment:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving net investment data'
        });
    }
};

// Get cash flow over time
const getCashFlow = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get transactions for cash flow analysis
        const transactions = await Transaction.findAll({
            where: { userId },
            order: [['transactionDate', 'ASC']]
        });

        const cashFlowData = [];
        let runningBalance = 0;

        transactions.forEach(transaction => {
            let cashFlow = 0;
            
            if (transaction.transactionType === 'BUY') {
                cashFlow = -parseFloat(transaction.totalAmount); // Cash out
            } else if (transaction.transactionType === 'SELL') {
                cashFlow = parseFloat(transaction.totalAmount); // Cash in
            }

            runningBalance += cashFlow;

            cashFlowData.push({
                date: transaction.transactionDate,
                cashFlow: parseFloat(cashFlow.toFixed(2)),
                runningBalance: parseFloat(runningBalance.toFixed(2)),
                transactionType: transaction.transactionType,
                symbol: transaction.symbol
            });
        });

        res.json({
            success: true,
            data: {
                cashFlowData,
                totalCashFlow: parseFloat(runningBalance.toFixed(2)),
                transactionCount: transactions.length
            }
        });

    } catch (error) {
        console.error('Error getting cash flow:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving cash flow data'
        });
    }
};

module.exports = {
    getPortfolioDetails,
    getNetInvestment,
    getCashFlow
};