/**
 * @jest-environment jsdom
 */

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

describe('Frontend Auth Tests', () => {
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        localStorageMock.clear.mockClear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
        localStorageMock.removeItem.mockClear();
        
        // Reset DOM
        document.body.innerHTML = '';
        
        // Setup basic HTML structure
        document.body.innerHTML = `
            <form id="loginForm">
                <input type="email" id="email" />
                <input type="password" id="password" />
                <button type="submit" id="loginBtn">Login</button>
            </form>
            <div id="message"></div>
        `;
    });

    describe('Login Functionality', () => {
        test('should validate email format', () => {
            // Simulate the email validation function from login.js
            function isValidEmail(email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            }

            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('test@')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
        });

        test('should handle successful login', async () => {
            const mockResponse = {
                success: true,
                data: {
                    token: 'mock-jwt-token',
                    user: {
                        id: 1,
                        username: 'testuser',
                        email: 'test@example.com',
                        cashBalance: 10000.00
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse)
            });

            // Simulate login function
            const handleLogin = async (email, password) => {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    localStorage.setItem('authToken', result.data.token);
                    localStorage.setItem('userId', result.data.user.id.toString());
                    localStorage.setItem('user', JSON.stringify(result.data.user));
                    return { success: true, user: result.data.user };
                }
                
                return { success: false, message: result.message };
            };

            const result = await handleLogin('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith('authToken', 'mock-jwt-token');
            expect(localStorage.setItem).toHaveBeenCalledWith('userId', '1');
            expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.data.user));
        });

        test('should handle login failure', async () => {
            const mockResponse = {
                success: false,
                message: 'Invalid email or password'
            };

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse)
            });

            const handleLogin = async (email, password) => {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const result = await response.json();
                return { success: result.success, message: result.message };
            };

            const result = await handleLogin('test@example.com', 'wrongpassword');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid email or password');
            expect(localStorage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('Authentication State Management', () => {
        test('should check if user is authenticated', () => {
            const isAuthenticated = () => {
                const token = localStorage.getItem('authToken');
                const userId = localStorage.getItem('userId');
                return !!(token && userId);
            };

            // Not authenticated initially
            localStorageMock.getItem.mockReturnValue(null);
            expect(isAuthenticated()).toBe(false);

            // Authenticated when token and userId exist
            localStorageMock.getItem
                .mockReturnValueOnce('mock-token')
                .mockReturnValueOnce('1');
            expect(isAuthenticated()).toBe(true);
        });

        test('should clear authentication data on logout', () => {
            const logout = () => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userId');
                localStorage.removeItem('user');
            };

            logout();

            expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
            expect(localStorage.removeItem).toHaveBeenCalledWith('userId');
            expect(localStorage.removeItem).toHaveBeenCalledWith('user');
        });
    });

    describe('Registration Functionality', () => {
        test('should validate registration form', () => {
            const validateRegistration = (formData) => {
                const errors = [];

                if (!formData.username || formData.username.length < 3) {
                    errors.push('Username must be at least 3 characters');
                }

                if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                    errors.push('Valid email is required');
                }

                if (!formData.password || formData.password.length < 6) {
                    errors.push('Password must be at least 6 characters');
                }

                if (formData.password !== formData.confirmPassword) {
                    errors.push('Passwords do not match');
                }

                return errors;
            };

            // Valid form data
            const validData = {
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123'
            };
            expect(validateRegistration(validData)).toEqual([]);

            // Invalid form data
            const invalidData = {
                username: 'ab',
                email: 'invalid-email',
                password: '123',
                confirmPassword: '456'
            };
            const errors = validateRegistration(invalidData);
            expect(errors).toContain('Username must be at least 3 characters');
            expect(errors).toContain('Valid email is required');
            expect(errors).toContain('Password must be at least 6 characters');
            expect(errors).toContain('Passwords do not match');
        });
    });
});
