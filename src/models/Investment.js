const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Investment = sequelize.define('Investment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    symbol: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        get() {
            return parseInt(this.getDataValue('quantity')) || 0;
        },
        set(value) {
            this.setDataValue('quantity', parseInt(value) || 0);
        }
    },
    purchasePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        get() {
            const value = this.getDataValue('purchasePrice');
            return value ? parseFloat(value) : 0;
        },
        set(value) {
            this.setDataValue('purchasePrice', parseFloat(value) || 0);
        }
    },
    currentPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        get() {
            const value = this.getDataValue('currentPrice');
            return value ? parseFloat(value) : 0;
        },
        set(value) {
            this.setDataValue('currentPrice', parseFloat(value) || 0);
        }
    },
    purchaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    totalInvested: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        get() {
            const value = this.getDataValue('totalInvested');
            return value ? parseFloat(value) : 0;
        },
        set(value) {
            this.setDataValue('totalInvested', parseFloat(value) || 0);
        }
    }
}, {
    tableName: 'investments',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'symbol']
        }
    ]
});

module.exports = Investment;