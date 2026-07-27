-- SEEDER DATA DUMMY HACKATHON KONVERSI AMIKOM (OBE MAGANG)

-- 1. MAHASISWA
INSERT INTO mahasiswa (nim, nama, prodi, angkatan, email, foto_profile) VALUES
('21.11.4001', 'Budi Santoso', 'Informatika', '2021', 'budi.santoso@students.amikom.ac.id', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde'),
('21.11.4002', 'Siti Rahmawati', 'Informatika', '2021', 'siti.rahma@students.amikom.ac.id', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330'),
('21.11.4003', 'Ahmad Rizky', 'Informatika', '2021', 'ahmad.rizky@students.amikom.ac.id', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61')
ON CONFLICT (nim) DO NOTHING;

-- 2. DOSEN PEMBIMBING LAPANGAN (DPL)
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

-- 5. MATA KULIAH RESMI INFORMATIKA AMIKOM (DATA HACKATHON)
INSERT INTO mata_kuliah (kode_mk, nama_mk, sks, semester) VALUES
('ST044', 'Metode Numerik', 4, 4),
('ST050', 'Manajemen Strategik', 2, 5),
('ST087', 'Manajemen Sumber Daya IT', 2, 5),
('ST108', 'E-Commerce', 2, 5),
('ST116', 'Pemrograman Basis Data', 4, 5),
('ST120', 'Bahasa Indonesia', 2, 1),
('ST132', 'Infrastruktur Web & Internet', 2, 5),
('ST143', 'Perancangan Jaringan', 4, 6),
('ST150', 'Kepemimpinan', 2, 6),
('ST153', 'Big Data & Predictive Analytics', 2, 6),
('ST154', 'Internet of Things', 2, 6),
('ST155', 'Digital Business', 2, 6),
('ST163', 'Inovasi Pembayaran Digital', 2, 6),
('ST164', 'Kecerdasan Buatan Lanjut', 2, 6),
('ST165', 'Proyek Pemrograman', 4, 7),
('ST166', 'Proyek Game', 4, 7),
('ST167', 'Proyek Data Mining', 4, 7),
('ST168', 'Big Data & Data Mining', 4, 7),
('ST170', 'Rekayasa Perangkat Lunak', 4, 5),
('ST173', 'Media Interaktif', 4, 6),
('ST175', 'Komunikasi dan Negosiasi', 2, 6),
('ST178', 'Mixed Reality', 4, 7)
ON CONFLICT (kode_mk) DO NOTHING;

-- 6. CAPAIAN PEMBELAJARAN MATA KULIAH (CPMK AMIKOM HACKATHON)
INSERT INTO cpl_cpmk (id_cpl, kode_cpl, kategori, nama_kompetensi, deskripsi, bobot_persen) VALUES
(1, 'CPMK-ST165-1', 'Hard Skill', 'Menyampaikan pandangan/gagasan kritis & profesional dalam menyelesaikan masalah industri', 'Disampaikan melalui presentasi lisan maupun laporan tertulis', 25.0),
(2, 'CPMK-ST165-2', 'Hard Skill', 'Menghasilkan produk ekonomi kreatif digital di bidang informatika', 'Pengembangan software skala industri', 30.0),
(3, 'CPMK-ST165-3', 'Hard Skill', 'Merancang perangkat lunak pada berbagai platform digital', 'Frontend, Backend, & Mobile app', 25.0),
(4, 'CPMK-ST165-4', 'Problem Solving', 'Menganalisis platform yang sesuai dengan kebutuhan industri atau masyarakat', 'Solusi arsitektur cloud & database', 20.0),
(5, 'CPMK-ST170-1', 'Soft Skill', 'Mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan', 'Komunikasi dengan tim & mentor', 25.0),
(6, 'CPMK-ST170-2', 'Hard Skill', 'Menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah industri', 'Penerapan clean architecture & REST API', 25.0),
(7, 'CPMK-ST155-1', 'Soft Skill', 'Mengimplementasikan profesionalisme dalam menyesuaikan diri dengan berbagai kegiatan', 'Kedisiplinan & adaptabilitas magang', 25.0),
(8, 'CPMK-ST175-1', 'Soft Skill', 'Membangun integritas dengan menjalin kerja sama dalam tim untuk menyelesaikan tugas', 'Kolaborasi antar divisi magang', 25.0)
ON CONFLICT (id_cpl) DO NOTHING;

-- 7. PEMETAAN CPMK -> MATA KULIAH
INSERT INTO pemetaan_cpl_mk (id_pemetaan, kode_mk, id_cpl) VALUES
(1, 'ST165', 1),
(2, 'ST165', 2),
(3, 'ST165', 3),
(4, 'ST165', 4),
(5, 'ST170', 5),
(6, 'ST170', 6),
(7, 'ST155', 7),
(8, 'ST175', 8)
ON CONFLICT (id_pemetaan) DO NOTHING;

-- 8. PENGAJUAN MAGANG (TAHAP 1)
INSERT INTO pengajuan_magang (id_pengajuan, nim, id_mitra, nidn, id_admin, nama_supervisor_mitra, email_supervisor_mitra, jenis_program, posisi, durasi_bulan, tanggal_mulai, tanggal_selesai, file_proposal_magang, file_bukti_diterima, status_pengajuan, status_program) VALUES
(1, '21.11.4001', 1, '0512038901', 1, 'Rian Hidayat (Lead Eng GoTo)', 'rian.hidayat@goto.com', 'Magang Mandiri / MSIB', 'Fullstack Developer Intern', 6, '2026-02-01', '2026-07-31', 'https://res.cloudinary.com/demo/image/upload/v1/proposal_budi.pdf', 'https://res.cloudinary.com/demo/image/upload/v1/bukti_diterima_goto.pdf', 'Disetujui', 'Sedang Berjalan'),
(2, '21.11.4002', 2, '0515088502', 1, 'Dedi Suhendra (Manager Telkom)', 'dedi.s@telkom.co.id', 'Studi Independen MSIB', 'Cloud Engineer Intern', 6, '2026-02-01', '2026-07-31', 'https://res.cloudinary.com/demo/image/upload/v1/proposal_siti.pdf', 'https://res.cloudinary.com/demo/image/upload/v1/bukti_diterima_telkom.pdf', 'Menunggu Verifikasi', 'Sedang Berjalan')
ON CONFLICT (id_pengajuan) DO NOTHING;

-- 9. USULAN & KLAIM KONVERSI (TAHAP 2 & TAHAP 3 & TAHAP 4-6)
INSERT INTO item_konversi_mk (id_item_konversi, id_pengajuan, kode_mk, id_cpl, aktivitas_magang, bukti_aktivitas, file_laporan_magang, file_sertifikat_magang, status_usulan, status_klaim, catatan_dosen, nilai_mitra, komentar_mitra, tanggal_penilaian_mitra, nilai_dpl, catatan_dpl, tanggal_penilaian_dpl, nilai_akhir_angka, nilai_akhir_huruf) VALUES
(1, 1, 'ST165', 2, 'Pengembangan Microservices REST API & Dashboard React', 'Link Repositori Git & Deployment Vercel/Render', 'https://res.cloudinary.com/demo/image/upload/v1/laporan_magang_budi.pdf', 'https://res.cloudinary.com/demo/image/upload/v1/sertifikat_goto.pdf', 'Disetujui DPL', 'Disetujui', 'Pencapaian CPMK Proyek Pemrograman sangat baik dan sesuai target.', 90.0, 'Budi berkinerja sangat luar biasa dalam menangani tugas backend.', '2026-07-25 10:00:00', 85.0, 'Sangat baik, laporan lengkap.', '2026-07-26 14:00:00', 88.5, 'A'),
(2, 1, 'ST170', 6, 'Penerapan Clean Architecture & Unit Testing di GoTo', 'Dokumentasi Arsitektur & Log Test Coverage', 'https://res.cloudinary.com/demo/image/upload/v1/laporan_magang_budi.pdf', 'https://res.cloudinary.com/demo/image/upload/v1/sertifikat_goto.pdf', 'Disetujui DPL', 'Menunggu Review DPL', 'Menunggu persetujuan nilai dari DPL.', 92.0, 'Pemahaman arsitektur software dan testing sangat matang.', '2026-07-26 11:30:00', NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id_item_konversi) DO NOTHING;

-- 10. APPROVAL TOKENS (MAGIC LINK UNTUK MITRA & DPL)
INSERT INTO approval_tokens (id_token, token, target_type, id_pengajuan, email_recipient, expires_at, is_used) VALUES
(1, 'tok_mitra_goto_8f91a2', 'mitra_penilaian', 1, 'rian.hidayat@goto.com', '2026-08-30 23:59:59', TRUE),
(2, 'tok_dpl_indah_3c81b9', 'dpl_review', 1, 'indah.susanti@amikom.ac.id', '2026-08-30 23:59:59', FALSE)
ON CONFLICT (id_token) DO NOTHING;

-- 11. LOGBOOK MINGGUAN
INSERT INTO logbook_mingguan (id_logbook, id_pengajuan, minggu_ke, periode_mulai, periode_selesai, total_jam, kompetensi_utama, aktivitas_utama, kendala_solusi, umpan_balik_mentor, status_verifikasi) VALUES
(1, 1, 1, '2026-02-01', '2026-02-07', 40, 'Onboarding & Git Workflow', 'Mengikuti onboarding tim engineering GoTo, setup environment, integrasi CI/CD.', 'Memahami arsitektur monorepo internal. Solusi: Membaca dokumentasi repositori.', 'Budi sangat cepat beradaptasi dengan teknologi internal.', 'Disetujui'),
(2, 1, 2, '2026-02-08', '2026-02-14', 40, 'Backend API Development', 'Membuat REST API authentication & integrasi Supabase PostgreSQL.', 'Menyesuaikan RLS policy. Solusi: Diskusi bersama lead developer.', 'Penggunaan Async/Await dan error handling sudah baik.', 'Disetujui')
ON CONFLICT (id_logbook) DO NOTHING;

-- 12. CHAT ROOM & MESSAGES
INSERT INTO chat_room (id_room, nim_mahasiswa, nidn_dosen, id_pengajuan, jenis_room) VALUES
(1, '21.11.4001', '0512038901', 1, 'konsultasi_dosen')
ON CONFLICT (id_room) DO NOTHING;

INSERT INTO chat_message (id_message, id_room, sender_email, sender_role, pesan, attachment_url, is_read) VALUES
(1, 1, 'budi.santoso@students.amikom.ac.id', 'Mahasiswa', 'Selamat pagi Bu Indah, saya sudah mengunggah laporan klaim konversi untuk ST165 dan ST170.', NULL, TRUE),
(2, 1, 'indah.susanti@amikom.ac.id', 'Dosen', 'Selamat pagi Budi, baik Pak Rian dari GoTo sudah mengisi nilai mitra (90), sekarang tinggal saya review nilai akhirnya ya.', NULL, FALSE)
ON CONFLICT (id_message) DO NOTHING;

-- 13. NOTIFIKASI
INSERT INTO notifikasi (id_notifikasi, receiver_email, judul, pesan, is_read) VALUES
(1, 'budi.santoso@students.amikom.ac.id', 'Penilaian Mitra Selesai', 'Supervisor GoTo (Rian Hidayat) telah memberikan nilai magang Anda.', FALSE),
(2, 'indah.susanti@amikom.ac.id', 'Klaim Konversi Menunggu Review', 'Klaim Konversi MK ST170 Budi Santoso siap direview dan dinilai.', FALSE)
ON CONFLICT (id_notifikasi) DO NOTHING;
