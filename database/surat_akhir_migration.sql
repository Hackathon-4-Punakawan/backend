-- MIGRATION SCRIPT FOR SURAT AKHIR & UCAPAN TERIMA KASIH MAGANG FIK
CREATE TABLE IF NOT EXISTS surat_akhir_magang (
  id_surat_akhir SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  nim VARCHAR(30) NOT NULL,
  email VARCHAR(255) NOT NULL,
  id_magang_fakultas VARCHAR(50),
  tanggal_mulai_magang VARCHAR(50),
  tanggal_berakhir_magang VARCHAR(50),
  periode_magang VARCHAR(50),
  status_surat VARCHAR(30) DEFAULT 'Disetujui',
  surat_terima_kasih_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
