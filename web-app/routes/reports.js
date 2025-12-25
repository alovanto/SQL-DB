/**
 * REPORT ROUTES - API cho báo cáo thống kê
 * Base path: /api/reports
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// ============================================
// GET /api/reports/dashboard - Tổng quan
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        // Đếm users
        const [[users]] = await pool.execute('SELECT COUNT(*) as total FROM users');
        
        // Đếm products
        const [[products]] = await pool.execute('SELECT COUNT(*) as total FROM products WHERE is_active = TRUE');
        
        // Đếm orders
        const [[orders]] = await pool.execute('SELECT COUNT(*) as total FROM orders');
        
        // Tổng doanh thu
        const [[revenue]] = await pool.execute(
            "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'paid'"
        );
        
        // Đơn hàng pending
        const [[pending]] = await pool.execute(
            "SELECT COUNT(*) as total FROM orders WHERE status = 'pending'"
        );
        
        res.json({
            success: true,
            data: {
                total_users: users.total,
                total_products: products.total,
                total_orders: orders.total,
                total_revenue: revenue.total,
                pending_orders: pending.total
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/reports/top-products - Sản phẩm bán chạy
// ============================================
router.get('/top-products', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const sql = `
            SELECT 
                p.id, p.name, p.price, p.image_url,
                c.name as category_name,
                SUM(oi.quantity) as total_sold,
                SUM(oi.total_price) as total_revenue
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE o.status != 'cancelled'
            GROUP BY p.id
            ORDER BY total_sold DESC
            LIMIT ?
        `;
        
        const [products] = await pool.execute(sql, [String(limit)]);
        
        res.json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/reports/revenue-by-category - Doanh thu theo danh mục
// ============================================
router.get('/revenue-by-category', async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.id, c.name as category,
                COUNT(DISTINCT oi.order_id) as order_count,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.total_price) as total_revenue
            FROM categories c
            JOIN products p ON c.id = p.category_id
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.payment_status = 'paid'
            GROUP BY c.id, c.name
            ORDER BY total_revenue DESC
        `;
        
        const [data] = await pool.execute(sql);
        
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/reports/revenue-by-month - Doanh thu theo tháng
// ============================================
router.get('/revenue-by-month', async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        const sql = `
            SELECT 
                MONTH(created_at) as month,
                COUNT(*) as order_count,
                SUM(total_amount) as total_revenue
            FROM orders
            WHERE YEAR(created_at) = ? AND payment_status = 'paid'
            GROUP BY MONTH(created_at)
            ORDER BY month
        `;
        
        const [data] = await pool.execute(sql, [year]);
        
        // Fill missing months
        const months = [];
        for (let i = 1; i <= 12; i++) {
            const found = data.find(d => d.month === i);
            months.push({
                month: i,
                order_count: found ? found.order_count : 0,
                total_revenue: found ? found.total_revenue : 0
            });
        }
        
        res.json({ success: true, data: months, year: Number(year) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/reports/user-stats - Thống kê users
// ============================================
router.get('/user-stats', async (req, res) => {
    try {
        // Users by role
        const [byRole] = await pool.execute(`
            SELECT role, COUNT(*) as count
            FROM users
            GROUP BY role
        `);
        
        // Top buyers
        const [topBuyers] = await pool.execute(`
            SELECT 
                u.id, u.username, u.full_name,
                COUNT(o.id) as order_count,
                SUM(o.total_amount) as total_spent
            FROM users u
            JOIN orders o ON u.id = o.user_id
            WHERE o.payment_status = 'paid'
            GROUP BY u.id
            ORDER BY total_spent DESC
            LIMIT 10
        `);
        
        // New users this month
        const [[newUsers]] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM users
            WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())
        `);
        
        res.json({
            success: true,
            data: {
                by_role: byRole,
                top_buyers: topBuyers,
                new_users_this_month: newUsers.count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/reports/low-stock - Sản phẩm sắp hết hàng
// ============================================
router.get('/low-stock', async (req, res) => {
    try {
        const { threshold = 10 } = req.query;
        
        const sql = `
            SELECT p.id, p.name, p.stock, p.price, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE AND p.stock <= ?
            ORDER BY p.stock ASC
        `;
        
        const [products] = await pool.execute(sql, [threshold]);
        
        res.json({ success: true, data: products, threshold: Number(threshold) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
