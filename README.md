# 🚀 Library Management System - Backend API

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JWT](https://img.shields.io/badge/JWT-Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)

> **RESTful API** untuk Sistem Manajemen Perpustakaan. Menyediakan endpoint untuk autentikasi, manajemen buku/anggota, logika transaksi peminjaman/pengembalian dengan **perhitungan denda otomatis**, serta endpoint analitik untuk pelaporan.

---

## Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Prasyarat](#-prasyarat)
- [Instalasi & Setup](#-instalasi--setup)
- [Konfigurasi Environment](#-konfigurasi-environment)
- [Struktur Database](#-struktur-database)
- [API Endpoints](#-api-endpoints)
- [Struktur Folder](#-struktur-folder)
- [Menjalankan Server](#-menjalankan-server)

---

## ✨ Fitur Utama

### 🔐 Autentikasi & Keamanan

- **JWT Authentication**: Login dan registrasi user dengan JSON Web Token.
- **Password Hashing**: Menggunakan `bcrypt` untuk keamanan password.
- **Security Headers**: Dilindungi oleh `Helmet`.
- **Rate Limiting**: Mencegah brute-force attack.
- **CORS**: Konfigurasi cross-origin yang aman.

### 📖 Manajemen Data (CRUD)

- **Buku**: Tambah, ubah, hapus, dan cari data buku beserta stok.
- **Anggota**: Manajemen data anggota perpustakaan.

### 💰 Logika Bisnis Transaksi

- **Peminjaman**: Validasi stok real-time, input multi-buku dalam satu transaksi.
- **Pengembalian & Denda**:
  - Perhitungan denda otomatis (Rp 1.000/buku/hari terlambat).
  - Update stok otomatis saat buku dikembalikan.
  - Pencatatan kondisi buku (Baik/Rusak/Hilang).
  - Transaksi database (MySQL Transactions) untuk menjamin konsistensi data.

### 📊 Analitik & Laporan

- **Endpoint Laporan**: Menghasilkan data agregat berdasarkan rentang tanggal.
- **Statistik**: Total peminjaman, pengembalian, dan denda terkumpul.
- **Peringkat**: Top 5 buku terpopuler dan member paling aktif.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL (menggunakan `mysql2/promise` untuk async queries)
- **Authentication**: `jsonwebtoken` (JWT)
- **Security**: `helmet`, `cors`, `express-rate-limit`
- **Utilities**: `bcrypt`, `dotenv`

---

## 📦 Prasyarat

Sebelum memulai, pastikan Anda telah menginstal:

- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (versi 8.x direkomendasikan)
- Git

---

## ⚙️ Instalasi & Setup

1. **Clone repository ini**
   ```bash
   git clone https://github.com/yourusername/library-backend.git
   cd library-backend
   ```
