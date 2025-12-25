/**
 * LAB SQL - ORM: DELETE
 * So sánh với Raw SQL trong 02-raw-sql/delete.js
 * Chạy: node 03-orm/delete.js
 */

const { Op } = require('sequelize');
const { sequelize, User, Category, Product, Order, OrderItem, Review } = require('./index');

// ============================================
// 1. DELETE ĐƠN GIẢN
// ============================================

// Raw SQL:  DELETE FROM reviews WHERE id = ?
// ORM:      review.destroy() hoặc Review.destroy({ where })

async function deleteReview(reviewId) {
    const deleted = await Review.destroy({
        where: { id: reviewId }
    });
    
    console.log('🗑️ Đã xóa review:', reviewId, '- Affected:', deleted);
    return deleted > 0;
}

// ============================================
// 2. DELETE VỚI VALIDATION
// ============================================

async function deleteUserReview(reviewId, userId) {
    // Chỉ xóa nếu review thuộc về user
    const deleted = await Review.destroy({
        where: {
            id: reviewId,
            user_id: userId
        }
    });
    
    if (deleted === 0) {
        throw new Error('Không tìm thấy review hoặc bạn không có quyền xóa!');
    }
    
    console.log('🗑️ User', userId, 'đã xóa review:', reviewId);
    return true;
}

async function deleteUser(userId) {
    const user = await User.findByPk(userId);
    
    if (!user) {
        throw new Error('User không tồn tại!');
    }
    
    if (user.role === 'admin') {
        throw new Error('Không thể xóa tài khoản Admin!');
    }
    
    // Kiểm tra đơn hàng chưa hoàn thành
    const pendingOrders = await Order.count({
        where: {
            user_id: userId,
            status: { [Op.notIn]: ['delivered', 'cancelled'] }
        }
    });
    
    if (pendingOrders > 0) {
        throw new Error(`User còn ${pendingOrders} đơn hàng chưa hoàn thành!`);
    }
    
    // Xóa user (cascade sẽ xóa orders, reviews)
    await user.destroy();
    
    console.log('🗑️ Đã xóa user:', user.username);
    return true;
}

// ============================================
// 3. DELETE VỚI TRANSACTION
// ============================================

async function cancelOrder(orderId, reason = null) {
    const t = await sequelize.transaction();
    
    try {
        const order = await Order.findByPk(orderId, {
            include: [{
                model: OrderItem,
                as: 'items'
            }],
            transaction: t
        });
        
        if (!order) {
            throw new Error('Không tìm thấy đơn hàng!');
        }
        
        if (order.status === 'delivered') {
            throw new Error('Không thể hủy đơn hàng đã giao!');
        }
        
        if (order.status === 'cancelled') {
            throw new Error('Đơn hàng đã bị hủy trước đó!');
        }
        
        // Hoàn lại stock
        for (const item of order.items) {
            await Product.increment('stock', {
                by: item.quantity,
                where: { id: item.product_id },
                transaction: t
            });
        }
        
        // Cập nhật trạng thái (soft delete)
        await order.update({
            status: 'cancelled',
            payment_status: 'refunded',
            note: order.note ? `${order.note} | Lý do hủy: ${reason || 'Không có'}` : `Lý do hủy: ${reason || 'Không có'}`
        }, { transaction: t });
        
        await t.commit();
        
        console.log('🗑️ Đã hủy đơn hàng:', orderId);
        console.log('   Đã hoàn stock:', order.items.length, 'sản phẩm');
        
        return true;
        
    } catch (error) {
        await t.rollback();
        console.error('❌ Lỗi, đã rollback:', error.message);
        throw error;
    }
}

// ============================================
// 4. HARD DELETE VS SOFT DELETE
// ============================================

// Hard delete - Xóa vĩnh viễn
async function hardDeleteProduct(productId) {
    // Kiểm tra đã có đơn hàng chưa
    const orderCount = await OrderItem.count({
        where: { product_id: productId }
    });
    
    if (orderCount > 0) {
        throw new Error('Không thể xóa sản phẩm đã có đơn hàng! Hãy dùng soft delete.');
    }
    
    // Xóa reviews trước
    await Review.destroy({ where: { product_id: productId } });
    
    // Xóa product
    const deleted = await Product.destroy({ where: { id: productId } });
    
    console.log('🗑️ Đã xóa vĩnh viễn product:', productId);
    return deleted > 0;
}

// Soft delete
async function softDeleteProduct(productId) {
    await Product.update(
        { is_active: false },
        { where: { id: productId } }
    );
    
    console.log('🗑️ Đã soft delete product:', productId);
    return true;
}

// ============================================
// 5. DELETE HÀNG LOẠT
// ============================================

async function deleteOldReviews(days = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const deleted = await Review.destroy({
        where: {
            created_at: { [Op.lt]: cutoffDate },
            is_verified_purchase: false
        }
    });
    
    console.log(`🗑️ Đã xóa ${deleted} reviews cũ hơn ${days} ngày`);
    return deleted;
}

async function deleteReviewsByProduct(productId) {
    const deleted = await Review.destroy({
        where: { product_id: productId }
    });
    
    console.log(`🗑️ Đã xóa ${deleted} reviews của product ${productId}`);
    return deleted;
}

async function deleteReviewsByUser(userId) {
    const deleted = await Review.destroy({
        where: { user_id: userId }
    });
    
    console.log(`🗑️ Đã xóa ${deleted} reviews của user ${userId}`);
    return deleted;
}

// ============================================
// 6. CLEANUP OPERATIONS
// ============================================

async function cleanupCancelledOrders(days = 30) {
    const t = await sequelize.transaction();
    
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        // Tìm orders cần xóa
        const orders = await Order.findAll({
            where: {
                status: 'cancelled',
                updated_at: { [Op.lt]: cutoffDate }
            },
            transaction: t
        });
        
        if (orders.length === 0) {
            console.log('Không có đơn hàng cần cleanup');
            return 0;
        }
        
        const orderIds = orders.map(o => o.id);
        
        // Xóa order_items
        await OrderItem.destroy({
            where: { order_id: { [Op.in]: orderIds } },
            transaction: t
        });
        
        // Xóa orders
        const deleted = await Order.destroy({
            where: { id: { [Op.in]: orderIds } },
            transaction: t
        });
        
        await t.commit();
        
        console.log(`🗑️ Đã cleanup ${deleted} đơn hàng đã hủy`);
        return deleted;
        
    } catch (error) {
        await t.rollback();
        throw error;
    }
}

async function cleanupUnverifiedReviews() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    
    const deleted = await Review.destroy({
        where: {
            is_verified_purchase: false,
            rating: { [Op.lt]: 3 },
            created_at: { [Op.lt]: cutoffDate }
        }
    });
    
    console.log(`🗑️ Đã cleanup ${deleted} reviews spam/fake`);
    return deleted;
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo ORM - DELETE\n');
    console.log('='.repeat(50));
    
    try {
        // Tạo review test
        console.log('\n📝 Tạo review test...');
        const review = await Review.create({
            user_id: 2,
            product_id: 1,
            rating: 3,
            title: 'Test Review ORM',
            comment: 'Đây là review test để xóa',
            is_verified_purchase: false
        });
        console.log('   Đã tạo review ID:', review.id);
        
        // Demo 1: Xóa review
        console.log('\n🗑️ 1. Xóa review:');
        await deleteReview(review.id);
        
        // Demo 2: Thử xóa admin (sẽ fail)
        console.log('\n🗑️ 2. Thử xóa admin (sẽ fail):');
        try {
            await deleteUser(1);
        } catch (error) {
            console.log('   ❌ Đúng như mong đợi:', error.message);
        }
        
        // Thống kê
        console.log('\n📋 Thống kê hiện tại:');
        const stats = {
            users: await User.count(),
            products: await Product.count(),
            orders: await Order.count(),
            reviews: await Review.count()
        };
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
    deleteReviewsByProduct,
    deleteReviewsByUser,
    cleanupCancelledOrders,
    cleanupUnverifiedReviews
};

// Run demo
if (require.main === module) {
    demo();
}
