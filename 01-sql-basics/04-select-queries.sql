-- ============================================
-- LAB SQL - CÂU LỆNH SELECT CƠ BẢN
-- Từ đơn giản đến phức tạp
-- ============================================

USE lab_sql;

-- ============================================
-- 1. SELECT CƠ BẢN
-- ============================================

-- Lấy tất cả users
SELECT * FROM users;

-- Chọn cột cụ thể
SELECT id, username, full_name, email FROM users;

-- Đặt alias cho cột
SELECT 
    id AS 'Mã KH',
    full_name AS 'Họ tên',
    email AS 'Email',
    phone AS 'Số điện thoại'
FROM users;

-- ============================================
-- 2. WHERE - LỌC DỮ LIỆU
-- ============================================

-- Lọc theo điều kiện đơn
SELECT * FROM users WHERE role = 'admin';
SELECT * FROM users WHERE role = 'customer';

-- Lọc theo số
SELECT * FROM products WHERE price > 20000000;
SELECT * FROM products WHERE stock < 30;

-- BETWEEN - Trong khoảng
SELECT * FROM products WHERE price BETWEEN 10000000 AND 30000000;

-- IN - Trong danh sách
SELECT * FROM products WHERE category_id IN (1, 2);
SELECT * FROM orders WHERE status IN ('pending', 'confirmed');

-- LIKE - Tìm kiếm pattern
SELECT * FROM users WHERE email LIKE '%gmail.com';
SELECT * FROM products WHERE name LIKE '%iPhone%';
SELECT * FROM products WHERE name LIKE 'Samsung%';
SELECT * FROM users WHERE full_name LIKE 'Nguyễn%';

-- IS NULL / IS NOT NULL
SELECT * FROM products WHERE sale_price IS NULL;
SELECT * FROM products WHERE sale_price IS NOT NULL;

-- ============================================
-- 3. AND, OR, NOT - LOGIC
-- ============================================

-- AND - Cả 2 điều kiện đúng
SELECT * FROM products 
WHERE category_id = 1 AND price > 25000000;

-- OR - 1 trong 2 điều kiện đúng
SELECT * FROM products 
WHERE category_id = 1 OR category_id = 2;

-- NOT - Phủ định
SELECT * FROM products WHERE NOT category_id = 1;
SELECT * FROM users WHERE NOT role = 'admin';

-- Kết hợp phức tạp
SELECT * FROM products 
WHERE (category_id = 1 OR category_id = 2) 
AND price > 30000000 
AND stock > 20;

-- Sản phẩm đang giảm giá và giá sale dưới 20 triệu
SELECT * FROM products 
WHERE sale_price IS NOT NULL 
AND sale_price < 20000000;

-- ============================================
-- 4. ORDER BY - SẮP XẾP
-- ============================================

-- Sắp xếp tăng dần (ASC - mặc định)
SELECT * FROM products ORDER BY price ASC;

-- Sắp xếp giảm dần
SELECT * FROM products ORDER BY price DESC;

-- Sắp xếp nhiều cột
SELECT * FROM products ORDER BY category_id ASC, price DESC;

-- Sắp xếp theo ngày
SELECT * FROM orders ORDER BY created_at DESC;

-- Top 5 sản phẩm đắt nhất
SELECT * FROM products ORDER BY price DESC LIMIT 5;

-- ============================================
-- 5. LIMIT & OFFSET - PHÂN TRANG
-- ============================================

-- Lấy 5 dòng đầu
SELECT * FROM products LIMIT 5;

-- Lấy 5 dòng, bỏ qua 5 dòng đầu (trang 2)
SELECT * FROM products LIMIT 5 OFFSET 5;

-- Cách viết khác: LIMIT offset, count
SELECT * FROM products LIMIT 10, 5;  -- Bỏ 10, lấy 5

-- Phân trang thực tế (10 sản phẩm/trang)
-- Trang 1
SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 0;
-- Trang 2
SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 10;

-- ============================================
-- 6. DISTINCT - LOẠI BỎ TRÙNG LẶP
-- ============================================

-- Các role có trong hệ thống
SELECT DISTINCT role FROM users;

-- Các trạng thái đơn hàng
SELECT DISTINCT status FROM orders;

-- Các category_id có sản phẩm
SELECT DISTINCT category_id FROM products;

-- Các phương thức thanh toán đã dùng
SELECT DISTINCT payment_method FROM orders;

-- ============================================
-- 7. AGGREGATE FUNCTIONS - HÀM TỔNG HỢP
-- ============================================

-- COUNT - Đếm
SELECT COUNT(*) AS 'Tổng sản phẩm' FROM products;
SELECT COUNT(*) AS 'Số đơn hàng' FROM orders;
SELECT COUNT(*) AS 'Số khách hàng' FROM users WHERE role = 'customer';

-- COUNT với điều kiện
SELECT COUNT(*) AS 'Sản phẩm đang giảm giá' 
FROM products WHERE sale_price IS NOT NULL;

SELECT COUNT(*) AS 'Đơn hàng đã giao' 
FROM orders WHERE status = 'delivered';

-- SUM - Tổng
SELECT SUM(stock) AS 'Tổng tồn kho' FROM products;
SELECT SUM(total_amount) AS 'Tổng doanh thu' FROM orders WHERE payment_status = 'paid';

-- AVG - Trung bình
SELECT AVG(price) AS 'Giá trung bình' FROM products;
SELECT AVG(rating) AS 'Đánh giá trung bình' FROM reviews;
SELECT ROUND(AVG(price), 0) AS 'Giá TB (làm tròn)' FROM products;

-- MIN / MAX
SELECT MIN(price) AS 'Giá thấp nhất', MAX(price) AS 'Giá cao nhất' FROM products;
SELECT MIN(rating) AS 'Đánh giá thấp nhất', MAX(rating) AS 'Đánh giá cao nhất' FROM reviews;

-- Kết hợp nhiều aggregate
SELECT 
    COUNT(*) AS 'Số sản phẩm',
    SUM(stock) AS 'Tổng tồn kho',
    ROUND(AVG(price), 0) AS 'Giá trung bình',
    MIN(price) AS 'Giá thấp nhất',
    MAX(price) AS 'Giá cao nhất'
FROM products;

-- ============================================
-- 8. GROUP BY - NHÓM DỮ LIỆU
-- ============================================

-- Đếm sản phẩm theo category
SELECT category_id, COUNT(*) AS 'Số sản phẩm' 
FROM products 
GROUP BY category_id;

-- Đếm đơn hàng theo trạng thái
SELECT status, COUNT(*) AS 'Số đơn' 
FROM orders 
GROUP BY status;

-- Đếm đơn hàng theo phương thức thanh toán
SELECT payment_method, COUNT(*) AS 'Số đơn' 
FROM orders 
GROUP BY payment_method;

-- Tổng doanh thu theo user
SELECT user_id, SUM(total_amount) AS 'Tổng chi tiêu' 
FROM orders 
GROUP BY user_id 
ORDER BY SUM(total_amount) DESC;

-- Đánh giá trung bình theo sản phẩm
SELECT product_id, 
       COUNT(*) AS 'Số đánh giá',
       ROUND(AVG(rating), 1) AS 'Điểm TB'
FROM reviews 
GROUP BY product_id
ORDER BY AVG(rating) DESC;

-- Thống kê theo tháng
SELECT 
    YEAR(created_at) AS 'Năm',
    MONTH(created_at) AS 'Tháng',
    COUNT(*) AS 'Số đơn',
    SUM(total_amount) AS 'Doanh thu'
FROM orders
GROUP BY YEAR(created_at), MONTH(created_at);

-- ============================================
-- 9. HAVING - LỌC SAU KHI GROUP
-- ============================================

-- Category có hơn 3 sản phẩm
SELECT category_id, COUNT(*) AS 'Số sản phẩm' 
FROM products 
GROUP BY category_id
HAVING COUNT(*) > 3;

-- Sản phẩm có điểm đánh giá TB >= 4
SELECT product_id, ROUND(AVG(rating), 1) AS 'Điểm TB'
FROM reviews 
GROUP BY product_id
HAVING AVG(rating) >= 4;

-- User đã mua hơn 1 đơn
SELECT user_id, COUNT(*) AS 'Số đơn'
FROM orders 
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Category có tổng tồn kho > 50
SELECT category_id, SUM(stock) AS 'Tổng tồn kho'
FROM products 
GROUP BY category_id
HAVING SUM(stock) > 50;

-- ============================================
-- 10. SUBQUERY - TRUY VẤN LỒNG
-- ============================================

-- Sản phẩm có giá cao hơn giá trung bình
SELECT * FROM products 
WHERE price > (SELECT AVG(price) FROM products);

-- Sản phẩm đắt nhất
SELECT * FROM products 
WHERE price = (SELECT MAX(price) FROM products);

-- Users đã đặt hàng
SELECT * FROM users 
WHERE id IN (SELECT DISTINCT user_id FROM orders);

-- Users chưa đặt hàng nào
SELECT * FROM users 
WHERE id NOT IN (SELECT DISTINCT user_id FROM orders)
AND role = 'customer';

-- Sản phẩm đã được mua (có trong order_items)
SELECT * FROM products 
WHERE id IN (SELECT DISTINCT product_id FROM order_items);

-- Sản phẩm chưa ai mua
SELECT * FROM products 
WHERE id NOT IN (SELECT DISTINCT product_id FROM order_items);

-- Sản phẩm có đánh giá 5 sao
SELECT * FROM products 
WHERE id IN (SELECT product_id FROM reviews WHERE rating = 5);

-- ============================================
-- 11. CASE WHEN - ĐIỀU KIỆN TRONG SELECT
-- ============================================

-- Phân loại giá sản phẩm
SELECT 
    name,
    price,
    CASE 
        WHEN price < 10000000 THEN 'Giá rẻ'
        WHEN price BETWEEN 10000000 AND 30000000 THEN 'Tầm trung'
        ELSE 'Cao cấp'
    END AS 'Phân loại'
FROM products;

-- Trạng thái đơn hàng tiếng Việt
SELECT 
    order_code,
    status,
    CASE status
        WHEN 'pending' THEN 'Chờ xác nhận'
        WHEN 'confirmed' THEN 'Đã xác nhận'
        WHEN 'shipping' THEN 'Đang giao'
        WHEN 'delivered' THEN 'Đã giao'
        WHEN 'cancelled' THEN 'Đã hủy'
    END AS 'Trạng thái'
FROM orders;

-- Đánh giá theo sao
SELECT 
    product_id,
    rating,
    CASE 
        WHEN rating >= 4 THEN '⭐ Tốt'
        WHEN rating = 3 THEN '⭐ Trung bình'
        ELSE '⭐ Kém'
    END AS 'Đánh giá'
FROM reviews;

-- Tính giá hiển thị (sale_price nếu có, không thì price)
SELECT 
    name,
    price AS 'Giá gốc',
    sale_price AS 'Giá sale',
    COALESCE(sale_price, price) AS 'Giá hiển thị',
    CASE 
        WHEN sale_price IS NOT NULL THEN CONCAT(ROUND((1 - sale_price/price) * 100), '%')
        ELSE 'Không giảm'
    END AS 'Giảm giá'
FROM products;

-- ============================================
-- 12. STRING FUNCTIONS - XỬ LÝ CHUỖI
-- ============================================

-- CONCAT - Nối chuỗi
SELECT CONCAT(full_name, ' - ', phone) AS 'Thông tin KH' FROM users;

-- UPPER / LOWER
SELECT UPPER(name) FROM products;
SELECT LOWER(email) FROM users;

-- SUBSTRING
SELECT SUBSTRING(phone, 1, 4) AS 'Đầu số' FROM users;

-- LENGTH
SELECT name, LENGTH(name) AS 'Độ dài tên' FROM products;

-- REPLACE
SELECT REPLACE(phone, '0', '+84') FROM users;

-- TRIM
SELECT TRIM(name) FROM products;

-- LEFT / RIGHT
SELECT LEFT(order_code, 3) AS 'Prefix' FROM orders;

-- FORMAT số với dấu phẩy
SELECT name, FORMAT(price, 0) AS 'Giá' FROM products;

-- ============================================
-- 13. DATE FUNCTIONS - XỬ LÝ NGÀY THÁNG
-- ============================================

-- Lấy các phần của ngày
SELECT 
    created_at,
    YEAR(created_at) AS 'Năm',
    MONTH(created_at) AS 'Tháng',
    DAY(created_at) AS 'Ngày',
    HOUR(created_at) AS 'Giờ'
FROM orders;

-- Định dạng ngày
SELECT 
    order_code,
    DATE_FORMAT(created_at, '%d/%m/%Y') AS 'Ngày đặt',
    DATE_FORMAT(created_at, '%H:%i') AS 'Giờ đặt'
FROM orders;

-- Ngày hiện tại
SELECT NOW(), CURDATE(), CURTIME();

-- Đơn hàng trong 30 ngày gần đây
SELECT * FROM orders 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Đơn hàng trong tháng này
SELECT * FROM orders 
WHERE MONTH(created_at) = MONTH(NOW()) 
AND YEAR(created_at) = YEAR(NOW());

-- Số ngày từ khi đặt hàng
SELECT 
    order_code,
    created_at,
    DATEDIFF(NOW(), created_at) AS 'Số ngày'
FROM orders;

-- ============================================
-- 14. MATH FUNCTIONS - HÀM TOÁN HỌC
-- ============================================

-- ROUND - Làm tròn
SELECT name, ROUND(price / 1000000, 2) AS 'Giá (triệu)' FROM products;

-- FLOOR / CEIL
SELECT FLOOR(19.9), CEIL(19.1);

-- ABS - Giá trị tuyệt đối
SELECT ABS(-100);

-- Tính % giảm giá
SELECT 
    name,
    price,
    sale_price,
    ROUND((price - sale_price) / price * 100, 1) AS '% Giảm'
FROM products
WHERE sale_price IS NOT NULL;

-- ============================================
-- 15. QUERY THỰC TẾ - TỔNG HỢP
-- ============================================

-- TOP 5 sản phẩm bán chạy nhất
SELECT 
    p.name,
    SUM(oi.quantity) AS 'Số lượng bán'
FROM products p
JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY SUM(oi.quantity) DESC
LIMIT 5;

-- Khách hàng VIP (chi tiêu nhiều nhất)
SELECT 
    u.full_name,
    COUNT(o.id) AS 'Số đơn',
    SUM(o.total_amount) AS 'Tổng chi tiêu'
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.payment_status = 'paid'
GROUP BY u.id, u.full_name
ORDER BY SUM(o.total_amount) DESC;

-- Sản phẩm sắp hết hàng (stock < 30)
SELECT name, stock,
    CASE 
        WHEN stock < 20 THEN '🔴 Cần nhập gấp'
        WHEN stock < 30 THEN '🟡 Cần nhập'
        ELSE '🟢 Đủ hàng'
    END AS 'Trạng thái'
FROM products
WHERE stock < 30
ORDER BY stock ASC;

-- Báo cáo tổng quan đơn hàng
SELECT 
    CASE status
        WHEN 'pending' THEN 'Chờ xác nhận'
        WHEN 'confirmed' THEN 'Đã xác nhận'
        WHEN 'shipping' THEN 'Đang giao'
        WHEN 'delivered' THEN 'Đã giao'
        WHEN 'cancelled' THEN 'Đã hủy'
    END AS 'Trạng thái',
    COUNT(*) AS 'Số đơn',
    FORMAT(SUM(total_amount), 0) AS 'Tổng tiền'
FROM orders
GROUP BY status;
