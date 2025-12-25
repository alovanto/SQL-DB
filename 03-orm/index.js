/**
 * LAB SQL - MODEL INDEX
 * Định nghĩa relationships giữa các models
 */

const { sequelize } = require('./config');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Order = require('./models/Order');
const OrderItem = require('./models/OrderItem');
const Review = require('./models/Review');

// ============================================
// ĐỊNH NGHĨA RELATIONSHIPS
// ============================================

// User - Order (1:N)
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - Review (1:N)
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category - Product (1:N)
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Product - Review (1:N)
Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Order - OrderItem (1:N)
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Product - OrderItem (1:N)
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Order - Product (N:M thông qua OrderItem)
Order.belongsToMany(Product, { through: OrderItem, foreignKey: 'order_id', as: 'products' });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: 'product_id', as: 'orders' });

// ============================================
// EXPORT TẤT CẢ
// ============================================
module.exports = {
    sequelize,
    User,
    Category,
    Product,
    Order,
    OrderItem,
    Review
};
