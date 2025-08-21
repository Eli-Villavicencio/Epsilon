const financeAPI = require('../services/financeAPI');

// Get market overview data
const getMarketData = async (req, res) => {
    try {
        const marketData = await financeAPI.getMarketData();
        
        res.json({
            success: true,
            data: marketData,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching market data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching market data'
        });
    }
};

// Get stock price by symbol
const getStockPrice = async (req, res) => {
    try {
        const { symbol } = req.params;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: 'Action Symbol required'
            });
        }

        const stockData = await financeAPI.getStockPrice(symbol.toUpperCase());
        
        if (stockData) {
            res.json({
                success: true,
                data: stockData
            });
        } else {
            res.status(404).json({
                success: false,
                message: `No data found for the symbol. ${symbol}`
            });
        }
    } catch (error) {
        console.error(`Error fetching stock price for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stock price'
        });
    }
};

// Search stocks
const searchStocks = async (req, res) => {
    try {
        const { query } = req.query;
        console.log(`📍 Search request received: "${query}"`);
        
        if (!query || query.trim().length < 1) {
            return res.json({
                success: true,
                data: [],
                message: 'Empty Query'
            });
        }

        // Search using finance API
        const searchResults = await financeAPI.searchStocks(query.trim());
        console.log(`📍 Search results count: ${searchResults.length}`);
        
        res.json({
            success: true,
            data: searchResults,
            query: query.trim(),
            resultCount: searchResults.length
        });

    } catch (error) {
        console.error('Error searching stocks:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching stocks'
        });
    }
};

// Get historical data for a stock
const getHistoricalData = async (req, res) => {
    try {
        const { symbol } = req.params;
        const { period = '1mo', interval = '1d' } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: 'Action Symbol required'
            });
        }

        const historicalData = await financeAPI.getHistoricalData(
            symbol.toUpperCase(), 
            period, 
            interval
        );
        
        res.json({
            success: true,
            data: historicalData
        });
    } catch (error) {
        console.error(`Error fetching historical data for ${req.params.symbol}:`, error);
        res.status(500).json({
            success: false,
            message: 'Error fetching historical data'
        });
    }
};

// Get market moves/trending stocks
const getMarketMoves = async (req, res) => {
    try {
        // Get top moving stocks
        const popularSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
        
        const stockPromises = popularSymbols.map(async (symbol) => {
            try {
                return await financeAPI.getStockPrice(symbol);
            } catch (error) {
                console.error(`Error fetching ${symbol}:`, error);
                return null;
            }
        });

        const stocks = await Promise.all(stockPromises);
        const validStocks = stocks.filter(Boolean);

        // Sort by percentage change
        const gainers = validStocks
            .filter(stock => stock.changePercent > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 5);

        const losers = validStocks
            .filter(stock => stock.changePercent < 0)
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 5);

        const mostActive = validStocks
            .sort((a, b) => (b.volume || 0) - (a.volume || 0))
            .slice(0, 5);

        res.json({
            success: true,
            data: {
                gainers,
                losers,
                mostActive,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error fetching market moves:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching market moves'
        });
    }
};

// Get top stocks
const getTopStocks = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const topStocks = await financeAPI.getTopStocks(parseInt(limit));
        
        res.json({
            success: true,
            data: topStocks,
            message: `Top ${topStocks.length} stocks retrieved successfully`
        });
    } catch (error) {
        console.error('Error fetching top stocks:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving top stocks'
        });
    }
};

// Debug endpoint for testing stock prices
const debugStockPrice = async (req, res) => {
    try {
        const { symbol } = req.params;
        const testSymbol = symbol || 'AAPL';
        
        console.log(`Debug: Fetching data for ${testSymbol}`);
        
        const stockData = await financeAPI.getStockPrice(testSymbol);
        
        res.json({
            success: true,
            debug: true,
            symbol: testSymbol,
            data: stockData,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            debug: true,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    getMarketData,
    getStockPrice,
    searchStocks,
    getHistoricalData,
    getMarketMoves,
    getTopStocks,
    debugStockPrice
};