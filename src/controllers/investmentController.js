const { User, Investment, Transaction } = require('../models');
const financeAPI = require('../services/financeAPI');
const { sequelize } = require('../config/database');

// Get all investments for a user
const getAllInvestments = async (req, res) => {
    try {
        const userId = req.user.id;

        const investments = await Investment.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        // Update current prices and calculate gains/losses
        const updatedInvestments = await Promise.all(
            investments.map(async (investment) => {
                try {
                    const stockData = await financeAPI.getStockPrice(investment.symbol);
                    const currentPrice = stockData ? stockData.price : investment.purchasePrice;
                    
                    // Update investment with current price
                    await investment.update({ currentPrice });

                    const currentValue = currentPrice * investment.quantity;
                    const gainLoss = currentValue - investment.totalInvested;
                    const gainLossPercent = investment.totalInvested > 0 ? 
                        (gainLoss / investment.totalInvested) * 100 : 0;

                    return {
                        ...investment.toJSON(),
                        currentPrice: parseFloat(currentPrice),
                        currentValue: parseFloat(currentValue.toFixed(2)),
                        gainLoss: parseFloat(gainLoss.toFixed(2)),
                        gainLossPercent: parseFloat(gainLossPercent.toFixed(2)),
                        companyName: stockData?.shortName || investment.companyName
                    };
                } catch (error) {
                    console.error(`Error updating price for ${investment.symbol}:`, error);
                    
                    const currentValue = investment.purchasePrice * investment.quantity;
                    return {
                        ...investment.toJSON(),
                        currentPrice: parseFloat(investment.purchasePrice),
                        currentValue: parseFloat(currentValue.toFixed(2)),
                        gainLoss: 0,
                        gainLossPercent: 0
                    };
                }
            })
        );

        res.json({
            success: true,
            data: updatedInvestments
        });

    } catch (error) {
        console.error('Error getting investments:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving investments'
        });
    }
};

// Get specific investment by ID
const getInvestmentById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const investment = await Investment.findOne({
            where: { id, userId }
        });

        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Investment not found'
            });
        }

        // Get current stock price
        try {
            const stockData = await financeAPI.getStockPrice(investment.symbol);
            const currentPrice = stockData ? stockData.price : investment.purchasePrice;
            
            await investment.update({ currentPrice });

            const currentValue = currentPrice * investment.quantity;
            const gainLoss = currentValue - investment.totalInvested;
            const gainLossPercent = investment.totalInvested > 0 ? 
                (gainLoss / investment.totalInvested) * 100 : 0;

            res.json({
                success: true,
                data: {
                    ...investment.toJSON(),
                    currentPrice: parseFloat(currentPrice),
                    currentValue: parseFloat(currentValue.toFixed(2)),
                    gainLoss: parseFloat(gainLoss.toFixed(2)),
                    gainLossPercent: parseFloat(gainLossPercent.toFixed(2)),
                    companyName: stockData?.shortName || investment.companyName
                }
            });
        } catch (error) {
            console.error(`Error getting current price for ${investment.symbol}:`, error);
            res.json({
                success: true,
                data: investment.toJSON()
            });
        }

    } catch (error) {
        console.error('Error getting investment:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving investment'
        });
    }
};

// Create new investment (buy stocks)
const createInvestment = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { symbol, quantity } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!symbol || !quantity || quantity <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Symbol and valid quantity are required'
            });
        }

        // Get current stock price
        const stockData = await financeAPI.getStockPrice(symbol.toUpperCase());
        if (!stockData) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Could not get stock price'
            });
        }

        const currentPrice = stockData.price;
        const totalCost = currentPrice * quantity;

        // Get user's current cash balance
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user has enough cash
        if (parseFloat(user.cashBalance) < totalCost) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Insufficient funds. You need $${totalCost.toFixed(2)} but only have $${parseFloat(user.cashBalance).toFixed(2)}`
            });
        }

        // Check if user already has this stock
        let investment = await Investment.findOne({
            where: { userId, symbol: symbol.toUpperCase() },
            transaction
        });

        if (investment) {
            // Update existing investment (average price calculation)
            const newTotalQuantity = investment.quantity + quantity;
            const newTotalInvested = investment.totalInvested + totalCost;
            const newAveragePrice = newTotalInvested / newTotalQuantity;

            await investment.update({
                quantity: newTotalQuantity,
                purchasePrice: newAveragePrice,
                totalInvested: newTotalInvested,
                currentPrice: currentPrice,
                companyName: stockData.shortName || investment.companyName
            }, { transaction });
        } else {
            // Create new investment
            investment = await Investment.create({
                userId,
                symbol: symbol.toUpperCase(),
                companyName: stockData.shortName,
                quantity,
                purchasePrice: currentPrice,
                currentPrice,
                totalInvested: totalCost,
                purchaseDate: new Date()
            }, { transaction });
        }

        // Update user's cash balance
        const newCashBalance = parseFloat(user.cashBalance) - totalCost;
        await user.update({ cashBalance: newCashBalance }, { transaction });

        // Record transaction
        await Transaction.create({
            userId,
            symbol: symbol.toUpperCase(),
            transactionType: 'BUY',
            quantity,
            price: currentPrice,
            totalAmount: totalCost,
            transactionDate: new Date()
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: `Successfully purchased ${quantity} shares of ${symbol.toUpperCase()} for $${totalCost.toFixed(2)}`,
            data: {
                investment: investment.toJSON(),
                remainingCash: newCashBalance,
                transactionDetails: {
                    symbol: symbol.toUpperCase(),
                    quantity,
                    pricePerShare: currentPrice,
                    totalCost
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error creating investment:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing purchase'
        });
    }
};

// Sell stock
const sellInvestment = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { id } = req.params;
        const { quantity } = req.body;
        const userId = req.user.id;

        // Convert and validate quantity
        const sellQuantity = parseInt(quantity);
        if (!sellQuantity || sellQuantity <= 0 || isNaN(sellQuantity)) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Valid quantity is required for sale'
            });
        }

        // Find the investment with explicit lock
        const investment = await Investment.findOne({
            where: { id: id, userId: userId },
            transaction: t,
            lock: true // Add explicit lock to prevent race conditions
        });

        if (!investment) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                message: 'Investment not found'
            });
        }

        const investmentQuantity = parseInt(investment.quantity);
        if (sellQuantity > investmentQuantity) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Cannot sell ${sellQuantity} shares. You only own ${investmentQuantity} shares.`
            });
        }

        // Get current price
        const currentStockData = await financeAPI.getStockPrice(investment.symbol);
        const currentPrice = currentStockData ? parseFloat(currentStockData.price.toFixed(2)) : parseFloat(investment.currentPrice);
        
        // Calculate sale values with proper decimal handling
        const saleValue = parseFloat((currentPrice * sellQuantity).toFixed(2));
        const totalInvested = parseFloat(investment.totalInvested);
        const proportionalInvested = parseFloat(((totalInvested / investmentQuantity) * sellQuantity).toFixed(2));
        const profitLoss = parseFloat((saleValue - proportionalInvested).toFixed(2));
        const profitLossPercent = proportionalInvested > 0 ? parseFloat(((profitLoss / proportionalInvested) * 100).toFixed(2)) : 0;

        console.log('Sell calculation debug:', {
            investmentId: id,
            sellQuantity,
            investmentQuantity,
            currentPrice,
            saleValue,
            totalInvested,
            proportionalInvested,
            profitLoss,
            profitLossPercent
        });

        // Update user cash balance
        const user = await User.findByPk(userId, { transaction: t, lock: true });
        const currentCashBalance = parseFloat(user.cashBalance || 0);
        const newCashBalance = parseFloat((currentCashBalance + saleValue).toFixed(2));
        
        await user.update({
            cashBalance: newCashBalance
        }, { transaction: t });

        // Record transaction first
        await Transaction.create({
            userId: userId,
            symbol: investment.symbol,
            transactionType: 'SELL',
            quantity: sellQuantity,
            price: currentPrice,
            totalAmount: saleValue,
            transactionDate: new Date()
        }, { transaction: t });

        // Handle investment update/deletion
        if (sellQuantity === investmentQuantity) {
            // Sell all shares - delete investment
            await investment.destroy({ transaction: t });
        } else {
            // Partial sale - update investment with recalculated values
            const remainingQuantity = investmentQuantity - sellQuantity;
            const remainingTotalInvested = parseFloat((totalInvested - proportionalInvested).toFixed(2));
            
            // Recalculate average purchase price for remaining shares
            const newAveragePrice = remainingQuantity > 0 ? 
                parseFloat((remainingTotalInvested / remainingQuantity).toFixed(2)) : 
                parseFloat(investment.purchasePrice);

            console.log('Investment update debug:', {
                remainingQuantity,
                remainingTotalInvested,
                newAveragePrice
            });

            await investment.update({
                quantity: remainingQuantity,
                totalInvested: remainingTotalInvested,
                purchasePrice: newAveragePrice,
                currentPrice: currentPrice
            }, { transaction: t });
        }

        await t.commit();

        res.json({
            success: true,
            message: `Successfully sold ${sellQuantity} shares of ${investment.symbol}`,
            data: {
                saleDetails: {
                    symbol: investment.symbol,
                    quantitySold: sellQuantity,
                    pricePerShare: currentPrice,
                    totalReceived: saleValue,
                    profitLoss: profitLoss,
                    profitLossPercent: profitLossPercent
                },
                newCashBalance: newCashBalance,
                remainingShares: sellQuantity === investmentQuantity ? 0 : investmentQuantity - sellQuantity
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error selling investment:', error);
        
        // Log additional debug info for decimal errors
        if (error.message && error.message.includes('decimal')) {
            console.error('Decimal error details:', {
                params: req.params,
                body: req.body,
                userId: req.user.id
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error processing sale. Please try again.'
        });
    }
};

// Delete investment
const deleteInvestment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const investment = await Investment.findOne({
            where: { id, userId }
        });

        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Investment not found'
            });
        }

        await investment.destroy();

        res.json({
            success: true,
            message: 'Investment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting investment:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting investment'
        });
    }
};

// Get cash balance
const getCashBalance = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                cashBalance: parseFloat(user.cashBalance),
                userId
            }
        });

    } catch (error) {
        console.error('Error getting cash balance:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving cash balance'
        });
    }
};

// Add cash to account
const addCash = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount is required'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update cash balance
        const newBalance = parseFloat(user.cashBalance) + parseFloat(amount);
        await user.update({ cashBalance: newBalance });

        res.json({
            success: true,
            message: `$${parseFloat(amount).toFixed(2)} successfully added to your account`,
            data: {
                newBalance: parseFloat(newBalance.toFixed(2)),
                addedAmount: parseFloat(amount)
            }
        });

    } catch (error) {
        console.error('Error adding cash:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding funds to account'
        });
    }
};

// Get transaction history
const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0, type } = req.query;

        const whereClause = { userId };
        if (type && ['BUY', 'SELL'].includes(type.toUpperCase())) {
            whereClause.transactionType = type.toUpperCase();
        }

        const transactions = await Transaction.findAndCountAll({
            where: whereClause,
            order: [['transactionDate', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: {
                transactions: transactions.rows,
                totalCount: transactions.count,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: transactions.count > (parseInt(offset) + parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error getting transaction history:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving transaction history'
        });
    }
};

const buyInvestment = async (req, res) => {
    const t = await sequelize.transaction();
    
    try {
        const { symbol, quantity } = req.body;
        const userId = req.user.id;

        // Convert to numbers immediately and validate
        const purchaseQuantity = parseInt(quantity);
        if (isNaN(purchaseQuantity) || purchaseQuantity <= 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Valid numeric quantity is required'
            });
        }

        // Get current stock price
        const stockData = await financeAPI.getStockPrice(symbol);
        if (!stockData) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Could not get stock price. Please try again.'
            });
        }

        // Ensure price is a number and calculate total cost
        const stockPrice = parseFloat(stockData.price);
        if (isNaN(stockPrice) || stockPrice <= 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid stock price received'
            });
        }

        const totalCost = parseFloat((stockPrice * purchaseQuantity).toFixed(2));

        // Check if user has enough cash with lock
        const user = await User.findByPk(userId, { transaction: t, lock: true });
        const userCashBalance = parseFloat(user.cashBalance || 0);
        
        if (userCashBalance < totalCost) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: 'Insufficient funds to complete this purchase',
                currentBalance: userCashBalance
            });
        }

        // Check if user already has this investment with lock
        let investment = await Investment.findOne({
            where: { userId: userId, symbol: symbol },
            transaction: t,
            lock: true
        });

        if (investment) {
            // Update existing investment - Convert all values to numbers first
            const existingTotalInvested = parseFloat(investment.totalInvested || 0);
            const existingQuantity = parseInt(investment.quantity || 0);
            
            // Calculate new values
            const newTotalInvested = parseFloat((existingTotalInvested + totalCost).toFixed(2));
            const newQuantity = existingQuantity + purchaseQuantity;
            const newAveragePrice = parseFloat((newTotalInvested / newQuantity).toFixed(2));

            console.log('Investment update calculation:', {
                existingTotalInvested,
                existingQuantity,
                totalCost,
                purchaseQuantity,
                newTotalInvested,
                newQuantity,
                newAveragePrice
            });

            await investment.update({
                quantity: newQuantity,
                purchasePrice: newAveragePrice,
                totalInvested: newTotalInvested,
                currentPrice: parseFloat(stockPrice.toFixed(2))
            }, { transaction: t });
        } else {
            // Create new investment
            investment = await Investment.create({
                userId: userId,
                symbol: symbol,
                companyName: stockData.shortName || `${symbol} Inc.`,
                quantity: purchaseQuantity,
                purchasePrice: parseFloat(stockPrice.toFixed(2)),
                currentPrice: parseFloat(stockPrice.toFixed(2)),
                totalInvested: totalCost,
                purchaseDate: new Date()
            }, { transaction: t });
        }

        // Update user cash balance
        const newCashBalance = parseFloat((userCashBalance - totalCost).toFixed(2));
        await user.update({
            cashBalance: newCashBalance
        }, { transaction: t });

        // Record transaction
        await Transaction.create({
            userId: userId,
            symbol: symbol,
            transactionType: 'BUY',
            quantity: purchaseQuantity,
            price: parseFloat(stockPrice.toFixed(2)),
            totalAmount: totalCost,
            transactionDate: new Date()
        }, { transaction: t });

        await t.commit();

        res.json({
            success: true,
            message: `Successfully purchased ${purchaseQuantity} shares of ${symbol}`,
            data: {
                investment: {
                    id: investment.id,
                    symbol: symbol,
                    quantity: investment.quantity,
                    purchasePrice: investment.purchasePrice,
                    totalInvested: investment.totalInvested
                },
                remainingCash: newCashBalance,
                transactionDetails: {
                    symbol: symbol,
                    quantity: purchaseQuantity,
                    pricePerShare: stockPrice,
                    totalCost: totalCost
                }
            }
        });

    } catch (error) {
        await t.rollback();
        console.error('Error buying investment:', error);
        
        // Log additional debug info for decimal errors
        if (error.message && error.message.includes('decimal')) {
            console.error('Decimal error details:', {
                body: req.body,
                userId: req.user.id
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error processing purchase. Please try again.'
        });
    }
};

module.exports = {
    getAllInvestments,
    getInvestmentById,
    createInvestment,
    sellInvestment,
    deleteInvestment,
    getCashBalance,
    addCash,
    getTransactionHistory,
    buyInvestment
};