// File: routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Secret key untuk JWT
const JWT_SECRET = 'rahasia-perpustakaan-2024';

// POST Register - Daftar user baru
router.post('/register', async (req, res) => {
    try {
        const { username, password, full_name, role } = req.body;
        
        // Cek apakah username sudah ada
        const [existing] = await pool.query(
            'SELECT * FROM users WHERE username = ?', 
            [username]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username sudah digunakan'
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert ke database
        const sql = `
            INSERT INTO users (username, password, full_name, role) 
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await pool.query(sql, [
            username, 
            hashedPassword, 
            full_name, 
            role || 'petugas'
        ]);
        
        res.status(201).json({
            success: true,
            message: 'User berhasil didaftarkan',
            data: {
                id: result.insertId,
                username,
                full_name,
                role: role || 'petugas'
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// POST Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('📥 Login attempt:', { username, passwordLength: password?.length });
        
        // Cari user berdasarkan username
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?', 
            [username]
        );
        
        console.log('🔍 User found:', rows.length > 0 ? 'Yes' : 'No');
        
        if (rows.length === 0) {
            console.log('❌ User not found');
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }
        
        const user = rows[0];
        
        console.log('🔑 Comparing password...');
        // Bandingkan password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        console.log('✅ Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            console.log('❌ Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }
        
        // ✅ BUAT TOKEN JWT
        console.log('🔐 Generating token...');
        const tokenPayload = {
            id: user.id,
            username: user.username,
            role: user.role
        };
        
        const token = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: '1d'
        });
        
        console.log('✅ Token generated');
        
        // ✅ KIRIM RESPONSE
        console.log('📤 Sending response...');
        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    full_name: user.full_name,
                    role: user.role
                }
            }
        });
        
        console.log('✅ Login complete!');
        
    } catch (error) {
        console.error('💥 Login error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;