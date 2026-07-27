-- SEEDER DATA UNTUK KONVERSI AMIKOM (OBE MAGANG)

-- 1. MAHASISWA
INSERT INTO mahasiswa (nim, nama, prodi, angkatan, email, foto_profile) VALUES
('21.11.4001', 'Budi Santoso', 'Informatika', '2021', 'budi.santoso@students.amikom.ac.id', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'),
('21.11.4002', 'Siti Rahmawati', 'Informatika', '2021', 'siti.rahma@students.amikom.ac.id', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'),
('21.11.4003', 'Ahmad Rizky', 'Informatika', '2021', 'ahmad.rizky@students.amikom.ac.id', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61')
ON CONFLICT (nim) DO NOTHING;

-- 2. DOSEN PEMBIMBING
INSERT INTO dosen_pembimbing (nidn, nama, bidang_keahlian, email, foto_profile, is_active) VALUES
('0512038901', 'Dr. Indah Susanti, M.Kom', 'Software Engineering & Web Dev', 'indah.susanti@amikom.ac.id', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2', TRUE),
('0515088502', 'Bambang Kurniawan, M.Eng', 'Artificial Intelligence & Data', 'bambang.k@amikom.ac.id', 'https://images.unsplash.com/photo-1560250097-0b93528c311a', TRUE)
ON CONFLICT (nidn) DO NOTHING;

-- 3. MITRA INDUSTRI
INSERT INTO mitra_industri (id_mitra, nama_perusahaan, kategori_industri, bidang_usaha, kontak_pic) VALUES
(1, 'PT GoTo Gojek Tokopedia Tbk', 'Technology & Unicorn', 'Software & Digital Services', 'hr.internship@goto.com'),
(2, 'PT Telkom Indonesia (Persero) Tbk', 'Telecommunication & Cloud', 'IT Solutions', 'internship@telkom.co.id'),
(3, 'PT Bank Central Asia Tbk (BCA)', 'Banking & Fintech', 'Financial Technology', 'recruitment@bca.co.id')
ON CONFLICT (id_mitra) DO NOTHING;

-- 4. ADMIN KAPRODI
INSERT INTO admin_kaprodi (id_admin, nama, jabatan, email) VALUES
(1, 'Dr. Amiruddin, M.T.', 'Ketua Program Studi S1 Informatika', 'kaprodi.if@amikom.ac.id')
ON CONFLICT (id_admin) DO NOTHING;

-- 5. MATA KULIAH
INSERT INTO mata_kuliah (kode_mk, nama_mk, sks, semester) VALUES
('IF101', 'Pemrograman Web Lanjut', 4, 5),
('IF102', 'Rekayasa Perangkat Lunak', 4, 5),
('IF103', 'Manajemen Proyek TI', 3, 6),
('IF104', 'Kecerdasan Buatan', 3, 6),
('IF105', 'Magang Industri / MBKM', 6, 7)
ON CONFLICT (kode_mk) DO NOTHING;

-- 6. CPL / CPMK (OBE COMPETENCY)
INSERT INTO cpl_cpmk (id_cpl, kode_cpl, kategori, nama_kompetensi, deskripsi, bobot_persen) VALUES
(1, 'CPL-01', 'Hard Skill', 'Pengembangan Perangkat Lunak Frontend & Backend', 'Mampu merancang dan mengimplementasikan aplikasi skala industri menggunakan framework modern', 30.0),
(2, 'CPL-02', 'Problem Solving', 'Analisis Sistem & Problem Solving', 'Mampu menganalisis masalah kompleks industri dan memberikan solusi teknis yang efisien', 25.0),
(3, 'CPL-03', 'Soft Skill', 'Kerja Sama Tim & Komunikasi Profesional', 'Mampu berkolaborasi dalam tim multidisiplin dan berkomunikasi efektif dengan stakeholder', 25.0),
(4, 'CPL-04', 'Soft Skill', 'Kedisiplinan & Etika Profesi', 'Mematuhi aturan kerja, jadwal, integritas, dan etika profesionalitas industri', 20.0)
ON CONFLICT (id_cpl) DO NOTHING;

-- 7. PEMETAAN CPL MK
INSERT INTO pemetaan_cpl_mk (id_pemetaan, kode_mk, id_cpl) VALUES
(1, 'IF101', 1),
(2, 'IF102', 1),
(3, 'IF102', 2),
(4, 'IF103', 3),
(5, 'IF103', 4),
(6, 'IF105', 1),
(7, 'IF105', 2),
(8, 'IF105', 3),
(9, 'IF105', 4)
ON CONFLICT (id_pemetaan) DO NOTHING;

-- 8. PENGAJUAN MAGANG
INSERT INTO pengajuan_magang (id_pengajuan, nim, id_mitra, nidn, id_admin, jenis_program, posisi, durasi_bulan, tanggal_mulai, tanggal_selesai, status_program) VALUES
(1, '21.11.4001', 1, '0512038901', 1, 'Magang Mandiri / MSIB', 'Fullstack Developer Intern', 6, '2026-02-01', '2026-07-31', 'Sedang Berjalan'),
(2, '21.11.4002', 2, '0515088502', 1, 'Studi Independen MSIB', 'Cloud & Backend Engineer Intern', 6, '2026-02-01', '2026-07-31', 'Sedang Berjalan')
ON CONFLICT (id_pengajuan) DO NOTHING;

-- 9. ITEM KONVERSI MK
INSERT INTO item_konversi_mk (id_item_konversi, id_pengajuan, kode_mk, modul_industri, status_step, catatan_dosen, nilai_akhir_angka, nilai_akhir_huruf) VALUES
(1, 1, 'IF101', 'Pengembangan React Next.js & Express REST API', 'Setuju Kaprodi', 'Modul industri memenuhi capaian CPL Pemrograman Web Lanjut.', 88.5, 'A'),
(2, 1, 'IF102', 'Arsitektur Software Microservices & Clean Code', 'Validasi Dosen', 'Logbook mingguan menunjukkan pengerjaan refactoring yang baik.', 85.0, 'A'),
(3, 1, 'IF105', 'Proyek Magang Software Engineering GoTo', 'Diajukan', 'Menunggu evaluasi akhir dari mentor industri.', NULL, NULL)
ON CONFLICT (id_item_konversi) DO NOTHING;

-- 10. LOGBOOK MINGGUAN
INSERT INTO logbook_mingguan (id_logbook, id_pengajuan, minggu_ke, periode_mulai, periode_selesai, total_jam, kompetensi_utama, aktivitas_utama, kendala_solusi, umpan_balik_mentor, status_verifikasi) VALUES
(1, 1, 1, '2026-02-01', '2026-02-07', 40, 'Onboarding & Git Workflow', 'Mengikuti onboarding tim engineering, setup environment, integrasi CI/CD.', 'Memahami arsitektur monorepo internal. Solusi: Membaca dokumentasi repositori.', 'Budi sangat cepat beradaptasi dengan teknologi internal.', 'Disetujui'),
(2, 1, 2, '2026-02-08', '2026-02-14', 40, 'Backend API Development', 'Membuat REST API authentication & integrasi Supabase PostgreSQL.', 'Menyesuaikan RLS policy. Solusi: Diskusi bersama lead developer.', 'Penggunaan Async/Await dan error handling sudah baik.', 'Disetujui')
ON CONFLICT (id_logbook) DO NOTHING;

-- 11. DOKUMEN PENDUKUNG
INSERT INTO dokumen_pendukung (id_dokumen, id_pengajuan, id_logbook, jenis_dokumen, file_path) VALUES
(1, 1, 1, 'Laporan Mingguan 1', 'https://res.cloudinary.com/demo/image/upload/v1/logbook_m1.pdf'),
(2, 1, 2, 'Laporan Mingguan 2', 'https://res.cloudinary.com/demo/image/upload/v1/logbook_m2.pdf')
ON CONFLICT (id_dokumen) DO NOTHING;

-- 12. EVALUASI MITRA
INSERT INTO evaluasi_mitra (id_evaluasi, id_pengajuan, periode_evaluasi, status_draf, skor_total) VALUES
(1, 1, 'Mid-term', 'Kirim', 88.0)
ON CONFLICT (id_evaluasi) DO NOTHING;

-- 13. DETAIL SKOR CPL
INSERT INTO detail_skor_cpl (id_detail, id_evaluasi, id_cpl, skor) VALUES
(1, 1, 1, 90.0),
(2, 1, 2, 85.0),
(3, 1, 3, 88.0),
(4, 1, 4, 92.0)
ON CONFLICT (id_detail) DO NOTHING;

-- 14. CHAT ROOM & MESSAGES
INSERT INTO chat_room (id_room, nim_mahasiswa, nidn_dosen, id_pengajuan, jenis_room) VALUES
(1, '21.11.4001', '0512038901', 1, 'konsultasi_dosen')
ON CONFLICT (id_room) DO NOTHING;

INSERT INTO chat_message (id_message, id_room, sender_email, sender_role, pesan, attachment_url, is_read) VALUES
(1, 1, 'budi.santoso@students.amikom.ac.id', 'Mahasiswa', 'Selamat pagi Bu Indah, saya sudah mengunggah logbook minggu ke-2 dan draf modul konversi IF101.', NULL, TRUE),
(2, 1, 'indah.susanti@amikom.ac.id', 'Dosen', 'Selamat pagi Budi, baik sudah saya periksa dan verifikasi. Tinggal menunggu evaluasi mid-term dari mentor GoTo ya.', NULL, FALSE)
ON CONFLICT (id_message) DO NOTHING;

-- 15. NOTIFIKASI
INSERT INTO notifikasi (id_notifikasi, receiver_email, judul, pesan, is_read) VALUES
(1, 'budi.santoso@students.amikom.ac.id', 'Logbook Disetujui', 'Logbook minggu ke-2 Anda telah diverifikasi oleh Dosen Pembimbing.', FALSE),
(2, 'indah.susanti@amikom.ac.id', 'Pengajuan Konversi Baru', 'Mahasiswa Budi Santoso mengajukan konversi MK IF101 Pemrograman Web Lanjut.', TRUE)
ON CONFLICT (id_notifikasi) DO NOTHING;
