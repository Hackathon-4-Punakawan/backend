-- Konversi Amikom database schema
-- PostgreSQL DDL based on WORKGLOW.md

-- 1. ENTITAS UTAMA (USERS)
CREATE TABLE IF NOT EXISTS mahasiswa (
  nim VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  prodi VARCHAR(50) NOT NULL,
  angkatan VARCHAR(10),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS dosen_pembimbing (
  nidn VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  bidang_keahlian VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS mitra_industri (
  id_mitra SERIAL PRIMARY KEY,
  nama_perusahaan VARCHAR(150) NOT NULL,
  kategori_industri VARCHAR(100),
  bidang_usaha VARCHAR(100),
  kontak_pic VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS admin_kaprodi (
  id_admin SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  jabatan VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

-- 2. PENGAJUAN & KONVERSI OBE
CREATE TABLE IF NOT EXISTS pengajuan_magang (
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

CREATE TABLE IF NOT EXISTS mata_kuliah (
  kode_mk VARCHAR(20) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  sks INT NOT NULL,
  semester INT
);

CREATE TABLE IF NOT EXISTS cpl_cpmk (
  id_cpl SERIAL PRIMARY KEY,
  kode_cpl VARCHAR(20) NOT NULL,
  kategori VARCHAR(50) NOT NULL,
  nama_kompetensi VARCHAR(150) NOT NULL,
  deskripsi TEXT,
  bobot_persen FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS pemetaan_cpl_mk (
  id_pemetaan SERIAL PRIMARY KEY,
  kode_mk VARCHAR(20) REFERENCES mata_kuliah(kode_mk),
  id_cpl INT REFERENCES cpl_cpmk(id_cpl)
);

CREATE TABLE IF NOT EXISTS item_konversi_mk (
  id_item_konversi SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  kode_mk VARCHAR(20) REFERENCES mata_kuliah(kode_mk),
  modul_industri VARCHAR(150),
  status_step VARCHAR(30) DEFAULT 'Diajukan',
  catatan_dosen TEXT,
  nilai_akhir_angka FLOAT,
  nilai_akhir_huruf VARCHAR(5),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. LOGBOOK & EVALUASI
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
  periode_evaluasi VARCHAR(30) NOT NULL,
  status_draf VARCHAR(20) DEFAULT 'Draf',
  skor_total FLOAT,
  tanggal_evaluasi TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detail_skor_cpl (
  id_detail SERIAL PRIMARY KEY,
  id_evaluasi INT REFERENCES evaluasi_mitra(id_evaluasi) ON DELETE CASCADE,
  id_cpl INT REFERENCES cpl_cpmk(id_cpl),
  skor FLOAT CHECK (skor >= 0 AND skor <= 100)
);

-- 4. CHAT REALTIME & NOTIFIKASI
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

-- Foreign key indexes for common joins and filtering.
CREATE INDEX IF NOT EXISTS idx_pengajuan_magang_nim ON pengajuan_magang(nim);
CREATE INDEX IF NOT EXISTS idx_pengajuan_magang_id_mitra ON pengajuan_magang(id_mitra);
CREATE INDEX IF NOT EXISTS idx_pengajuan_magang_nidn ON pengajuan_magang(nidn);
CREATE INDEX IF NOT EXISTS idx_pengajuan_magang_id_admin ON pengajuan_magang(id_admin);
CREATE INDEX IF NOT EXISTS idx_pemetaan_cpl_mk_kode_mk ON pemetaan_cpl_mk(kode_mk);
CREATE INDEX IF NOT EXISTS idx_pemetaan_cpl_mk_id_cpl ON pemetaan_cpl_mk(id_cpl);
CREATE INDEX IF NOT EXISTS idx_item_konversi_mk_id_pengajuan ON item_konversi_mk(id_pengajuan);
CREATE INDEX IF NOT EXISTS idx_item_konversi_mk_kode_mk ON item_konversi_mk(kode_mk);
CREATE INDEX IF NOT EXISTS idx_logbook_mingguan_id_pengajuan ON logbook_mingguan(id_pengajuan);
CREATE INDEX IF NOT EXISTS idx_dokumen_pendukung_id_pengajuan ON dokumen_pendukung(id_pengajuan);
CREATE INDEX IF NOT EXISTS idx_dokumen_pendukung_id_logbook ON dokumen_pendukung(id_logbook);
CREATE INDEX IF NOT EXISTS idx_evaluasi_mitra_id_pengajuan ON evaluasi_mitra(id_pengajuan);
CREATE INDEX IF NOT EXISTS idx_detail_skor_cpl_id_evaluasi ON detail_skor_cpl(id_evaluasi);
CREATE INDEX IF NOT EXISTS idx_detail_skor_cpl_id_cpl ON detail_skor_cpl(id_cpl);
CREATE INDEX IF NOT EXISTS idx_chat_room_nim_mahasiswa ON chat_room(nim_mahasiswa);
CREATE INDEX IF NOT EXISTS idx_chat_room_nidn_dosen ON chat_room(nidn_dosen);
CREATE INDEX IF NOT EXISTS idx_chat_room_id_pengajuan ON chat_room(id_pengajuan);
CREATE INDEX IF NOT EXISTS idx_chat_message_id_room ON chat_message(id_room);
CREATE INDEX IF NOT EXISTS idx_notifikasi_receiver_email ON notifikasi(receiver_email);
