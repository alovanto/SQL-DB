/**
 * LAB SQL - RAW SQL: UPDATE
 * Cập nhật dữ liệu trong database
 * Chạy: node 02-raw-sql/update.js
 */

const { pool } = require('../config/database');

// ============================================
// 1. UPDATE ĐƠN GIẢN
// ============================================
async function updateUserProfile(userId, data) {
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
        data.full_name || null,
        data.phone || null,
        data.address || null,
        userId
    ]);
    
    console.log('✅ Đã cập nhật user:', userId);
    console.log('   Affected rows:', result.affectedRows);
    console.log('   Changed rows:', result.changedRows);
    
    return result.affectedRows > 0;
}

// ============================================
// 2. UPDATE VỚI ĐIỀU KIỆN PHỨC TẠP
// ============================================
async function updateProductPrice(productId, newPrice, newSalePrice = null) {
    // Validate
    if (newSalePrice && newSalePrice >= newPrice) {
        throw new Error('Giá sale phải nhỏ hơn giá gốc!');
    }
    
    const sql = `
        UPDATE products 
        SET 
            price = ?,
            sale_price = ?,
            updated_at = NOW()
        WHERE id = ? AND is_active = TRUE
    `;
    
    const [result] = await pool.execute(sql, [newPrice, newSalePrice, productId]);
    
    if (result.affectedRows === 0) {
        throw new Error('Không tìm thấy sản phẩm hoặc sản phẩm đã bị vô hiệu hóa!');
    }
    
    console.log('✅ Đã cập nhật giá sản phẩm:', productId);
    return true;
}

// ============================================
// 3. UPDATE HÀNG LOẠT
// ============================================
async function applyDiscountByCategory(categoryId, discountPercent) {
    if (discountPercent < 0 || discountPercent > 50) {
        throw new Error('Discount phải từ 0% đến 50%!');
    }
    
    const sql = `
        UPDATE products 
        SET 
            sale_price = ROUND(price * (1 - ? / 100), -3),
            updated_at = NOW()
        WHERE category_id = ? 
        AND is_active = TRUE 
        AND sale_price IS NULL
    `;
    
    const [result] = await pool.execute(sql, [discountPercent, categoryId]);
    
    console.log(`✅ Đã áp dụng giảm giá ${discountPercent}% cho category ${categoryId}`);
    console.log('   Số sản phẩm:', result.affectedRows);
    
    return result.affectedRows;
}

async function removeAllDiscounts() {
    const sql = `
        UPDATE products 
        SET sale_price = NULL, updated_at = NOW()
        WHERE sale_price IS NOT NULL
    `;
    
    const [result] = await pool.execute(sql);
    console.log('✅ Đã xóa tất cả giảm giá:', result.affectedRows, 'sản phẩm');
    return result.affectedRows;
}

// ============================================
// 4. UPDATE VỚI CASE WHEN
// ============================================
async function updateOrderStatus(orderId, newStatus) {
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
        [orderId]
    );
    
    if (!order) {
        throw new Error('Không tìm thấy đơn hàng!');
    }
    
    if (!validTransitions[order.status].includes(newStatus)) {
        throw new Error(`Không thể chuyển từ "${order.status}" sang "${newStatus}"!`);
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
    
    const [result] = await pool.execute(sql, [newStatus, newStatus, newStatus, orderId]);
    
    console.log('✅ Đã cập nhật trạng thái đơn hàng:', orderId);
    console.log('   Từ:', order.status, '→', newStatus);
    
    return true;
}

// ============================================
// 5. UPDATE VỚI TRANSACTION
// ============================================
async function confirmPayment(orderId, paymentMethod) {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // 1. Cập nhật trạng thái thanh toán
        const updateOrderSql = `
            UPDATE orders 
            SET 
                payment_status = 'paid',
                payment_method = ?,
                status = 'confirmed',
                updated_at = NOW()
            WHERE id = ? AND payment_status = 'unpaid'
        `;
        
        const [result] = await connection.execute(updateOrderSql, [paymentMethod, orderId]);
        
        if (result.affectedRows === 0) {
            throw new Error('Đơn hàng không tồn tại hoặc đã thanh toán!');
        }
        
        // 2. Log payment (nếu có bảng payment_logs)
        // await connection.execute(
        //     'INSERT INTO payment_logs (order_id, amount, method, created_at) VALUES (?, ?, ?, NOW())',
        //     [orderId, amount, paymentMethod]
        // );
        
        await connection.commit();
        console.log('✅ Đã xác nhận thanh toán đơn hàng:', orderId);
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
// 6. UPDATE STOCK
// ============================================
async function updateStock(productId, quantity, operation = 'set') {
    let sql;
    
    switch (operation) {
        case 'add':
            sql = 'UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?';
            break;
        case 'subtract':
            sql = 'UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ? AND stock >= ?';
            break;
        case 'set':
        default:
            sql = 'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?';
    }
    
    const params = operation === 'subtract' 
        ? [quantity, productId, quantity]
        : [quantity, productId];
    
    const [result] = await pool.execute(sql, params);
    
    if (result.affectedRows === 0) {
        throw new Error(
            operation === 'subtract' 
                ? 'Không đủ hàng trong kho!' 
                : 'Không tìm thấy sản phẩm!'
        );
    }
    
    console.log(`✅ Stock ${operation}:`, productId, quantity);
    return true;
}

// ============================================
// 7. SOFT DELETE (Vô hiệu hóa)
// ============================================
async function deactivateUser(userId) {
    const sql = `
        UPDATE users 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = ? AND role != 'admin'
    `;
    
    const [result] = await pool.execute(sql, [userId]);
    
    if (result.affectedRows === 0) {
        throw new Error('Không thể vô hiệu hóa user này!');
    }
    
    console.log('✅ Đã vô hiệu hóa user:', userId);
    return true;
}

async function deactivateProduct(productId) {
    const sql = `
        UPDATE products 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = ?
    `;
    
    const [result] = await pool.execute(sql, [productId]);
    console.log('✅ Đã vô hiệu hóa product:', productId);
    return result.affectedRows > 0;
}

// ============================================
// 8. UPDATE VỚI VALIDATION
// ============================================
async function updateReview(reviewId, userId, data) {
    // Kiểm tra review thuộc về user
    const [[review]] = await pool.execute(
        'SELECT id FROM reviews WHERE id = ? AND user_id = ?',
        [reviewId, userId]
    );
    
    if (!review) {
        throw new Error('Bạn không có quyền sửa review này!');
    }
    
    // Validate rating
    if (data.rating && (data.rating < 1 || data.rating > 5)) {
        throw new Error('Rating phải từ 1 đến 5!');
    }
    
    const sql = `
        UPDATE reviews 
        SET 
            rating = COALESCE(?, rating),
            title = COALESCE(?, title),
            comment = COALESCE(?, comment),
            updated_at = NOW()
        WHERE id = ?
    `;
    
    const [result] = await pool.execute(sql, [
        data.rating || null,
        data.title || null,
        data.comment || null,
        reviewId
    ]);
    
    console.log('✅ Đã cập nhật review:', reviewId);
    return true;
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo Raw SQL - UPDATE\n');
    console.log('='.repeat(50));
    
    try {
        // 1. Update user profile
        console.log('\n📝 1. Cập nhật profile user:');
        await updateUserProfile(2, {
            full_name: 'Nguyễn Văn A (Updated)',
            phone: '0909123456'
        });
        
        // 2. Update product price
        console.log('\n📝 2. Cập nhật giá sản phẩm:');
        await updateProductPrice(1, 34990000, 31990000);
        
        // 3. Update stock
        console.log('\n📝 3. Cập nhật tồn kho:');
        await updateStock(1, 5, 'add');
        
        // 4. Hiển thị kết quả
        console.log('\n📋 Kết quả:');
        const [[user]] = await pool.execute('SELECT id, full_name, phone FROM users WHERE id = 2');
        console.log('User:', user);
        
        const [[product]] = await pool.execute('SELECT id, name, price, sale_price, stock FROM products WHERE id = 1');
        console.log('Product:', product);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Demo hoàn tất!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    process.exit(0);
}

// Export
module.exports = {
    updateUserProfile,
    updateProductPrice,
    applyDiscountByCategory,
    removeAllDiscounts,
    updateOrderStatus,
    confirmPayment,
    updateStock,
    deactivateUser,
    deactivateProduct,
    updateReview
};

// Run demo
if (require.main === module) {
    demo();
}
