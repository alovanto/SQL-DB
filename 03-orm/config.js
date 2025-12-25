/**
 * LAB SQL - SEQUELIZE CONFIG
 * Cấu hình kết nối ORM
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Tạo instance Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false, // Tắt log SQL (bật: console.log)
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true, // Dùng snake_case cho columns
            freezeTableName: true // Không đổi tên bảng thành số nhiều
        }
    }
);

// Test connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Sequelize kết nối MySQL thành công!');
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối:', error.message);
        return false;
    }
}

module.exports = { sequelize, testConnection };
