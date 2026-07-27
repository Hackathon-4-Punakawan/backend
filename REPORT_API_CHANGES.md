# Report Perubahan REST API dan Dashboard Tester

## Ringkasan

Backend Express telah dikembangkan menjadi REST API untuk seluruh domain aplikasi Konversi Amikom. API menggunakan PostgreSQL melalui package `pg`, memakai query parameterized, dan tersedia pada prefix `/api/v1`.

Dashboard pengujian endpoint tanpa framework frontend tersedia di:

```text
http://localhost:3000/api-tester/
```

## File Yang Ditambahkan atau Diubah

- `src/index.js`: Entry point server dan informasi URL dashboard.
- `src/app.js`: Konfigurasi Express, static dashboard, API router, 404 handler, dan database error handler.
- `src/routes/api.js`: CRUD API dan endpoint workflow aplikasi.
- `public/api-tester/index.html`: Struktur dashboard API Lab.
- `public/api-tester/styles.css`: Tampilan responsif desktop dan mobile.
- `public/api-tester/app.js`: Katalog endpoint, request builder, validasi JSON, dan response viewer.
- `REPORT_API_CHANGES.md`: Dokumentasi perubahan pada tahap ini.

## Base URL

```text
http://localhost:3000/api/v1
```

## CRUD Resource

Semua resource berikut memiliki operasi list, create, detail, update, dan delete:

```text
GET    /api/v1/{resource}
POST   /api/v1/{resource}
GET    /api/v1/{resource}/:id
PATCH  /api/v1/{resource}/:id
DELETE /api/v1/{resource}/:id
```

Resource yang tersedia:

- `mahasiswa`
- `dosen-pembimbing`
- `mitra-industri`
- `admin-kaprodi`
- `mata-kuliah`
- `cpl-cpmk`
- `pemetaan-cpl-mk`
- `pengajuan-magang`
- `item-konversi`
- `logbook`
- `dokumen-pendukung`
- `evaluasi-mitra`
- `detail-skor-cpl`
- `chat-rooms`
- `chat-messages`
- `notifikasi`
- `approval-tokens`

Endpoint list menerima pagination dan filter field:

```text
GET /api/v1/mahasiswa?page=1&limit=25&prodi=Informatika
```

Jumlah maksimum per request adalah 100 data.

## Workflow Pengajuan Magang

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/pengajuan-magang/:id/submit` | Mengubah Draft menjadi Menunggu Verifikasi |
| `POST` | `/pengajuan-magang/:id/approve` | Menyetujui pengajuan dan menentukan DPL/admin |
| `POST` | `/pengajuan-magang/:id/reject` | Menolak pengajuan |
| `POST` | `/pengajuan-magang/:id/complete` | Menyelesaikan program magang |
| `GET` | `/pengajuan-magang/:id/progress` | Ringkasan logbook, konversi, dan evaluasi |

## Workflow Konversi Mata Kuliah

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/item-konversi/:id/proposal/approve` | Persetujuan usulan oleh DPL |
| `POST` | `/item-konversi/:id/proposal/reject` | Penolakan usulan dengan catatan |
| `POST` | `/item-konversi/:id/mitra-assessment` | Menyimpan nilai mitra skala 0-100 |
| `POST` | `/item-konversi/:id/request-revision` | Meminta revisi klaim mahasiswa |
| `POST` | `/item-konversi/:id/dpl-assessment` | Menyimpan nilai DPL dan menghitung nilai akhir |

Formula nilai akhir:

```text
(nilai_mitra * 70%) + (nilai_dpl * 30%)
```

Nilai huruf dihitung otomatis menggunakan skala A, B+, B, C+, C, D, dan E.

## Logbook dan Evaluasi OBE

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/logbook/:id/verify` | Verifikasi logbook oleh DPL |
| `POST` | `/logbook/:id/reject` | Tolak logbook dan berikan umpan balik |
| `PUT` | `/evaluasi-mitra/:id/skor-cpl` | Mengganti detail skor CPL dalam transaksi |
| `POST` | `/evaluasi-mitra/:id/submit` | Hitung skor berbobot dan kirim evaluasi |
| `GET` | `/evaluasi-mitra/:id/hasil` | Detail hasil evaluasi beserta CPL |

## Chat, Notifikasi, dan Approval Token

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/chat/rooms/:id/messages` | Riwayat pesan room |
| `POST` | `/chat/rooms/:id/messages` | Kirim pesan |
| `POST` | `/chat/rooms/:id/read` | Tandai pesan sudah dibaca |
| `PATCH` | `/notifikasi/:id/read` | Tandai satu notifikasi dibaca |
| `POST` | `/notifikasi/read-all` | Tandai seluruh notifikasi user dibaca |
| `GET` | `/approval/:token` | Validasi magic link |
| `POST` | `/approval/:token/use` | Gunakan dan invalidasi magic link |

Token dibuat otomatis dengan `crypto.randomBytes()` jika `POST /approval-tokens` tidak menerima field `token`.

## Dashboard API Tester

Dashboard menyediakan:

- Katalog endpoint berdasarkan domain.
- Pencarian endpoint.
- Pemilihan HTTP method dan URL yang dapat diedit.
- Contoh request body untuk endpoint utama.
- Validasi dan format JSON.
- Keyboard shortcut `Ctrl+Enter` atau `Command+Enter`.
- Konfirmasi sebelum menjalankan request `DELETE`.
- Tampilan status HTTP, durasi request, ukuran response, dan pretty JSON.
- Tombol copy response.
- Layout responsif untuk desktop dan mobile.

## Error Handling

API mengubah error PostgreSQL umum menjadi response HTTP yang sesuai:

- `400`: Request atau format parameter tidak valid.
- `404`: Endpoint atau data tidak ditemukan.
- `409`: Data duplikat, foreign key conflict, atau transisi status tidak valid.
- `422`: Nilai melanggar constraint atau aturan bisnis.
- `500`: Kesalahan server yang tidak teridentifikasi.

## Menjalankan Aplikasi

```bash
npm run dev
```

Pastikan `DATABASE_URL` di `.env` mengarah ke PostgreSQL yang sudah menjalankan `database/schema.sql`.

## Catatan Keamanan

API tahap ini belum menerapkan autentikasi dan role-based authorization karena schema user tidak menyimpan credential atau provider identity. Endpoint ditujukan untuk integrasi dan testing awal. Sebelum deployment publik, tambahkan middleware autentikasi Supabase Auth/JWT dan batasi dashboard tester pada environment development.
