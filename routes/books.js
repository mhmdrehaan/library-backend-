const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticate = require('../middleware/auth'); // Import middleware

// GET semua buku (PUBLIC - tidak perlu login)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM books ORDER BY id');
        res.json({
            success: true,
            data: rows,
            message: 'Books retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET 1 buku (PUBLIC)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
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

// POST tambah buku (PROTECTED - perlu login)
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, author, publisher, publication_year, category, stock } = req.body;
        
        const sql = `
            INSERT INTO books 
            (title, author, publisher, publication_year, category, stock) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await pool.query(sql, [
            title, author, publisher, publication_year, category, stock
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Book created successfully',
            data: {
                id: result.insertId,
                title,
                author,
                publisher,
                publication_year,
                category,
                stock
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// PUT update buku (PROTECTED)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, publisher, publication_year, category, stock } = req.body;
        
        const sql = `
            UPDATE books 
            SET title = ?, author = ?, publisher = ?, 
                publication_year = ?, category = ?, stock = ?
            WHERE id = ?
        `;
        
        const [result] = await pool.query(sql, [
            title, author, publisher, publication_year, category, stock, id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Book updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// DELETE buku (PROTECTED)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query('DELETE FROM books WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Book deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;