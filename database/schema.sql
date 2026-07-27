-- UNIKA.IN (BIMA Revamp) Database Schema
-- PostgreSQL DDL with Auth & RBAC User Management

-- 1. AUTHENTICATION & MASTER USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('MAHASISWA', 'DPL', 'MITRA', 'ADMIN_PRODI')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MAHASISWA
CREATE TABLE IF NOT EXISTS mahasiswa (
  nim VARCHAR(20) PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL,
  prodi VARCHAR(50) NOT NULL,
  angkatan VARCHAR(10),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255)
);

-- DOSEN PEMBIMBING LAPANGAN (DPL)
CREATE TABLE IF NOT EXISTS dosen_pembimbing (
  nidn VARCHAR(20) PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL,
  bidang_keahlian VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

-- MITRA INDUSTRI / SUPERVISOR
CREATE TABLE IF NOT EXISTS mitra_industri (
  id_mitra SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama_perusahaan VARCHAR(150) NOT NULL,
  nama_supervisor VARCHAR(100),
  email_supervisor VARCHAR(100),
  kategori_industri VARCHAR(100),
  bidang_usaha VARCHAR(100),
  kontak_pic VARCHAR(100)
);

-- ADMIN / KAPRODI
CREATE TABLE IF NOT EXISTS admin_kaprodi (
  id_admin SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL,
  jabatan VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

-- 2. PENGAJUAN MAGANG & INTEGRASI FAKULTAS
CREATE TABLE IF NOT EXISTS pengajuan_magang (
  id_pengajuan SERIAL PRIMARY KEY,
  id_magang_fakultas VARCHAR(50), -- Manual ID dari Pra-Survey Fakultas
  nim VARCHAR(20) REFERENCES mahasiswa(nim) ON DELETE CASCADE,
  id_mitra INT REFERENCES mitra_industri(id_mitra),
  nidn VARCHAR(20) REFERENCES dosen_pembimbing(nidn),
  id_admin INT REFERENCES admin_kaprodi(id_admin),
  nama_instansi VARCHAR(150),
  alamat_instansi TEXT,
  tujuan_surat VARCHAR(150),
  semester INT,
  tahun_akademik VARCHAR(20),
  jenis_surat_fakultas VARCHAR(100),
  status_surat_fakultas VARCHAR(50) DEFAULT 'Diproses Fakultas',
  nomor_layanan_fik VARCHAR(100),
  nama_supervisor_mitra VARCHAR(100),
  email_supervisor_mitra VARCHAR(100),
  jenis_program VARCHAR(100) NOT NULL, -- Magang Mandiri / MSIB / Studi Independen
  posisi VARCHAR(100) NOT NULL,
  durasi_bulan INT DEFAULT 6,
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  file_proposal_magang VARCHAR(255),
  file_bukti_diterima VARCHAR(255),
  surat_pengantar_url VARCHAR(255),
  status_proposal VARCHAR(50) DEFAULT 'Review Proposal Prodi',
  catatan_revisi_proposal TEXT,
  status_pengajuan VARCHAR(30) DEFAULT 'Draft', -- Draft -> Menunggu Verifikasi -> Disetujui -> Ditolak
  status_program VARCHAR(30) DEFAULT 'Sedang Berjalan', -- Sedang Berjalan -> Selesai
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. KURIKULUM OBE & USULAN KONVERSI
CREATE TABLE IF NOT EXISTS mata_kuliah (
  kode_mk VARCHAR(20) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  sks INT NOT NULL,
  semester INT
);

CREATE TABLE IF NOT EXISTS cpl_cpmk (
  id_cpl SERIAL PRIMARY KEY,
  kode_cpl VARCHAR(20) NOT NULL,
  kategori VARCHAR(50) NOT NULL, -- Soft Skill, Hard Skill, Problem Solving
  nama_kompetensi VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  bobot_persen FLOAT DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS pemetaan_cpl_mk (
  id_pemetaan SERIAL PRIMARY KEY,
  kode_mk VARCHAR(20) REFERENCES mata_kuliah(kode_mk) ON DELETE CASCADE,
  id_cpl INT REFERENCES cpl_cpmk(id_cpl) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS item_konversi_mk (
  id_item_konversi SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  kode_mk VARCHAR(20) REFERENCES mata_kuliah(kode_mk),
  id_cpl INT REFERENCES cpl_cpmk(id_cpl),
  aktivitas_magang TEXT, -- Contoh: "Membangun REST API"
  bukti_aktivitas TEXT, -- Contoh: "Pengembangan REST API dan deployment aplikasi"
  file_laporan_magang VARCHAR(255),
  file_sertifikat_magang VARCHAR(255),
  status_usulan VARCHAR(30) DEFAULT 'Menunggu Persetujuan DPL', -- Menunggu Persetujuan DPL -> Disetujui DPL -> Ditolak
  status_klaim VARCHAR(30) DEFAULT 'Menunggu Penilaian Mitra', -- Menunggu Penilaian Mitra -> Menunggu Review DPL -> Minta Revisi -> Disetujui -> Ditolak
  catatan_dosen TEXT,
  nilai_mitra FLOAT, -- Skala 1-100 (Bobot 70%)
  komentar_mitra TEXT,
  tanggal_penilaian_mitra TIMESTAMP,
  nilai_dpl FLOAT, -- Skala 1-100 (Bobot 30%)
  catatan_dpl TEXT,
  tanggal_penilaian_dpl TIMESTAMP,
  nilai_akhir_angka FLOAT, -- Formula: (70% * nilai_mitra) + (30% * nilai_dpl)
  nilai_akhir_huruf VARCHAR(5), -- A, B+, B, C+, C, D, E
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. APPROVAL TOKENS (MAGIC LINK UNTUK DPL & MITRA TANPA LOGIN)
CREATE TABLE IF NOT EXISTS approval_tokens (
  id_token SERIAL PRIMARY KEY,
  token VARCHAR(100) UNIQUE NOT NULL,
  target_type VARCHAR(30) NOT NULL, -- 'mitra_penilaian' atau 'dpl_review'
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  email_recipient VARCHAR(100) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. LOGBOOK & EVALUASI
CREATE TABLE IF NOT EXISTS logbook_mingguan (
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

CREATE TABLE IF NOT EXISTS dokumen_pendukung (
  id_dokumen SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  id_logbook INT REFERENCES logbook_mingguan(id_logbook),
  jenis_dokumen VARCHAR(50) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  tanggal_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluasi_mitra (
  id_evaluasi SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  periode_evaluasi VARCHAR(30) NOT NULL, -- Mid-term, Final
  status_draf VARCHAR(20) DEFAULT 'Draf', -- Draf, Kirim
  skor_total FLOAT,
  tanggal_evaluasi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detail_skor_cpl (
  id_detail SERIAL PRIMARY KEY,
  id_evaluasi INT REFERENCES evaluasi_mitra(id_evaluasi) ON DELETE CASCADE,
  id_cpl INT REFERENCES cpl_cpmk(id_cpl),
  skor FLOAT CHECK (skor >= 0 AND skor <= 100)
);

-- 6. CHAT REALTIME & NOTIFIKASI
CREATE TABLE IF NOT EXISTS chat_room (
  id_room SERIAL PRIMARY KEY,
  nim_mahasiswa VARCHAR(20) REFERENCES mahasiswa(nim),
  nidn_dosen VARCHAR(20) REFERENCES dosen_pembimbing(nidn),
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan),
  jenis_room VARCHAR(30) DEFAULT 'konsultasi_dosen',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_message (
  id_message SERIAL PRIMARY KEY,
  id_room INT REFERENCES chat_room(id_room) ON DELETE CASCADE,
  sender_email VARCHAR(100) NOT NULL,
  sender_role VARCHAR(30) NOT NULL,
  pesan TEXT NOT NULL,
  attachment_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifikasi (
  id_notifikasi SERIAL PRIMARY KEY,
  receiver_email VARCHAR(100) NOT NULL,
  judul VARCHAR(100) NOT NULL,
  pesan TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_pengajuan_magang_nim ON pengajuan_magang(nim);
CREATE INDEX IF NOT EXISTS idx_pengajuan_magang_id_mitra ON pengajuan_magang(id_mitra);
CREATE INDEX IF NOT EXISTS idx_pengajuan_magang_nidn ON pengajuan_magang(nidn);
CREATE INDEX IF NOT EXISTS idx_pemetaan_cpl_mk_kode_mk ON pemetaan_cpl_mk(kode_mk);
CREATE INDEX IF NOT EXISTS idx_pemetaan_cpl_mk_id_cpl ON pemetaan_cpl_mk(id_cpl);
CREATE INDEX IF NOT EXISTS idx_item_konversi_mk_id_pengajuan ON item_konversi_mk(id_pengajuan);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON approval_tokens(token);

-- 7. PROPOSAL MAGANG (STEP 2) & REVIEW KAPRODI
CREATE TABLE IF NOT EXISTS proposal_magang (
  id_proposal SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  nim VARCHAR(20) REFERENCES mahasiswa(nim) ON DELETE CASCADE,
  nama_program_kegiatan VARCHAR(255) NOT NULL,
  nama_instansi VARCHAR(150),
  alamat_instansi TEXT,
  durasi_pelaksanaan VARCHAR(50),
  nama_pic VARCHAR(100),
  jabatan_pic VARCHAR(100),
  email_pic VARCHAR(100),
  no_hp_pic VARCHAR(50),
  program_diikuti VARCHAR(100) CHECK (program_diikuti IN ('Magang Berdampak', 'Studi Independen', 'Magang Mandiri', 'Studi Independen Mandiri')),
  no_hp_mahasiswa VARCHAR(50),
  alasan_mendaftar TEXT NOT NULL,
  deskripsi_kegiatan TEXT NOT NULL,
  keahlian_utama TEXT NOT NULL,
  file_cv VARCHAR(255),
  file_krs VARCHAR(255),
  file_transkrip VARCHAR(255),
  file_proposal_pdf VARCHAR(255),
  status_review VARCHAR(50) DEFAULT 'Review Proposal Prodi', -- Review Proposal Prodi, ACC Proposal, Revisi Proposal, Ditolak
  catatan_revisi TEXT,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proposal_magang_nim ON proposal_magang(nim);
CREATE INDEX IF NOT EXISTS idx_proposal_magang_id_pengajuan ON proposal_magang(id_pengajuan);
