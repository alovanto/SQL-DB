/**
 * LAB SQL - ORM: READ (SELECT)
 * So sánh với Raw SQL trong 02-raw-sql/read.js
 * Chạy: node 03-orm/read.js
 */

const { Op } = require('sequelize');
const { sequelize, User, Category, Product, Order, OrderItem, Review } = require('./index');

// ============================================
// 1. FIND ALL
// ============================================

// Raw SQL:  SELECT * FROM users
// ORM:      User.findAll()

async function getAllUsers() {
    const users = await User.findAll({
        attributes: ['id', 'username', 'full_name', 'email', 'phone', 'role']
    });
    
    console.log('📋 Tất cả users:', users.length);
    return users;
}

// ============================================
// 2. FIND BY PRIMARY KEY
// ============================================

// Raw SQL:  SELECT * FROM users WHERE id = ?
// ORM:      User.findByPk(id)

async function getUserById(id) {
    const user = await User.findByPk(id);
    return user;
}

// ============================================
// 3. FIND ONE (Điều kiện)
// ============================================

// Raw SQL:  SELECT * FROM users WHERE email = ? LIMIT 1
// ORM:      User.findOne({ where: { email } })

async function getUserByEmail(email) {
    const user = await User.findOne({
        where: { email }
    });
    return user;
}

// ============================================
// 4. WHERE VỚI OPERATORS
// ============================================

async function getProductsByPriceRange(minPrice, maxPrice) {
    // Raw SQL: WHERE price BETWEEN ? AND ?
    const products = await Product.findAll({
        where: {
            price: {
                [Op.between]: [minPrice, maxPrice]
            },
            is_active: true
        },
        order: [['price', 'ASC']]
    });
    
    return products;
}

async function searchProducts(keyword) {
    // Raw SQL: WHERE name LIKE ? OR description LIKE ?
    const products = await Product.findAll({
        where: {
            [Op.or]: [
                { name: { [Op.like]: `%${keyword}%` } },
                { description: { [Op.like]: `%${keyword}%` } }
            ]
        },
        include: [{
            model: Category,
            as: 'category',
            attributes: ['name']
        }]
    });
    
    console.log(`🔍 Tìm "${keyword}":`, products.length, 'kết quả');
    return products;
}

// ============================================
// 5. INCLUDE (JOIN)
// ============================================

async function getProductWithCategory(productId) {
    // Raw SQL: SELECT p.*, c.name FROM products p JOIN categories c ...
    const product = await Product.findByPk(productId, {
        include: [{
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
        }]
    });
    
    return product;
}

async function getProductWithReviews(productId) {
    const product = await Product.findByPk(productId, {
        include: [
            {
                model: Category,
                as: 'category',
                attributes: ['name']
            },
            {
                model: Review,
                as: 'reviews',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['full_name']
                }],
                order: [['created_at', 'DESC']],
                limit: 10
            }
        ]
    });
    
    return product;
}

// ============================================
// 6. PAGINATION
// ============================================

async function getProductsPaginated(page = 1, limit = 10) {
    // Raw SQL: SELECT ... LIMIT ? OFFSET ?
    const offset = (page - 1) * limit;
    
    const { count, rows } = await Product.findAndCountAll({
        include: [{
            model: Category,
            as: 'category',
            attributes: ['name']
        }],
        order: [['id', 'ASC']],
        limit,
        offset
    });
    
    return {
        data: rows,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
            hasNext: page < Math.ceil(count / limit),
            hasPrev: page > 1
        }
    };
}

// ============================================
// 7. AGGREGATE
// ============================================

async function getProductStats() {
    // Raw SQL: SELECT COUNT(*), SUM(stock), AVG(price)...
    const stats = await Product.findOne({
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total_products'],
            [sequelize.fn('SUM', sequelize.col('stock')), 'total_stock'],
            [sequelize.fn('AVG', sequelize.col('price')), 'avg_price'],
            [sequelize.fn('MIN', sequelize.col('price')), 'min_price'],
            [sequelize.fn('MAX', sequelize.col('price')), 'max_price']
        ],
        where: { is_active: true },
        raw: true
    });
    
    return stats;
}

async function getReviewStats(productId) {
    const stats = await Review.findOne({
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'total_reviews'],
            [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
            [sequelize.fn('MIN', sequelize.col('rating')), 'min_rating'],
            [sequelize.fn('MAX', sequelize.col('rating')), 'max_rating']
        ],
        where: { product_id: productId },
        raw: true
    });
    
    return stats;
}

// ============================================
// 8. GROUP BY
// ============================================

async function getProductCountByCategory() {
    // Raw SQL: SELECT category_id, COUNT(*) ... GROUP BY category_id
    const result = await Product.findAll({
        attributes: [
            'category_id',
            [sequelize.fn('COUNT', sequelize.col('products.id')), 'product_count'],
            [sequelize.fn('SUM', sequelize.col('stock')), 'total_stock']
        ],
        include: [{
            model: Category,
            as: 'category',
            attributes: ['name']
        }],
        group: ['category_id', 'category.id', 'category.name'],
        raw: true,
        nest: true
    });
    
    return result;
}

async function getOrdersByStatus() {
    const result = await Order.findAll({
        attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
            [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_revenue']
        ],
        group: ['status'],
        raw: true
    });
    
    return result;
}

// ============================================
// 9. ORDER DETAILS (COMPLEX JOIN)
// ============================================

async function getOrderDetails(orderId) {
    const order = await Order.findByPk(orderId, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'full_name', 'email', 'phone']
            },
            {
                model: OrderItem,
                as: 'items',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'image_url'],
                    include: [{
                        model: Category,
                        as: 'category',
                        attributes: ['name']
                    }]
                }]
            }
        ]
    });
    
    return order;
}

// ============================================
// 10. ADVANCED SEARCH
// ============================================

async function searchProductsAdvanced(filters) {
    const where = { is_active: true };
    
    if (filters.category_id) {
        where.category_id = filters.category_id;
    }
    
    if (filters.min_price) {
        where.price = { ...where.price, [Op.gte]: filters.min_price };
    }
    
    if (filters.max_price) {
        where.price = { ...where.price, [Op.lte]: filters.max_price };
    }
    
    if (filters.keyword) {
        where[Op.or] = [
            { name: { [Op.like]: `%${filters.keyword}%` } },
            { description: { [Op.like]: `%${filters.keyword}%` } }
        ];
    }
    
    if (filters.in_stock) {
        where.stock = { [Op.gt]: 0 };
    }
    
    if (filters.on_sale) {
        where.sale_price = { [Op.not]: null };
    }
    
    // Sort options
    const orderOptions = {
        'price_asc': [['price', 'ASC']],
        'price_desc': [['price', 'DESC']],
        'name_asc': [['name', 'ASC']],
        'newest': [['created_at', 'DESC']]
    };
    
    const products = await Product.findAll({
        where,
        include: [{
            model: Category,
            as: 'category',
            attributes: ['name']
        }],
        order: orderOptions[filters.sort] || [['id', 'ASC']],
        limit: filters.limit || 20,
        offset: filters.offset || 0
    });
    
    return products;
}

// ============================================
// 11. TOP PRODUCTS
// ============================================

async function getTopSellingProducts(limit = 5) {
    const result = await OrderItem.findAll({
        attributes: [
            'product_id',
            [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold'],
            [sequelize.fn('SUM', sequelize.col('order_items.total_price')), 'total_revenue']
        ],
        include: [{
            model: Product,
            as: 'product',
            attributes: ['name', 'price'],
            include: [{
                model: Category,
                as: 'category',
                attributes: ['name']
            }]
        }],
        group: ['product_id', 'product.id', 'product.name', 'product.price', 
                'product.category.id', 'product.category.name'],
        order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
        limit,
        raw: true,
        nest: true
    });
    
    return result;
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo ORM - READ\n');
    console.log('='.repeat(50));
    
    try {
        // 1. Get all users
        console.log('\n📋 1. Tất cả users:');
        const users = await getAllUsers();
        console.table(users.map(u => u.toJSON()).slice(0, 3));
        
        // 2. Get user by ID
        console.log('\n📋 2. User ID = 2:');
        const user = await getUserById(2);
        console.log(user?.toJSON());
        
        // 3. Search products
        console.log('\n📋 3. Tìm kiếm "iPhone":');
        const searchResults = await searchProducts('iPhone');
        console.table(searchResults.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category?.name
        })));
        
        // 4. Pagination
        console.log('\n📋 4. Phân trang (trang 1, 5 sản phẩm):');
        const paginated = await getProductsPaginated(1, 5);
        console.log('Pagination:', paginated.pagination);
        
        // 5. Statistics
        console.log('\n📋 5. Thống kê sản phẩm:');
        const stats = await getProductStats();
        console.table([stats]);
        
        // 6. Order details
        console.log('\n📋 6. Chi tiết đơn hàng ID = 1:');
        const order = await getOrderDetails(1);
        if (order) {
            console.log('Order:', order.order_code);
            console.log('Customer:', order.user.full_name);
            console.log('Items:', order.items.map(i => i.product.name));
        }
        
        // 7. Products by category
        console.log('\n📋 7. Số sản phẩm theo danh mục:');
        const byCategory = await getProductCountByCategory();
        console.table(byCategory);
        
        console.log('\n' + '='.repeat(50));
        console.log('✅ Demo hoàn tất!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    process.exit(0);
}

// Export
module.exports = {
    getAllUsers,
    getUserById,
    getUserByEmail,
    getProductsByPriceRange,
    searchProducts,
    getProductWithCategory,
    getProductWithReviews,
    getProductsPaginated,
    getProductStats,
    getReviewStats,
    getProductCountByCategory,
    getOrdersByStatus,
    getOrderDetails,
    searchProductsAdvanced,
    getTopSellingProducts
};

// Run demo
if (require.main === module) {
    demo();
}
