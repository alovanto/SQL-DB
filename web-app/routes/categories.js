/**
 * CATEGORY ROUTES - API cho quản lý danh mục
 * Base path: /api/categories
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// ============================================
// GET /api/categories - Danh sách danh mục
// ============================================
router.get('/', async (req, res) => {
    try {
        const sql = `
            SELECT c.*, COUNT(p.id) as product_count
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
            GROUP BY c.id
            ORDER BY c.name
        `;
        
        const [categories] = await pool.execute(sql);
        
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/categories/:id - Chi tiết danh mục
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Danh mục không tồn tại' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/categories/:id/products - Sản phẩm theo danh mục
// ============================================
router.get('/:id/products', async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 12 } = req.query;
        const offset = (page - 1) * limit;
        
        const sql = `
            SELECT p.*, c.name as category_name,
                   COALESCE(p.sale_price, p.price) as display_price
            FROM products p
            JOIN categories c ON p.category_id = c.id
            WHERE p.category_id = ? AND p.is_active = TRUE
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?
        `;
        
        const [products] = await pool.execute(sql, [id, String(limit), String(offset)]);
        
        // Count
        const [[{ total }]] = await pool.execute(
            'SELECT COUNT(*) as total FROM products WHERE category_id = ? AND is_active = TRUE',
            [id]
        );
        
        res.json({
            success: true,
            data: products,
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
// POST /api/categories - Tạo danh mục
// ============================================
router.post('/', async (req, res) => {
    try {
        const { name, description, image_url } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Tên danh mục là bắt buộc!' });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)',
            [name, description || null, image_url || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Tạo danh mục thành công!',
            data: { id: result.insertId, name }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PUT /api/categories/:id - Cập nhật danh mục
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, image_url } = req.body;
        
        const [result] = await pool.execute(
            `UPDATE categories SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                image_url = COALESCE(?, image_url)
             WHERE id = ?`,
            [name || null, description || null, image_url || null, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Danh mục không tồn tại' });
        }
        
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE /api/categories/:id - Xóa danh mục
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra có sản phẩm không
        const [[{ count }]] = await pool.execute(
            'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
            [id]
        );
        
        if (count > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `Không thể xóa! Danh mục có ${count} sản phẩm.` 
            });
        }
        
        const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Danh mục không tồn tại' });
        }
        
        res.json({ success: true, message: 'Xóa danh mục thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
