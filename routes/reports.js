// routes/reports.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * @route GET /api/reports
 * @desc Generate laporan berdasarkan periode
 * @query start_date, end_date (format: YYYY-MM-DD)
 */
router.get('/', async (req, res) => {
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'Parameter start_date dan end_date wajib diisi'
    });
  }

  try {
    // 1. Total Peminjaman dalam periode
    const [totalBorrowings] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM borrowings 
      WHERE borrow_date BETWEEN ? AND ?
    `, [start_date, end_date]);

    // 2. Total Pengembalian dalam periode
    const [totalReturns] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM borrowings 
      WHERE return_date BETWEEN ? AND ?
    `, [start_date, end_date]);

    // 3. Total Denda dalam periode
    const [totalFines] = await pool.query(`
      SELECT COALESCE(SUM(fine_amount), 0) as total 
      FROM borrowing_details bd
      JOIN borrowings b ON bd.borrowing_id = b.id
      WHERE b.return_date BETWEEN ? AND ?
    `, [start_date, end_date]);

    // 4. Detail per hari (untuk grafik)
    const [dailyStats] = await pool.query(`
      SELECT 
        DATE(borrow_date) as date,
        COUNT(*) as borrowings,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returns
      FROM borrowings
      WHERE borrow_date BETWEEN ? AND ?
      GROUP BY DATE(borrow_date)
      ORDER BY date ASC
    `, [start_date, end_date]);

    // 5. Denda per hari
    const [dailyFines] = await pool.query(`
      SELECT 
        DATE(b.return_date) as date,
        COALESCE(SUM(bd.fine_amount), 0) as fines
      FROM borrowings b
      LEFT JOIN borrowing_details bd ON b.id = bd.borrowing_id
      WHERE b.return_date BETWEEN ? AND ?
      GROUP BY DATE(b.return_date)
      ORDER BY date ASC
    `, [start_date, end_date]);

    // 6. Top 5 Buku Terpopuler
    const [topBooks] = await pool.query(`
      SELECT 
        bk.title,
        bk.author,
        SUM(bd.quantity) as total_borrowed
      FROM borrowing_details bd
      JOIN borrowings b ON bd.borrowing_id = b.id
      JOIN books bk ON bd.book_id = bk.id
      WHERE b.borrow_date BETWEEN ? AND ?
      GROUP BY bk.id, bk.title, bk.author
      ORDER BY total_borrowed DESC
      LIMIT 5
    `, [start_date, end_date]);

    // 7. Top 5 Member Aktif
    const [topMembers] = await pool.query(`
      SELECT 
        m.name,
        m.email,
        COUNT(b.id) as total_borrowings
      FROM borrowings b
      JOIN members m ON b.member_id = m.id
      WHERE b.borrow_date BETWEEN ? AND ?
      GROUP BY m.id, m.name, m.email
      ORDER BY total_borrowings DESC
      LIMIT 5
    `, [start_date, end_date]);

    res.json({
      success: true,
      data: {
        summary: {
          total_borrowings: totalBorrowings[0].total,
          total_returns: totalReturns[0].total,
          total_fines: totalFines[0].total
        },
        daily_stats: dailyStats,
        daily_fines: dailyFines,
        top_books: topBooks,
        top_members: topMembers
      }
    });

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal generate laporan: ' + error.message
    });
  }
});

module.exports = router;