const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const { Op } = require('sequelize');

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { userId, iat: Date.now() },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

// Register new user
const register = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, cashBalance } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { username: username }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate cash balance (ensure numeric)
        const initialCashBalance = parseFloat(cashBalance) || 0;
        if (initialCashBalance < 0) {
            return res.status(400).json({
                success: false,
                message: 'Initial balance cannot be negative'
            });
        }

        // Create new user
        const newUser = await User.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password,
            firstName: firstName?.trim(),
            lastName: lastName?.trim(),
            cashBalance: initialCashBalance
        });

        // Generate token
        const token = generateToken(newUser.id);

        // Update last login
        await newUser.update({ lastLoginAt: new Date() });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: newUser.toJSON()
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid input data',
                errors: error.errors.map(e => e.message)
            });
        }
        
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                message: 'User with this email or username already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Update last login
        await user.update({ lastLoginAt: new Date() });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: user.toJSON()
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Get user profile
const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting user profile'
        });
    }
};

// Refresh token
const refreshToken = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Generate new token
        const token = generateToken(user.id);

        res.json({
            success: true,
            data: {
                token,
                user: user.toJSON()
            }
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error refreshing token'
        });
    }
};

// Logout (client-side mostly, but we can blacklist tokens in future)
const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout'
        });
    }
};

// Verify token endpoint
const verify = async (req, res) => {
    try {
        // If we reach this point, token is valid (middleware verified it)
        res.json({
            success: true,
            data: {
                user: req.user.toJSON()
            }
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying token'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        await user.update({ password: newPassword });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password'
        });
    }
};

// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            // Don't reveal that user doesn't exist
            return res.json({
                success: true,
                message: 'If the email exists, you will receive instructions to reset your password'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await user.update({
            resetPasswordToken: resetToken,
            resetPasswordExpires: resetTokenExpiry
        });

        // In a real app, you would send an email here
        // For demo purposes, we'll return the reset link
        const resetLink = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

        res.json({
            success: true,
            message: 'Password reset instructions sent to email',
            resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
        });

    } catch (error) {
        console.error('Request password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request'
        });
    }
};

// Verify reset token
const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        res.json({
            success: true,
            data: {
                email: user.email
            }
        });

    } catch (error) {
        console.error('Verify reset token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying token'
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Update password and clear reset token
        await user.update({
            password: newPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        });

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    refreshToken,
    logout,
    verify,
    changePassword,
    requestPasswordReset,
    verifyResetToken,
    resetPassword
};