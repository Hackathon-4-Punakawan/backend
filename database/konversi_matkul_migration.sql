-- Migration: Step 5 - Konversi SKS Mata Kuliah (Manual & Rekomendasi AI)
CREATE TABLE IF NOT EXISTS mata_kuliah_catalog (
  kode_mk VARCHAR(20) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  sks INT NOT NULL DEFAULT 4,
  semester INT DEFAULT 6,
  cpmk TEXT NOT NULL,
  default_objective TEXT
);

CREATE TABLE IF NOT EXISTS pengajuan_konversi_matkul (
  id_konversi SERIAL PRIMARY KEY,
  nim VARCHAR(20) NOT NULL REFERENCES mahasiswa(nim) ON DELETE CASCADE,
  mode_input VARCHAR(30) DEFAULT 'MANUAL', -- 'MANUAL' atau 'AI_RECOMMENDATION'
  total_sks INT NOT NULL DEFAULT 0,
  status_konversi VARCHAR(50) DEFAULT 'Menunggu Review DPL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS item_konversi_detail (
  id_item SERIAL PRIMARY KEY,
  id_konversi INT REFERENCES pengajuan_konversi_matkul(id_konversi) ON DELETE CASCADE,
  nim VARCHAR(20) NOT NULL,
  kode_mk VARCHAR(20) NOT NULL,
  nama_mk VARCHAR(150) NOT NULL,
  sks INT NOT NULL,
  cpmk TEXT NOT NULL,
  objective TEXT NOT NULL,
  durasi VARCHAR(50) DEFAULT '6 Bulan',
  nilai_angka FLOAT,
  nilai_huruf VARCHAR(5),
  status_item VARCHAR(50) DEFAULT 'Menunggu Persetujuan DPL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Master Mata Kuliah Catalog (Informatika)
INSERT INTO mata_kuliah_catalog (kode_mk, nama_mk, sks, semester, cpmk, default_objective)
VALUES 
  ('ST084', 'Pemrograman Web', 4, 6, 'CPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital\nCPMK18-Mahasiswa mampu menganalisis kebutuhan industri atau masyarakat', 'Memulai Dasar Pemrograman Web. 1. Meneliti, merancang, dan membangun web app responsif.'),
  ('ST116', 'Pemrograman Basis Data', 4, 6, 'CPMK15-Mahasiswa mampu menganalisis perangkat lunak pada berbagai platform digital\nCPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital', 'Belajar Fundamen Database. 1. Menerapkan Microservices, SQL query, dan database optimization.'),
  ('ST091', 'Analisis dan Desain Sistem Informasi', 4, 6, 'CPMK11-Mahasiswa mampu menghasilkan produk ekonomi kreatif digital dalam bidang informatika\nCPMK18-Mahasiswa mampu menganalisis kebutuhan industri atau masyarakat', 'Memulai Dasar Perancangan Sistem. 1. Meneliti, menganalisis sistem, UML diagram, dan proses bisnis.'),
  ('ST055', 'Arsitektur REST API & Cloud Computing', 4, 6, 'CPMK12-Mahasiswa mampu membangun API microservices dan cloud infrastructure', 'Membangun REST API scalable, backend Node.js, dan deployment cloud server.'),
  ('ST060', 'Etika Profesi & Manajemen Proyek TI', 4, 6, 'CPMK09-Mahasiswa mampu berkomunikasi dan bekerja sama secara profesional dalam tim', 'Manajemen proyek software berbasis Agile/Scrum dan komunikasi tim industri.')
ON CONFLICT (kode_mk) DO UPDATE SET 
  nama_mk = EXCLUDED.nama_mk,
  sks = EXCLUDED.sks,
  cpmk = EXCLUDED.cpmk,
  default_objective = EXCLUDED.default_objective;
