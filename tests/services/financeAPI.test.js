const financeAPI = require('../../src/services/financeAPI');

describe('Finance API Service', () => {
    describe('getStockPrice', () => {
        test('should return stock price for valid symbol', async () => {
            const result = await financeAPI.getStockPrice('AAPL');

            expect(result).toBeTruthy();
            expect(result).toHaveProperty('symbol', 'AAPL');
            expect(result).toHaveProperty('price');
            expect(result).toHaveProperty('change');
            expect(result).toHaveProperty('changePercent');
            expect(typeof result.price).toBe('number');
            expect(result.price).toBeGreaterThan(0);
        });

        test('should return data for unknown symbol', async () => {
            const result = await financeAPI.getStockPrice('UNKNOWN');

            expect(result).toBeTruthy();
            expect(result).toHaveProperty('symbol', 'UNKNOWN');
            expect(result).toHaveProperty('price');
            expect(typeof result.price).toBe('number');
        });

        test('should handle null/undefined symbol', async () => {
            const result = await financeAPI.getStockPrice(null);
            expect(result).toBeNull();

            const result2 = await financeAPI.getStockPrice(undefined);
            expect(result2).toBeNull();
        });
    });

    describe('searchStocks', () => {
        test('should return search results for Apple', async () => {
            const results = await financeAPI.searchStocks('Apple');

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
            
            const appleStock = results.find(stock => stock.symbol === 'AAPL');
            expect(appleStock).toBeTruthy();
            expect(appleStock.name).toContain('Apple');
        });

        test('should return results for stock symbol', async () => {
            const results = await financeAPI.searchStocks('GOOGL');

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);

            const googleStock = results.find(stock => stock.symbol === 'GOOGL');
            expect(googleStock).toBeTruthy();
        });

        test('should return empty array for invalid search', async () => {
            const results = await financeAPI.searchStocks('INVALIDSTOCKXYZ123');

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(0);
        });

        test('should handle empty search query', async () => {
            const results = await financeAPI.searchStocks('');

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBe(0);
        });
    });

    describe('getTopStocks', () => {
        test('should return default number of top stocks', async () => {
            const results = await financeAPI.getTopStocks();

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
            expect(results.length).toBeLessThanOrEqual(10);

            results.forEach(stock => {
                expect(stock).toHaveProperty('symbol');
                expect(stock).toHaveProperty('price');
                expect(stock).toHaveProperty('change');
                expect(typeof stock.price).toBe('number');
            });
        });

        test('should return specified number of stocks', async () => {
            const results = await financeAPI.getTopStocks(5);

            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeLessThanOrEqual(5);
        });
    });

    describe('getMarketData', () => {
        test('should return market data with indices', async () => {
            const result = await financeAPI.getMarketData();

            expect(result).toBeTruthy();
            expect(result).toHaveProperty('indices');
            expect(result).toHaveProperty('marketStatus');
            expect(Array.isArray(result.indices)).toBe(true);
            expect(['OPEN', 'CLOSED', 'PRE_MARKET', 'AFTER_HOURS']).toContain(result.marketStatus);
        });
    });

    describe('getHistoricalData', () => {
        test('should return historical data for valid symbol', async () => {
            const result = await financeAPI.getHistoricalData('AAPL', '1mo', '1d');

            expect(result).toBeTruthy();
            expect(result).toHaveProperty('data');
            expect(Array.isArray(result.data)).toBe(true);
            
            if (result.data.length > 0) {
                const dataPoint = result.data[0];
                expect(dataPoint).toHaveProperty('date');
                expect(dataPoint).toHaveProperty('open');
                expect(dataPoint).toHaveProperty('high');
                expect(dataPoint).toHaveProperty('low');
                expect(dataPoint).toHaveProperty('close');
            }
        });

        test('should handle invalid symbol', async () => {
            const result = await financeAPI.getHistoricalData('INVALID', '1mo', '1d');

            expect(result).toBeTruthy();
            expect(result).toHaveProperty('data');
            expect(Array.isArray(result.data)).toBe(true);
        });
    });

    describe('getStockCategory', () => {
        test('should return correct category for known stocks', () => {
            expect(financeAPI.getStockCategory('AAPL')).toBe('Technology');
            expect(financeAPI.getStockCategory('JPM')).toBe('Banking');
            expect(financeAPI.getStockCategory('JNJ')).toBe('Healthcare');
        });

        test('should return default category for unknown stocks', () => {
            expect(financeAPI.getStockCategory('UNKNOWN')).toBe('Other');
        });
    });
});
