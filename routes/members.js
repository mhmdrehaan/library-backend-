const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET semua member
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM members ORDER BY id');
        res.json({
            success: true,
            data: rows,
            message: 'Members retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET 1 member berdasarkan ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// POST tambah member baru (sesuai struktur tabel saat ini)
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, address } = req.body;
        
        const sql = `
            INSERT INTO members 
            (name, email, phone, address) 
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await pool.query(sql, [name, email, phone, address]);
        
        res.status(201).json({
            success: true,
            message: 'Member created successfully',
            data: {
                id: result.insertId,
                name,
                email,
                phone,
                address
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// PUT update member
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address } = req.body;
        
        const sql = `
            UPDATE members 
            SET name = ?, email = ?, phone = ?, address = ?
            WHERE id = ?
        `;
        
        const [result] = await pool.query(sql, [name, email, phone, address, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Member updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE member
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM members WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Member deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;