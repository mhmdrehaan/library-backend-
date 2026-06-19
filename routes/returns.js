// routes/returns.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Tarif denda harian default (Rp 1000 per buku per hari terlambat)
const DEFAULT_FINE_RATE_PER_DAY = 1000;

/**
 * @route PUT /api/returns/:id/return
 * @desc Proses pengembalian buku & hitung denda keterlambatan
 * @access Private (perlu token)
 */
router.put('/:id/return', async (req, res) => {
  const { id } = req.params;
  const { returned_books } = req.body; // [{ book_id, quantity, condition }, ...]

  if (!Array.isArray(returned_books) || returned_books.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Field "returned_books" harus berupa array dan tidak boleh kosong.'
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Ambil data peminjaman (pastikan status = 'borrowed')
    const [borrowingRows] = await connection.query(
      'SELECT id, member_id, borrow_date, due_date FROM borrowings WHERE id = ? AND status = ?',
      [id, 'borrowed']
    );

    if (borrowingRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Peminjaman tidak ditemukan atau sudah dikembalikan.'
      });
    }
    const borrowing = borrowingRows[0];

    // 2. Hitung tanggal kembali (gunakan waktu sekarang)
    const returnDate = new Date(); // Format: YYYY-MM-DD HH:mm:ss
    const dueDate = new Date(borrowing.due_date);

    // 3. Proses setiap buku yang dikembalikan
    let totalFine = 0;

    for (const item of returned_books) {
      const { book_id, quantity, condition } = item;

      // Validasi input
      if (!book_id || typeof quantity !== 'number' || quantity <= 0) {
        throw new Error(`Data buku tidak valid: book_id=${book_id}, quantity=${quantity}`);
      }
      if (!['good', 'damaged', 'lost'].includes(condition)) {
        throw new Error(`Kondisi buku tidak valid: ${condition}. Harus 'good', 'damaged', atau 'lost'.`);
      }

      // 3.1. Cek apakah buku ada
      const [bookRows] = await connection.query(
        'SELECT stock FROM books WHERE id = ?',
        [book_id]
      );
      if (bookRows.length === 0) {
        throw new Error(`Buku dengan ID ${book_id} tidak ditemukan.`);
      }

      // 3.2. Hitung keterlambatan (hari)
      const timeDiffMs = returnDate.getTime() - dueDate.getTime();
      const daysLate = Math.max(0, Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24))); // ceil, min 0

      // 3.3. Hitung denda: daysLate × quantity × tarif
      const fineAmount = daysLate * quantity * DEFAULT_FINE_RATE_PER_DAY;
      totalFine += fineAmount;

      // 3.4. Update stok buku (tambahkan kembali)
      const [updateStockResult] = await connection.query(
        'UPDATE books SET stock = stock + ? WHERE id = ?',
        [quantity, book_id]
      );
      if (updateStockResult.affectedRows === 0) {
        throw new Error(`Gagal memperbarui stok buku ID ${book_id}.`);
      }

      // 3.5. Update detail peminjaman: kondisi & denda
      const [updateDetailResult] = await connection.query(
        `UPDATE borrowing_details 
         SET book_condition = ?, fine_amount = ? 
         WHERE borrowing_id = ? AND book_id = ?`,
        [condition, fineAmount, id, book_id]
      );

      if (updateDetailResult.affectedRows === 0) {
        // Jika tidak ada baris yang di-update, coba cari dengan quantity (opsional)
        // Untuk keamanan, kita asumsikan struktur tabel benar: satu baris per (borrowing_id, book_id)
        throw new Error(`Detail peminjaman untuk buku ID ${book_id} tidak ditemukan.`);
      }
    }

    // 4. Update status peminjaman menjadi 'returned'
    await connection.query(
      'UPDATE borrowings SET status = ?, return_date = ? WHERE id = ?',
      ['returned', returnDate, id]
    );

    // 5. Commit transaksi
    await connection.commit();

    res.json({
      success: true,
      message: 'Pengembalian berhasil diproses.',
      data: {
        borrowing_id: id,
        total_fine: totalFine,
        return_date: returnDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('[RETURN ERROR]', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Gagal memproses pengembalian. Silakan coba lagi.'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;