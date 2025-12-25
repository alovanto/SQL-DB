/**
 * ORDER ROUTES - API cho quản lý đơn hàng
 * Base path: /api/orders
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../config/database');

// ============================================
// GET /api/orders - Danh sách đơn hàng
// ============================================
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, user_id } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = `
            SELECT o.*, u.username, u.full_name,
                   COUNT(oi.id) as item_count
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE 1=1
        `;
        const params = [];
        
        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }
        
        if (user_id) {
            sql += ' AND o.user_id = ?';
            params.push(user_id);
        }
        
        sql += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(String(limit), String(offset));
        
        const [orders] = await pool.execute(sql, params);
        
        // Count total
        const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM orders');
        
        res.json({
            success: true,
            data: orders,
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
// GET /api/orders/stats - Thống kê đơn hàng
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const sql = `
            SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
                SUM(CASE WHEN status = 'shipping' THEN 1 ELSE 0 END) as shipping_count,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as total_revenue
            FROM orders
        `;
        
        const [[stats]] = await pool.execute(sql);
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET /api/orders/:id - Chi tiết đơn hàng
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Lấy thông tin order
        const orderSql = `
            SELECT o.*, u.username, u.full_name, u.email, u.phone as user_phone
            FROM orders o
            JOIN users u ON o.user_id = u.id
            WHERE o.id = ?
        `;
        const [orderRows] = await pool.execute(orderSql, [id]);
        
        if (orderRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại' });
        }
        
        // Lấy order items
        const itemsSql = `
            SELECT oi.*, p.name as product_name, p.image_url, c.name as category_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE oi.order_id = ?
        `;
        const [items] = await pool.execute(itemsSql, [id]);
        
        res.json({
            success: true,
            data: {
                ...orderRows[0],
                items
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// POST /api/orders - Tạo đơn hàng mới
// ============================================
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { user_id, items, shipping_address, shipping_phone, payment_method } = req.body;
        
        // Validate
        if (!user_id || !items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID và danh sách sản phẩm là bắt buộc!' 
            });
        }
        
        await connection.beginTransaction();
        
        // Tạo order code
        const orderCode = 'ORD' + Date.now();
        
        // Tính tổng tiền và validate stock
        let totalAmount = 0;
        const orderItems = [];
        
        for (const item of items) {
            const [[product]] = await connection.execute(
                'SELECT id, name, price, sale_price, stock FROM products WHERE id = ? AND is_active = TRUE',
                [item.product_id]
            );
            
            if (!product) {
                throw new Error(`Sản phẩm ID ${item.product_id} không tồn tại!`);
            }
            
            if (product.stock < item.quantity) {
                throw new Error(`Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho!`);
            }
            
            const unitPrice = product.sale_price || product.price;
            const itemTotal = unitPrice * item.quantity;
            totalAmount += itemTotal;
            
            orderItems.push({
                product_id: product.id,
                quantity: item.quantity,
                unit_price: unitPrice,
                total_price: itemTotal
            });
        }
        
        // Tạo order
        const [orderResult] = await connection.execute(
            `INSERT INTO orders (user_id, order_code, total_amount, shipping_address, shipping_phone, payment_method)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, orderCode, totalAmount, shipping_address || '', shipping_phone || '', payment_method || 'cod']
        );
        
        const orderId = orderResult.insertId;
        
        // Thêm order items và giảm stock
        for (const item of orderItems) {
            await connection.execute(
                `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.unit_price, item.total_price]
            );
            
            await connection.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công!',
            data: {
                id: orderId,
                order_code: orderCode,
                total_amount: totalAmount,
                item_count: orderItems.length
            }
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

// ============================================
// PUT /api/orders/:id/status - Cập nhật trạng thái
// ============================================
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validTransitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['shipping', 'cancelled'],
            'shipping': ['delivered', 'cancelled'],
            'delivered': [],
            'cancelled': []
        };
        
        // Lấy status hiện tại
        const [[order]] = await pool.execute(
            'SELECT status FROM orders WHERE id = ?',
            [id]
        );
        
        if (!order) {
            return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại' });
        }
        
        if (!validTransitions[order.status].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: `Không thể chuyển từ "${order.status}" sang "${status}"!` 
            });
        }
        
        const sql = `
            UPDATE orders 
            SET 
                status = ?,
                payment_status = CASE 
                    WHEN ? = 'delivered' THEN 'paid'
                    WHEN ? = 'cancelled' THEN 'refunded'
                    ELSE payment_status
                END,
                updated_at = NOW()
            WHERE id = ?
        `;
        
        await pool.execute(sql, [status, status, status, id]);
        
        res.json({ 
            success: true, 
            message: `Đã cập nhật trạng thái: ${order.status} → ${status}` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DELETE /api/orders/:id - Hủy đơn hàng
// ============================================
router.delete('/:id', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        await connection.beginTransaction();
        
        // Kiểm tra đơn hàng
        const [[order]] = await connection.execute(
            'SELECT id, status FROM orders WHERE id = ?',
            [id]
        );
        
        if (!order) {
            return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại' });
        }
        
        if (order.status === 'delivered') {
            return res.status(400).json({ success: false, error: 'Không thể hủy đơn hàng đã giao!' });
        }
        
        if (order.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Đơn hàng đã bị hủy trước đó!' });
        }
        
        // Hoàn lại stock
        const [orderItems] = await connection.execute(
            'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
            [id]
        );
        
        for (const item of orderItems) {
            await connection.execute(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        
        // Cập nhật trạng thái
        await connection.execute(
            `UPDATE orders SET 
                status = 'cancelled', 
                payment_status = 'refunded',
                note = CONCAT(COALESCE(note, ''), ' | Lý do hủy: ', ?),
                updated_at = NOW()
             WHERE id = ?`,
            [reason || 'Không có lý do', id]
        );
        
        await connection.commit();
        
        res.json({ 
            success: true, 
            message: 'Đã hủy đơn hàng và hoàn lại stock!' 
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ success: false, error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;
