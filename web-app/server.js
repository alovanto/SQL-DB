/**
 * 🛒 E-COMMERCE WEB APP - SECURE VERSION
 * 
 * Web server sử dụng các functions từ phần 02-04 (đã viết an toàn)
 * 
 * Chạy: node web-app/server.js
 * Truy cập: http://localhost:3001
 * 
 * So sánh với 05-vulnerable-api (port 3000) - version có lỗ hổng
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const logger = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Import routes
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');

// Import database
const { testConnection } = require('../config/database');

const app = express();
const PORT = process.env.WEB_PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// API ROUTES
// ============================================
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);

// ============================================
// API DOCUMENTATION
// ============================================
app.get('/api', (req, res) => {
    res.json({
        name: 'E-Commerce API',
        version: '1.0.0',
        description: 'Secure REST API for E-commerce system',
        endpoints: {
            users: {
                'GET /api/users': 'Danh sách users',
                'GET /api/users/:id': 'Chi tiết user',
                'POST /api/users': 'Tạo user mới',
                'PUT /api/users/:id': 'Cập nhật user',
                'DELETE /api/users/:id': 'Xóa user',
                'POST /api/users/login': 'Đăng nhập',
                'GET /api/users/:id/orders': 'Lịch sử đơn hàng'
            },
            products: {
                'GET /api/products': 'Danh sách sản phẩm (hỗ trợ search, filter, pagination)',
                'GET /api/products/:id': 'Chi tiết sản phẩm',
                'POST /api/products': 'Tạo sản phẩm',
                'PUT /api/products/:id': 'Cập nhật sản phẩm',
                'DELETE /api/products/:id': 'Xóa sản phẩm',
                'GET /api/products/:id/reviews': 'Đánh giá sản phẩm',
                'POST /api/products/:id/reviews': 'Thêm đánh giá',
                'GET /api/products/stats': 'Thống kê sản phẩm'
            },
            orders: {
                'GET /api/orders': 'Danh sách đơn hàng',
                'GET /api/orders/:id': 'Chi tiết đơn hàng',
                'POST /api/orders': 'Tạo đơn hàng',
                'PUT /api/orders/:id/status': 'Cập nhật trạng thái',
                'DELETE /api/orders/:id': 'Hủy đơn hàng',
                'GET /api/orders/stats': 'Thống kê đơn hàng'
            },
            categories: {
                'GET /api/categories': 'Danh sách danh mục',
                'GET /api/categories/:id': 'Chi tiết danh mục',
                'GET /api/categories/:id/products': 'Sản phẩm theo danh mục',
                'POST /api/categories': 'Tạo danh mục',
                'PUT /api/categories/:id': 'Cập nhật danh mục',
                'DELETE /api/categories/:id': 'Xóa danh mục'
            },
            reports: {
                'GET /api/reports/dashboard': 'Tổng quan dashboard',
                'GET /api/reports/top-products': 'Sản phẩm bán chạy',
                'GET /api/reports/revenue-by-category': 'Doanh thu theo danh mục',
                'GET /api/reports/revenue-by-month': 'Doanh thu theo tháng',
                'GET /api/reports/user-stats': 'Thống kê users',
                'GET /api/reports/low-stock': 'Sản phẩm sắp hết'
            }
        },
        security: {
            note: '✅ Tất cả API đều sử dụng Prepared Statements - AN TOÀN khỏi SQL Injection!',
            compare: 'So sánh với http://localhost:3000 (vulnerable version)'
        }
    });
});

// ============================================
// FRONTEND ROUTES
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================
app.use(notFound);
app.use(errorHandler);

// ============================================
// START SERVER
// ============================================
async function startServer() {
    try {
        // Test database connection
        await testConnection();
        
        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║       🛒 E-COMMERCE WEB APP - SECURE VERSION           ║');
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log(`║  🌐 Web:     http://localhost:${PORT}                     ║`);
            console.log(`║  📚 API:     http://localhost:${PORT}/api                 ║`);
            console.log('║  ✅ Status:  Running (Secure - No SQLi!)               ║');
            console.log('╠════════════════════════════════════════════════════════╣');
            console.log('║  So sánh với Vulnerable version:                       ║');
            console.log('║  ⚠️  http://localhost:3000 (05-vulnerable-api)         ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Không thể khởi động server:', error.message);
        process.exit(1);
    }
}

startServer();

module.exports = app;
