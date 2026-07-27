# 📄 SYSTEM ARCHITECTURE & PROJECT SPECIFICATION
**Project Name:** Konversi Amikom (Sistem Konversi Nilai Magang Berbasis OBE)  
**Architecture:** Monorepo / Decoupled Architecture
  • **Backend:** Node.js + Express.js (REST API + Socket.io / Supabase Realtime)
  • **Frontend:** Next.js / React (App Router + Tailwind CSS)
  • **Database & Storage:** PostgreSQL + Cloudinary / Supabase Storage
**Deployment Host:** Render / Railway (Backend Express Free) + Vercel (Frontend Free)

---

## 1. Context & Business Domain

Aplikasi ini mendigitalisasi dan mengotomatisasi proses konversi kegiatan magang/MBKM mahasiswa menjadi mata kuliah bernilai akademik dengan pendekatan **Outcome-Based Education (OBE)**.

### Primary Roles & Access Control:
1. **Mahasiswa:** Mengajukan magang, mengunggah logbook mingguan, mengecek status step konversi per MK, dan chat dengan Dosen/Mitra.
2. **Dosen Pembimbing:** Memverifikasi logbook mingguan, memvalidasi kesesuaian modul industri dengan MK konversi, serta chat dengan Mahasiswa bimbingan.
3. **Mitra Industri (Supervisor):** Mengisi formulir evaluasi kompetensi OBE (Mid-term & Final), mengunggah sertifikat/laporan.
4. **Admin / Kaprodi:** Memetakan CPL ke Mata Kuliah, menyetujui rekomendasi nilai, dan menetapkan SK Nilai Konversi Akhir.

---

## 2. Database Schema (PostgreSQL DDL)

Agent backend harus membuat skema PostgreSQL berikut:

```sql
-- 1. ENTITAS UTAMA (USERS)
CREATE TABLE mahasiswa (
  nim VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  prodi VARCHAR(50) NOT NULL,
  angkatan VARCHAR(10),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255)
);

CREATE TABLE dosen_pembimbing (
  nidn VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  bidang_keahlian VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE mitra_industri (
  id_mitra SERIAL PRIMARY KEY,
  nama_perusahaan VARCHAR(150) NOT NULL,
  kategori_industri VARCHAR(100),
  bidang_usaha VARCHAR(100),
  kontak_pic VARCHAR(100)
);

CREATE TABLE admin_kaprodi (
  id_admin SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  jabatan VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

-- 2. PENGAJUAN & KONVERSI OBE
CREATE TABLE pengajuan_magang (
  id_pengajuan SERIAL PRIMARY KEY,
  nim VARCHAR(20) REFERENCES mahasiswa(nim) ON DELETE CASCADE,
  id_mitra INT REFERENCES mitra_industri(id_mitra),
  nidn VARCHAR(20) REFERENCES dosen_pembimbing(nidn),
  id_admin INT REFERENCES admin_kaprodi(id_admin),
  jenis_program VARCHAR(100) NOT NULL,
  posisi VARCHAR(100) NOT NULL,
  durasi_bulan INT DEFAULT 6,
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  status_program VARCHAR(30) DEFAULT 'Sedang Berjalan',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mata_kuliah (
  kode_mk VARCHAR(20) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  sks INT NOT NULL,
  semester INT
);

CREATE TABLE cpl_cpmk (
  id_cpl SERIAL PRIMARY KEY,
  kode_cpl VARCHAR(20) NOT NULL,
  kategori VARCHAR(50) NOT NULL, -- Soft Skill, Hard Skill, Problem Solving
  nama_kompetensi VARCHAR(150) NOT NULL,
  deskripsi TEXT,
  bobot_persen FLOAT NOT NULL
);

CREATE TABLE pemetaan_cpl_mk (
  id_pemetaan SERIAL PRIMARY KEY,
  kode_mk VARCHAR(20) REFERENCES mata_kuliah(kode_mk),
  id_cpl INT REFERENCES cpl_cpmk(id_cpl)
);

CREATE TABLE item_konversi_mk (
  id_item_konversi SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  kode_mk VARCHAR(20) REFERENCES mata_kuliah(kode_mk),
  modul_industri VARCHAR(150),
  status_step VARCHAR(30) DEFAULT 'Diajukan', -- Diajukan, Validasi Dosen, Setuju Kaprodi, SK Terbit
  catatan_dosen TEXT,
  nilai_akhir_angka FLOAT,
  nilai_akhir_huruf VARCHAR(5),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. LOGBOOK & EVALUASI
CREATE TABLE logbook_mingguan (
  id_logbook SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  minggu_ke INT NOT NULL,
  periode_mulai DATE,
  periode_selesai DATE,
  total_jam INT,
  kompetensi_utama VARCHAR(150),
  aktivitas_utama TEXT,
  kendala_solusi TEXT,
  umpan_balik_mentor TEXT,
  status_verifikasi VARCHAR(30) DEFAULT 'Pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dokumen_pendukung (
  id_dokumen SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  id_logbook INT REFERENCES logbook_mingguan(id_logbook),
  jenis_dokumen VARCHAR(50) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  tanggal_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluasi_mitra (
  id_evaluasi SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  periode_evaluasi VARCHAR(30) NOT NULL, -- Mid-term, Final
  status_draf VARCHAR(20) DEFAULT 'Draf', -- Draf, Kirim
  skor_total FLOAT,
  tanggal_evaluasi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detail_skor_cpl (
  id_detail SERIAL PRIMARY KEY,
  id_evaluasi INT REFERENCES evaluasi_mitra(id_evaluasi) ON DELETE CASCADE,
  id_cpl INT REFERENCES cpl_cpmk(id_cpl),
  skor FLOAT CHECK (skor >= 0 AND skor <= 100)
);

-- 4. CHAT REALTIME & NOTIFIKASI
CREATE TABLE chat_room (
  id_room SERIAL PRIMARY KEY,
  nim_mahasiswa VARCHAR(20) REFERENCES mahasiswa(nim),
  nidn_dosen VARCHAR(20) REFERENCES dosen_pembimbing(nidn),
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan),
  jenis_room VARCHAR(30) DEFAULT 'konsultasi_dosen',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_message (
  id_message SERIAL PRIMARY KEY,
  id_room INT REFERENCES chat_room(id_room) ON DELETE CASCADE,
  sender_email VARCHAR(100) NOT NULL,
  sender_role VARCHAR(30) NOT NULL,
  pesan TEXT NOT NULL,
  attachment_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifikasi (
  id_notifikasi SERIAL PRIMARY KEY,
  receiver_email VARCHAR(100) NOT NULL,
  judul VARCHAR(100) NOT NULL,
  pesan TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);