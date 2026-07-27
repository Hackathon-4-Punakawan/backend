-- SEEDER DATA DUMMY HACKATHON KONVERSI AMIKOM (OBE MAGANG MULTI-DPL)

-- 1. MAHASISWA (10 MAHASISWA DENGAN DPL BERBEDA-BEDA)
INSERT INTO mahasiswa (nim, nama, prodi, angkatan, email, foto_profile) VALUES
('21.11.4001', 'Budi Santoso', 'Informatika', '2021', 'budi.santoso@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Budi+Santoso&background=4f46e5&color=fff&bold=true'),
('21.11.4002', 'Siti Rahmawati', 'Informatika', '2021', 'siti.rahma@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Siti+Rahmawati&background=4f46e5&color=fff&bold=true'),
('21.11.4003', 'Ahmad Rizky', 'Informatika', '2021', 'ahmad.rizky@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Ahmad+Rizky&background=4f46e5&color=fff&bold=true'),
('21.11.4004', 'Dewa Pratama', 'Informatika', '2021', 'dewa.pratama@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Dewa+Pratama&background=4f46e5&color=fff&bold=true'),
('21.11.4005', 'Nabila Putri', 'Informatika', '2021', 'nabila.putri@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Nabila+Putri&background=4f46e5&color=fff&bold=true'),
('21.11.4006', 'Ramadhan Supriadi', 'Informatika', '2021', 'ramadhan.s@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Ramadhan+Supriadi&background=4f46e5&color=fff&bold=true'),
('21.11.4007', 'Fadhil Azhar', 'Informatika', '2021', 'fadhil.azhar@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Fadhil+Azhar&background=4f46e5&color=fff&bold=true'),
('21.11.4008', 'Clarissa Anindya', 'Informatika', '2021', 'clarissa.a@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Clarissa+Anindya&background=4f46e5&color=fff&bold=true'),
('21.11.4009', 'Muhammad Farhan', 'Informatika', '2021', 'm.farhan@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Muhammad+Farhan&background=4f46e5&color=fff&bold=true'),
('21.11.4010', 'Stephanie Vania', 'Informatika', '2021', 'stephanie.v@students.amikom.ac.id', 'https://ui-avatars.com/api/?name=Stephanie+Vania&background=4f46e5&color=fff&bold=true')
ON CONFLICT (nim) DO UPDATE SET 
  nama = EXCLUDED.nama,
  email = EXCLUDED.email;

-- 2. DOSEN PEMBIMBING LAPANGAN (5 DPL DENGAN NIDN BERBEDA)
INSERT INTO dosen_pembimbing (nidn, nama, bidang_keahlian, email, foto_profile, is_active) VALUES
('0512038901', 'Dr. Indah Susanti, M.Kom', 'Software Engineering & Web Dev', 'indah.susanti@amikom.ac.id', 'https://ui-avatars.com/api/?name=Indah+Susanti&background=0284c7&color=fff&bold=true', TRUE),
('0515088502', 'Bambang Kurniawan, M.Eng', 'Artificial Intelligence & Data Science', 'bambang.k@amikom.ac.id', 'https://ui-avatars.com/api/?name=Bambang+Kurniawan&background=0284c7&color=fff&bold=true', TRUE),
('0509077801', 'Dr. Kusrini, M.Kom.', 'Business Intelligence & Data Mining', 'kusrini@amikom.ac.id', 'https://ui-avatars.com/api/?name=Kusrini&background=0284c7&color=fff&bold=true', TRUE),
('0522108201', 'Andi Sunyoto, M.Kom.', 'Cloud Infrastructure & Computer Network', 'andi.sunyoto@amikom.ac.id', 'https://ui-avatars.com/api/?name=Andi+Sunyoto&background=0284c7&color=fff&bold=true', TRUE),
('0518048601', 'Dharmawan, M.T.', 'Mobile Programming & Cyber Security', 'dharmawan@amikom.ac.id', 'https://ui-avatars.com/api/?name=Dharmawan&background=0284c7&color=fff&bold=true', TRUE)
ON CONFLICT (nidn) DO UPDATE SET 
  nama = EXCLUDED.nama,
  email = EXCLUDED.email;

-- 3. MITRA INDUSTRI
INSERT INTO mitra_industri (id_mitra, nama_perusahaan, kategori_industri, bidang_usaha, kontak_pic) VALUES
(1, 'PT GoTo Gojek Tokopedia Tbk', 'Technology & Unicorn', 'Software & Digital Services', 'hr.internship@goto.com'),
(2, 'PT Telkom Indonesia (Persero) Tbk', 'Telecommunication & Cloud', 'IT Solutions', 'internship@telkom.co.id'),
(3, 'PT Bank Central Asia Tbk (BCA)', 'Banking & Fintech', 'Financial Technology', 'recruitment@bca.co.id'),
(4, 'PT Tokopedia', 'E-Commerce & Tech', 'Digital Marketplace', 'careers@tokopedia.com'),
(5, 'PT Shopee International Indonesia', 'E-Commerce & Tech', 'Digital Marketplace', 'internship@shopee.co.id'),
(6, 'PT Nodeflux Teknologi Indonesia', 'AI & Computer Vision', 'Artificial Intelligence', 'hr@nodeflux.io'),
(7, 'PT Traveloka Indonesia', 'Travel & Lifestyle Tech', 'Online Travel Platform', 'careers@traveloka.com'),
(8, 'PT Biznet Networks', 'Telecommunication & ISP', 'Internet Provider', 'careers@biznetnetworks.com'),
(9, 'PT Global Digital Niaga (Blibli)', 'E-Commerce & Tech', 'Digital Retail', 'intern@blibli.com')
ON CONFLICT (id_mitra) DO UPDATE SET 
  nama_perusahaan = EXCLUDED.nama_perusahaan;

-- 4. ADMIN KAPRODI
INSERT INTO admin_kaprodi (id_admin, nama, jabatan, email) VALUES
(1, 'Dr. Amiruddin, M.T.', 'Ketua Program Studi S1 Informatika', 'kaprodi.if@amikom.ac.id')
ON CONFLICT (id_admin) DO NOTHING;

-- 5. PENGAJUAN MAGANG (STEP 1 & LINKING TO DPL)
INSERT INTO pengajuan_magang (id_pengajuan, nim, id_mitra, nidn, id_admin, nama_instansi, nama_supervisor_mitra, email_supervisor_mitra, jenis_program, posisi, durasi_bulan, tanggal_mulai, tanggal_selesai, status_pengajuan, status_program, nomor_layanan_fik, semester) VALUES
(1, '21.11.4001', 1, '0512038901', 1, 'PT GoTo Gojek Tokopedia Tbk', 'Rian Hidayat (Lead Eng GoTo)', 'rian.hidayat@goto.com', 'Magang Mandiri / MSIB', 'Fullstack Developer Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199373', 6),
(2, '21.11.4002', 2, '0515088502', 1, 'PT Telkom Indonesia (Persero) Tbk', 'Dedi Suhendra (Manager Cloud)', 'dedi.s@telkom.co.id', 'Studi Independen MSIB', 'Cloud Engineer Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199374', 6),
(3, '21.11.4003', 3, '0509077801', 1, 'PT Bank Central Asia Tbk (BCA)', 'Budi Pratama (Lead Data BCA)', 'budi.p@bca.co.id', 'Magang Mandiri MSIB', 'Data Analyst Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199375', 6),
(4, '21.11.4004', 4, '0522108201', 1, 'PT Tokopedia', 'Hendra Wijaya (DevOps Lead)', 'hendra@tokopedia.com', 'Magang Mandiri', 'DevOps Engineer Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199376', 6),
(5, '21.11.4005', 5, '0518048601', 1, 'PT Shopee International Indonesia', 'Citra Kirana (Mobile Lead)', 'citra@shopee.co.id', 'Magang MSIB', 'Mobile Developer Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199377', 6),
(6, '21.11.4006', 1, '0512038901', 1, 'PT Amikom Tech Digital', 'Agus Setiawan (Manager)', 'agus@amikomtech.com', 'Magang Mandiri', 'Fullstack Web Developer Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199378', 6),
(7, '21.11.4007', 6, '0515088502', 1, 'PT Nodeflux Teknologi Indonesia', 'Fajar Ramadhan (AI Lead)', 'fajar@nodeflux.io', 'Magang MSIB', 'AI & Computer Vision Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199379', 6),
(8, '21.11.4008', 7, '0509077801', 1, 'PT Traveloka Indonesia', 'Diana Rose (Data Lead)', 'diana@traveloka.com', 'Magang MSIB', 'Product Data Scientist Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199380', 6),
(9, '21.11.4009', 8, '0522108201', 1, 'PT Biznet Networks', 'Eko Prasetyo (Sec Ops)', 'eko@biznetnetworks.com', 'Magang Mandiri', 'Cyber Security & Network Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199381', 6),
(10, '21.11.4010', 9, '0518048601', 1, 'PT Global Digital Niaga (Blibli)', 'Rina Astuti (iOS Lead)', 'rina@blibli.com', 'Magang MSIB', 'iOS Developer Intern', 6, '2026-02-01', '2026-07-31', 'Disetujui', 'Sedang Berjalan', 'FIK6199382', 6)
ON CONFLICT (id_pengajuan) DO UPDATE SET 
  posisi = EXCLUDED.posisi,
  nidn = EXCLUDED.nidn;

-- 6. PENGAJUAN DOSEN PEMBIMBING (STEP 4)
INSERT INTO pengajuan_dpl (id_pengajuan_dpl, nim, email_mahasiswa, nama_mahasiswa, id_magang_fakultas, sks_ditempuh, bukti_diterima_magang, file_khs, status_pengajuan, nidn_dpl, nama_dpl, sk_dpl_url) VALUES
(1, '21.11.4001', 'budi.santoso@students.amikom.ac.id', 'Budi Santoso', 'FIK6199373', 110, 'https://drive.google.com/bukti_goto.pdf', 'https://drive.google.com/khs_budi.pdf', 'Disetujui', '0512038901', 'Dr. Indah Susanti, M.Kom', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4001.pdf'),
(2, '21.11.4002', 'siti.rahma@students.amikom.ac.id', 'Siti Rahmawati', 'FIK6199374', 112, 'https://drive.google.com/bukti_telkom.pdf', 'https://drive.google.com/khs_siti.pdf', 'Disetujui', '0515088502', 'Bambang Kurniawan, M.Eng', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4002.pdf'),
(3, '21.11.4003', 'ahmad.rizky@students.amikom.ac.id', 'Ahmad Rizky', 'FIK6199375', 108, 'https://drive.google.com/bukti_bca.pdf', 'https://drive.google.com/khs_rizky.pdf', 'Disetujui', '0509077801', 'Dr. Kusrini, M.Kom.', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4003.pdf'),
(4, '21.11.4004', 'dewa.pratama@students.amikom.ac.id', 'Dewa Pratama', 'FIK6199376', 115, 'https://drive.google.com/bukti_tokopedia.pdf', 'https://drive.google.com/khs_dewa.pdf', 'Disetujui', '0522108201', 'Andi Sunyoto, M.Kom.', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4004.pdf'),
(5, '21.11.4005', 'nabila.putri@students.amikom.ac.id', 'Nabila Putri', 'FIK6199377', 106, 'https://drive.google.com/bukti_shopee.pdf', 'https://drive.google.com/khs_nabila.pdf', 'Disetujui', '0518048601', 'Dharmawan, M.T.', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4005.pdf'),
(6, '21.11.4006', 'ramadhan.s@students.amikom.ac.id', 'Ramadhan Supriadi', 'FIK6199378', 110, 'https://drive.google.com/bukti_amikom.pdf', 'https://drive.google.com/khs_ramadhan.pdf', 'Disetujui', '0512038901', 'Dr. Indah Susanti, M.Kom', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4006.pdf'),
(7, '21.11.4007', 'fadhil.azhar@students.amikom.ac.id', 'Fadhil Azhar', 'FIK6199379', 114, 'https://drive.google.com/bukti_nodeflux.pdf', 'https://drive.google.com/khs_fadhil.pdf', 'Disetujui', '0515088502', 'Bambang Kurniawan, M.Eng', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4007.pdf'),
(8, '21.11.4008', 'clarissa.a@students.amikom.ac.id', 'Clarissa Anindya', 'FIK6199380', 112, 'https://drive.google.com/bukti_traveloka.pdf', 'https://drive.google.com/khs_clarissa.pdf', 'Disetujui', '0509077801', 'Dr. Kusrini, M.Kom.', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4008.pdf'),
(9, '21.11.4009', 'm.farhan@students.amikom.ac.id', 'Muhammad Farhan', 'FIK6199381', 118, 'https://drive.google.com/bukti_biznet.pdf', 'https://drive.google.com/khs_farhan.pdf', 'Disetujui', '0522108201', 'Andi Sunyoto, M.Kom.', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4009.pdf'),
(10, '21.11.4010', 'stephanie.v@students.amikom.ac.id', 'Stephanie Vania', 'FIK6199382', 110, 'https://drive.google.com/bukti_blibli.pdf', 'https://drive.google.com/khs_stephanie.pdf', 'Disetujui', '0518048601', 'Dharmawan, M.T.', 'https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4010.pdf')
ON CONFLICT (id_pengajuan_dpl) DO UPDATE SET 
  nidn_dpl = EXCLUDED.nidn_dpl,
  nama_dpl = EXCLUDED.nama_dpl;

-- 7. PENGAJUAN KONVERSI MATA KULIAH HEADER (STEP 5)
INSERT INTO pengajuan_konversi_matkul (id_konversi, nim, mode_input, total_sks, status_konversi) VALUES
(1, '21.11.4001', 'AI_RECOMMENDATION', 20, 'Disetujui DPL'),
(2, '21.11.4002', 'AI_RECOMMENDATION', 20, 'Menunggu Review DPL'),
(3, '21.11.4003', 'MANUAL', 20, 'Revisi DPL'),
(4, '21.11.4004', 'AI_RECOMMENDATION', 20, 'Disetujui DPL'),
(5, '21.11.4005', 'AI_RECOMMENDATION', 20, 'Menunggu Review DPL'),
(6, '21.11.4006', 'MANUAL', 20, 'Menunggu Review DPL'),
(7, '21.11.4007', 'AI_RECOMMENDATION', 20, 'Disetujui DPL'),
(8, '21.11.4008', 'AI_RECOMMENDATION', 20, 'Revisi DPL'),
(9, '21.11.4009', 'MANUAL', 20, 'Menunggu Review DPL'),
(10, '21.11.4010', 'AI_RECOMMENDATION', 20, 'Disetujui DPL')
ON CONFLICT (id_konversi) DO UPDATE SET 
  status_konversi = EXCLUDED.status_konversi;

-- 8. ITEM DETAIL KONVERSI MATA KULIAH PER MAHASISWA
-- Budi Santoso (21.11.4001) - Disetujui DPL (Dr. Indah Susanti, M.Kom)
INSERT INTO item_konversi_detail (id_item, id_konversi, nim, kode_mk, nama_mk, sks, cpmk, objective, status_item, catatan_dosen, nilai_angka, nilai_huruf) VALUES
(1, 1, '21.11.4001', 'ST084', 'Pemrograman Web', 4, 'CPMK16-Mahasiswa mampu merancang web app responsif', 'Merancang & mendeploy dashboard React.js responsif.', 'Disetujui DPL', 'Sangat baik, arsitektur frontend rapi.', 90, 'A'),
(2, 1, '21.11.4001', 'ST116', 'Pemrograman Basis Data', 4, 'CPMK15-Mahasiswa mampu mengoptimalkan database relasional', 'Mengoptimalkan query PostgreSQL & RLS Policy.', 'Disetujui DPL', 'Query optimization & indexing sangat bagus.', 88, 'A'),
(3, 1, '21.11.4001', 'ST091', 'Analisis dan Desain Sistem Informasi', 4, 'CPMK11-Mahasiswa mampu merancang UML & analisis sistem', 'Menyusun dokumentasi arsitektur sistem & Sequence Diagram.', 'Disetujui DPL', 'Dokumentasi sangat lengkap.', 85, 'A'),
(4, 1, '21.11.4001', 'ST055', 'Arsitektur REST API & Cloud Computing', 4, 'CPMK12-Mahasiswa mampu membangun REST API microservices', 'Membangun REST API Express.js & deployment cloud.', 'Disetujui DPL', 'Microservices scalable.', 92, 'A'),
(5, 1, '21.11.4001', 'ST170', 'Rekayasa Perangkat Lunak', 4, 'CPMK-Mahasiswa mampu menerapkan Clean Architecture', 'Menerapkan TDD, automated testing, dan CI/CD pipeline.', 'Disetujui DPL', 'CI/CD pipeline berjalan tanpa hambatan.', 90, 'A'),

-- Siti Rahmawati (21.11.4002) - Menunggu Review DPL (Bambang Kurniawan, M.Eng)
(6, 2, '21.11.4002', 'ST055', 'Arsitektur REST API & Cloud Computing', 4, 'CPMK12-Mahasiswa mampu membangun infrastruktur cloud', 'Mengelola Kubernetes cluster & Terraform di Telkom Cloud.', 'Menunggu Persetujuan DPL', NULL, NULL, NULL),
(7, 2, '21.11.4002', 'ST143', 'Perancangan Jaringan', 4, 'CPMK-Mahasiswa mampu merancang arsitektur jaringan', 'Konfigurasi VLAN & Border Gateway Protocol.', 'Menunggu Persetujuan DPL', NULL, NULL, NULL),
(8, 2, '21.11.4002', 'ST132', 'Infrastruktur Web & Internet', 2, 'CPMK-Mahasiswa mampu mengamankan server web', 'Setup Nginx Reverse Proxy & SSL Certificate.', 'Menunggu Persetujuan DPL', NULL, NULL, NULL),
(9, 2, '21.11.4002', 'ST154', 'Internet of Things', 2, 'CPMK-Mahasiswa mampu mengintegrasikan sensor & IoT Gateway', 'Integrasi MQTT Broker untuk monitoring telemetry cloud.', 'Menunggu Persetujuan DPL', NULL, NULL, NULL),
(10, 2, '21.11.4002', 'ST170', 'Rekayasa Perangkat Lunak', 4, 'CPMK-Mahasiswa mampu menerapkan software engineering', 'Monitoring log server berbasis Prometheus & Grafana.', 'Menunggu Persetujuan DPL', NULL, NULL, NULL),

-- Ahmad Rizky (21.11.4003) - Revisi DPL (Dr. Kusrini, M.Kom.)
(11, 3, '21.11.4003', 'ST153', 'Big Data & Predictive Analytics', 2, 'CPMK-Mahasiswa mampu menganalisis data besar', 'Membangun pipeline data Spark untuk transaksi BCA.', 'Revisi DPL', 'Harap perjelas volume data dan algoritma predictive analytics yang digunakan pada BCA.', NULL, NULL),
(12, 3, '21.11.4003', 'ST167', 'Proyek Data Mining', 4, 'CPMK-Mahasiswa mampu menerapkan pemodelan data mining', 'Pemodelan credit scoring dengan XGBoost.', 'Disetujui DPL', 'Model credit scoring sudah baik.', 85, 'A'),
(13, 3, '21.11.4003', 'ST168', 'Big Data & Data Mining', 4, 'CPMK-Mahasiswa mampu mengolah data pergudangan', 'Data Warehousing & ETL pipeline di Postgres Data Mart.', 'Revisi DPL', 'Lampirkan skema ERD data warehouse.', NULL, NULL),
(14, 3, '21.11.4003', 'ST116', 'Pemrograman Basis Data', 4, 'CPMK15-Mahasiswa mampu mengoptimalkan query database', 'Menulis Stored Procedure & Trigger transaksi bank.', 'Disetujui DPL', 'Stored procedure sesuai syarat ACID.', 88, 'A'),
(15, 3, '21.11.4003', 'ST087', 'Manajemen Sumber Daya IT', 2, 'CPMK-Mahasiswa mampu mengelola aset data', 'Pengelolaan tata kelola data (Data Governance).', 'Disetujui DPL', 'Good governance.', 80, 'A-'),

-- Dewa Pratama (21.11.4004) - Disetujui DPL (Andi Sunyoto, M.Kom.)
(16, 4, '21.11.4004', 'ST055', 'Arsitektur REST API & Cloud Computing', 4, 'CPMK12-Mahasiswa mampu membangun infrastruktur cloud', 'Otomatisasi deployment microservices menggunakan Docker & Helm.', 'Disetujui DPL', 'Sangat rapi.', 91, 'A'),
(17, 4, '21.11.4004', 'ST143', 'Perancangan Jaringan', 4, 'CPMK-Mahasiswa mampu merancang jaringan high availability', 'Setup Load Balancer & AWS Route53 failover.', 'Disetujui DPL', 'Konfigurasi HA bekerja prima.', 89, 'A'),

-- Nabila Putri (21.11.4005) - Menunggu Review DPL (Dharmawan, M.T.)
(18, 5, '21.11.4005', 'ST084', 'Pemrograman Web', 4, 'CPMK16-Mahasiswa mampu merancang mobile web app', 'Mengembangkan aplikasi Shopee React Native & Flutter.', 'Menunggu Persetujuan DPL', NULL, NULL, NULL),

-- Ramadhan Supriadi (21.11.4006) - Menunggu Review DPL (Dr. Indah Susanti, M.Kom)
(19, 6, '21.11.4006', 'ST084', 'Pemrograman Web', 4, 'CPMK16-Mahasiswa mampu merancang web app responsif', 'Pengembangan portal admin Amikom Tech berbasis Next.js.', 'Menunggu Persetujuan DPL', NULL, NULL, NULL),

-- Fadhil Azhar (21.11.4007) - Disetujui DPL (Bambang Kurniawan, M.Eng)
(20, 7, '21.11.4007', 'ST164', 'Kecerdasan Buatan Lanjut', 2, 'CPMK-Mahasiswa mampu menerapkan Deep Learning', 'Inference model Object Detection YOLOv8 pada edge device.', 'Disetujui DPL', 'Optimasi model sangat responsif.', 94, 'A')

ON CONFLICT (id_item) DO UPDATE SET 
  status_item = EXCLUDED.status_item,
  catatan_dosen = EXCLUDED.catatan_dosen;
