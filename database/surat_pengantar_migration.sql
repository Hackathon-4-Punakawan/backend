-- PENYESUAIAN TABEL UNTUK STEP 3: PENGAJUAN SURAT PENGANTAR MAGANG FIK
CREATE TABLE IF NOT EXISTS surat_pengantar_magang (
  id_surat SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  id_proposal INT REFERENCES proposal_magang(id_proposal) ON DELETE CASCADE,
  nim VARCHAR(20) REFERENCES mahasiswa(nim) ON DELETE CASCADE,
  email_mahasiswa VARCHAR(100) NOT NULL,
  id_magang_fakultas VARCHAR(50) NOT NULL,
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  periode_magang VARCHAR(50),
  nama_instansi VARCHAR(150),
  alamat_instansi TEXT,
  tujuan_surat VARCHAR(150),
  status_surat VARCHAR(50) DEFAULT 'Diproses', -- Diproses, Disetujui, Diterbitkan, Ditolak
  surat_pengantar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_surat_pengantar_nim ON surat_pengantar_magang(nim);
CREATE INDEX IF NOT EXISTS idx_surat_pengantar_id_magang ON surat_pengantar_magang(id_magang_fakultas);
