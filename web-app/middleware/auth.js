/**
 * AUTH MIDDLEWARE
 * Xác thực và phân quyền (đơn giản hóa cho demo)
 * 
 * Trong production nên dùng JWT hoặc session
 */

const { pool } = require('../../config/database');

// Middleware kiểm tra user đã đăng nhập (giả lập)
// Trong thực tế sẽ check JWT token hoặc session
const requireAuth = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Vui lòng đăng nhập!'
        });
    }
    
    req.userId = userId;
    next();
};

// Middleware kiểm tra quyền admin
const requireAdmin = async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({
            success: false,
            error: 'Vui lòng đăng nhập!'
        });
    }
    
    try {
        const [rows] = await pool.execute(
            'SELECT role FROM users WHERE id = ?',
            [userId]
        );
        
        if (rows.length === 0 || rows[0].role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Bạn không có quyền truy cập!'
            });
        }
        
        req.userId = userId;
        req.userRole = 'admin';
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Middleware kiểm tra ownership (user chỉ được sửa data của mình)
const requireOwnership = (paramName = 'id') => {
    return (req, res, next) => {
        const userId = req.headers['x-user-id'];
        const resourceUserId = req.params[paramName];
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Vui lòng đăng nhập!'
            });
        }
        
        if (userId !== resourceUserId && req.userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Bạn không có quyền truy cập resource này!'
            });
        }
        
        req.userId = userId;
        next();
    };
};

module.exports = { requireAuth, requireAdmin, requireOwnership };
