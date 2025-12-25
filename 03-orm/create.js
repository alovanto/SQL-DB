/**
 * LAB SQL - ORM: CREATE (INSERT)
 * So sánh với Raw SQL trong 02-raw-sql/create.js
 * Chạy: node 03-orm/create.js
 */

const { sequelize, User, Category, Product, Order, OrderItem, Review } = require('./index');

// ============================================
// 1. CREATE ĐƠN GIẢN
// ============================================

// Raw SQL:  INSERT INTO users (username, email, ...) VALUES (?, ?, ...)
// ORM:      User.create({ username, email, ... })

async function createUser(userData) {
    try {
        const user = await User.create(userData);
        
        console.log('✅ Đã tạo user:');
        console.log('   ID:', user.id);
        console.log('   Username:', user.username);
        
        return user;
    } catch (error) {
        // Sequelize tự động validate
        if (error.name === 'SequelizeValidationError') {
            console.error('❌ Validation error:', error.errors.map(e => e.message));
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            console.error('❌ Trùng lặp:', error.errors.map(e => e.message));
        } else {
            console.error('❌ Lỗi:', error.message);
        }
        throw error;
    }
}

// ============================================
// 2. CREATE NHIỀU DÒNG (BULK)
// ============================================

// Raw SQL:  INSERT INTO products VALUES ?
// ORM:      Product.bulkCreate([...])

async function createMultipleProducts(products) {
    try {
        const created = await Product.bulkCreate(products, {
            validate: true, // Validate tất cả trước khi insert
            returning: true
        });
        
        console.log('✅ Đã tạo', created.length, 'sản phẩm');
        return created;
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    }
}

// ============================================
// 3. CREATE VỚI ASSOCIATION
// ============================================

// Tạo order kèm order items (nested create)
async function createOrderWithItems(orderData) {
    const t = await sequelize.transaction();
    
    try {
        // 1. Tạo order
        const order = await Order.create({
            user_id: orderData.user_id,
            order_code: orderData.order_code,
            total_amount: orderData.total_amount,
            shipping_address: orderData.shipping_address,
            shipping_phone: orderData.shipping_phone,
            payment_method: orderData.payment_method
        }, { transaction: t });
        
        // 2. Tạo order items
        const itemsData = orderData.items.map(item => ({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.quantity * item.unit_price
        }));
        
        await OrderItem.bulkCreate(itemsData, { transaction: t });
        
        // 3. Giảm stock
        for (const item of orderData.items) {
            const product = await Product.findByPk(item.product_id, { transaction: t });
            
            if (!product || product.stock < item.quantity) {
                throw new Error(`Sản phẩm ${item.product_id} không đủ hàng!`);
            }
            
            await product.decrement('stock', { 
                by: item.quantity, 
                transaction: t 
            });
        }
        
        await t.commit();
        
        console.log('✅ Đã tạo đơn hàng:', order.order_code);
        return order;
        
    } catch (error) {
        await t.rollback();
        console.error('❌ Lỗi, đã rollback:', error.message);
        throw error;
    }
}

// ============================================
// 4. FIND OR CREATE
// ============================================

// Tìm hoặc tạo mới nếu chưa có
async function findOrCreateCategory(name, description = null) {
    const [category, created] = await Category.findOrCreate({
        where: { name },
        defaults: {
            description,
            is_active: true
        }
    });
    
    console.log(created ? '✅ Đã tạo category mới' : '📋 Category đã tồn tại');
    console.log('   ID:', category.id, '- Name:', category.name);
    
    return { category, created };
}

// ============================================
// 5. CREATE VỚI VALIDATION
// ============================================

async function createReview(reviewData) {
    try {
        // Kiểm tra đã review chưa
        const existing = await Review.findOne({
            where: {
                user_id: reviewData.user_id,
                product_id: reviewData.product_id
            }
        });
        
        if (existing) {
            throw new Error('Bạn đã đánh giá sản phẩm này rồi!');
        }
        
        // Kiểm tra đã mua hàng chưa
        const purchased = await OrderItem.findOne({
            include: [{
                model: Order,
                as: 'order',
                where: {
                    user_id: reviewData.user_id,
                    status: 'delivered'
                }
            }],
            where: {
                product_id: reviewData.product_id
            }
        });
        
        const review = await Review.create({
            ...reviewData,
            is_verified_purchase: !!purchased
        });
        
        console.log('✅ Đã tạo review:');
        console.log('   ID:', review.id);
        console.log('   Verified:', review.is_verified_purchase ? 'Có' : 'Không');
        
        return review;
    } catch (error) {
        console.error('❌ Lỗi:', error.message);
        throw error;
    }
}

// ============================================
// 6. UPSERT (INSERT OR UPDATE)
// ============================================

async function upsertProduct(productData) {
    const [product, created] = await Product.upsert(productData, {
        returning: true
    });
    
    console.log(created ? '✅ Đã INSERT' : '✅ Đã UPDATE', 'product ID:', product.id);
    return { product, created };
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo ORM - CREATE\n');
    console.log('='.repeat(50));
    
    try {
        // Demo 1: Create user
        console.log('\n📝 1. Tạo user mới:');
        const user = await createUser({
            username: 'orm_user_' + Date.now(),
            email: `orm${Date.now()}@test.com`,
            password: 'hashed_password',
            full_name: 'ORM Test User',
            phone: '0999888777',
            address: 'TP.HCM'
        });
        
        // Demo 2: Find or create category
        console.log('\n📝 2. Find or Create category:');
        await findOrCreateCategory('Camera', 'Camera và thiết bị quay phim');
        await findOrCreateCategory('Điện thoại'); // Đã tồn tại
        
        // Demo 3: Bulk create
        console.log('\n📝 3. Tạo nhiều sản phẩm:');
        await createMultipleProducts([
            { category_id: 1, name: 'ORM Phone 1', price: 9990000, stock: 10 },
            { category_id: 1, name: 'ORM Phone 2', price: 8990000, stock: 15 }
        ]);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Demo hoàn tất!\n');
        
    } catch (error) {
        console.error('❌ Demo error:', error.message);
    }
    
    process.exit(0);
}

// Export
module.exports = {
    createUser,
    createMultipleProducts,
    createOrderWithItems,
    findOrCreateCategory,
    createReview,
    upsertProduct
};

// Run demo
if (require.main === module) {
    demo();
}
