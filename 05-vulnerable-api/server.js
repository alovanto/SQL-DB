/**
 * ⚠️ VULNERABLE API - CHỈ DÙNG ĐỂ HỌC TẬP SQLi!
 * ⚠️ KHÔNG BAO GIỜ DEPLOY CODE NÀY LÊN PRODUCTION!
 * 
 * Chạy: node 05-vulnerable-api/server.js
 * Truy cập: http://localhost:3000
 */

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    multipleStatements: true  // ⚠️ Cho phép multiple statements (nguy hiểm!)
};

let pool;

async function initDB() {
    pool = mysql.createPool(dbConfig);
    console.log('✅ Connected to MySQL');
}

// ============================================================
// ⚠️ VULNERABLE ENDPOINTS - CỐ TÌNH CÓ LỖI!
// ============================================================

/**
 * 🔓 VULNERABLE LOGIN - SQL Injection
 * 
 * Cách khai thác:
 * - Username: admin'--
 * - Username: ' OR '1'='1'--
 * - Username: ' OR 1=1#
 */
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // ❌ VULNERABLE: String concatenation
    const sql = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;
    
    console.log('\n🔴 [VULNERABLE] Login Query:');
    console.log(sql);
    
    try {
        const [rows] = await pool.query(sql);
        
        if (rows.length > 0) {
            res.json({ 
                success: true, 
                message: 'Đăng nhập thành công!',
                user: rows[0],
                debug: { query: sql }
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Sai username hoặc password!',
                debug: { query: sql }
            });
        }
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: { query: sql }
        });
    }
});

/**
 * 🔓 VULNERABLE SEARCH - SQL Injection
 * 
 * Cách khai thác:
 * - search=' OR '1'='1
 * - search=' UNION SELECT id,username,password,email,phone,role,1,1,1,1,1 FROM users--
 * - search=test'; DROP TABLE products;--
 */
app.get('/api/products', async (req, res) => {
    const { search, category, sort } = req.query;
    
    // ❌ VULNERABLE: String concatenation
    let sql = `SELECT p.*, c.name as category_name 
               FROM products p 
               LEFT JOIN categories c ON p.category_id = c.id 
               WHERE 1=1`;
    
    if (search) {
        sql += ` AND (p.name LIKE '%${search}%' OR p.description LIKE '%${search}%')`;
    }
    
    if (category) {
        sql += ` AND p.category_id = ${category}`;
    }
    
    if (sort) {
        sql += ` ORDER BY ${sort}`;  // ❌ ORDER BY injection
    } else {
        sql += ` ORDER BY p.id`;
    }
    
    console.log('\n🔴 [VULNERABLE] Search Query:');
    console.log(sql);
    
    try {
        const [rows] = await pool.query(sql);
        res.json({ 
            success: true, 
            count: rows.length,
            products: rows,
            debug: { query: sql }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: { query: sql }
        });
    }
});

/**
 * 🔓 VULNERABLE USER PROFILE - IDOR + SQL Injection
 * 
 * Cách khai thác:
 * - /api/users/1 OR 1=1
 * - /api/users/1 UNION SELECT * FROM users
 */
app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    
    // ❌ VULNERABLE: Không validate input, string concatenation
    const sql = `SELECT id, username, email, full_name, phone, role FROM users WHERE id = ${id}`;
    
    console.log('\n🔴 [VULNERABLE] User Query:');
    console.log(sql);
    
    try {
        const [rows] = await pool.query(sql);
        res.json({ 
            success: true, 
            user: rows,
            debug: { query: sql }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: { query: sql }
        });
    }
});

/**
 * 🔓 VULNERABLE ORDER LOOKUP
 * 
 * Cách khai thác:
 * - order_code=' OR '1'='1
 * - order_code=' UNION SELECT * FROM users WHERE '1'='1
 */
app.get('/api/orders/lookup', async (req, res) => {
    const { order_code } = req.query;
    
    // ❌ VULNERABLE
    const sql = `SELECT o.*, u.full_name, u.email 
                 FROM orders o 
                 JOIN users u ON o.user_id = u.id 
                 WHERE o.order_code = '${order_code}'`;
    
    console.log('\n🔴 [VULNERABLE] Order Lookup Query:');
    console.log(sql);
    
    try {
        const [rows] = await pool.query(sql);
        res.json({ 
            success: true, 
            orders: rows,
            debug: { query: sql }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: { query: sql }
        });
    }
});

/**
 * 🔓 VULNERABLE COMMENT/REVIEW
 * 
 * Cách khai thác:
 * - Stored XSS + SQL Injection
 */
app.post('/api/reviews', async (req, res) => {
    const { user_id, product_id, rating, comment } = req.body;
    
    // ❌ VULNERABLE
    const sql = `INSERT INTO reviews (user_id, product_id, rating, comment) 
                 VALUES (${user_id}, ${product_id}, ${rating}, '${comment}')`;
    
    console.log('\n🔴 [VULNERABLE] Review Insert Query:');
    console.log(sql);
    
    try {
        const [result] = await pool.query(sql);
        res.json({ 
            success: true, 
            message: 'Review added!',
            insertId: result.insertId,
            debug: { query: sql }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: { query: sql }
        });
    }
});

/**
 * 🔓 VULNERABLE DELETE
 */
app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    
    // ❌ VULNERABLE
    const sql = `DELETE FROM products WHERE id = ${id}`;
    
    console.log('\n🔴 [VULNERABLE] Delete Query:');
    console.log(sql);
    
    try {
        const [result] = await pool.query(sql);
        res.json({ 
            success: true, 
            message: `Deleted ${result.affectedRows} rows`,
            debug: { query: sql }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: { query: sql }
        });
    }
});

// ============================================================
// HELPER ENDPOINTS
// ============================================================

// Xem tất cả tables (để biết structure)
app.get('/api/debug/tables', async (req, res) => {
    try {
        const [tables] = await pool.query('SHOW TABLES');
        const tableInfo = {};
        
        for (const row of tables) {
            const tableName = Object.values(row)[0];
            const [columns] = await pool.query(`DESCRIBE ${tableName}`);
            tableInfo[tableName] = columns;
        }
        
        res.json({ tables: tableInfo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reset database (nếu bị phá)
app.post('/api/debug/reset', async (req, res) => {
    try {
        // Chạy lại setup script
        res.json({ message: 'Hãy chạy: node 01-sql-basics/setup-database.js' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// START SERVER
// ============================================================

const PORT = 3000;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  ⚠️  VULNERABLE API SERVER - CHỈ DÙNG ĐỂ HỌC TẬP!             ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  🌐 Server: http://localhost:${PORT}                            ║
║  📄 Frontend: http://localhost:${PORT}/index.html               ║
║                                                               ║
║  🔓 Vulnerable Endpoints:                                     ║
║     POST /api/login          - Auth Bypass                    ║
║     GET  /api/products       - Search SQLi                    ║
║     GET  /api/users/:id      - IDOR + SQLi                    ║
║     GET  /api/orders/lookup  - Data Extraction                ║
║     POST /api/reviews        - INSERT Injection               ║
║     DELETE /api/products/:id - DELETE Injection               ║
║                                                               ║
║  🔧 Debug:                                                    ║
║     GET  /api/debug/tables   - Xem cấu trúc DB                ║
║                                                               ║
║  ⚠️  KHÔNG DEPLOY LÊN INTERNET!                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
        `);
    });
});
