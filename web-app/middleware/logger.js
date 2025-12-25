/**
 * LOGGER MIDDLEWARE
 * Ghi log các request đến API
 */

const logger = (req, res, next) => {
    const start = Date.now();
    
    // Log khi response kết thúc
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
        const reset = '\x1b[0m';
        
        console.log(
            `${statusColor}${req.method}${reset} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
        );
    });
    
    next();
};

module.exports = logger;
