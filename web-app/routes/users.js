/**
 * USER ROUTES - API cho quản lý người dùng
 * Base path: /api/users
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// ============================================
// GET /api/users - Lấy danh sách users
// ============================================
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, role } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = 'SELECT id, username, full_name, email, phone, role, created_at FROM users WHERE 1=1';
        const params = [];
        
        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }
        
        sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
        params.push(String(limit), String(offset));
        
        const [users] = await pool.execute(sql, params);
        
        // Đếm tổng
        const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM users');
        
        res.json({
            success: true,
            data: users,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/users/:id - Lấy thông tin 1 user
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = 'SELECT id, username, full_name, email, phone, address, role, created_at FROM users WHERE id = ?';
        
        const [rows] = await pool.execute(sql, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User không tồn tại' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/users - Tạo user mới (Đăng ký)
// ============================================
router.post('/', async (req, res) => {
    try {
        const { username, email, password, full_name, phone, address } = req.body;
        
        // Validate
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username, email và password là bắt buộc!' 
            });
        }
        
        // Check duplicate
        const [existing] = await pool.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username hoặc email đã tồn tại!' 
            });
        }
        
        const sql = `
            INSERT INTO users (username, email, password, full_name, phone, address, role)
            VALUES (?, ?, ?, ?, ?, ?, 'customer')
        `;
        
        const [result] = await pool.execute(sql, [
            username, email, password, full_name || null, phone || null, address || null
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            data: { id: result.insertId, username, email }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PUT /api/users/:id - Cập nhật user
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, phone, address } = req.body;
        
        const sql = `
            UPDATE users 
            SET 
                full_name = COALESCE(?, full_name),
                phone = COALESCE(?, phone),
                address = COALESCE(?, address),
                updated_at = NOW()
            WHERE id = ?
        `;
        
        const [result] = await pool.execute(sql, [
            full_name || null, phone || null, address || null, id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'User không tồn tại' });
        }
        
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE /api/users/:id - Xóa user
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra user
        const [[user]] = await pool.execute(
            'SELECT id, role, username FROM users WHERE id = ?',
            [id]
        );
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User không tồn tại' });
        }
        
        if (user.role === 'admin') {
            return res.status(403).json({ success: false, error: 'Không thể xóa Admin!' });
        }
        
        // Kiểm tra đơn hàng pending
        const [[pending]] = await pool.execute(
            `SELECT COUNT(*) as count FROM orders 
             WHERE user_id = ? AND status NOT IN ('delivered', 'cancelled')`,
            [id]
        );
        
        if (pending.count > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `User còn ${pending.count} đơn hàng chưa hoàn thành!` 
            });
        }
        
        await pool.execute('DELETE FROM users WHERE id = ?', [id]);
        
        res.json({ success: true, message: `Đã xóa user: ${user.username}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/users/login - Đăng nhập
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username và password là bắt buộc!' 
            });
        }
        
        const sql = 'SELECT id, username, full_name, email, role FROM users WHERE username = ? AND password = ?';
        const [rows] = await pool.execute(sql, [username, password]);
        
        if (rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Sai username hoặc password!' 
            });
        }
        
        res.json({
            success: true,
            message: 'Đăng nhập thành công!',
            user: rows[0]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/users/:id/orders - Lịch sử đơn hàng
// ============================================
router.get('/:id/orders', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT 
                o.id, o.order_code, o.total_amount, o.status, 
                o.payment_status, o.created_at,
                COUNT(oi.id) as item_count
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `;
        
        const [orders] = await pool.execute(sql, [id]);
        
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
