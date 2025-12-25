/**
 * ERROR HANDLER MIDDLEWARE
 * Xử lý lỗi tập trung cho toàn bộ API
 */

// Not Found handler
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Error handler
const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    console.error('❌ Error:', err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    
    res.status(statusCode).json({
        success: false,
        error: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = { notFound, errorHandler };
