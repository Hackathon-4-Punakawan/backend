# Report Perubahan Database

## Ringkasan

Database PostgreSQL untuk aplikasi Konversi Amikom telah dibuat berdasarkan spesifikasi di `WORKGLOW.md`. Perubahan difokuskan pada pembuatan schema relasional untuk proses pengajuan magang, konversi OBE, logbook, evaluasi mitra, chat realtime, dan notifikasi.

## File Yang Ditambahkan

- `database/schema.sql`: SQL DDL lengkap untuk membuat database schema.
- `database/README.md`: Panduan singkat menjalankan schema ke PostgreSQL atau Supabase.
- `REPORT_DATABASE_CHANGES.md`: Report perubahan database.

## Tabel Yang Dibuat

- `mahasiswa`: Data utama mahasiswa.
- `dosen_pembimbing`: Data dosen pembimbing.
- `mitra_industri`: Data perusahaan/mitra industri.
- `admin_kaprodi`: Data admin atau kaprodi.
- `pengajuan_magang`: Data pengajuan program magang/MBKM mahasiswa.
- `mata_kuliah`: Master mata kuliah konversi.
- `cpl_cpmk`: Master CPL/CPMK dan bobot kompetensi OBE.
- `pemetaan_cpl_mk`: Relasi CPL/CPMK ke mata kuliah.
- `item_konversi_mk`: Detail mata kuliah yang dikonversi dari pengajuan magang.
- `logbook_mingguan`: Log aktivitas mingguan mahasiswa.
- `dokumen_pendukung`: Dokumen pendukung pengajuan atau logbook.
- `evaluasi_mitra`: Header evaluasi dari mitra industri.
- `detail_skor_cpl`: Detail skor CPL dari evaluasi mitra.
- `chat_room`: Room konsultasi realtime mahasiswa dan dosen.
- `chat_message`: Pesan chat dalam room.
- `notifikasi`: Notifikasi untuk user berdasarkan email penerima.

## Relasi Utama

- `pengajuan_magang.nim` terhubung ke `mahasiswa.nim` dengan `ON DELETE CASCADE`.
- `pengajuan_magang.id_mitra` terhubung ke `mitra_industri.id_mitra`.
- `pengajuan_magang.nidn` terhubung ke `dosen_pembimbing.nidn`.
- `pengajuan_magang.id_admin` terhubung ke `admin_kaprodi.id_admin`.
- `item_konversi_mk.id_pengajuan`, `logbook_mingguan.id_pengajuan`, `dokumen_pendukung.id_pengajuan`, dan `evaluasi_mitra.id_pengajuan` ikut terhapus saat pengajuan dihapus.
- `detail_skor_cpl.id_evaluasi` ikut terhapus saat data evaluasi dihapus.
- `chat_message.id_room` ikut terhapus saat chat room dihapus.

## Constraint Dan Default Value

- Primary key dibuat pada semua tabel utama.
- Email pada `mahasiswa`, `dosen_pembimbing`, dan `admin_kaprodi` dibuat unique.
- `detail_skor_cpl.skor` dibatasi antara `0` sampai `100`.
- Beberapa status memiliki default value, seperti `Sedang Berjalan`, `Diajukan`, `Pending`, `Draf`, dan `konsultasi_dosen`.
- Timestamp default menggunakan `CURRENT_TIMESTAMP`.

## Optimasi Index

Index tambahan dibuat untuk kolom foreign key dan kolom yang umum dipakai untuk join/filter, seperti `id_pengajuan`, `nim`, `nidn`, `id_room`, dan `receiver_email`.

## Cara Eksekusi

Jalankan schema dengan PostgreSQL CLI:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Atau jalankan isi `database/schema.sql` melalui Supabase SQL Editor.

## Catatan Implementasi

- Project backend belum memakai ORM atau migration tool seperti Prisma, Sequelize, Knex, atau TypeORM.
- Karena itu schema dibuat dalam bentuk SQL murni agar langsung kompatibel dengan PostgreSQL/Supabase.
- Jika nanti backend mulai memakai ORM, schema ini bisa dijadikan baseline migration awal.
