/**
 * LAB SQL - ORM: UPDATE
 * So sánh với Raw SQL trong 02-raw-sql/update.js
 * Chạy: node 03-orm/update.js
 */

const { Op } = require('sequelize');
const { sequelize, User, Category, Product, Order, OrderItem, Review } = require('./index');

// ============================================
// 1. UPDATE ĐƠN GIẢN
// ============================================

// Raw SQL:  UPDATE users SET full_name = ? WHERE id = ?
// ORM:      user.update({ full_name }) hoặc User.update({}, { where })

async function updateUserProfile(userId, data) {
    // Cách 1: Tìm rồi update
    const user = await User.findByPk(userId);
    
    if (!user) {
        throw new Error('User không tồn tại!');
    }
    
    await user.update({
        full_name: data.full_name,
        phone: data.phone,
        address: data.address
    });
    
    console.log('✅ Đã cập nhật user:', userId);
    return user;
}

async function updateUserProfileDirect(userId, data) {
    // Cách 2: Update trực tiếp (không cần findByPk trước)
    const [affectedCount] = await User.update(data, {
        where: { id: userId }
    });
    
    console.log('✅ Affected rows:', affectedCount);
    return affectedCount > 0;
}

// ============================================
// 2. UPDATE VỚI VALIDATION
// ============================================

async function updateProductPrice(productId, newPrice, newSalePrice = null) {
    const product = await Product.findByPk(productId);
    
    if (!product) {
        throw new Error('Sản phẩm không tồn tại!');
    }
    
    if (newSalePrice && newSalePrice >= newPrice) {
        throw new Error('Giá sale phải nhỏ hơn giá gốc!');
    }
    
    await product.update({
        price: newPrice,
        sale_price: newSalePrice
    });
    
    console.log('✅ Đã cập nhật giá sản phẩm:', productId);
    return product;
}

// ============================================
// 3. UPDATE HÀNG LOẠT
// ============================================

async function applyDiscountByCategory(categoryId, discountPercent) {
    if (discountPercent < 0 || discountPercent > 50) {
        throw new Error('Discount phải từ 0% đến 50%!');
    }
    
    // Lấy products chưa có sale
    const products = await Product.findAll({
        where: {
            category_id: categoryId,
            is_active: true,
            sale_price: null
        }
    });
    
    // Update từng product
    for (const product of products) {
        const salePrice = Math.round(product.price * (1 - discountPercent / 100) / 1000) * 1000;
        await product.update({ sale_price: salePrice });
    }
    
    console.log(`✅ Đã giảm ${discountPercent}% cho ${products.length} sản phẩm`);
    return products.length;
}

async function removeAllDiscounts() {
    const [affectedCount] = await Product.update(
        { sale_price: null },
        { where: { sale_price: { [Op.not]: null } } }
    );
    
    console.log('✅ Đã xóa giảm giá:', affectedCount, 'sản phẩm');
    return affectedCount;
}

// ============================================
// 4. UPDATE ORDER STATUS
// ============================================

async function updateOrderStatus(orderId, newStatus) {
    const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['shipping', 'cancelled'],
        'shipping': ['delivered', 'cancelled'],
        'delivered': [],
        'cancelled': []
    };
    
    const order = await Order.findByPk(orderId);
    
    if (!order) {
        throw new Error('Đơn hàng không tồn tại!');
    }
    
    if (!validTransitions[order.status].includes(newStatus)) {
        throw new Error(`Không thể chuyển từ "${order.status}" sang "${newStatus}"!`);
    }
    
    const updateData = { status: newStatus };
    
    // Auto update payment_status
    if (newStatus === 'delivered') {
        updateData.payment_status = 'paid';
    } else if (newStatus === 'cancelled') {
        updateData.payment_status = 'refunded';
    }
    
    await order.update(updateData);
    
    console.log('✅ Đơn hàng', orderId, ':', order.status, '→', newStatus);
    return order;
}

// ============================================
// 5. UPDATE VỚI TRANSACTION
// ============================================

async function confirmPayment(orderId, paymentMethod) {
    const t = await sequelize.transaction();
    
    try {
        const order = await Order.findByPk(orderId, { transaction: t });
        
        if (!order) {
            throw new Error('Đơn hàng không tồn tại!');
        }
        
        if (order.payment_status === 'paid') {
            throw new Error('Đơn hàng đã thanh toán!');
        }
        
        await order.update({
            payment_status: 'paid',
            payment_method: paymentMethod,
            status: 'confirmed'
        }, { transaction: t });
        
        await t.commit();
        console.log('✅ Đã xác nhận thanh toán:', orderId);
        return order;
        
    } catch (error) {
        await t.rollback();
        console.error('❌ Lỗi, đã rollback:', error.message);
        throw error;
    }
}

// ============================================
// 6. INCREMENT / DECREMENT
// ============================================

async function incrementStock(productId, quantity) {
    const product = await Product.findByPk(productId);
    
    if (!product) {
        throw new Error('Sản phẩm không tồn tại!');
    }
    
    // Tăng stock
    await product.increment('stock', { by: quantity });
    
    console.log('✅ Đã tăng stock:', productId, '+', quantity);
    return product.reload(); // Reload để lấy giá trị mới
}

async function decrementStock(productId, quantity) {
    const product = await Product.findByPk(productId);
    
    if (!product) {
        throw new Error('Sản phẩm không tồn tại!');
    }
    
    if (product.stock < quantity) {
        throw new Error('Không đủ hàng trong kho!');
    }
    
    // Giảm stock
    await product.decrement('stock', { by: quantity });
    
    console.log('✅ Đã giảm stock:', productId, '-', quantity);
    return product.reload();
}

// ============================================
// 7. SOFT DELETE (Vô hiệu hóa)
// ============================================

async function deactivateUser(userId) {
    const user = await User.findByPk(userId);
    
    if (!user) {
        throw new Error('User không tồn tại!');
    }
    
    if (user.role === 'admin') {
        throw new Error('Không thể vô hiệu hóa Admin!');
    }
    
    await user.update({ is_active: false });
    
    console.log('✅ Đã vô hiệu hóa user:', userId);
    return true;
}

async function deactivateProduct(productId) {
    await Product.update(
        { is_active: false },
        { where: { id: productId } }
    );
    
    console.log('✅ Đã vô hiệu hóa product:', productId);
    return true;
}

// ============================================
// 8. UPDATE REVIEW
// ============================================

async function updateReview(reviewId, userId, data) {
    const review = await Review.findOne({
        where: { id: reviewId, user_id: userId }
    });
    
    if (!review) {
        throw new Error('Bạn không có quyền sửa review này!');
    }
    
    await review.update({
        rating: data.rating,
        title: data.title,
        comment: data.comment
    });
    
    console.log('✅ Đã cập nhật review:', reviewId);
    return review;
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo ORM - UPDATE\n');
    console.log('='.repeat(50));
    
    try {
        // 1. Update user profile
        console.log('\n📝 1. Cập nhật profile user:');
        await updateUserProfile(2, {
            full_name: 'Nguyễn Văn A (ORM Updated)',
            phone: '0909111222'
        });
        
        // 2. Increment stock
        console.log('\n📝 2. Tăng stock:');
        const product = await incrementStock(1, 10);
        console.log('   New stock:', product.stock);
        
        // 3. Hiển thị kết quả
        console.log('\n📋 Kết quả:');
        const user = await User.findByPk(2, {
            attributes: ['id', 'full_name', 'phone']
        });
        console.log('User:', user.toJSON());
        
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
    updateUserProfileDirect,
    updateProductPrice,
    applyDiscountByCategory,
    removeAllDiscounts,
    updateOrderStatus,
    confirmPayment,
    incrementStock,
    decrementStock,
    deactivateUser,
    deactivateProduct,
    updateReview
};

// Run demo
if (require.main === module) {
    demo();
}
