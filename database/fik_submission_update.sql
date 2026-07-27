-- PENYESUAIAN TABEL pengajuan_magang UNTUK PENGAJUAN SURAT FAKULTAS (FIK)
ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS status_surat_fakultas VARCHAR(50) DEFAULT 'Diproses Fakultas';
ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS nomor_layanan_fik VARCHAR(100);
ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS tujuan_surat VARCHAR(150);
