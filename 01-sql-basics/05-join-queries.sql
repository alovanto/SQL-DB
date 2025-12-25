-- ============================================
-- LAB SQL - CÁC LOẠI JOIN
-- Từ cơ bản đến nâng cao
-- ============================================

USE lab_sql;

-- ============================================
-- 1. INNER JOIN - CHỈ LẤY RECORDS KHỚP
-- ============================================

-- Sản phẩm với tên danh mục
SELECT 
    p.id,
    p.name AS 'Sản phẩm',
    p.price AS 'Giá',
    c.name AS 'Danh mục'
FROM products p
INNER JOIN categories c ON p.category_id = c.id;

-- Đơn hàng với thông tin khách hàng
SELECT 
    o.order_code AS 'Mã đơn',
    u.full_name AS 'Khách hàng',
    u.phone AS 'SĐT',
    o.total_amount AS 'Tổng tiền',
    o.status AS 'Trạng thái'
FROM orders o
INNER JOIN users u ON o.user_id = u.id;

-- Review với thông tin user và product
SELECT 
    r.rating AS 'Số sao',
    r.comment AS 'Nhận xét',
    u.full_name AS 'Người đánh giá',
    p.name AS 'Sản phẩm'
FROM reviews r
INNER JOIN users u ON r.user_id = u.id
INNER JOIN products p ON r.product_id = p.id;

-- ============================================
-- 2. LEFT JOIN - LẤY TẤT CẢ TỪ BẢNG TRÁI
-- ============================================

-- Tất cả users, kể cả chưa có đơn hàng
SELECT 
    u.full_name AS 'Khách hàng',
    u.email,
    o.order_code AS 'Mã đơn',
    o.total_amount AS 'Tổng tiền'
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
ORDER BY o.order_code;

-- Tìm users chưa đặt hàng
SELECT 
    u.full_name AS 'Khách hàng',
    u.email,
    u.created_at AS 'Ngày đăng ký'
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL AND u.role = 'customer';

-- Tất cả sản phẩm, kể cả chưa có review
SELECT 
    p.name AS 'Sản phẩm',
    p.price AS 'Giá',
    COUNT(r.id) AS 'Số review',
    COALESCE(ROUND(AVG(r.rating), 1), 0) AS 'Điểm TB'
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id, p.name, p.price
ORDER BY COUNT(r.id) DESC;

-- Sản phẩm chưa có review nào
SELECT 
    p.name AS 'Sản phẩm',
    p.price AS 'Giá',
    c.name AS 'Danh mục'
FROM products p
LEFT JOIN reviews r ON p.id = r.product_id
LEFT JOIN categories c ON p.category_id = c.id
WHERE r.id IS NULL;

-- Tất cả categories kể cả chưa có sản phẩm
SELECT 
    c.name AS 'Danh mục',
    COUNT(p.id) AS 'Số sản phẩm'
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name;

-- ============================================
-- 3. RIGHT JOIN - LẤY TẤT CẢ TỪ BẢNG PHẢI
-- ============================================

-- Tất cả categories với products (từ góc nhìn categories)
SELECT 
    c.name AS 'Danh mục',
    p.name AS 'Sản phẩm',
    p.price AS 'Giá'
FROM products p
RIGHT JOIN categories c ON p.category_id = c.id;

-- ============================================
-- 4. MULTIPLE JOINS - NHIỀU BẢNG
-- ============================================

-- Chi tiết đơn hàng đầy đủ
SELECT 
    o.order_code AS 'Mã đơn',
    u.full_name AS 'Khách hàng',
    p.name AS 'Sản phẩm',
    oi.quantity AS 'SL',
    FORMAT(oi.unit_price, 0) AS 'Đơn giá',
    FORMAT(oi.total_price, 0) AS 'Thành tiền'
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
ORDER BY o.order_code;

-- Chi tiết đơn hàng với danh mục sản phẩm
SELECT 
    o.order_code AS 'Mã đơn',
    o.created_at AS 'Ngày đặt',
    u.full_name AS 'Khách hàng',
    c.name AS 'Danh mục',
    p.name AS 'Sản phẩm',
    oi.quantity AS 'SL',
    FORMAT(oi.total_price, 0) AS 'Thành tiền',
    o.status AS 'Trạng thái'
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
ORDER BY o.created_at DESC;

-- Review đầy đủ thông tin
SELECT 
    u.full_name AS 'Người đánh giá',
    p.name AS 'Sản phẩm',
    c.name AS 'Danh mục',
    r.rating AS 'Sao',
    r.title AS 'Tiêu đề',
    r.comment AS 'Nhận xét',
    CASE r.is_verified_purchase 
        WHEN 1 THEN '✓ Đã mua'
        ELSE '✗ Chưa mua'
    END AS 'Xác thực'
FROM reviews r
JOIN users u ON r.user_id = u.id
JOIN products p ON r.product_id = p.id
JOIN categories c ON p.category_id = c.id
ORDER BY r.rating DESC, r.created_at DESC;

-- ============================================
-- 5. SELF JOIN - JOIN VỚI CHÍNH BẢNG ĐÓ
-- ============================================

-- Danh mục cha - con
SELECT 
    parent.name AS 'Danh mục cha',
    child.name AS 'Danh mục con'
FROM categories child
JOIN categories parent ON child.parent_id = parent.id;

-- Tất cả danh mục với thông tin cha
SELECT 
    c.name AS 'Danh mục',
    COALESCE(parent.name, '(Danh mục gốc)') AS 'Thuộc'
FROM categories c
LEFT JOIN categories parent ON c.parent_id = parent.id;

-- ============================================
-- 6. JOIN VỚI AGGREGATE
-- ============================================

-- Doanh thu theo danh mục
SELECT 
    c.name AS 'Danh mục',
    COUNT(DISTINCT oi.order_id) AS 'Số đơn',
    SUM(oi.quantity) AS 'SL bán',
    FORMAT(SUM(oi.total_price), 0) AS 'Doanh thu'
FROM categories c
JOIN products p ON c.id = p.category_id
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.payment_status = 'paid'
GROUP BY c.id, c.name
ORDER BY SUM(oi.total_price) DESC;

-- Top khách hàng theo số tiền đã thanh toán
SELECT 
    u.full_name AS 'Khách hàng',
    u.email,
    COUNT(o.id) AS 'Số đơn',
    FORMAT(SUM(o.total_amount), 0) AS 'Tổng chi tiêu'
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.payment_status = 'paid'
GROUP BY u.id, u.full_name, u.email
ORDER BY SUM(o.total_amount) DESC;

-- Sản phẩm với số lượng bán và đánh giá
SELECT 
    p.name AS 'Sản phẩm',
    c.name AS 'Danh mục',
    FORMAT(p.price, 0) AS 'Giá',
    COALESCE(SUM(oi.quantity), 0) AS 'Đã bán',
    COUNT(DISTINCT r.id) AS 'Số review',
    COALESCE(ROUND(AVG(r.rating), 1), 0) AS 'Điểm TB'
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN order_items oi ON p.id = oi.product_id
LEFT JOIN reviews r ON p.id = r.product_id
GROUP BY p.id, p.name, c.name, p.price
ORDER BY SUM(oi.quantity) DESC;

-- ============================================
-- 7. JOIN VỚI SUBQUERY
-- ============================================

-- Sản phẩm có doanh thu cao nhất
SELECT 
    p.name AS 'Sản phẩm',
    sub.total_revenue AS 'Doanh thu'
FROM products p
JOIN (
    SELECT product_id, SUM(total_price) AS total_revenue
    FROM order_items
    GROUP BY product_id
    ORDER BY SUM(total_price) DESC
    LIMIT 1
) sub ON p.id = sub.product_id;

-- Khách hàng mua nhiều đơn nhất
SELECT 
    u.full_name,
    u.email,
    sub.order_count AS 'Số đơn'
FROM users u
JOIN (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
    HAVING COUNT(*) = (
        SELECT MAX(cnt) FROM (
            SELECT COUNT(*) AS cnt FROM orders GROUP BY user_id
        ) AS counts
    )
) sub ON u.id = sub.user_id;

-- Sản phẩm có giá cao hơn giá TB của danh mục
SELECT 
    p.name AS 'Sản phẩm',
    c.name AS 'Danh mục',
    FORMAT(p.price, 0) AS 'Giá',
    FORMAT(cat_avg.avg_price, 0) AS 'Giá TB danh mục'
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN (
    SELECT category_id, AVG(price) AS avg_price
    FROM products
    GROUP BY category_id
) cat_avg ON p.category_id = cat_avg.category_id
WHERE p.price > cat_avg.avg_price;

-- ============================================
-- 8. QUERY THỰC TẾ - BÁO CÁO
-- ============================================

-- 📊 Báo cáo tổng quan bán hàng
SELECT 
    'Tổng đơn hàng' AS 'Chỉ số',
    COUNT(*) AS 'Giá trị'
FROM orders
UNION ALL
SELECT 
    'Đơn đã thanh toán',
    COUNT(*)
FROM orders WHERE payment_status = 'paid'
UNION ALL
SELECT 
    'Tổng doanh thu (VND)',
    SUM(total_amount)
FROM orders WHERE payment_status = 'paid'
UNION ALL
SELECT 
    'Số khách hàng',
    COUNT(DISTINCT user_id)
FROM orders;

-- 📊 Bảng thống kê sản phẩm chi tiết
SELECT 
    p.id,
    p.name AS 'Tên sản phẩm',
    c.name AS 'Danh mục',
    FORMAT(p.price, 0) AS 'Giá gốc',
    FORMAT(COALESCE(p.sale_price, p.price), 0) AS 'Giá bán',
    p.stock AS 'Tồn kho',
    COALESCE(sold.qty, 0) AS 'Đã bán',
    COALESCE(rev.cnt, 0) AS 'Số review',
    COALESCE(ROUND(rev.avg_rating, 1), 0) AS 'Điểm TB',
    CASE 
        WHEN p.stock < 20 THEN '🔴 Sắp hết'
        WHEN p.stock < 40 THEN '🟡 Còn ít'
        ELSE '🟢 Đủ hàng'
    END AS 'Trạng thái kho'
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN (
    SELECT product_id, SUM(quantity) AS qty
    FROM order_items
    GROUP BY product_id
) sold ON p.id = sold.product_id
LEFT JOIN (
    SELECT product_id, COUNT(*) AS cnt, AVG(rating) AS avg_rating
    FROM reviews
    GROUP BY product_id
) rev ON p.id = rev.product_id
ORDER BY COALESCE(sold.qty, 0) DESC;

-- 📊 Chi tiết đơn hàng dạng hóa đơn
SELECT 
    o.order_code AS 'Mã đơn hàng',
    DATE_FORMAT(o.created_at, '%d/%m/%Y %H:%i') AS 'Thời gian',
    u.full_name AS 'Khách hàng',
    o.shipping_phone AS 'SĐT',
    o.shipping_address AS 'Địa chỉ',
    GROUP_CONCAT(
        CONCAT(p.name, ' x', oi.quantity)
        SEPARATOR ', '
    ) AS 'Sản phẩm',
    FORMAT(o.total_amount, 0) AS 'Tổng tiền',
    CASE o.payment_method
        WHEN 'cod' THEN 'COD'
        WHEN 'bank_transfer' THEN 'Chuyển khoản'
        WHEN 'credit_card' THEN 'Thẻ tín dụng'
    END AS 'Thanh toán',
    CASE o.status
        WHEN 'pending' THEN '⏳ Chờ xác nhận'
        WHEN 'confirmed' THEN '✅ Đã xác nhận'
        WHEN 'shipping' THEN '🚚 Đang giao'
        WHEN 'delivered' THEN '📦 Đã giao'
        WHEN 'cancelled' THEN '❌ Đã hủy'
    END AS 'Trạng thái'
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
GROUP BY o.id, o.order_code, o.created_at, u.full_name, 
         o.shipping_phone, o.shipping_address, o.total_amount,
         o.payment_method, o.status
ORDER BY o.created_at DESC;

-- 📊 Phân tích khách hàng RFM (Recency, Frequency, Monetary)
SELECT 
    u.id,
    u.full_name AS 'Khách hàng',
    DATEDIFF(NOW(), MAX(o.created_at)) AS 'Ngày từ đơn cuối (R)',
    COUNT(o.id) AS 'Số đơn (F)',
    FORMAT(SUM(o.total_amount), 0) AS 'Tổng chi tiêu (M)',
    CASE 
        WHEN COUNT(o.id) >= 2 AND SUM(o.total_amount) > 30000000 THEN '💎 VIP'
        WHEN COUNT(o.id) >= 2 THEN '🥈 Thân thiết'
        ELSE '🥉 Thường'
    END AS 'Hạng'
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.payment_status = 'paid'
GROUP BY u.id, u.full_name
ORDER BY SUM(o.total_amount) DESC;

-- 📊 Cross-sell: Sản phẩm thường mua cùng nhau
SELECT 
    p1.name AS 'Sản phẩm 1',
    p2.name AS 'Sản phẩm 2',
    COUNT(*) AS 'Số lần mua cùng'
FROM order_items oi1
JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id < oi2.product_id
JOIN products p1 ON oi1.product_id = p1.id
JOIN products p2 ON oi2.product_id = p2.id
GROUP BY oi1.product_id, oi2.product_id, p1.name, p2.name
HAVING COUNT(*) >= 1
ORDER BY COUNT(*) DESC;
