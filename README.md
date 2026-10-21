# 🏡 KontrakanKu (Markas Warung)

Sistem Operasi Manajemen Rumah Kontrakan & Shared Living berbasis Web / PWA (Progressive Web App). Aplikasi ini mengotomatiskan pembagian giliran tugas belanja (Duty Rotation), pencatatan keuangan bersama (Split Bill & Continuous Ledger), integrasi pembayaran QRIS dinamis berstandar EMVCo CRC-16, kalender konsumsi, serta pelaporan pemeliharaan fasilitas kontrakan.

---

## 🚀 Fitur Utama

1. **Dashboard Rumah (Command Center)**
   - Status stok kebutuhan saat ini (Aman, Menipis, Habis).
   - Pengingat giliran piket/belanja aktif untuk tiap penghuni.
   - Ringkasan saldo kas kontrakan dan tagihan belum lunas.

2. **Kebutuhan & Giliran Piket (Needs & Duty Rotation)**
   - Rotasi belanja adil dengan algoritma *Least Recently Used* (skor kontribusi & histori tertua).
   - Pengaturan fleksibel: giliran individu (1 orang), berpasangan (2 orang), atau kluster khusus.
   - Penyesuaian otomatis terhadap ketersediaan penghuni (melewati anggota yang sedang cuti / keluar kota).
   - Analisis laju konsumsi barang (Accelerating, Steady, Slowing).

3. **Keuangan & Split Bill (Continuous Ledger)**
   - Pembagian tagihan (patungan wifi, belanja bersama, listrik) secara merata atau proporsional.
   - Algoritma penyelesaian hutang *Greedy Settlement Plan* yang meminimalkan jumlah transaksi antar penghuni.
   - Pembukuan kas rumah (House Wallet) dengan riwayat mutasi masuk & keluar.
   - Laporan visual bulanan menggunakan diagram grafik kategori pengeluaran.

4. **Integrasi QRIS Dinamis (EMVCo & CRC-16)**
   - Konversi QRIS statis penghuni menjadi QRIS dinamis dengan nominal rupiah otomatis sesuai tagihan split bill.
   - Kalkulasi checksum CRC-16 CCITT (Polinomial `0x1021`) valid sesuai standar Bank Indonesia (PADG).
   - Scan & upload QRIS langsung dari gambar barcode.

5. **Kalender Pemantauan & Riwayat**
   - Kalender interaktif jadwal pembelian riil vs perkiraan habis stok berikutnya.
   - Tambah agenda rumah (rapat kontrakan, kerja bakti, dll.).

6. **Pemeliharaan & Kerusakan (Maintenance Hub)**
   - Pelaporan kerusakan fasilitas (keran bocor, genteng bocor, lampu mati).
   - Penugasan teknisi antar penghuni dan mekanisme *reimbursement* dari kas bersama.

7. **Pengaturan & Role-Based Access Control (RBAC)**
   - Peran berjenjang: `SUPER_ADMIN`, `ADMIN`, `OWNER`, dan `MEMBER`.
   - Kode undangan resmi (*Invite Code*) untuk penghuni baru saat registrasi.
   - Integrasi bot notifikasi Telegram grup kontrakan.

---

## 🛠️ Stack Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Vite 8, Vite PWA.
- **Backend**: Node.js, Express, Multer, JSON Web Token (JWT).
- **Database & ORM**: TiDB / MySQL via Drizzle ORM, Sinkronisasi Memory Store aktif.
- **QRIS Engine**: EMVCo TLV Parser, CRC-16 CCITT Generator, jsQR.

---

## 📂 Struktur Direktori

```
kontrakanku/
├── docs/                 # Dokumentasi QA & Skema Basis Data
├── public/               # Asset statis PWA & Web Manifest
├── scripts/              # Utilitas database (migrasi, reset, query)
│   ├── migrate.ts        # Migrasi kolom database
│   ├── query-users.ts    # Pengecekan user database
│   └── reset-db.ts       # Reset & seed ulang database
├── src/
│   ├── components/       # Komponen UI modular
│   │   ├── auth/         # Login, Register & Reset Sandi
│   │   ├── home/         # Dashboard / Command Center
│   │   ├── needs/        # Kebutuhan & Konfigurasi Giliran
│   │   ├── finance/      # Keuangan, Split Bill & QRIS
│   │   ├── calendar/     # Kalender Rumah
│   │   ├── maintenance/  # Pemeliharaan Fasilitas
│   │   ├── activity/     # Log Aktivitas & Rekap WhatsApp
│   │   ├── profile/      # Profil Akun & Avatar
│   │   ├── settings/     # Pengaturan Rumah & Telegram
│   │   └── navigation/   # Header, Sidebar, BottomNav
│   ├── contexts/         # State otentikasi global (AuthContext)
│   ├── db/               # Skema Drizzle ORM & Database Pool
│   ├── domain/           # Mesin logika murni (Duty, NetBalance, QRIS, dll)
│   └── services/         # API Client terpusat (apiClient)
├── server.ts             # Server backend Express & API
├── vite.config.ts        # Konfigurasi Vite & PWA
└── package.json          # Dependensi & skrip aplikasi
```

---

## 🏃 Menjalankan Aplikasi Secara Lokal

### 1. Instal Dependensi
```bash
npm install
```

### 2. Konfigurasi Lingkungan (.env)
Salin `.env.example` ke `.env` atau isi kredensial MySQL / TiDB:
```env
DATABASE_URL="mysql://user:password@host:port/database"
JWT_SECRET="rahasia_kontrakan_2026"
PORT=3000
```

### 3. Jalankan Mode Pengembangan
```bash
npm run dev
```
Akses di browser pada: `http://localhost:3000`

### 4. Build untuk Production
```bash
npm run build
```

### 5. Verifikasi Unit Tests Domain
```bash
npx tsx -e "import { runDomainUnitTests } from './src/domain/__tests__/engine.test.ts'; console.log(runDomainUnitTests());"
```
