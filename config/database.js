const mysql = require('mysql2/promise');
require('dotenv').config();

// Cấu hình kết nối MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
};

// Tạo connection pool (tốt hơn cho production)
const pool = mysql.createPool(dbConfig);

// Hàm test kết nối
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Kết nối MySQL thành công!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối MySQL:', error.message);
        return false;
    }
}

module.exports = { pool, dbConfig, testConnection };
