/**
 * STORED PROCEDURES - Gọi SP từ Node.js
 * Lab SQL: E-commerce System
 * 
 * File này demo cách gọi Stored Procedures từ Node.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// Cấu hình kết nối
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    multipleStatements: true // Quan trọng: cho phép multiple result sets
};

// ============================================================
// 1. USER STORED PROCEDURES
// ============================================================

/**
 * Tạo user mới qua Stored Procedure
 */
async function createUserSP(userData) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_create_user');
        console.log('Input:', userData);
        
        // Gọi stored procedure với OUT parameters
        const [results] = await connection.query(
            `CALL sp_create_user(?, ?, ?, ?, ?, ?, @user_id, @message);
             SELECT @user_id AS user_id, @message AS message;`,
            [
                userData.username,
                userData.email,
                userData.password,
                userData.full_name,
                userData.phone,
                userData.role || 'customer'
            ]
        );
        
        // Kết quả nằm ở result set cuối cùng
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

/**
 * Lấy thông tin user theo ID
 */
async function getUserByIdSP(userId) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_get_user_by_id');
        console.log('Input: userId =', userId);
        
        const [results] = await connection.query('CALL sp_get_user_by_id(?)', [userId]);
        
        const user = results[0][0];
        console.log('Output:', user || 'Không tìm thấy user');
        
        return user;
    } finally {
        await connection.end();
    }
}

/**
 * Lấy danh sách users với phân trang
 */
async function getUsersPaginatedSP(page = 1, limit = 5, role = null) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_get_users_paginated');
        console.log('Input: page =', page, ', limit =', limit, ', role =', role);
        
        const [results] = await connection.query(
            `CALL sp_get_users_paginated(?, ?, ?, @total);
             SELECT @total AS total;`,
            [page, limit, role]
        );
        
        const users = results[0];
        const total = results[results.length - 1][0].total;
        
        console.log(`Output: ${users.length} users (tổng: ${total})`);
        console.table(users.map(u => ({
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            role: u.role
        })));
        
        return { users, total, page, limit };
    } finally {
        await connection.end();
    }
}

/**
 * Cập nhật user
 */
async function updateUserSP(userId, updateData) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_update_user');
        console.log('Input: userId =', userId, ', data =', updateData);
        
        const [results] = await connection.query(
            `CALL sp_update_user(?, ?, ?, ?, @affected, @message);
             SELECT @affected AS affected_rows, @message AS message;`,
            [
                userId,
                updateData.full_name || null,
                updateData.phone || null,
                updateData.role || null
            ]
        );
        
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

/**
 * Xóa user
 */
async function deleteUserSP(userId) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_delete_user');
        console.log('Input: userId =', userId);
        
        const [results] = await connection.query(
            `CALL sp_delete_user(?, @affected, @message);
             SELECT @affected AS affected_rows, @message AS message;`,
            [userId]
        );
        
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

// ============================================================
// 2. PRODUCT STORED PROCEDURES
// ============================================================

/**
 * Tạo sản phẩm mới
 */
async function createProductSP(productData) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_create_product');
        console.log('Input:', productData);
        
        const [results] = await connection.query(
            `CALL sp_create_product(?, ?, ?, ?, ?, ?, @product_id, @message);
             SELECT @product_id AS product_id, @message AS message;`,
            [
                productData.category_id,
                productData.name,
                productData.description,
                productData.price,
                productData.stock_quantity,
                productData.image_url || null
            ]
        );
        
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

/**
 * Tìm kiếm sản phẩm
 */
async function searchProductsSP(options = {}) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_search_products');
        console.log('Input:', options);
        
        const [results] = await connection.query(
            'CALL sp_search_products(?, ?, ?, ?, ?, ?, ?)',
            [
                options.keyword || null,
                options.category_id || null,
                options.min_price || null,
                options.max_price || null,
                options.in_stock ?? null,
                options.page || 1,
                options.limit || 10
            ]
        );
        
        const products = results[0];
        console.log(`Output: Tìm thấy ${products.length} sản phẩm`);
        console.table(products.map(p => ({
            id: p.id,
            name: p.name.substring(0, 30),
            price: Number(p.price).toLocaleString('vi-VN'),
            stock: p.stock_quantity,
            rating: Number(p.avg_rating).toFixed(1),
            reviews: p.review_count
        })));
        
        return products;
    } finally {
        await connection.end();
    }
}

/**
 * Lấy chi tiết sản phẩm
 */
async function getProductDetailSP(productId) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_get_product_detail');
        console.log('Input: productId =', productId);
        
        const [results] = await connection.query(
            'CALL sp_get_product_detail(?)',
            [productId]
        );
        
        const product = results[0][0];
        const reviews = results[1];
        
        console.log('Product:', {
            id: product.id,
            name: product.name,
            price: Number(product.price).toLocaleString('vi-VN'),
            avg_rating: Number(product.avg_rating).toFixed(1)
        });
        console.log(`Reviews (${reviews.length}):`);
        reviews.forEach(r => {
            console.log(`  ⭐ ${r.rating}/5 - ${r.username}: ${r.comment?.substring(0, 50) || 'Không có comment'}`);
        });
        
        return { product, reviews };
    } finally {
        await connection.end();
    }
}

/**
 * Cập nhật tồn kho
 */
async function updateStockSP(productId, quantity, operation) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_update_stock');
        console.log('Input: productId =', productId, ', quantity =', quantity, ', operation =', operation);
        
        const [results] = await connection.query(
            `CALL sp_update_stock(?, ?, ?, @new_stock, @message);
             SELECT @new_stock AS new_stock, @message AS message;`,
            [productId, quantity, operation]
        );
        
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

// ============================================================
// 3. ORDER STORED PROCEDURES
// ============================================================

/**
 * Tạo đơn hàng mới
 */
async function createOrderSP(orderData) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_create_order');
        console.log('Input:', orderData);
        
        const [results] = await connection.query(
            `CALL sp_create_order(?, ?, ?, @order_id, @total, @message);
             SELECT @order_id AS order_id, @total AS total_amount, @message AS message;`,
            [
                orderData.user_id,
                orderData.shipping_address,
                JSON.stringify(orderData.items)
            ]
        );
        
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

/**
 * Lấy chi tiết đơn hàng
 */
async function getOrderDetailSP(orderId) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_get_order_detail');
        console.log('Input: orderId =', orderId);
        
        const [results] = await connection.query(
            'CALL sp_get_order_detail(?)',
            [orderId]
        );
        
        const order = results[0][0];
        const items = results[1];
        
        if (order) {
            console.log('Order:', {
                id: order.id,
                code: order.order_code,
                customer: order.full_name,
                status: order.status,
                total: Number(order.total_amount).toLocaleString('vi-VN') + ' VNĐ'
            });
            console.log('Items:');
            items.forEach(item => {
                console.log(`  - ${item.product_name}: ${item.quantity} x ${Number(item.unit_price).toLocaleString('vi-VN')} = ${Number(item.subtotal).toLocaleString('vi-VN')} VNĐ`);
            });
        }
        
        return { order, items };
    } finally {
        await connection.end();
    }
}

/**
 * Cập nhật trạng thái đơn hàng
 */
async function updateOrderStatusSP(orderId, newStatus) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_update_order_status');
        console.log('Input: orderId =', orderId, ', newStatus =', newStatus);
        
        const [results] = await connection.query(
            `CALL sp_update_order_status(?, ?, @message);
             SELECT @message AS message;`,
            [orderId, newStatus]
        );
        
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

/**
 * Hủy đơn hàng
 */
async function cancelOrderSP(orderId) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_cancel_order');
        console.log('Input: orderId =', orderId);
        
        const [results] = await connection.query(
            `CALL sp_cancel_order(?, @message);
             SELECT @message AS message;`,
            [orderId]
        );
        
        const output = results[results.length - 1][0];
        console.log('Output:', output);
        
        return output;
    } finally {
        await connection.end();
    }
}

// ============================================================
// 4. STATISTICS STORED PROCEDURES
// ============================================================

/**
 * Dashboard overview
 */
async function getDashboardSP() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_dashboard_overview');
        
        const [results] = await connection.query('CALL sp_dashboard_overview()');
        
        const overview = results[0][0];
        const ordersByStatus = results[1];
        const lowStockProducts = results[2];
        const recentOrders = results[3];
        
        console.log('\n📊 DASHBOARD OVERVIEW');
        console.log('═'.repeat(50));
        console.log('Tổng quan:');
        console.log(`  👥 Khách hàng: ${overview.total_customers}`);
        console.log(`  📦 Sản phẩm: ${overview.total_products}`);
        console.log(`  🛒 Đơn hàng: ${overview.total_orders}`);
        console.log(`  💰 Doanh thu: ${Number(overview.total_revenue || 0).toLocaleString('vi-VN')} VNĐ`);
        
        console.log('\nĐơn hàng theo trạng thái:');
        ordersByStatus.forEach(s => {
            console.log(`  ${s.status}: ${s.count}`);
        });
        
        console.log('\nSản phẩm sắp hết hàng:');
        lowStockProducts.forEach(p => {
            console.log(`  ⚠️ ${p.name}: còn ${p.stock_quantity}`);
        });
        
        console.log('\nĐơn hàng mới nhất:');
        recentOrders.forEach(o => {
            console.log(`  ${o.order_code} - ${o.full_name} - ${Number(o.total_amount).toLocaleString('vi-VN')} VNĐ [${o.status}]`);
        });
        
        return { overview, ordersByStatus, lowStockProducts, recentOrders };
    } finally {
        await connection.end();
    }
}

/**
 * Báo cáo doanh thu
 */
async function getRevenueReportSP(startDate, endDate) {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n🔹 Gọi SP: sp_revenue_report');
        console.log('Input: từ', startDate, 'đến', endDate);
        
        const [results] = await connection.query(
            'CALL sp_revenue_report(?, ?)',
            [startDate, endDate]
        );
        
        const summary = results[0][0];
        const dailyRevenue = results[1];
        const topProducts = results[2];
        
        console.log('\n📈 BÁO CÁO DOANH THU');
        console.log('═'.repeat(50));
        console.log('Tổng quan:');
        console.log(`  📋 Tổng đơn hàng: ${summary.total_orders}`);
        console.log(`  ✅ Đã giao: ${summary.delivered_orders}`);
        console.log(`  ❌ Đã hủy: ${summary.cancelled_orders}`);
        console.log(`  💵 Tổng doanh thu: ${Number(summary.total_revenue || 0).toLocaleString('vi-VN')} VNĐ`);
        console.log(`  📊 Giá trị TB/đơn: ${Number(summary.avg_order_value || 0).toLocaleString('vi-VN')} VNĐ`);
        
        if (dailyRevenue.length > 0) {
            console.log('\nDoanh thu theo ngày:');
            dailyRevenue.forEach(d => {
                console.log(`  ${d.order_date}: ${d.order_count} đơn - ${Number(d.daily_revenue).toLocaleString('vi-VN')} VNĐ`);
            });
        }
        
        if (topProducts.length > 0) {
            console.log('\nTop sản phẩm bán chạy:');
            topProducts.forEach((p, i) => {
                console.log(`  ${i + 1}. ${p.name}: ${p.total_sold} sp - ${Number(p.total_revenue).toLocaleString('vi-VN')} VNĐ`);
            });
        }
        
        return { summary, dailyRevenue, topProducts };
    } finally {
        await connection.end();
    }
}

// ============================================================
// MAIN - Demo các Stored Procedures
// ============================================================

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     STORED PROCEDURES DEMO - E-commerce System            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    
    try {
        // ----- USER SPs -----
        console.log('\n' + '═'.repeat(60));
        console.log('📌 1. USER STORED PROCEDURES');
        console.log('═'.repeat(60));
        
        // Lấy danh sách users
        await getUsersPaginatedSP(1, 5, null);
        
        // Lấy user theo ID
        await getUserByIdSP(2);
        
        // Tạo user mới (có thể bị duplicate)
        await createUserSP({
            username: 'sp_user_test',
            email: 'sp_test@example.com',
            password: 'hashed_password_123',
            full_name: 'SP Test User',
            phone: '0999888777',
            role: 'customer'
        });
        
        // ----- PRODUCT SPs -----
        console.log('\n' + '═'.repeat(60));
        console.log('📌 2. PRODUCT STORED PROCEDURES');
        console.log('═'.repeat(60));
        
        // Tìm kiếm sản phẩm
        await searchProductsSP({ keyword: 'iPhone', in_stock: true });
        
        // Chi tiết sản phẩm
        await getProductDetailSP(1);
        
        // Cập nhật tồn kho
        await updateStockSP(1, 5, 'add');
        
        // ----- ORDER SPs -----
        console.log('\n' + '═'.repeat(60));
        console.log('📌 3. ORDER STORED PROCEDURES');
        console.log('═'.repeat(60));
        
        // Chi tiết đơn hàng
        await getOrderDetailSP(1);
        
        // Cập nhật trạng thái
        await updateOrderStatusSP(1, 'confirmed');
        
        // ----- STATISTICS SPs -----
        console.log('\n' + '═'.repeat(60));
        console.log('📌 4. STATISTICS STORED PROCEDURES');
        console.log('═'.repeat(60));
        
        // Dashboard
        await getDashboardSP();
        
        // Báo cáo doanh thu (7 ngày gần nhất)
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        await getRevenueReportSP(
            weekAgo.toISOString().split('T')[0],
            today.toISOString().split('T')[0]
        );
        
        console.log('\n' + '═'.repeat(60));
        console.log('✅ Demo Stored Procedures hoàn tất!');
        console.log('═'.repeat(60));
        
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    }
}

// Chạy demo
main();

// Export các functions
module.exports = {
    // User
    createUserSP,
    getUserByIdSP,
    getUsersPaginatedSP,
    updateUserSP,
    deleteUserSP,
    
    // Product
    createProductSP,
    searchProductsSP,
    getProductDetailSP,
    updateStockSP,
    
    // Order
    createOrderSP,
    getOrderDetailSP,
    updateOrderStatusSP,
    cancelOrderSP,
    
    // Statistics
    getDashboardSP,
    getRevenueReportSP
};
