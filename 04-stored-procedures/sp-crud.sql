-- ============================================================
-- STORED PROCEDURES - CRUD Operations
-- Lab SQL: E-commerce System
-- ============================================================

USE lab_sql;

-- ============================================================
-- 1. USER STORED PROCEDURES
-- ============================================================

-- SP: Tạo user mới
DELIMITER //
CREATE PROCEDURE sp_create_user(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255),
    IN p_full_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_role ENUM('customer', 'admin'),
    OUT p_user_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR 1062 -- Duplicate entry
    BEGIN
        SET p_user_id = 0;
        SET p_message = 'ERROR: Username hoặc email đã tồn tại!';
    END;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_user_id = 0;
        SET p_message = 'ERROR: Có lỗi xảy ra khi tạo user!';
    END;
    
    INSERT INTO users (username, email, password, full_name, phone, role)
    VALUES (p_username, p_email, p_password, p_full_name, p_phone, p_role);
    
    SET p_user_id = LAST_INSERT_ID();
    SET p_message = CONCAT('SUCCESS: Tạo user thành công với ID = ', p_user_id);
END //
DELIMITER ;

-- SP: Lấy thông tin user theo ID
DELIMITER //
CREATE PROCEDURE sp_get_user_by_id(
    IN p_user_id INT
)
BEGIN
    SELECT 
        id, username, email, full_name, phone, role, 
        created_at, updated_at
    FROM users 
    WHERE id = p_user_id;
END //
DELIMITER ;

-- SP: Lấy danh sách users với phân trang
DELIMITER //
CREATE PROCEDURE sp_get_users_paginated(
    IN p_page INT,
    IN p_limit INT,
    IN p_role VARCHAR(20),
    OUT p_total INT
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = (p_page - 1) * p_limit;
    
    -- Đếm tổng số records
    IF p_role IS NULL OR p_role = '' THEN
        SELECT COUNT(*) INTO p_total FROM users;
    ELSE
        SELECT COUNT(*) INTO p_total FROM users WHERE role = p_role;
    END IF;
    
    -- Lấy danh sách
    IF p_role IS NULL OR p_role = '' THEN
        SELECT id, username, email, full_name, phone, role, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT v_offset, p_limit;
    ELSE
        SELECT id, username, email, full_name, phone, role, created_at
        FROM users
        WHERE role = p_role
        ORDER BY created_at DESC
        LIMIT v_offset, p_limit;
    END IF;
END //
DELIMITER ;

-- SP: Cập nhật user
DELIMITER //
CREATE PROCEDURE sp_update_user(
    IN p_user_id INT,
    IN p_full_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_role ENUM('customer', 'admin'),
    OUT p_affected_rows INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    UPDATE users 
    SET 
        full_name = COALESCE(p_full_name, full_name),
        phone = COALESCE(p_phone, phone),
        role = COALESCE(p_role, role),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    SET p_affected_rows = ROW_COUNT();
    
    IF p_affected_rows > 0 THEN
        SET p_message = CONCAT('SUCCESS: Cập nhật user ID ', p_user_id, ' thành công!');
    ELSE
        SET p_message = CONCAT('WARNING: Không tìm thấy user ID ', p_user_id);
    END IF;
END //
DELIMITER ;

-- SP: Xóa user (soft delete hoặc hard delete)
DELIMITER //
CREATE PROCEDURE sp_delete_user(
    IN p_user_id INT,
    OUT p_affected_rows INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_order_count INT;
    
    -- Kiểm tra user có đơn hàng không
    SELECT COUNT(*) INTO v_order_count FROM orders WHERE user_id = p_user_id;
    
    IF v_order_count > 0 THEN
        SET p_affected_rows = 0;
        SET p_message = CONCAT('ERROR: User có ', v_order_count, ' đơn hàng, không thể xóa!');
    ELSE
        DELETE FROM users WHERE id = p_user_id;
        SET p_affected_rows = ROW_COUNT();
        
        IF p_affected_rows > 0 THEN
            SET p_message = CONCAT('SUCCESS: Đã xóa user ID ', p_user_id);
        ELSE
            SET p_message = CONCAT('WARNING: Không tìm thấy user ID ', p_user_id);
        END IF;
    END IF;
END //
DELIMITER ;

-- ============================================================
-- 2. PRODUCT STORED PROCEDURES
-- ============================================================

-- SP: Tạo sản phẩm mới
DELIMITER //
CREATE PROCEDURE sp_create_product(
    IN p_category_id INT,
    IN p_name VARCHAR(200),
    IN p_description TEXT,
    IN p_price DECIMAL(15,2),
    IN p_stock_quantity INT,
    IN p_image_url VARCHAR(500),
    OUT p_product_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_category_exists INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_product_id = 0;
        SET p_message = 'ERROR: Có lỗi xảy ra khi tạo sản phẩm!';
    END;
    
    -- Kiểm tra category tồn tại
    SELECT COUNT(*) INTO v_category_exists FROM categories WHERE id = p_category_id;
    
    IF v_category_exists = 0 THEN
        SET p_product_id = 0;
        SET p_message = 'ERROR: Category không tồn tại!';
    ELSE
        INSERT INTO products (category_id, name, description, price, stock_quantity, image_url)
        VALUES (p_category_id, p_name, p_description, p_price, p_stock_quantity, p_image_url);
        
        SET p_product_id = LAST_INSERT_ID();
        SET p_message = CONCAT('SUCCESS: Tạo sản phẩm thành công với ID = ', p_product_id);
    END IF;
END //
DELIMITER ;

-- SP: Tìm kiếm sản phẩm
DELIMITER //
CREATE PROCEDURE sp_search_products(
    IN p_keyword VARCHAR(100),
    IN p_category_id INT,
    IN p_min_price DECIMAL(15,2),
    IN p_max_price DECIMAL(15,2),
    IN p_in_stock BOOLEAN,
    IN p_page INT,
    IN p_limit INT
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = (p_page - 1) * p_limit;
    
    SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock_quantity,
        c.name AS category_name,
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE 
        (p_keyword IS NULL OR p.name LIKE CONCAT('%', p_keyword, '%') 
         OR p.description LIKE CONCAT('%', p_keyword, '%'))
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
        AND (p_in_stock IS NULL OR p_in_stock = FALSE OR p.stock_quantity > 0)
    GROUP BY p.id
    ORDER BY p.created_at DESC
    LIMIT v_offset, p_limit;
END //
DELIMITER ;

-- SP: Lấy chi tiết sản phẩm với reviews
DELIMITER //
CREATE PROCEDURE sp_get_product_detail(
    IN p_product_id INT
)
BEGIN
    -- Thông tin sản phẩm
    SELECT 
        p.*,
        c.name AS category_name,
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.id = p_product_id
    GROUP BY p.id;
    
    -- Danh sách reviews
    SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.username,
        u.full_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = p_product_id
    ORDER BY r.created_at DESC
    LIMIT 10;
END //
DELIMITER ;

-- SP: Cập nhật tồn kho
DELIMITER //
CREATE PROCEDURE sp_update_stock(
    IN p_product_id INT,
    IN p_quantity_change INT,
    IN p_operation ENUM('add', 'subtract', 'set'),
    OUT p_new_stock INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_current_stock INT;
    
    SELECT stock_quantity INTO v_current_stock 
    FROM products WHERE id = p_product_id;
    
    IF v_current_stock IS NULL THEN
        SET p_new_stock = -1;
        SET p_message = 'ERROR: Sản phẩm không tồn tại!';
    ELSE
        CASE p_operation
            WHEN 'add' THEN
                SET p_new_stock = v_current_stock + p_quantity_change;
            WHEN 'subtract' THEN
                SET p_new_stock = v_current_stock - p_quantity_change;
                IF p_new_stock < 0 THEN
                    SET p_new_stock = v_current_stock;
                    SET p_message = 'ERROR: Không đủ tồn kho!';
                END IF;
            WHEN 'set' THEN
                SET p_new_stock = p_quantity_change;
        END CASE;
        
        IF p_message IS NULL THEN
            UPDATE products SET stock_quantity = p_new_stock WHERE id = p_product_id;
            SET p_message = CONCAT('SUCCESS: Cập nhật tồn kho thành ', p_new_stock);
        END IF;
    END IF;
END //
DELIMITER ;

-- ============================================================
-- 3. ORDER STORED PROCEDURES
-- ============================================================

-- SP: Tạo đơn hàng mới (Transaction)
DELIMITER //
CREATE PROCEDURE sp_create_order(
    IN p_user_id INT,
    IN p_shipping_address TEXT,
    IN p_items JSON, -- [{"product_id": 1, "quantity": 2}, ...]
    OUT p_order_id INT,
    OUT p_total_amount DECIMAL(15,2),
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_item_count INT DEFAULT 0;
    DECLARE v_index INT DEFAULT 0;
    DECLARE v_product_id INT;
    DECLARE v_quantity INT;
    DECLARE v_price DECIMAL(15,2);
    DECLARE v_stock INT;
    DECLARE v_item_total DECIMAL(15,2);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_order_id = 0;
        SET p_message = 'ERROR: Có lỗi xảy ra, đã rollback transaction!';
    END;
    
    START TRANSACTION;
    
    -- Tạo order
    INSERT INTO orders (user_id, order_code, shipping_address, status, total_amount)
    VALUES (
        p_user_id, 
        CONCAT('ORD', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), FLOOR(RAND() * 1000)),
        p_shipping_address,
        'pending',
        0
    );
    
    SET p_order_id = LAST_INSERT_ID();
    SET p_total_amount = 0;
    SET v_item_count = JSON_LENGTH(p_items);
    
    -- Thêm từng item
    WHILE v_index < v_item_count DO
        SET v_product_id = JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].product_id'));
        SET v_quantity = JSON_EXTRACT(p_items, CONCAT('$[', v_index, '].quantity'));
        
        -- Lấy giá và kiểm tra tồn kho
        SELECT price, stock_quantity INTO v_price, v_stock
        FROM products WHERE id = v_product_id FOR UPDATE;
        
        IF v_stock < v_quantity THEN
            ROLLBACK;
            SET p_order_id = 0;
            SET p_message = CONCAT('ERROR: Sản phẩm ID ', v_product_id, ' không đủ tồn kho!');
            LEAVE;
        END IF;
        
        SET v_item_total = v_price * v_quantity;
        
        -- Thêm order item
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (p_order_id, v_product_id, v_quantity, v_price);
        
        -- Trừ tồn kho
        UPDATE products SET stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;
        
        SET p_total_amount = p_total_amount + v_item_total;
        SET v_index = v_index + 1;
    END WHILE;
    
    -- Cập nhật tổng tiền
    UPDATE orders SET total_amount = p_total_amount WHERE id = p_order_id;
    
    COMMIT;
    SET p_message = CONCAT('SUCCESS: Tạo đơn hàng #', p_order_id, ' thành công!');
END //
DELIMITER ;

-- SP: Lấy chi tiết đơn hàng
DELIMITER //
CREATE PROCEDURE sp_get_order_detail(
    IN p_order_id INT
)
BEGIN
    -- Thông tin đơn hàng
    SELECT 
        o.*,
        u.username,
        u.full_name,
        u.email,
        u.phone
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = p_order_id;
    
    -- Chi tiết items
    SELECT 
        oi.id,
        oi.quantity,
        oi.price,
        (oi.quantity * oi.price) AS subtotal,
        p.id AS product_id,
        p.name AS product_name,
        p.image_url
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id;
END //
DELIMITER ;

-- SP: Cập nhật trạng thái đơn hàng
DELIMITER //
CREATE PROCEDURE sp_update_order_status(
    IN p_order_id INT,
    IN p_new_status ENUM('pending', 'confirmed', 'shipping', 'delivered', 'cancelled'),
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_current_status VARCHAR(20);
    
    SELECT status INTO v_current_status FROM orders WHERE id = p_order_id;
    
    IF v_current_status IS NULL THEN
        SET p_message = 'ERROR: Đơn hàng không tồn tại!';
    ELSEIF v_current_status = 'cancelled' THEN
        SET p_message = 'ERROR: Không thể cập nhật đơn hàng đã hủy!';
    ELSEIF v_current_status = 'delivered' AND p_new_status != 'delivered' THEN
        SET p_message = 'ERROR: Không thể thay đổi trạng thái đơn đã giao!';
    ELSE
        UPDATE orders SET status = p_new_status WHERE id = p_order_id;
        SET p_message = CONCAT('SUCCESS: Cập nhật trạng thái từ ', v_current_status, ' sang ', p_new_status);
    END IF;
END //
DELIMITER ;

-- SP: Hủy đơn hàng (hoàn lại tồn kho)
DELIMITER //
CREATE PROCEDURE sp_cancel_order(
    IN p_order_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_status VARCHAR(20);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_message = 'ERROR: Có lỗi xảy ra khi hủy đơn!';
    END;
    
    SELECT status INTO v_status FROM orders WHERE id = p_order_id;
    
    IF v_status IS NULL THEN
        SET p_message = 'ERROR: Đơn hàng không tồn tại!';
    ELSEIF v_status IN ('delivered', 'cancelled') THEN
        SET p_message = CONCAT('ERROR: Không thể hủy đơn hàng đã ', v_status);
    ELSE
        START TRANSACTION;
        
        -- Hoàn lại tồn kho
        UPDATE products p
        JOIN order_items oi ON p.id = oi.product_id
        SET p.stock_quantity = p.stock_quantity + oi.quantity
        WHERE oi.order_id = p_order_id;
        
        -- Cập nhật trạng thái
        UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;
        
        COMMIT;
        SET p_message = 'SUCCESS: Đã hủy đơn hàng và hoàn lại tồn kho!';
    END IF;
END //
DELIMITER ;

-- ============================================================
-- 4. REVIEW STORED PROCEDURES
-- ============================================================

-- SP: Thêm review
DELIMITER //
CREATE PROCEDURE sp_add_review(
    IN p_user_id INT,
    IN p_product_id INT,
    IN p_rating INT,
    IN p_comment TEXT,
    OUT p_review_id INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_has_purchased INT;
    DECLARE v_already_reviewed INT;
    
    -- Kiểm tra đã mua sản phẩm chưa
    SELECT COUNT(*) INTO v_has_purchased
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.user_id = p_user_id 
      AND oi.product_id = p_product_id
      AND o.status = 'delivered';
    
    -- Kiểm tra đã review chưa
    SELECT COUNT(*) INTO v_already_reviewed
    FROM reviews
    WHERE user_id = p_user_id AND product_id = p_product_id;
    
    IF v_has_purchased = 0 THEN
        SET p_review_id = 0;
        SET p_message = 'ERROR: Bạn cần mua sản phẩm trước khi đánh giá!';
    ELSEIF v_already_reviewed > 0 THEN
        SET p_review_id = 0;
        SET p_message = 'ERROR: Bạn đã đánh giá sản phẩm này rồi!';
    ELSEIF p_rating < 1 OR p_rating > 5 THEN
        SET p_review_id = 0;
        SET p_message = 'ERROR: Rating phải từ 1 đến 5!';
    ELSE
        INSERT INTO reviews (user_id, product_id, rating, comment)
        VALUES (p_user_id, p_product_id, p_rating, p_comment);
        
        SET p_review_id = LAST_INSERT_ID();
        SET p_message = 'SUCCESS: Đánh giá thành công!';
    END IF;
END //
DELIMITER ;

-- SP: Xóa review
DELIMITER //
CREATE PROCEDURE sp_delete_review(
    IN p_review_id INT,
    IN p_user_id INT,
    IN p_is_admin BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_review_owner INT;
    
    SELECT user_id INTO v_review_owner FROM reviews WHERE id = p_review_id;
    
    IF v_review_owner IS NULL THEN
        SET p_message = 'ERROR: Review không tồn tại!';
    ELSEIF p_is_admin = TRUE OR v_review_owner = p_user_id THEN
        DELETE FROM reviews WHERE id = p_review_id;
        SET p_message = 'SUCCESS: Đã xóa review!';
    ELSE
        SET p_message = 'ERROR: Bạn không có quyền xóa review này!';
    END IF;
END //
DELIMITER ;

-- ============================================================
-- 5. STATISTICS / REPORT STORED PROCEDURES
-- ============================================================

-- SP: Thống kê doanh thu
DELIMITER //
CREATE PROCEDURE sp_revenue_report(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Tổng quan
    SELECT 
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) AS total_revenue,
        AVG(CASE WHEN status = 'delivered' THEN total_amount END) AS avg_order_value
    FROM orders
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;
    
    -- Doanh thu theo ngày
    SELECT 
        DATE(created_at) AS order_date,
        COUNT(*) AS order_count,
        SUM(total_amount) AS daily_revenue
    FROM orders
    WHERE status = 'delivered'
      AND DATE(created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(created_at)
    ORDER BY order_date;
    
    -- Top sản phẩm bán chạy
    SELECT 
        p.id,
        p.name,
        SUM(oi.quantity) AS total_sold,
        SUM(oi.quantity * oi.price) AS total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE o.status = 'delivered'
      AND DATE(o.created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 10;
END //
DELIMITER ;

-- SP: Thống kê khách hàng
DELIMITER //
CREATE PROCEDURE sp_customer_stats()
BEGIN
    SELECT 
        u.id,
        u.username,
        u.full_name,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) AS total_spent,
        MAX(o.created_at) AS last_order_date
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY total_spent DESC;
END //
DELIMITER ;

-- SP: Dashboard overview
DELIMITER //
CREATE PROCEDURE sp_dashboard_overview()
BEGIN
    -- Tổng quan hệ thống
    SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM products) AS total_products,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT SUM(total_amount) FROM orders WHERE status = 'delivered') AS total_revenue;
    
    -- Đơn hàng theo trạng thái
    SELECT status, COUNT(*) AS count
    FROM orders
    GROUP BY status;
    
    -- Sản phẩm sắp hết hàng
    SELECT id, name, stock_quantity
    FROM products
    WHERE stock_quantity < 10
    ORDER BY stock_quantity ASC
    LIMIT 5;
    
    -- Đơn hàng mới nhất
    SELECT 
        o.id,
        o.order_code,
        u.full_name,
        o.total_amount,
        o.status,
        o.created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 5;
END //
DELIMITER ;

-- ============================================================
-- HIỂN THỊ DANH SÁCH STORED PROCEDURES
-- ============================================================
SELECT 'Đã tạo các Stored Procedures sau:' AS message;
SHOW PROCEDURE STATUS WHERE Db = 'lab_sql';
