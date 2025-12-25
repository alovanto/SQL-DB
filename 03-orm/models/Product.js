/**
 * LAB SQL - MODEL: PRODUCT
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config');

const Product = sequelize.define('products', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'categories',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
            notEmpty: true,
            len: [2, 200]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    sale_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
            min: 0,
            // Custom validation: sale_price < price
            lessThanPrice(value) {
                if (value && parseFloat(value) >= parseFloat(this.price)) {
                    throw new Error('Giá sale phải nhỏ hơn giá gốc!');
                }
            }
        }
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    image_url: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'products',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Virtual field: Giá hiển thị
Product.prototype.getDisplayPrice = function() {
    return this.sale_price || this.price;
};

// Virtual field: % giảm giá
Product.prototype.getDiscountPercent = function() {
    if (!this.sale_price) return 0;
    return Math.round((1 - this.sale_price / this.price) * 100);
};

module.exports = Product;
