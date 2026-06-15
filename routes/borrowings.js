// File: routes/borrowings.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticate = require('../middleware/auth');

// POST - Buat Peminjaman Baru (PROTECTED)
router.post('/', authenticate, async (req, res) => {
    // Mulai transaction (agar semua query berhasil atau gagal bersama)
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { member_id, books, due_date } = req.body;
        // books = array of { book_id, quantity }
        // Contoh: [{ book_id: 1, quantity: 1 }, { book_id: 2, quantity: 2 }]
        
        // 1. Cek apakah member ada
        const [members] = await connection.query(
            'SELECT * FROM members WHERE id = ?', 
            [member_id]
        );
        
        if (members.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Member tidak ditemukan'
            });
        }
        
        // 2. Cek stok semua buku yang dipinjam
        for (const book of books) {
            const [bookData] = await connection.query(
                'SELECT * FROM books WHERE id = ?', 
                [book.book_id]
            );
            
            if (bookData.length === 0) {
                await connection.rollback();
                return res.status(404).json({
                    success: false,
                    message: `Buku dengan id ${book.book_id} tidak ditemukan`
                });
            }
            
            if (bookData[0].stock < book.quantity) {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Stok buku "${bookData[0].title}" tidak cukup. Tersedia: ${bookData[0].stock}, diminta: ${book.quantity}`
                });
            }
        }
        
        // 3. Set tanggal pinjam (hari ini) dan jatuh tempo
        const borrow_date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const final_due_date = due_date || (() => {
            const date = new Date();
            date.setDate(date.getDate() + 7); // Default 7 hari
            return date.toISOString().split('T')[0];
        })();
        
        // 4. Insert ke tabel borrowings
        const [borrowingResult] = await connection.query(
            `INSERT INTO borrowings (member_id, borrow_date, due_date, status) 
             VALUES (?, ?, ?, 'borrowed')`,
            [member_id, borrow_date, final_due_date]
        );
        
        const borrowing_id = borrowingResult.insertId;
        
        // 5. Insert ke tabel borrowing_details + kurangi stok
        for (const book of books) {
            // Insert detail
            await connection.query(
                `INSERT INTO borrowing_details (borrowing_id, book_id, quantity) 
                 VALUES (?, ?, ?)`,
                [borrowing_id, book.book_id, book.quantity]
            );
            
            // Kurangi stok buku
            await connection.query(
                'UPDATE books SET stock = stock - ? WHERE id = ?',
                [book.quantity, book.book_id]
            );
        }
        
        // 6. Commit transaction (simpan semua perubahan)
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Peminjaman berhasil dicatat',
            data: {
                borrowing_id,
                member_id,
                borrow_date,
                due_date: final_due_date,
                books: books
            }
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
});

// GET - Lihat Semua Peminjaman (dengan JOIN)
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                b.id AS borrowing_id,
                b.borrow_date,
                b.due_date,
                b.return_date,
                b.status,
                m.id AS member_id,
                m.name AS member_name,
                m.email AS member_email
            FROM borrowings b
            JOIN members m ON b.member_id = m.id
            ORDER BY b.id DESC
        `);
        
        res.json({
            success: true,
            data: rows,
            message: 'Borrowings retrieved successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// GET - Detail 1 Peminjaman (dengan detail buku)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Ambil data peminjaman utama
        const [borrowings] = await pool.query(`
            SELECT 
                b.*,
                m.name AS member_name,
                m.email AS member_email,
                m.phone AS member_phone
            FROM borrowings b
            JOIN members m ON b.member_id = m.id
            WHERE b.id = ?
        `, [id]);
        
        if (borrowings.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan'
            });
        }
        
        // Ambil detail buku yang dipinjam
        const [details] = await pool.query(`
            SELECT 
                bd.id AS detail_id,
                bd.quantity,
                bd.return_quantity,
                bd.book_condition,
                bk.id AS book_id,
                bk.title AS book_title,
                bk.author AS book_author
            FROM borrowing_details bd
            JOIN books bk ON bd.book_id = bk.id
            WHERE bd.borrowing_id = ?
        `, [id]);
        
        res.json({
            success: true,
            data: {
                ...borrowings[0],
                details: details
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// PUT - Proses Pengembalian Buku
router.put('/:id/return', authenticate, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        const { returned_books } = req.body;
        // returned_books = array of { book_id, quantity, condition }
        // condition: 'good', 'damaged', 'lost'
        
        // 1. Cek peminjaman ada
        const [borrowings] = await connection.query(
            'SELECT * FROM borrowings WHERE id = ?', 
            [id]
        );
        
        if (borrowings.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan'
            });
        }
        
        const borrowing = borrowings[0];
        
        if (borrowing.status === 'returned') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Buku sudah dikembalikan'
            });
        }
        
        // 2. Update borrowing_details + kembalikan stok
        for (const book of returned_books) {
            // Update detail
            await connection.query(
                `UPDATE borrowing_details 
                 SET return_quantity = ?, book_condition = ? 
                 WHERE borrowing_id = ? AND book_id = ?`,
                [book.quantity, book.condition || 'good', id, book.book_id]
            );
            
            // Kembalikan stok (hanya jika kondisi baik)
            if (book.condition === 'good' || !book.condition) {
                await connection.query(
                    'UPDATE books SET stock = stock + ? WHERE id = ?',
                    [book.quantity, book.book_id]
                );
            }
        }
        
        // 3. Update status peminjaman
        const return_date = new Date().toISOString().split('T')[0];
        await connection.query(
            `UPDATE borrowings 
             SET return_date = ?, status = 'returned' 
             WHERE id = ?`,
            [return_date, id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Pengembalian buku berhasil diproses',
            data: {
                borrowing_id: id,
                return_date,
                returned_books
            }
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
});

// DELETE - Batalkan Peminjaman (PROTECTED)
router.delete('/:id', authenticate, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { id } = req.params;
        
        // 1. Ambil detail peminjaman
        const [details] = await connection.query(
            'SELECT * FROM borrowing_details WHERE borrowing_id = ?', 
            [id]
        );
        
        if (details.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Peminjaman tidak ditemukan'
            });
        }
        
        // 2. Kembalikan stok semua buku
        for (const detail of details) {
            await connection.query(
                'UPDATE books SET stock = stock + ? WHERE id = ?',
                [detail.quantity, detail.book_id]
            );
        }
        
        // 3. Hapus details (akan cascade) dan borrowing
        await connection.query('DELETE FROM borrowings WHERE id = ?', [id]);
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Peminjaman dibatalkan dan stok dikembalikan'
        });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        connection.release();
    }
});

module.exports = router;