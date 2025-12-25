/**
 * LAB SQL - RAW SQL: CREATE (INSERT)
 * Thêm dữ liệu mới vào database
 * Chạy: node 02-raw-sql/create.js
 */

const { pool } = require('../config/database');

// ============================================
// 1. INSERT ĐƠN GIẢN
// ============================================
async function insertUser(userData) {
    const sql = `
        INSERT INTO users (username, email, password, full_name, phone, address, role)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        userData.username,
        userData.email,
        userData.password,
        userData.full_name,
        userData.phone,
        userData.address,
        userData.role || 'customer'
    ];
    
    try {
        const [result] = await pool.execute(sql, params);
        console.log('✅ Đã thêm user mới!');
        console.log('   ID:', result.insertId);
        console.log('   Affected rows:', result.affectedRows);
        return result.insertId;
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    }
}

// ============================================
// 2. INSERT NHIỀU DÒNG
// ============================================
async function insertMultipleProducts(products) {
    const sql = `
        INSERT INTO products (category_id, name, description, price, stock, image_url)
        VALUES ?
    `;
    
    // Chuyển array objects thành array of arrays
    const values = products.map(p => [
        p.category_id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.image_url
    ]);
    
    try {
        // Dùng query() thay vì execute() cho bulk insert
        const [result] = await pool.query(sql, [values]);
        console.log('✅ Đã thêm nhiều sản phẩm!');
        console.log('   Số dòng:', result.affectedRows);
        console.log('   ID đầu tiên:', result.insertId);
        return result;
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    }
}

// ============================================
// 3. INSERT VỚI TRANSACTION (Tạo đơn hàng)
// ============================================
async function createOrder(orderData) {
    const connection = await pool.getConnection();
    
    try {
        // Bắt đầu transaction
        await connection.beginTransaction();
        
        // 1. Tạo order
        const orderSql = `
            INSERT INTO orders (user_id, order_code, total_amount, shipping_address, shipping_phone, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [orderResult] = await connection.execute(orderSql, [
            orderData.user_id,
            orderData.order_code,
            orderData.total_amount,
            orderData.shipping_address,
            orderData.shipping_phone,
            orderData.payment_method
        ]);
        
        const orderId = orderResult.insertId;
        console.log('   📝 Đã tạo order:', orderId);
        
        // 2. Thêm order items
        for (const item of orderData.items) {
            const itemSql = `
                INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?)
            `;
            await connection.execute(itemSql, [
                orderId,
                item.product_id,
                item.quantity,
                item.unit_price,
                item.quantity * item.unit_price
            ]);
            
            // 3. Giảm stock
            const updateStockSql = `
                UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?
            `;
            const [stockResult] = await connection.execute(updateStockSql, [
                item.quantity,
                item.product_id,
                item.quantity
            ]);
            
            if (stockResult.affectedRows === 0) {
                throw new Error(`Sản phẩm ${item.product_id} không đủ hàng!`);
            }
        }
        
        // Commit transaction
        await connection.commit();
        console.log('✅ Đã tạo đơn hàng thành công!');
        console.log('   Order ID:', orderId);
        console.log('   Order Code:', orderData.order_code);
        
        return orderId;
        
    } catch (error) {
        // Rollback nếu lỗi
        await connection.rollback();
        console.error('❌ Lỗi, đã rollback:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// ============================================
// 4. INSERT OR UPDATE (UPSERT)
// ============================================
async function upsertProduct(product) {
    const sql = `
        INSERT INTO products (id, category_id, name, price, stock)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            price = VALUES(price),
            stock = VALUES(stock),
            updated_at = NOW()
    `;
    
    try {
        const [result] = await pool.execute(sql, [
            product.id,
            product.category_id,
            product.name,
            product.price,
            product.stock
        ]);
        
        if (result.affectedRows === 1) {
            console.log('✅ Đã INSERT sản phẩm mới, ID:', result.insertId);
        } else {
            console.log('✅ Đã UPDATE sản phẩm ID:', product.id);
        }
        
        return result;
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    }
}

// ============================================
// 5. INSERT VỚI VALIDATION
// ============================================
async function insertReview(reviewData) {
    // Validation
    if (!reviewData.user_id || !reviewData.product_id) {
        throw new Error('user_id và product_id là bắt buộc!');
    }
    
    if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating phải từ 1 đến 5!');
    }
    
    // Kiểm tra user đã review sản phẩm này chưa
    const checkSql = `
        SELECT id FROM reviews 
        WHERE user_id = ? AND product_id = ?
    `;
    const [existing] = await pool.execute(checkSql, [
        reviewData.user_id,
        reviewData.product_id
    ]);
    
    if (existing.length > 0) {
        throw new Error('User đã review sản phẩm này rồi!');
    }
    
    // Kiểm tra đã mua hàng chưa (verified purchase)
    const purchaseSql = `
        SELECT o.id FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'delivered'
        LIMIT 1
    `;
    const [purchase] = await pool.execute(purchaseSql, [
        reviewData.user_id,
        reviewData.product_id
    ]);
    
    const isVerified = purchase.length > 0;
    
    // Insert review
    const sql = `
        INSERT INTO reviews (user_id, product_id, rating, title, comment, is_verified_purchase)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(sql, [
        reviewData.user_id,
        reviewData.product_id,
        reviewData.rating,
        reviewData.title || null,
        reviewData.comment || null,
        isVerified
    ]);
    
    console.log('✅ Đã thêm review!');
    console.log('   ID:', result.insertId);
    console.log('   Verified purchase:', isVerified ? 'Có' : 'Không');
    
    return result.insertId;
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo Raw SQL - CREATE\n');
    console.log('='.repeat(50));
    
    try {
        // Demo 1: Insert user
        console.log('\n📝 1. Thêm user mới:');
        const userId = await insertUser({
            username: 'demo_user_' + Date.now(),
            email: `demo${Date.now()}@test.com`,
            password: 'hashed_password',
            full_name: 'Demo User',
            phone: '0999888777',
            address: 'TP.HCM'
        });
        
        // Demo 2: Insert nhiều products
        console.log('\n📝 2. Thêm nhiều sản phẩm:');
        await insertMultipleProducts([
            { category_id: 1, name: 'Demo Phone 1', description: 'Test', price: 9990000, stock: 10, image_url: 'demo1.jpg' },
            { category_id: 1, name: 'Demo Phone 2', description: 'Test', price: 8990000, stock: 15, image_url: 'demo2.jpg' }
        ]);
        
        // Demo 3: Tạo đơn hàng với transaction
        console.log('\n📝 3. Tạo đơn hàng (Transaction):');
        await createOrder({
            user_id: 2,
            order_code: 'ORD_DEMO_' + Date.now(),
            total_amount: 38980000,
            shipping_address: '123 Demo Street',
            shipping_phone: '0912345678',
            payment_method: 'cod',
            items: [
                { product_id: 1, quantity: 1, unit_price: 32990000 },
                { product_id: 11, quantity: 1, unit_price: 5990000 }
            ]
        });
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Demo hoàn tất!\n');
        
    } catch (error) {
        console.error('\n❌ Demo error:', error.message);
    }
    
    process.exit(0);
}

// Export functions
module.exports = {
    insertUser,
    insertMultipleProducts,
    createOrder,
    upsertProduct,
    insertReview
};

// Chạy demo nếu gọi trực tiếp
if (require.main === module) {
    demo();
}
