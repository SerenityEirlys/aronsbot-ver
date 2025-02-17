import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Tạo pool connection để quản lý kết nối hiệu quả
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Kiểm tra kết nối database
export async function testConnection() {
    try {
        await pool.query('SELECT 1');
        console.log('Database connection successful');
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

// Khởi tạo các bảng cần thiết
export async function initDatabase() {
    try {
        // Tạo bảng tickets
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tickets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ticket_id VARCHAR(100) NOT NULL,
                user_id VARCHAR(100) NOT NULL,
                channel_id VARCHAR(100) NOT NULL,
                guild_id VARCHAR(100) NOT NULL,
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP NULL
            )
        `);

        // Tạo bảng ticket_configs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ticket_configs (
                guild_id VARCHAR(100) PRIMARY KEY,
                category_id VARCHAR(100),
                log_channel_id VARCHAR(100),
                support_role_id VARCHAR(100),
                welcome_message TEXT
            )
        `);

        // Tạo bảng product_reviews
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                game_code VARCHAR(50) NOT NULL,
                product_code VARCHAR(50) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                username VARCHAR(255) NOT NULL,
                rating INT NOT NULL,
                comment TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX game_product_idx (game_code, product_code)
            )
        `);

        // Tạo bảng reviews
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                userId VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                username VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                gameId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                productId VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                rating INT NOT NULL,
                comment TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user_review (userId, gameId, productId)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);

        // Tạo bảng users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
                username VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);

        console.log('Database tables initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Hàm kiểm tra key
export async function checkKey(input) {
    try {
        const [keyData] = await pool.query(
            'SELECT * FROM license_keys WHERE key_value = ? OR hwid = ?',
            [input, input]
        );
        return keyData;
    } catch (error) {
        console.error('Error checking key:', error);
        throw error;
    }
}

// Thêm try-catch để xử lý lỗi JSON
export async function getProductReviews(gameId, productId) {
    try {
        // Đơn giản hóa query, không join với bảng users
        const [rows] = await pool.query(
            'SELECT * FROM reviews WHERE gameId = ? AND productId = ? ORDER BY timestamp DESC',
            [gameId, productId]
        );

        // Tính toán thống kê
        const totalReviews = rows.length;
        const totalComments = rows.filter(r => r.comment && r.comment.trim()).length;
        const averageRating = totalReviews > 0 
            ? (rows.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
            : 0;

        return {
            reviews: rows,
            totalReviews,
            totalComments,
            averageRating: parseFloat(averageRating)
        };
    } catch (error) {
        console.error('Error getting product reviews:', error);
        return {
            reviews: [],
            totalReviews: 0,
            totalComments: 0,
            averageRating: 0
        };
    }
}

export async function addReview(reviewData) {
    try {
        const { userId, username, productId, gameId, rating, comment } = reviewData;
        
        // Thêm hoặc cập nhật thông tin user
        await pool.query(
            'INSERT INTO users (id, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?',
            [userId, username, username]
        );
        
        // Kiểm tra xem user đã review chưa
        const [existing] = await pool.query(
            'SELECT id FROM reviews WHERE userId = ? AND gameId = ? AND productId = ?',
            [userId, gameId, productId]
        );

        if (existing.length > 0) {
            // Update review cũ
            await pool.query(
                'UPDATE reviews SET rating = ?, comment = ?, timestamp = NOW(), username = ? WHERE userId = ? AND gameId = ? AND productId = ?',
                [rating, comment, username, userId, gameId, productId]
            );
        } else {
            // Thêm review mới
            await pool.query(
                'INSERT INTO reviews (userId, username, gameId, productId, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, username, gameId, productId, rating, comment]
            );
        }

        return true;
    } catch (error) {
        console.error('Error adding review:', error);
        throw error;
    }
}

export { pool }; 