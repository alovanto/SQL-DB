/**
 * PRODUCT ROUTES - API cho quản lý sản phẩm
 * Base path: /api/products
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// ============================================
// GET /api/products - Lấy danh sách sản phẩm
// ============================================
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 12, 
            category, 
            search, 
            min_price, 
            max_price,
            sort = 'id',
            order = 'DESC'
        } = req.query;
        
        const offset = (page - 1) * limit;
        let sql = `
            SELECT p.*, c.name as category_name,
                   COALESCE(p.sale_price, p.price) as display_price
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = TRUE
        `;
        const params = [];
        
        // Filter by category
        if (category) {
            sql += ' AND p.category_id = ?';
            params.push(category);
        }
        
        // Search by name/description
        if (search) {
            sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern);
        }
        
        // Filter by price range
        if (min_price) {
            sql += ' AND COALESCE(p.sale_price, p.price) >= ?';
            params.push(min_price);
        }
        if (max_price) {
            sql += ' AND COALESCE(p.sale_price, p.price) <= ?';
            params.push(max_price);
        }
        
        // Sorting (whitelist để tránh SQL injection)
        const allowedSorts = ['id', 'name', 'price', 'created_at', 'stock'];
        const sortField = allowedSorts.includes(sort) ? sort : 'id';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        sql += ` ORDER BY p.${sortField} ${sortOrder}`;
        
        // Pagination
        sql += ' LIMIT ? OFFSET ?';
        params.push(String(limit), String(offset));
        
        const [products] = await pool.execute(sql, params);
        
        // Count total
        let countSql = 'SELECT COUNT(*) as total FROM products p WHERE p.is_active = TRUE';
        const countParams = [];
        
        if (category) {
            countSql += ' AND p.category_id = ?';
            countParams.push(category);
        }
        if (search) {
            countSql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern);
        }
        
        const [[{ total }]] = await pool.execute(countSql, countParams);
        
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
// GET /api/products/stats - Thống kê sản phẩm
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const sql = `
            SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_stock,
                ROUND(AVG(price), 0) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price,
                COUNT(CASE WHEN sale_price IS NOT NULL THEN 1 END) as on_sale_count
            FROM products
            WHERE is_active = TRUE
        `;
        
        const [[stats]] = await pool.execute(sql);
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/products/:id - Chi tiết sản phẩm
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ?
        `;
        
        const [rows] = await pool.execute(sql, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại' });
        }
        
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/products - Tạo sản phẩm mới
// ============================================
router.post('/', async (req, res) => {
    try {
        const { category_id, name, description, price, stock, image_url, sale_price } = req.body;
        
        // Validate
        if (!name || !price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Tên và giá sản phẩm là bắt buộc!' 
            });
        }
        
        if (sale_price && sale_price >= price) {
            return res.status(400).json({ 
                success: false, 
                error: 'Giá sale phải nhỏ hơn giá gốc!' 
            });
        }
        
        const sql = `
            INSERT INTO products (category_id, name, description, price, sale_price, stock, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await pool.execute(sql, [
            category_id || null, name, description || null, price, 
            sale_price || null, stock || 0, image_url || null
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Tạo sản phẩm thành công!',
            data: { id: result.insertId, name, price }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PUT /api/products/:id - Cập nhật sản phẩm
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, sale_price, stock, category_id, is_active } = req.body;
        
        const sql = `
            UPDATE products 
            SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                price = COALESCE(?, price),
                sale_price = ?,
                stock = COALESCE(?, stock),
                category_id = COALESCE(?, category_id),
                is_active = COALESCE(?, is_active),
                updated_at = NOW()
            WHERE id = ?
        `;
        
        const [result] = await pool.execute(sql, [
            name || null, description || null, price || null, 
            sale_price, stock || null, category_id || null, 
            is_active !== undefined ? is_active : null, id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại' });
        }
        
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE /api/products/:id - Xóa sản phẩm
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { hard = false } = req.query;
        
        if (hard === 'true') {
            // Hard delete
            const [[purchased]] = await pool.execute(
                'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
                [id]
            );
            
            if (purchased.count > 0) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Không thể xóa sản phẩm đã được mua. Dùng soft delete!' 
                });
            }
            
            await pool.execute('DELETE FROM products WHERE id = ?', [id]);
        } else {
            // Soft delete
            const [result] = await pool.execute(
                'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
                [id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại' });
            }
        }
        
        res.json({ success: true, message: 'Xóa sản phẩm thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/products/:id/reviews - Đánh giá sản phẩm
// ============================================
router.get('/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        
        const sql = `
            SELECT r.*, u.username, u.full_name
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.product_id = ?
            ORDER BY r.created_at DESC
        `;
        
        const [reviews] = await pool.execute(sql, [id]);
        
        // Tính rating trung bình
        const [[stats]] = await pool.execute(
            'SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews FROM reviews WHERE product_id = ?',
            [id]
        );
        
        res.json({ 
            success: true, 
            data: reviews,
            stats: {
                avg_rating: stats.avg_rating ? Number(stats.avg_rating).toFixed(1) : null,
                total_reviews: stats.total_reviews
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/products/:id/reviews - Thêm đánh giá
// ============================================
router.post('/:id/reviews', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, rating, comment } = req.body;
        
        if (!user_id || !rating) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID và rating là bắt buộc!' 
            });
        }
        
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                error: 'Rating phải từ 1-5!' 
            });
        }
        
        const sql = `
            INSERT INTO reviews (user_id, product_id, rating, comment)
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await pool.execute(sql, [user_id, id, rating, comment || null]);
        
        res.status(201).json({
            success: true,
            message: 'Đánh giá thành công!',
            data: { id: result.insertId }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
