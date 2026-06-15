// File: middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'rahasia-perpustakaan-2024'; // Sama dengan di auth.js

const authenticate = (req, res, next) => {
    try {
        // 1. Ambil token dari header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }
        
        // Format header: "Bearer <token>"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid'
            });
        }
        
        // 2. Verifikasi token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 3. Simpan data user di request object
        req.user = decoded;
        
        // 4. Lanjut ke endpoint berikutnya
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token sudah expired, silakan login ulang'
            });
        }
        
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid'
        });
    }
};

module.exports = authenticate;