-- ============================================
-- LAB SQL - INSERT, UPDATE, DELETE
-- Thao tác thêm, sửa, xóa dữ liệu
-- ============================================

USE lab_sql;

-- ============================================
-- 1. INSERT - THÊM DỮ LIỆU
-- ============================================

-- Insert đơn giản - 1 dòng
INSERT INTO users (username, email, password, full_name, phone, address, role)
VALUES ('newuser', 'newuser@gmail.com', 'hashed_pass', 'Người Dùng Mới', '0999888777', 'TP.HCM', 'customer');

-- Insert nhiều dòng cùng lúc
INSERT INTO categories (name, description, image_url) VALUES
('Đồng hồ thông minh', 'Smartwatch các loại', 'smartwatch.jpg'),
('Loa', 'Loa bluetooth và có dây', 'speaker.jpg');

-- Insert với SELECT (copy dữ liệu)
-- Tạo bảng backup users
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users WHERE 1=0;

INSERT INTO users_backup
SELECT * FROM users WHERE role = 'customer';

-- Insert và lấy ID vừa tạo (trong code)
INSERT INTO products (category_id, name, price, stock)
VALUES (1, 'iPhone 16 Pro', 39990000, 30);
-- SELECT LAST_INSERT_ID(); -- Lấy ID vừa tạo

-- Insert với giá trị mặc định
INSERT INTO orders (user_id, order_code, total_amount, shipping_address, shipping_phone)
VALUES (2, 'ORD006', 15000000, '123 ABC, TP.HCM', '0912345678');
-- status, payment_method, payment_status sẽ lấy giá trị DEFAULT

-- Insert IGNORE - Bỏ qua nếu trùng UNIQUE key
INSERT IGNORE INTO users (username, email, password, full_name)
VALUES ('nguyenvana', 'test@test.com', 'pass', 'Test');
-- Không lỗi vì username 'nguyenvana' đã tồn tại

-- INSERT ON DUPLICATE KEY UPDATE
INSERT INTO products (id, category_id, name, price, stock)
VALUES (1, 1, 'iPhone 15 Pro Max Updated', 33990000, 55)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    price = VALUES(price),
    stock = VALUES(stock);

-- ============================================
-- 2. UPDATE - CẬP NHẬT DỮ LIỆU
-- ============================================

-- Update đơn giản
UPDATE products 
SET stock = 100 
WHERE id = 1;

-- Update nhiều cột
UPDATE products 
SET 
    price = 34990000,
    sale_price = 32990000,
    stock = 45
WHERE id = 1;

-- Update với điều kiện phức tạp
UPDATE products 
SET sale_price = price * 0.9  -- Giảm 10%
WHERE category_id = 1 AND sale_price IS NULL;

-- Update với CASE
UPDATE orders
SET status = CASE 
    WHEN status = 'pending' AND DATEDIFF(NOW(), created_at) > 7 THEN 'cancelled'
    WHEN status = 'confirmed' THEN 'shipping'
    ELSE status
END
WHERE status IN ('pending', 'confirmed');

-- Update dựa trên JOIN
UPDATE products p
JOIN categories c ON p.category_id = c.id
SET p.is_active = FALSE
WHERE c.name = 'Phụ kiện' AND p.stock = 0;

-- Tăng giá tất cả sản phẩm 5%
UPDATE products 
SET price = price * 1.05;

-- Giảm stock sau khi bán
UPDATE products 
SET stock = stock - 1
WHERE id = 1 AND stock > 0;

-- Update với LIMIT (cập nhật n dòng đầu)
UPDATE products 
SET is_active = TRUE
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- 3. DELETE - XÓA DỮ LIỆU
-- ============================================

-- Delete đơn giản
DELETE FROM users_backup WHERE id = 1;

-- Delete với điều kiện
DELETE FROM reviews WHERE rating < 3;

-- Delete với IN
DELETE FROM order_items 
WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled');

-- Delete với JOIN
DELETE oi FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'cancelled';

-- Delete tất cả (CẨN THẬN!)
-- DELETE FROM users_backup;

-- TRUNCATE - Xóa nhanh toàn bộ (reset AUTO_INCREMENT)
-- TRUNCATE TABLE users_backup;

-- Delete với LIMIT
DELETE FROM reviews 
ORDER BY created_at ASC
LIMIT 2;

-- ============================================
-- 4. SAFE UPDATE MODE
-- ============================================

-- MySQL mặc định bật Safe Update Mode
-- Không cho UPDATE/DELETE không có WHERE hoặc KEY

-- Tắt tạm thời (CẨN THẬN!)
SET SQL_SAFE_UPDATES = 0;

-- Bật lại
SET SQL_SAFE_UPDATES = 1;

-- ============================================
-- 5. TRANSACTION - ĐẢM BẢO TOÀN VẸN
-- ============================================

-- Bắt đầu transaction
START TRANSACTION;

-- Thực hiện các thao tác
UPDATE products SET stock = stock - 1 WHERE id = 1;
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
VALUES (1, 1, 1, 32990000, 32990000);

-- Nếu OK thì commit
COMMIT;

-- Nếu lỗi thì rollback
-- ROLLBACK;

-- Transaction ví dụ: Chuyển tiền
START TRANSACTION;

-- Kiểm tra stock
SELECT stock FROM products WHERE id = 1 FOR UPDATE;

-- Nếu stock >= số lượng mua
UPDATE products SET stock = stock - 2 WHERE id = 1 AND stock >= 2;

-- Kiểm tra có update thành công không
-- Nếu ROW_COUNT() = 0 thì ROLLBACK
-- Nếu OK thì COMMIT

COMMIT;

-- ============================================
-- 6. THAO TÁC THỰC TẾ
-- ============================================

-- 📝 Đăng ký user mới
INSERT INTO users (username, email, password, full_name, phone, address)
VALUES ('khachhang_new', 'new@email.com', 'hashed_password', 'Khách Hàng Mới', '0909123456', 'Hà Nội');

-- 📝 Cập nhật thông tin profile
UPDATE users 
SET 
    full_name = 'Nguyễn Văn An Updated',
    phone = '0909999999',
    address = 'Địa chỉ mới, TP.HCM',
    updated_at = NOW()
WHERE id = 2;

-- 📝 Đổi password
UPDATE users 
SET password = 'new_hashed_password', updated_at = NOW()
WHERE id = 2;

-- 📝 Vô hiệu hóa user (soft delete)
UPDATE users 
SET is_active = FALSE 
WHERE id = 8;

-- 📝 Tạo đơn hàng mới
START TRANSACTION;

-- Tạo order
INSERT INTO orders (user_id, order_code, total_amount, shipping_address, shipping_phone, payment_method)
VALUES (2, 'ORD007', 38980000, '123 ABC, TP.HCM', '0912345678', 'bank_transfer');

SET @new_order_id = LAST_INSERT_ID();

-- Thêm order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
VALUES 
    (@new_order_id, 1, 1, 32990000, 32990000),
    (@new_order_id, 11, 1, 5990000, 5990000);

-- Giảm stock
UPDATE products SET stock = stock - 1 WHERE id IN (1, 11);

COMMIT;

-- 📝 Xác nhận đơn hàng
UPDATE orders 
SET 
    status = 'confirmed',
    updated_at = NOW()
WHERE order_code = 'ORD007' AND status = 'pending';

-- 📝 Hủy đơn hàng (hoàn stock)
START TRANSACTION;

-- Hoàn lại stock
UPDATE products p
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
SET p.stock = p.stock + oi.quantity
WHERE o.order_code = 'ORD007';

-- Cập nhật trạng thái đơn
UPDATE orders 
SET status = 'cancelled', updated_at = NOW()
WHERE order_code = 'ORD007';

COMMIT;

-- 📝 Thêm review sản phẩm
INSERT INTO reviews (user_id, product_id, rating, title, comment, is_verified_purchase)
SELECT 
    2,  -- user_id
    1,  -- product_id
    5,  -- rating
    'Sản phẩm tuyệt vời',
    'Rất hài lòng với sản phẩm này!',
    EXISTS (
        SELECT 1 FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = 2 AND oi.product_id = 1 AND o.status = 'delivered'
    ); -- Tự động check verified purchase

-- 📝 Xóa review
DELETE FROM reviews 
WHERE user_id = 2 AND product_id = 1
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- 7. BULK OPERATIONS - THAO TÁC HÀNG LOẠT
-- ============================================

-- Cập nhật giảm giá cho tất cả sản phẩm chưa có sale
UPDATE products 
SET sale_price = ROUND(price * 0.85, -3)  -- Giảm 15%, làm tròn
WHERE sale_price IS NULL AND price > 5000000;

-- Vô hiệu hóa sản phẩm hết hàng
UPDATE products 
SET is_active = FALSE 
WHERE stock = 0;

-- Kích hoạt lại sản phẩm có hàng
UPDATE products 
SET is_active = TRUE 
WHERE stock > 0 AND is_active = FALSE;

-- Xóa reviews cũ hơn 1 năm của sản phẩm không còn active
DELETE r FROM reviews r
JOIN products p ON r.product_id = p.id
WHERE p.is_active = FALSE 
AND r.created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

-- ============================================
-- 8. CLEANUP - DỌN DẸP DỮ LIỆU TEST
-- ============================================

-- Xóa user test
DELETE FROM users WHERE username = 'newuser';
DELETE FROM users WHERE username = 'khachhang_new';

-- Xóa categories test
DELETE FROM categories WHERE name IN ('Đồng hồ thông minh', 'Loa');

-- Xóa order test
DELETE FROM orders WHERE order_code IN ('ORD006', 'ORD007');

-- Xóa product test
DELETE FROM products WHERE name = 'iPhone 16 Pro';

-- Xóa bảng backup
DROP TABLE IF EXISTS users_backup;

-- Reset giá về ban đầu (chạy lại setup-database.js nếu cần)
