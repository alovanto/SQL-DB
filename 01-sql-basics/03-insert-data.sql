-- ============================================
-- LAB SQL - HỆ THỐNG E-COMMERCE
-- Phần 3: Thêm Dữ Liệu Mẫu
-- ============================================

USE lab_sql;

-- ============================================
-- DỮ LIỆU BẢNG USERS (8 người dùng)
-- ============================================
INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES
('admin', 'admin@shop.com', 'hashed_admin123', 'Quản Trị Viên', '0901234567', 'Hà Nội', 'admin'),
('nguyenvana', 'vana@gmail.com', 'hashed_pass123', 'Nguyễn Văn A', '0912345678', '123 Lê Lợi, Q.1, TP.HCM', 'customer'),
('tranthib', 'thib@gmail.com', 'hashed_pass123', 'Trần Thị B', '0923456789', '456 Nguyễn Huệ, Q.1, TP.HCM', 'customer'),
('levanc', 'vanc@gmail.com', 'hashed_pass123', 'Lê Văn C', '0934567890', '789 Hai Bà Trưng, Q.3, TP.HCM', 'customer'),
('phamthid', 'thid@gmail.com', 'hashed_pass123', 'Phạm Thị D', '0945678901', '12 Điện Biên Phủ, Hà Nội', 'customer'),
('hoangvane', 'vane@gmail.com', 'hashed_pass123', 'Hoàng Văn E', '0956789012', '34 Trần Hưng Đạo, Đà Nẵng', 'customer'),
('ngothif', 'thif@gmail.com', 'hashed_pass123', 'Ngô Thị F', '0967890123', '56 Lý Thường Kiệt, Huế', 'customer'),
('dovanh', 'vanh@gmail.com', 'hashed_pass123', 'Đỗ Văn H', '0978901234', '78 Phan Chu Trinh, Cần Thơ', 'customer');

-- ============================================
-- DỮ LIỆU BẢNG CATEGORIES (6 danh mục)
-- ============================================
INSERT INTO categories (name, description, parent_id, image_url) VALUES
('Điện thoại', 'Điện thoại di động các loại', NULL, 'phone.jpg'),
('Laptop', 'Máy tính xách tay', NULL, 'laptop.jpg'),
('Tablet', 'Máy tính bảng', NULL, 'tablet.jpg'),
('Phụ kiện', 'Phụ kiện điện tử', NULL, 'accessory.jpg'),
('Tai nghe', 'Tai nghe các loại', 4, 'headphone.jpg'),
('Sạc & Cáp', 'Sạc và cáp kết nối', 4, 'charger.jpg');

-- ============================================
-- DỮ LIỆU BẢNG PRODUCTS (15 sản phẩm)
-- ============================================
INSERT INTO products (category_id, name, description, price, sale_price, stock, image_url) VALUES
-- Điện thoại (category_id = 1)
(1, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB, chip A17 Pro', 34990000, 32990000, 50, 'iphone15promax.jpg'),
(1, 'Samsung Galaxy S24 Ultra', 'Samsung S24 Ultra 512GB, camera 200MP', 31990000, 29990000, 45, 'galaxys24ultra.jpg'),
(1, 'Xiaomi 14 Pro', 'Xiaomi 14 Pro 256GB, Snapdragon 8 Gen 3', 19990000, NULL, 60, 'xiaomi14pro.jpg'),
(1, 'OPPO Find X7', 'OPPO Find X7 256GB, camera Hasselblad', 22990000, 21490000, 35, 'oppofindx7.jpg'),

-- Laptop (category_id = 2)
(2, 'MacBook Pro M3 14 inch', 'MacBook Pro M3, RAM 18GB, SSD 512GB', 49990000, NULL, 25, 'macbookprom3.jpg'),
(2, 'Dell XPS 15', 'Dell XPS 15, Intel Core i7, RAM 16GB', 42990000, 39990000, 20, 'dellxps15.jpg'),
(2, 'ASUS ROG Strix G16', 'Laptop gaming, RTX 4060, RAM 16GB', 35990000, 33990000, 30, 'asusrog.jpg'),
(2, 'Lenovo ThinkPad X1 Carbon', 'ThinkPad X1, Intel Core i7, 14 inch', 38990000, NULL, 15, 'thinkpadx1.jpg'),

-- Tablet (category_id = 3)
(3, 'iPad Pro M2 12.9 inch', 'iPad Pro M2, 256GB, màn hình Liquid Retina', 28990000, 26990000, 40, 'ipadprom2.jpg'),
(3, 'Samsung Galaxy Tab S9', 'Galaxy Tab S9, Snapdragon 8 Gen 2', 18990000, 17490000, 35, 'galaxytabs9.jpg'),

-- Tai nghe (category_id = 5)
(5, 'AirPods Pro 2', 'AirPods Pro thế hệ 2, chống ồn chủ động', 6790000, 5990000, 100, 'airpodspro2.jpg'),
(5, 'Sony WH-1000XM5', 'Tai nghe chụp tai, chống ồn cao cấp', 8490000, NULL, 45, 'sonywh1000xm5.jpg'),
(5, 'Samsung Galaxy Buds2 Pro', 'Tai nghe true wireless, ANC', 4990000, 3990000, 80, 'galaxybuds2pro.jpg'),

-- Sạc & Cáp (category_id = 6)
(6, 'Sạc nhanh Apple 20W', 'Củ sạc nhanh USB-C 20W chính hãng', 590000, NULL, 200, 'apple20w.jpg'),
(6, 'Cáp USB-C to Lightning', 'Cáp sạc iPhone chính hãng 1m', 490000, 390000, 150, 'usbclightning.jpg');

-- ============================================
-- DỮ LIỆU BẢNG ORDERS (5 đơn hàng)
-- ============================================
INSERT INTO orders (user_id, order_code, total_amount, shipping_address, shipping_phone, status, payment_method, payment_status, note) VALUES
(2, 'ORD001', 38980000, '123 Lê Lợi, Q.1, TP.HCM', '0912345678', 'delivered', 'bank_transfer', 'paid', 'Giao giờ hành chính'),
(3, 'ORD002', 29990000, '456 Nguyễn Huệ, Q.1, TP.HCM', '0923456789', 'shipping', 'cod', 'unpaid', NULL),
(4, 'ORD003', 56480000, '789 Hai Bà Trưng, Q.3, TP.HCM', '0934567890', 'confirmed', 'credit_card', 'paid', 'Gọi trước khi giao'),
(5, 'ORD004', 5990000, '12 Điện Biên Phủ, Hà Nội', '0945678901', 'pending', 'cod', 'unpaid', NULL),
(2, 'ORD005', 17880000, '123 Lê Lợi, Q.1, TP.HCM', '0912345678', 'delivered', 'bank_transfer', 'paid', NULL);

-- ============================================
-- DỮ LIỆU BẢNG ORDER_ITEMS (10 chi tiết đơn hàng)
-- ============================================
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) VALUES
-- Đơn hàng 1: iPhone 15 + AirPods
(1, 1, 1, 32990000, 32990000),
(1, 11, 1, 5990000, 5990000),
-- Đơn hàng 2: Samsung S24
(2, 2, 1, 29990000, 29990000),
-- Đơn hàng 3: MacBook + Tai nghe Sony
(3, 5, 1, 49990000, 49990000),
(3, 12, 1, 8490000, 8490000),
-- Đơn hàng 4: AirPods Pro 2
(4, 11, 1, 5990000, 5990000),
-- Đơn hàng 5: Xiaomi 14 Pro
(5, 3, 1, 19990000, 19990000);

-- ============================================
-- DỮ LIỆU BẢNG REVIEWS (10 đánh giá)
-- ============================================
INSERT INTO reviews (user_id, product_id, rating, title, comment, is_verified_purchase) VALUES
(2, 1, 5, 'Tuyệt vời!', 'iPhone 15 Pro Max rất đẹp, camera chụp xuất sắc. Rất hài lòng!', TRUE),
(3, 2, 4, 'Rất tốt', 'Samsung S24 Ultra màn hình đẹp, pin trâu. Giá hơi cao.', TRUE),
(4, 5, 5, 'Đáng đồng tiền', 'MacBook Pro M3 mạnh mẽ, thiết kế sang trọng.', TRUE),
(5, 11, 5, 'Chống ồn tốt', 'AirPods Pro 2 chống ồn rất tốt, âm thanh hay.', TRUE),
(6, 3, 4, 'Xiaomi ngày càng tốt', 'Xiaomi 14 Pro cấu hình mạnh, giá hợp lý.', FALSE),
(7, 9, 5, 'iPad tuyệt vời', 'iPad Pro M2 màn hình đẹp, dùng vẽ rất mượt.', FALSE),
(2, 12, 4, 'Tai nghe Sony', 'Sony WH-1000XM5 chống ồn tốt nhưng hơi nóng tai.', FALSE),
(3, 6, 4, 'Laptop văn phòng tốt', 'Dell XPS 15 mỏng nhẹ, màn hình đẹp.', TRUE),
(4, 7, 5, 'Gaming mượt', 'ASUS ROG chơi game cực mượt, tản nhiệt tốt.', TRUE),
(6, 13, 3, 'Tạm ổn', 'Galaxy Buds2 Pro âm thanh ổn nhưng pin yếu.', FALSE);

-- ============================================
-- KIỂM TRA DỮ LIỆU ĐÃ THÊM
-- ============================================
SELECT 'Đã thêm dữ liệu thành công!' AS message;
SELECT 'users' AS 'Bảng', COUNT(*) AS 'Số dòng' FROM users
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews;
