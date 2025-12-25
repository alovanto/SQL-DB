/**
 * LAB SQL - RAW SQL: READ (SELECT)
 * Truy vấn dữ liệu từ database
 * Chạy: node 02-raw-sql/read.js
 */

const { pool } = require('../config/database');

// ============================================
// 1. SELECT ĐƠN GIẢN
// ============================================
async function getAllUsers() {
    const sql = 'SELECT id, username, full_name, email, phone, role FROM users';
    
    const [rows] = await pool.execute(sql);
    console.log('📋 Danh sách users:', rows.length, 'người');
    return rows;
}

async function getUserById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
}

// ============================================
// 2. SELECT VỚI ĐIỀU KIỆN
// ============================================
async function getProductsByCategory(categoryId) {
    const sql = `
        SELECT p.*, c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = ? AND p.is_active = TRUE
        ORDER BY p.price DESC
    `;
    
    const [rows] = await pool.execute(sql, [categoryId]);
    return rows;
}

async function getProductsInPriceRange(minPrice, maxPrice) {
    const sql = `
        SELECT id, name, price, sale_price, stock,
               COALESCE(sale_price, price) as display_price
        FROM products
        WHERE price BETWEEN ? AND ?
        ORDER BY COALESCE(sale_price, price) ASC
    `;
    
    const [rows] = await pool.execute(sql, [minPrice, maxPrice]);
    return rows;
}

// ============================================
// 3. SEARCH - TÌM KIẾM
// ============================================
async function searchProducts(keyword) {
    // ⚠️ CÁCH SAI - SQL Injection vulnerable:
    // const sql = `SELECT * FROM products WHERE name LIKE '%${keyword}%'`;
    
    // ✅ CÁCH ĐÚNG - Sử dụng prepared statement:
    const sql = `
        SELECT p.id, p.name, p.price, p.sale_price, p.stock, c.name as category
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name LIKE ? OR p.description LIKE ?
        ORDER BY p.name
    `;
    
    const searchPattern = `%${keyword}%`;
    const [rows] = await pool.execute(sql, [searchPattern, searchPattern]);
    
    console.log(`🔍 Tìm kiếm "${keyword}": ${rows.length} kết quả`);
    return rows;
}

// ============================================
// 4. PAGINATION - PHÂN TRANG
// ============================================
async function getProductsPaginated(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    // Query lấy data
    const dataSql = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.id
        LIMIT ? OFFSET ?
    `;
    
    // Query đếm tổng
    const countSql = 'SELECT COUNT(*) as total FROM products';
    
    const [rows] = await pool.execute(dataSql, [String(limit), String(offset)]);
    const [[{ total }]] = await pool.execute(countSql);
    
    const totalPages = Math.ceil(total / limit);
    
    return {
        data: rows,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
}

// ============================================
// 5. AGGREGATE - THỐNG KÊ
// ============================================
async function getProductStats() {
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
    return stats;
}

async function getSalesByCategory() {
    const sql = `
        SELECT 
            c.name as category,
            COUNT(DISTINCT oi.order_id) as order_count,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.total_price) as total_revenue
        FROM categories c
        JOIN products p ON c.id = p.category_id
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.payment_status = 'paid'
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
    `;
    
    const [rows] = await pool.execute(sql);
    return rows;
}

// ============================================
// 6. JOIN PHỨC TẠP
// ============================================
async function getOrderDetails(orderId) {
    const sql = `
        SELECT 
            o.order_code,
            o.created_at,
            o.status,
            o.payment_method,
            o.payment_status,
            o.total_amount,
            o.shipping_address,
            o.shipping_phone,
            u.full_name as customer_name,
            u.email as customer_email,
            p.name as product_name,
            c.name as category_name,
            oi.quantity,
            oi.unit_price,
            oi.total_price
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE o.id = ?
    `;
    
    const [rows] = await pool.execute(sql, [orderId]);
    
    if (rows.length === 0) return null;
    
    // Transform to order object with items array
    const order = {
        order_code: rows[0].order_code,
        created_at: rows[0].created_at,
        status: rows[0].status,
        payment_method: rows[0].payment_method,
        payment_status: rows[0].payment_status,
        total_amount: rows[0].total_amount,
        shipping_address: rows[0].shipping_address,
        shipping_phone: rows[0].shipping_phone,
        customer: {
            name: rows[0].customer_name,
            email: rows[0].customer_email
        },
        items: rows.map(row => ({
            product_name: row.product_name,
            category: row.category_name,
            quantity: row.quantity,
            unit_price: row.unit_price,
            total_price: row.total_price
        }))
    };
    
    return order;
}

// ============================================
// 7. PRODUCT VỚI REVIEWS
// ============================================
async function getProductWithReviews(productId) {
    // Lấy thông tin product
    const productSql = `
        SELECT p.*, c.name as category_name,
               (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) as avg_rating,
               (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
    `;
    
    // Lấy reviews
    const reviewsSql = `
        SELECT r.*, u.full_name as reviewer_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC
        LIMIT 10
    `;
    
    const [[product]] = await pool.execute(productSql, [productId]);
    const [reviews] = await pool.execute(reviewsSql, [productId]);
    
    if (!product) return null;
    
    return {
        ...product,
        reviews
    };
}

// ============================================
// 8. DYNAMIC QUERY BUILDER
// ============================================
async function searchProductsAdvanced(filters) {
    let sql = `
        SELECT p.*, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = TRUE
    `;
    
    const params = [];
    
    // Dynamic conditions
    if (filters.category_id) {
        sql += ' AND p.category_id = ?';
        params.push(filters.category_id);
    }
    
    if (filters.min_price) {
        sql += ' AND COALESCE(p.sale_price, p.price) >= ?';
        params.push(filters.min_price);
    }
    
    if (filters.max_price) {
        sql += ' AND COALESCE(p.sale_price, p.price) <= ?';
        params.push(filters.max_price);
    }
    
    if (filters.keyword) {
        sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    
    if (filters.in_stock) {
        sql += ' AND p.stock > 0';
    }
    
    if (filters.on_sale) {
        sql += ' AND p.sale_price IS NOT NULL';
    }
    
    // Sorting
    const sortOptions = {
        'price_asc': 'COALESCE(p.sale_price, p.price) ASC',
        'price_desc': 'COALESCE(p.sale_price, p.price) DESC',
        'name_asc': 'p.name ASC',
        'newest': 'p.created_at DESC',
        'popular': '(SELECT COUNT(*) FROM order_items WHERE product_id = p.id) DESC'
    };
    
    sql += ` ORDER BY ${sortOptions[filters.sort] || 'p.id ASC'}`;
    
    // Pagination
    if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(String(filters.limit));
        
        if (filters.offset) {
            sql += ' OFFSET ?';
            params.push(String(filters.offset));
        }
    }
    
    const [rows] = await pool.execute(sql, params);
    return rows;
}

// ============================================
// 9. TOP PRODUCTS / RANKINGS
// ============================================
async function getTopSellingProducts(limit = 5) {
    const sql = `
        SELECT 
            p.id, p.name, p.price, p.sale_price,
            c.name as category,
            SUM(oi.quantity) as total_sold,
            SUM(oi.total_price) as total_revenue
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE o.payment_status = 'paid'
        GROUP BY p.id, p.name, p.price, p.sale_price, c.name
        ORDER BY total_sold DESC
        LIMIT ?
    `;
    
    const [rows] = await pool.execute(sql, [String(limit)]);
    return rows;
}

async function getTopRatedProducts(limit = 5) {
    const sql = `
        SELECT 
            p.id, p.name, p.price,
            c.name as category,
            ROUND(AVG(r.rating), 1) as avg_rating,
            COUNT(r.id) as review_count
        FROM products p
        JOIN reviews r ON p.id = r.product_id
        LEFT JOIN categories c ON p.category_id = c.id
        GROUP BY p.id, p.name, p.price, c.name
        HAVING COUNT(r.id) >= 2
        ORDER BY avg_rating DESC, review_count DESC
        LIMIT ?
    `;
    
    const [rows] = await pool.execute(sql, [String(limit)]);
    return rows;
}

// ============================================
// DEMO
// ============================================
async function demo() {
    console.log('🚀 Demo Raw SQL - READ\n');
    console.log('='.repeat(50));
    
    try {
        // 1. Get all users
        console.log('\n📋 1. Tất cả users:');
        const users = await getAllUsers();
        console.table(users.slice(0, 3));
        
        // 2. Get user by ID
        console.log('\n📋 2. User ID = 2:');
        const user = await getUserById(2);
        console.log(user);
        
        // 3. Search products
        console.log('\n📋 3. Tìm kiếm "iPhone":');
        const searchResults = await searchProducts('iPhone');
        console.table(searchResults);
        
        // 4. Pagination
        console.log('\n📋 4. Phân trang (trang 1, 5 sản phẩm):');
        const paginated = await getProductsPaginated(1, 5);
        console.log('Pagination:', paginated.pagination);
        console.table(paginated.data.map(p => ({ id: p.id, name: p.name, price: p.price })));
        
        // 5. Statistics
        console.log('\n📋 5. Thống kê sản phẩm:');
        const stats = await getProductStats();
        console.table([stats]);
        
        // 6. Order details
        console.log('\n📋 6. Chi tiết đơn hàng ID = 1:');
        const order = await getOrderDetails(1);
        console.log('Order:', order?.order_code);
        console.log('Customer:', order?.customer);
        console.table(order?.items);
        
        // 7. Top selling
        console.log('\n📋 7. Top 5 sản phẩm bán chạy:');
        const topSelling = await getTopSellingProducts(5);
        console.table(topSelling);
        
        // 8. Advanced search
        console.log('\n📋 8. Tìm kiếm nâng cao (điện thoại, giá < 25 triệu):');
        const advanced = await searchProductsAdvanced({
            category_id: 1,
            max_price: 25000000,
            in_stock: true,
            sort: 'price_asc'
        });
        console.table(advanced.map(p => ({ name: p.name, price: p.price, stock: p.stock })));
        
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
    getProductsByCategory,
    getProductsInPriceRange,
    searchProducts,
    getProductsPaginated,
    getProductStats,
    getSalesByCategory,
    getOrderDetails,
    getProductWithReviews,
    searchProductsAdvanced,
    getTopSellingProducts,
    getTopRatedProducts
};

// Run demo
if (require.main === module) {
    demo();
}
