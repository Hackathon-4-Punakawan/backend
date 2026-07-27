-- Migration: Step 4 - Pengajuan Dosen Pembimbing Magang (DPL)
CREATE TABLE IF NOT EXISTS pengajuan_dpl (
  id_pengajuan_dpl SERIAL PRIMARY KEY,
  nim VARCHAR(20) NOT NULL REFERENCES mahasiswa(nim) ON DELETE CASCADE,
  email_mahasiswa VARCHAR(255) NOT NULL,
  nama_mahasiswa VARCHAR(255) NOT NULL,
  id_magang_fakultas VARCHAR(50) NOT NULL,
  sks_ditempuh INT NOT NULL,
  bukti_diterima_magang TEXT NOT NULL,
  file_khs TEXT NOT NULL,
  status_pengajuan VARCHAR(50) DEFAULT 'Diproses Fakultas',
  nidn_dpl VARCHAR(20) REFERENCES dosen(nidn) ON DELETE SET NULL,
  nama_dpl VARCHAR(255),
  sk_dpl_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pengajuan_dpl_nim ON pengajuan_dpl(nim);
