-- PENYESUAIAN TABEL UNTUK STEP 2: PROPOSAL MAGANG & REVIEW KAPRODI
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
