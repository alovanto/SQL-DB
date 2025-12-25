/**
 * LAB SQL - RAW SQL: DELETE
 * Xóa dữ liệu trong database
 * Chạy: node 02-raw-sql/delete.js
 */

const { pool } = require('../config/database');

// ============================================
// 1. DELETE ĐƠN GIẢN
// ============================================
async function deleteReview(reviewId) {
    const sql = 'DELETE FROM reviews WHERE id = ?';
    
    const [result] = await pool.execute(sql, [reviewId]);
    
    console.log('🗑️ Đã xóa review:', reviewId);
    console.log('   Affected rows:', result.affectedRows);
    
    return result.affectedRows > 0;
}

// ============================================
// 2. DELETE VỚI ĐIỀU KIỆN
// ============================================
async function deleteUserReview(reviewId, userId) {
    // Chỉ cho phép user xóa review của chính mình
    const sql = 'DELETE FROM reviews WHERE id = ? AND user_id = ?';
    
    const [result] = await pool.execute(sql, [reviewId, userId]);
    
    if (result.affectedRows === 0) {
        throw new Error('Không tìm thấy review hoặc bạn không có quyền xóa!');
    }
    
    console.log('🗑️ User', userId, 'đã xóa review:', reviewId);
    return true;
}

// ============================================
// 3. DELETE VỚI VALIDATION
// ============================================
async function deleteUser(userId) {
    // Kiểm tra user tồn tại
    const [[user]] = await pool.execute(
        'SELECT id, role, username FROM users WHERE id = ?',
        [userId]
    );
    
    if (!user) {
        throw new Error('User không tồn tại!');
    }
    
    // Không cho xóa admin
    if (user.role === 'admin') {
        throw new Error('Không thể xóa tài khoản Admin!');
    }
    
    // Kiểm tra có đơn hàng chưa hoàn thành không
    const [[pendingOrders]] = await pool.execute(
        `SELECT COUNT(*) as count FROM orders 
         WHERE user_id = ? AND status NOT IN ('delivered', 'cancelled')`,
        [userId]
    );
    
    if (pendingOrders.count > 0) {
        throw new Error(`User còn ${pendingOrders.count} đơn hàng chưa hoàn thành!`);
    }
    
    // Xóa user (cascade sẽ xóa orders, reviews)
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    
    console.log('🗑️ Đã xóa user:', user.username);
    return true;
}

// ============================================
// 4. DELETE VỚI TRANSACTION
// ============================================
async function cancelOrder(orderId, reason = null) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 1. Kiểm tra đơn hàng
        const [[order]] = await connection.execute(
            'SELECT id, status FROM orders WHERE id = ?',
            [orderId]
        );
        
        if (!order) {
            throw new Error('Không tìm thấy đơn hàng!');
        }
        
        if (order.status === 'delivered') {
            throw new Error('Không thể hủy đơn hàng đã giao!');
        }
        
        if (order.status === 'cancelled') {
            throw new Error('Đơn hàng đã bị hủy trước đó!');
        }
        
        // 2. Hoàn lại stock
        const [orderItems] = await connection.execute(
            'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
            [orderId]
        );
        
        for (const item of orderItems) {
            await connection.execute(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                [item.quantity, item.product_id]
            );
        }
        
        // 3. Cập nhật trạng thái đơn hàng (soft delete)
        await connection.execute(
            `UPDATE orders SET 
                status = 'cancelled', 
                payment_status = 'refunded',
                note = CONCAT(COALESCE(note, ''), ' | Lý do hủy: ', ?),
                updated_at = NOW()
             WHERE id = ?`,
            [reason || 'Không có lý do', orderId]
        );
        
        await connection.commit();
        console.log('🗑️ Đã hủy đơn hàng:', orderId);
        console.log('   Đã hoàn stock:', orderItems.length, 'sản phẩm');
        
        return true;
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Lỗi, đã rollback:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// ============================================
// 5. HARD DELETE VS SOFT DELETE
// ============================================

// Hard delete - Xóa vĩnh viễn
async function hardDeleteProduct(productId) {
    // Kiểm tra sản phẩm đã được mua chưa
    const [[purchased]] = await pool.execute(
        'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
        [productId]
    );
    
    if (purchased.count > 0) {
        throw new Error('Không thể xóa sản phẩm đã có đơn hàng! Hãy dùng soft delete.');
    }
    
    // Xóa reviews trước
    await pool.execute('DELETE FROM reviews WHERE product_id = ?', [productId]);
    
    // Xóa product
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [productId]);
    
    console.log('🗑️ Đã xóa vĩnh viễn product:', productId);
    return result.affectedRows > 0;
}

// Soft delete - Vô hiệu hóa
async function softDeleteProduct(productId) {
    const [result] = await pool.execute(
        'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
        [productId]
    );
    
    console.log('🗑️ Đã soft delete product:', productId);
    return result.affectedRows > 0;
}

// ============================================
// 6. DELETE HÀNG LOẠT
// ============================================
async function deleteOldReviews(days = 365) {
    const sql = `
        DELETE FROM reviews 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND is_verified_purchase = FALSE
    `;
    
    const [result] = await pool.execute(sql, [days]);
    
    console.log(`🗑️ Đã xóa ${result.affectedRows} reviews cũ hơn ${days} ngày`);
    return result.affectedRows;
}

async function deleteInactiveUsers(days = 180) {
    // Tìm users không hoạt động
    const sql = `
        DELETE u FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE u.role = 'customer'
        AND u.is_active = FALSE
        AND u.created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND o.id IS NULL
    `;
    
    const [result] = await pool.execute(sql, [days]);
    
    console.log(`🗑️ Đã xóa ${result.affectedRows} users không hoạt động`);
    return result.affectedRows;
}

// ============================================
// 7. DELETE VỚI IN/SUBQUERY
// ============================================
async function deleteReviewsByProduct(productId) {
    const sql = 'DELETE FROM reviews WHERE product_id = ?';
    const [result] = await pool.execute(sql, [productId]);
    
    console.log(`🗑️ Đã xóa ${result.affectedRows} reviews của product ${productId}`);
    return result.affectedRows;
}

async function deleteReviewsByUser(userId) {
    const sql = 'DELETE FROM reviews WHERE user_id = ?';
    const [result] = await pool.execute(sql, [userId]);
    
    console.log(`🗑️ Đã xóa ${result.affectedRows} reviews của user ${userId}`);
    return result.affectedRows;
}

// ============================================
// 8. CLEANUP OPERATIONS
// ============================================
async function cleanupCancelledOrders(days = 30) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Lấy danh sách orders cần xóa
        const [orders] = await connection.execute(
            `SELECT id FROM orders 
             WHERE status = 'cancelled' 
             AND updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
            [days]
        );
        
        if (orders.length === 0) {
            console.log('Không có đơn hàng đã hủy cần xóa');
            return 0;
        }
        
        const orderIds = orders.map(o => o.id);
        
        // Xóa order_items
        await connection.query(
            'DELETE FROM order_items WHERE order_id IN (?)',
            [orderIds]
        );
        
        // Xóa orders
        const [result] = await connection.query(
            'DELETE FROM orders WHERE id IN (?)',
            [orderIds]
        );
        
        await connection.commit();
        console.log(`🗑️ Đã cleanup ${result.affectedRows} đơn hàng đã hủy`);
        return result.affectedRows;
        
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function cleanupUnverifiedReviews() {
    // Xóa reviews không verified và rating < 3
    const sql = `
        DELETE FROM reviews 
        WHERE is_verified_purchase = FALSE 
        AND rating < 3
        AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    
    const [result] = await pool.execute(sql);
    console.log(`🗑️ Đã cleanup ${result.affectedRows} reviews spam/fake`);
    return result.affectedRows;
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo Raw SQL - DELETE\n');
    console.log('='.repeat(50));
    
    try {
        // Tạo dữ liệu test để xóa
        console.log('\n📝 Tạo dữ liệu test...');
        
        // Tạo review test
        await pool.execute(
            `INSERT INTO reviews (user_id, product_id, rating, title, comment, is_verified_purchase)
             VALUES (2, 1, 3, 'Test Review', 'Đây là review test để xóa', FALSE)`
        );
        
        const [[newReview]] = await pool.execute(
            'SELECT id FROM reviews ORDER BY id DESC LIMIT 1'
        );
        
        console.log('   Đã tạo review test ID:', newReview.id);
        
        // Demo 1: Xóa review
        console.log('\n🗑️ 1. Xóa review:');
        await deleteReview(newReview.id);
        
        // Demo 2: Thử xóa với validation
        console.log('\n🗑️ 2. Thử xóa admin (sẽ fail):');
        try {
            await deleteUser(1);
        } catch (error) {
            console.log('   ❌ Đúng như mong đợi:', error.message);
        }
        
        // Hiển thị thống kê
        console.log('\n📋 Thống kê hiện tại:');
        const [[stats]] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM orders) as orders,
                (SELECT COUNT(*) FROM reviews) as reviews
        `);
        console.table([stats]);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Demo hoàn tất!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    process.exit(0);
}

// Export
module.exports = {
    deleteReview,
    deleteUserReview,
    deleteUser,
    cancelOrder,
    hardDeleteProduct,
    softDeleteProduct,
    deleteOldReviews,
    deleteInactiveUsers,
    deleteReviewsByProduct,
    deleteReviewsByUser,
    cleanupCancelledOrders,
    cleanupUnverifiedReviews
};

// Run demo
if (require.main === module) {
    demo();
}
