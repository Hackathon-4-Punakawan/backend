const endpointCatalog = [
  ["System", "GET", "/health", "Health check"],
  
  // 👨‍🏫 KATEGORI KHUSUS: DASHBOARD DPL / DOSEN PEMBIMBING LAPANGAN
  ["Dashboard DPL", "POST", "/api/v1/auth/login", "1. Login DPL (Dr. Indah Susanti)", { identifier: "0512038901", password: "Dosen#1234" }],
  ["Dashboard DPL", "GET", "/api/v1/dosen/dashboard-stats", "2. Statistik Dashboard DPL (Jumlah Mahasiswa Diampu & Status Konversi)", {}],
  ["Dashboard DPL", "GET", "/api/v1/dosen/mahasiswa", "3. Daftar Mahasiswa Bimbingan yang Diampu DPL", {}],
  ["Dashboard DPL", "GET", "/api/v1/dosen/mahasiswa/21.11.4001", "4. Detail Data Mahasiswa Bimbingan (Profil, Magang, & Konversi SKS)", {}],
  ["Dashboard DPL", "POST", "/api/v1/dosen/konversi/review", "5. Review DPL: ACC Usulan Konversi (Post / Put)", { id_item_konversi: 101, nim: "21.11.4001", action: "ACC", catatan_dosen: "Objective dan CPMK sudah sesuai dengan standar industri", nilai_angka: 90, nilai_huruf: "A" }],
  ["Dashboard DPL", "POST", "/api/v1/dosen/konversi/review", "6. Review DPL: Minta Revisi Konversi dengan Catatan Wajib", { id_item_konversi: 101, nim: "21.11.4001", action: "REVISI", catatan_dosen: "Harap perjelas rincian objective activity pada modul basis data" }],
  ["Dashboard DPL", "POST", "/api/v1/dosen/konversi/acc", "7. Shortcut DPL ACC Konversi", { id_item_konversi: 101, nim: "21.11.4001", catatan_dosen: "ACC oleh DPL" }],
  ["Dashboard DPL", "POST", "/api/v1/dosen/konversi/revisi", "8. Shortcut DPL Revisi Konversi (Catatan Wajib)", { id_item_konversi: 101, nim: "21.11.4001", catatan_dosen: "Catatan perbaikan revisi DPL" }],
  ["Dashboard DPL", "GET", "/api/v1/konversi-matkul/dpl/list", "9. Legacy Daftar Usulan Konversi Masuk DPL", {}],
  ["Dashboard DPL", "POST", "/api/v1/konversi-matkul/dpl/review", "10. Legacy Review DPL (ACC / Revisi)", { id_item_konversi: 1, action: "ACC", catatan_dosen: "Mata kuliah & objective CPMK disetujui DPL" }],

  // 🏢 KATEGORI KHUSUS: DASHBOARD MITRA INDUSTRI
  ["Dashboard Mitra", "POST", "/api/v1/auth/login", "1. Login Mitra (Rian Hidayat - PT GoTo)", { identifier: "rian.hidayat@goto.com", password: "Mtr#1234" }],
  ["Dashboard Mitra", "GET", "/api/v1/mitra/dashboard-stats", "2. Statistik Dashboard Mitra (Jumlah Mahasiswa Magang & Evaluasi)", {}],
  ["Dashboard Mitra", "GET", "/api/v1/mitra/mahasiswa", "3. Daftar Mahasiswa Pengaju Surat Terima Kasih ke Mitra", {}],
  ["Dashboard Mitra", "GET", "/api/v1/mitra/mahasiswa/21.11.4001", "4. Detail Data Mahasiswa Magang & Surat Terima Kasih", {}],
  ["Dashboard Mitra", "POST", "/api/v1/mitra/penilaian", "5. Mitra Submit Penilaian Akhir Magang & Sertifikat (Post / Put)", { id_surat_akhir: 1, nim: "21.11.4001", nilai_mitra_angka: 92, nilai_mitra_huruf: "A", catatan_mitra: "Mahasiswa berkinerja luar biasa, sangat proaktif menguasai REST API & microservices.", sertifikat_magang_url: "https://drive.google.com/file/d/sertifikat_goto_budi.pdf" }],
  ["Dashboard Mitra", "POST", "/api/v1/mitra/submit-nilai", "6. Shortcut Mitra Submit Penilaian", { id_surat_akhir: 1, nim: "21.11.4001", nilai_mitra_angka: 95, catatan_mitra: "Kinerja sangat memuaskan." }],

  // 👑 KATEGORI KHUSUS: DASHBOARD ADMIN KAPRODI
  ["Dashboard Admin Kaprodi", "POST", "/api/v1/auth/login", "1. Login Admin Kaprodi (kaprodi.if@amikom.ac.id)", { identifier: "kaprodi.if@amikom.ac.id", password: "Admin#1234" }],
  ["Dashboard Admin Kaprodi", "GET", "/api/v1/admin/dashboard-stats", "2. Executive Analytics & Dashboard Stats (Total Mhs, DPL, Mitra, MK, Progress Steps)", {}],
  ["Dashboard Admin Kaprodi", "GET", "/api/v1/admin/mahasiswa", "3. Daftar & Monitoring Mahasiswa Konversi", {}],
  ["Dashboard Admin Kaprodi", "GET", "/api/v1/admin/mahasiswa/21.11.4001", "4. Detail Data Mahasiswa (Profil, 5 Steps Progress, DPL & Mitra)", {}],
  ["Dashboard Admin Kaprodi", "GET", "/api/v1/admin/dosen", "5. Daftar & Monitoring DPL (Beban Bimbingan & Status)", {}],
  ["Dashboard Admin Kaprodi", "POST", "/api/v1/admin/create-dpl", "6. Tambah DPL Baru & Automated Email Kredensial", { nidn: "0519049003", nama: "Fitriani, M.T.", email: "fitriani@amikom.ac.id" }],
  ["Dashboard Admin Kaprodi", "GET", "/api/v1/admin/mitra", "7. Daftar & Monitoring Mitra Industri (Mahasiswa Magang per Mitra)", {}],
  ["Dashboard Admin Kaprodi", "POST", "/api/v1/admin/create-mitra", "8. Tambah Mitra Baru & Automated Email Kredensial", { nama_perusahaan: "PT Bukalapak.com Tbk", nama_supervisor: "Hendra Wijaya", email: "hendra.wijaya@bukalapak.com", bidang_usaha: "E-Commerce" }],
  ["Dashboard Admin Kaprodi", "GET", "/api/v1/admin/mata-kuliah", "9. Master Data: Katalog Mata Kuliah & CPMK", {}],
  ["Dashboard Admin Kaprodi", "POST", "/api/v1/admin/mata-kuliah", "10. Master Data: Tambah Mata Kuliah & Deskripsi CPMK Baru", { kode_mk: "ST120", nama_mk: "Cloud & Microservices Architecture", sks: 4, semester: 6, cpmk: "CPMK20-Mahasiswa mampu merancang arsitektur cloud & microservices skala besar", kategori: "Wajib Prodi" }],
  ["Dashboard Admin Kaprodi", "GET", "/api/v1/admin/cpl-cpmk", "11. Master Data: Daftar CPL & CPMK", {}],

  // 👨‍🎓 KATEGORI KHUSUS: DASHBOARD MAHASISWA (FULL UI MATCH)
  ["Dashboard Mahasiswa", "POST", "/api/v1/auth/login", "1. Login Mahasiswa Complete (NIM 24.11.6666)", { identifier: "24.11.6666", password: "12345678" }],
  ["Dashboard Mahasiswa", "GET", "/api/v1/mahasiswa/dashboard", "2. Full Dashboard Data (Hero Card, DPL, Surat Akhir, Progress & Table MK)", {}],
  ["Dashboard Mahasiswa", "GET", "/api/v1/mahasiswa/dashboard?nim=24.11.6666", "3. Full Dashboard Data (NIM 24.11.6666 - Fathur Rahman)", {}],
  ["Dashboard Mahasiswa", "GET", "/api/v1/mahasiswa/dashboard?nim=21.11.4001", "4. Full Dashboard Data (NIM 21.11.4001 - Budi Santoso)", {}],
  ["Dashboard Mahasiswa", "GET", "/api/v1/mahasiswa/riwayat-semester", "5. Riwayat Magang per Semester & Berkas Dokumen ACC (User Logged-In)", {}],
  ["Dashboard Mahasiswa", "GET", "/api/v1/mahasiswa/riwayat-semester?nim=24.11.6666", "6. Riwayat Magang per Semester & Berkas Dokumen ACC (NIM 24.11.6666)", {}],

  // AUTENTIKASI & USER MANAGEMENT
  ["Autentikasi", "POST", "/api/v1/auth/register-mahasiswa", "Registrasi Mahasiswa Mandiri", { nim: "21.11.4005", nama: "Rizky Ramadhan", email: "rizky.ramadhan@students.amikom.ac.id", password: "Password123" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "⭐️ Login Mahasiswa Complete (NIM: 24.11.6666 / Pass: 12345678)", { identifier: "24.11.6666", password: "12345678" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login Mahasiswa (NIM)", { identifier: "21.11.4001", password: "Budi#1234" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login DPL (NIDN: 0512038901)", { identifier: "0512038901", password: "Dosen#1234" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login Mitra (Email)", { identifier: "rian.hidayat@goto.com", password: "Mtr#1234" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login Admin Kaprodi", { identifier: "kaprodi.if@amikom.ac.id", password: "Admin#1234" }],
  ["Autentikasi", "GET", "/api/v1/auth/me", "Profil User Aktif (/me)"],

  // ADMIN MANAGEMENT (SEND EMAIL CREDENTIALS)
  ["Admin", "POST", "/api/v1/admin/create-dpl", "Tambah DPL & Send Email (Admin Only)", { nidn: "0519049003", nama: "Fitriani, M.T.", email: "fitriani@amikom.ac.id" }],
  ["Admin", "POST", "/api/v1/admin/create-mitra", "Tambah Mitra & Send Email (Admin Only)", { nama_perusahaan: "PT Bukalapak.com Tbk", nama_supervisor: "Hendra Wijaya", email: "hendra.wijaya@bukalapak.com", bidang_usaha: "E-Commerce" }],

  // MASTER & DATA ENTITIES
  ["Master", "GET", "/api/v1/mahasiswa", "Daftar mahasiswa"],
  ["Master", "POST", "/api/v1/mahasiswa", "Tambah mahasiswa", { nim: "21.11.4004", nama: "Nama Mahasiswa", email: "mahasiswa@example.com" }],
  ["Master", "GET", "/api/v1/dosen-pembimbing", "Daftar dosen"],
  ["Master", "GET", "/api/v1/mitra-industri", "Daftar mitra"],
  ["Master", "GET", "/api/v1/admin-kaprodi", "Daftar admin"],
  
  // AKADEMIK & OBE
  ["Akademik", "GET", "/api/v1/mata-kuliah", "Daftar mata kuliah (Amikom Data)"],
  ["Akademik", "POST", "/api/v1/mata-kuliah", "Tambah mata kuliah", { kode_mk: "ST999", nama_mk: "Contoh Mata Kuliah", sks: 2, semester: 6 }],
  ["Akademik", "GET", "/api/v1/cpl-cpmk", "Daftar CPL/CPMK"],
  ["Akademik", "GET", "/api/v1/pemetaan-cpl-mk", "Pemetaan CPL dan MK"],
  
  // PENGAJUAN & KONVERSI
  ["Pengajuan", "GET", "/api/v1/pengajuan-magang", "Daftar pengajuan"],
  ["Pengajuan", "POST", "/api/v1/pengajuan-magang", "Buat pengajuan", { nim: "21.11.4001", id_mitra: 1, jenis_program: "Magang Mandiri", posisi: "Backend Developer", durasi_bulan: 6, nama_instansi: "PT GoTo Gojek Tokopedia Tbk", alamat_instansi: "Jl. Pasar Raya No. 21 Jakarta", tujuan_surat: "HRD PT GoTo Gojek Tokopedia Tbk", semester: 6, tahun_akademik: "2025/2026", jenis_surat_fakultas: "Surat Pengantar Magang" }],
  ["Pengajuan", "GET", "/api/v1/pengajuan-magang/1/progress", "Progress pengajuan"],
  ["Pengajuan", "POST", "/api/v1/pengajuan-magang/1/submit", "Kirim pengajuan", {}],
  ["Pengajuan", "POST", "/api/v1/pengajuan-magang/1/approve", "Setujui pengajuan", { nidn: "0512038901", id_admin: 1 }],

  // PENGAJUAN SURAT FAKULTAS (FIK) - STEP 1
  ["Step 1 FIK", "GET", "/api/v1/pengajuan-fik/helper-info", "Pre-fill Data Form FIK (Auto Semester & Academic Year)"],
  ["Step 1 FIK", "POST", "/api/v1/pengajuan-fik", "Submit Form Pendaftaran FIK (Pengajuan ID Magang)", { jenis_pengajuan: "Pengajuan ID Magang", kepada_yth: "Yth. Head of Engineering", nama_instansi: "PT Amikom Tech Digital", alamat_instansi: "Jl. Ring Road Utara, Condongcatur, Sleman, Yogyakarta", posisi: "Fullstack Developer Intern", jenis_program: "Magang Mandiri" }],
  ["Step 1 FIK", "GET", "/api/v1/pengajuan-fik/my-status", "Monitoring Status Pengajuan FIK (Auto-ACC 5s)"],
  ["Step 1 FIK", "PATCH", "/api/v1/pengajuan-fik/1/status", "Update Status Surat Fakultas (Admin/Fakultas)", { status_surat_fakultas: "Disetujui", surat_pengantar_url: "https://fik.amikom.ac.id/downloads/surat-pengantar.pdf" }],

  // PROPOSAL MAGANG & REVIEW KAPRODI - STEP 2
  ["Step 2 Proposal", "GET", "/api/v1/proposal-magang/helper-info", "Pre-fill Form Proposal (Mahasiswa)"],
  ["Step 2 Proposal", "POST", "/api/v1/proposal-magang", "Submit Proposal Magang Complete (Mahasiswa)", { nama_program_kegiatan: "Magang Fullstack Developer BIMA", nama_instansi: "PT GoTo Gojek Tokopedia Tbk", alamat_instansi: "Jl. Pasar Raya No. 21 Jakarta", tanggal_mulai: "2026-08-01", tanggal_selesai: "2027-01-31", durasi_pelaksanaan: "01 Agustus 2026 sampai dengan 31 Januari 2027", nama_pic: "Rian Hidayat", jabatan_pic: "Senior Tech Lead", email_pic: "rian.hidayat@goto.com", no_hp_pic: "081234567890", program_diikuti: "Magang Mandiri", no_hp_mahasiswa: "089876543210", alasan_mendaftar: "Saya mendaftar kegiatan ini untuk mengasah keahlian software engineering berbasis industri secara riil...", deskripsi_kegiatan: "Project ini meliputi pembuatan REST API backend, pemetaan kurikulum OBE, serta deployment aplikasi ke cloud server...", keahlian_utama: "Pengembangan web application, arsitektur REST API, microservices, dan database optimization...", file_cv: "https://drive.google.com/file/d/cv_mahasiswa.pdf", file_krs: "https://drive.google.com/file/d/krs_semester.pdf", file_transkrip: "https://drive.google.com/file/d/transkrip_nilai.pdf", file_proposal_pdf: "https://drive.google.com/file/d/proposal_lengkap.pdf" }],
  ["Step 2 Proposal", "GET", "/api/v1/proposal-magang/my-proposal", "Monitoring Proposal Mahasiswa (Status & Review)"],
  ["Step 2 Proposal", "GET", "/api/v1/proposal-magang/admin/list", "Daftar Proposal Masuk (Admin Kaprodi Dashboard)"],
  ["Step 2 Proposal", "POST", "/api/v1/proposal-magang/1/review", "Review Proposal: ACC (Admin Kaprodi)", { action: "ACC", catatan_revisi: "Proposal disetujui, topik sesuai dengan standar OBE Informatika" }],
  ["Step 2 Proposal", "POST", "/api/v1/proposal-magang/1/review", "Review Proposal: Tolak/Revisi (Admin Kaprodi)", { action: "REVISI", catatan_revisi: "Harap perjelas rincian deskripsi kegiatan project pada bab 2" }],
  
  // PENGAJUAN SURAT PENGANTAR MAGANG FIK - STEP 3
  ["Step 3 Surat Pengantar", "GET", "/api/v1/surat-pengantar/helper-info", "Pre-fill Form Surat Pengantar (Auto 5 Fields)"],
  ["Step 3 Surat Pengantar", "POST", "/api/v1/surat-pengantar", "Submit Pengajuan Surat Pengantar (Auto-ACC 5s)", { id_magang: "FIK6199364", tanggal_mulai: "2026-08-01", tanggal_berakhir: "2027-01-31" }],
  ["Step 3 Surat Pengantar", "GET", "/api/v1/surat-pengantar/my-status", "Monitoring Status & Unduh PDF Surat Pengantar"],
  ["Step 3 Surat Pengantar", "GET", "/api/v1/surat-pengantar/admin/list", "Daftar Pengajuan Surat Pengantar (Admin Dashboard)"],

  // PENGAJUAN DOSEN PEMBIMBING MAGANG (DPL) - STEP 4
  ["Step 4 Dosen Pembimbing", "GET", "/api/v1/pengajuan-dpl/helper-info", "Pre-fill Form DPL (Auto Email, ID Magang, Nama, NIM)"],
  ["Step 4 Dosen Pembimbing", "POST", "/api/v1/pengajuan-dpl", "Submit Form Pengajuan DPL Magang", { sks_ditempuh: 110, bukti_diterima_magang: "https://drive.google.com/file/d/bukti_terima_magang.pdf", file_khs: "https://drive.google.com/file/d/khs_semester.pdf" }],
  ["Step 4 Dosen Pembimbing", "GET", "/api/v1/pengajuan-dpl/my-status", "Monitoring Status Pengajuan DPL (Plotting & SK Link)"],
  ["Step 4 Dosen Pembimbing", "GET", "/api/v1/pengajuan-dpl/admin/list", "Daftar Pengajuan DPL (Admin/Kaprodi Dashboard)"],

  // KONVERSI SKS MATA KULIAH (STEP 5) - MANUAL & AI RECOMMENDATION
  ["Step 5 Konversi SKS", "GET", "/api/v1/konversi-matkul/catalog", "Katalog Mata Kuliah untuk Input Manual (Auto Kode, SKS, CPMK)"],
  ["Step 5 Konversi SKS", "POST", "/api/v1/konversi-matkul/ai-recommendation", "Rekomendasi AI Konversi (Cocokkan Deskripsi Magang & Semester)", { deskripsi_kegiatan: "Pengembangan REST API backend Node.js, pengelolaan database PostgreSQL, microservices, deployment cloud, dan analisis kebutuhan sistem informasi." }],
  ["Step 5 Konversi SKS", "POST", "/api/v1/konversi-matkul", "Submit Form Per Matkul (Individual Textfields Input)", { mode: "MANUAL", kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital", objective: "Memulai Dasar Pemrograman Web. 1. Meneliti, merancang, dan membangun web app responsif berbasis REST API.", durasi: "6 Bulan" }],
  ["Step 5 Konversi SKS", "POST", "/api/v1/konversi-matkul", "Submit Batch Tabel Konversi (Multiple Matkul Items)", { mode: "AI_RECOMMENDATION", items: [{ kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital", objective: "Memulai Dasar Pemrograman Web. 1. Meneliti, merancang, dan membangun web app responsif berbasis REST API.", durasi: "6 Bulan", nilai_angka: 88, nilai_huruf: "A" }, { kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu menganalisis perangkat lunak pada berbagai platform digital", objective: "Belajar Fundamen Database. 1. Menerapkan Microservices, SQL query, dan database optimization.", durasi: "6 Bulan", nilai_angka: 85, nilai_huruf: "A" }, { kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu menghasilkan produk ekonomi kreatif digital dalam bidang informatika", objective: "Memulai Dasar Perancangan Sistem. 1. Meneliti, menganalisis sistem, UML diagram, dan proses bisnis.", durasi: "6 Bulan", nilai_angka: 82, nilai_huruf: "A-" }] }],
  ["Step 5 Konversi SKS", "GET", "/api/v1/konversi-matkul/my-status", "Monitoring Status Tabel Konversi SKS (Mahasiswa)"],

  // SURAT AKHIR & UCAPAN TERIMA KASIH (AKHIR MAGANG)
  ["Surat Akhir Magang", "GET", "/api/v1/surat-akhir-magang/helper-info", "Get Prefilled Automatic Fields (Email, Tgl Mulai, Tgl Berakhir, Periode)"],
  ["Surat Akhir Magang", "POST", "/api/v1/surat-akhir-magang", "Submit Pengajuan Surat Akhir & Ucapan Terima Kasih FIK", { id_magang: "FIK6199373", tanggal_mulai_magang: "01 Agustus 2026", tanggal_berakhir_magang: "31 Januari 2027", periode_magang: "6 Bulan" }],
  ["Surat Akhir Magang", "GET", "/api/v1/surat-akhir-magang/my-status", "Monitoring Status Surat Akhir & Link Download PDF Terima Kasih FIK"],
  ["Surat Akhir Magang", "GET", "/api/v1/surat-akhir-magang/mitra/list", "Daftar Surat Ucapan Terima Kasih Masuk ke Dashboard Mitra"],
  ["Surat Akhir Magang", "POST", "/api/v1/surat-akhir-magang/mitra/submit-nilai", "Mitra Input Penilaian & Evaluasi Kinerja Mahasiswa", { id_surat_akhir: 1, nilai_mitra_angka: 92, nilai_mitra_huruf: "A", catatan_mitra: "Mahasiswa sangat proaktif, disiplin, dan terampil menguasai teknologi REST API serta sistem basis data.", sertifikat_magang_url: "https://drive.google.com/file/d/sertifikat_magang_budi.pdf" }],
  ["Surat Akhir Magang", "GET", "/api/v1/surat-akhir-magang/admin/list", "Daftar Pengajuan Surat Akhir FIK (Admin Dashboard)"],

  // GABUNGAN MONITORING GABUNGAN ALL STEPS (1, 2, 3, 4, 5)
  ["Summary All Steps", "GET", "/api/v1/pengajuan-fik/all-steps", "GET All Steps 1, 2, 3, 4, & 5 Unified Data & Dashboard Array"],
  ["Summary All Steps", "GET", "/api/v1/pengajuan-fik/history", "GET Riwayat Dashboard Mahasiswa (Tabel Display Format)"],
  
  // KONVERSI & PENILAIAN (70:30)
  ["Konversi", "GET", "/api/v1/item-konversi", "Daftar item konversi"],
  ["Konversi", "POST", "/api/v1/item-konversi/1/proposal/approve", "Approve usulan DPL", { catatan_dosen: "Sesuai dengan CPMK" }],
  ["Konversi", "POST", "/api/v1/item-konversi/1/mitra-assessment", "Penilaian mitra (70%)", { nilai_mitra: 90, komentar_mitra: "Kinerja sangat baik" }],
  ["Konversi", "POST", "/api/v1/item-konversi/1/dpl-assessment", "Penilaian final DPL (30%)", { nilai_dpl: 85, catatan_dpl: "Capaian sangat baik" }],
  
  // LOGBOOK
  ["Logbook", "GET", "/api/v1/logbook", "Daftar logbook"],
  ["Logbook", "POST", "/api/v1/logbook", "Tambah logbook", { id_pengajuan: 1, minggu_ke: 1, total_jam: 40, aktivitas_utama: "Pengembangan REST API" }],
  ["Logbook", "POST", "/api/v1/logbook/1/verify", "Verifikasi logbook", { umpan_balik_mentor: "Aktivitas sesuai" }],
  
  // EVALUASI
  ["Evaluasi", "GET", "/api/v1/evaluasi-mitra", "Daftar evaluasi"],
  ["Evaluasi", "PUT", "/api/v1/evaluasi-mitra/1/skor-cpl", "Isi skor CPL", { scores: [{ id_cpl: 1, skor: 90 }, { id_cpl: 2, skor: 85 }] }],
  ["Evaluasi", "POST", "/api/v1/evaluasi-mitra/1/submit", "Kirim evaluasi", {}],
  
  // DOKUMEN & CHAT
  ["Dokumen", "GET", "/api/v1/dokumen-pendukung", "Daftar dokumen"],
  ["Chat", "GET", "/api/v1/chat-rooms", "Daftar chat room"],
  ["Chat", "GET", "/api/v1/chat/rooms/1/messages", "Riwayat pesan"],
  ["Chat", "POST", "/api/v1/chat/rooms/1/messages", "Kirim pesan", { sender_email: "budi.santoso@students.amikom.ac.id", sender_role: "Mahasiswa", pesan: "Mohon review logbook saya." }],
  ["Notifikasi", "GET", "/api/v1/notifikasi", "Daftar notifikasi"],
  ["Notifikasi", "PATCH", "/api/v1/notifikasi/1/read", "Tandai dibaca", {}],
  ["Approval", "GET", "/api/v1/approval-tokens", "Daftar token approval"],
  ["Approval", "GET", "/api/v1/approval/tok_mitra_goto_8f91a2", "Validasi magic link"],
];

const elements = Object.fromEntries(
  ["base-url", "token-input", "status", "search", "endpoint-list", "method", "path", "body", "send", "format", "request-error", "response", "response-meta", "copy", "form-builder", "tab-form", "tab-json"].map((id) => [
    id,
    document.getElementById(id),
  ])
);
elements["base-url"].value = window.location.origin;

// Auto Load Saved Token from LocalStorage
const savedToken = localStorage.getItem("api_tester_jwt") || "";
if (elements["token-input"]) {
  elements["token-input"].value = savedToken;
  elements["token-input"].addEventListener("input", (e) => {
    localStorage.setItem("api_tester_jwt", e.target.value.trim());
  });
}

let activeTab = "form"; // 'form' or 'json'
let currentCategoryFilter = "";

function filterCategory(category) {
  currentCategoryFilter = category;
  document.querySelectorAll(".pill").forEach((pill) => {
    if (pill.getAttribute("data-cat") === category) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });
  renderCatalog(elements.search.value);
}
window.filterCategory = filterCategory;

function switchTab(tab) {
  activeTab = tab;
  if (tab === "form") {
    elements["tab-form"].classList.add("active");
    elements["tab-json"].classList.remove("active");
    elements["form-builder"].style.display = "grid";
    elements.body.style.display = "none";
  } else {
    elements["tab-json"].classList.add("active");
    elements["tab-form"].classList.remove("active");
    elements["form-builder"].style.display = "none";
    elements.body.style.display = "block";
  }
}

elements["tab-form"].addEventListener("click", () => switchTab("form"));
elements["tab-json"].addEventListener("click", () => switchTab("json"));

function renderCatalog(query = "") {
  const needle = query.toLowerCase();
  const filtered = endpointCatalog.filter((item) => {
    const matchCategory = !currentCategoryFilter || item[0].toLowerCase().includes(currentCategoryFilter.toLowerCase());
    const matchSearch = item.slice(0, 4).join(" ").toLowerCase().includes(needle);
    return matchCategory && matchSearch;
  });
  const groups = Object.groupBy ? Object.groupBy(filtered, (item) => item[0]) : filtered.reduce((all, item) => ((all[item[0]] ||= []).push(item), all), {});
  elements["endpoint-list"].replaceChildren();
  for (const [group, endpoints] of Object.entries(groups)) {
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group;
    elements["endpoint-list"].append(title);
    for (const endpoint of endpoints) {
      const button = document.createElement("button");
      button.className = "endpoint";
      button.innerHTML = `<span class="verb ${endpoint[1]}">${endpoint[1]}</span><span class="endpoint-path"></span><span class="endpoint-name"></span>`;
      button.querySelector(".endpoint-path").textContent = endpoint[2];
      button.querySelector(".endpoint-name").textContent = endpoint[3];
      button.addEventListener("click", () => selectEndpoint(endpoint, button));
      elements["endpoint-list"].append(button);
    }
  }
}

function selectEndpoint(endpoint, button) {
  document.querySelectorAll(".endpoint.active").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  elements.method.value = endpoint[1];
  elements.path.value = endpoint[2];
  
  const sampleObj = endpoint[4] !== undefined ? endpoint[4] : {};
  elements.body.value = endpoint[4] === undefined ? "" : JSON.stringify(endpoint[4], null, 2);
  elements.body.disabled = ["GET", "DELETE"].includes(endpoint[1]);
  elements["request-error"].textContent = "";

  if (["GET", "DELETE"].includes(endpoint[1])) {
    elements["form-builder"].style.display = "none";
    elements.body.style.display = "none";
  } else {
    buildFormFromJSON(sampleObj);
    switchTab(activeTab);
  }
}

function buildFormFromJSON(jsonObj) {
  const container = elements["form-builder"];
  container.replaceChildren();

  if (!jsonObj || typeof jsonObj !== "object" || Object.keys(jsonObj).length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; color: var(--muted); font-size: 12px; margin: 0;">Tidak ada parameter body untuk request ini.</p>`;
    return;
  }

  for (const [key, value] of Object.entries(jsonObj)) {
    const group = document.createElement("div");
    group.className = "form-field-group";

    const label = document.createElement("label");
    label.textContent = key;
    label.setAttribute("for", `input-field-${key}`);

    let input;
    if (typeof value === "object" && value !== null) {
      input = document.createElement("textarea");
      input.rows = 3;
      input.value = JSON.stringify(value, null, 2);
    } else {
      input = document.createElement("input");
      input.type = typeof value === "number" ? "number" : "text";
      input.value = value !== undefined && value !== null ? value : "";
    }

    input.id = `input-field-${key}`;
    input.setAttribute("data-key", key);
    input.placeholder = `Masukkan ${key}...`;

    input.addEventListener("input", syncFormToJSON);

    group.append(label, input);
    container.append(group);
  }
}

function syncFormToJSON() {
  const inputs = elements["form-builder"].querySelectorAll("input, textarea");
  const payload = {};
  inputs.forEach((input) => {
    const key = input.getAttribute("data-key");
    let val = input.value;
    if (input.type === "number" && val !== "") {
      val = Number(val);
    } else if (input.tagName === "TEXTAREA") {
      try {
        val = JSON.parse(val);
      } catch (_) {}
    }
    payload[key] = val;
  });
  elements.body.value = JSON.stringify(payload, null, 2);
}

// Sync JSON body textarea edits back to Form textfields
elements.body.addEventListener("input", () => {
  try {
    const parsed = JSON.parse(elements.body.value);
    buildFormFromJSON(parsed);
  } catch (_) {}
});

elements.search.addEventListener("input", (e) => renderCatalog(e.target.value));

elements.format.addEventListener("click", () => {
  try {
    if (elements.body.value.trim()) {
      const parsed = JSON.parse(elements.body.value);
      elements.body.value = JSON.stringify(parsed, null, 2);
      buildFormFromJSON(parsed);
      elements["request-error"].textContent = "";
    }
  } catch (err) {
    elements["request-error"].textContent = `JSON tidak valid: ${err.message}`;
  }
});

elements.send.addEventListener("click", async () => {
  const method = elements.method.value;
  const path = elements.path.value;
  const url = `${elements["base-url"].value}${path}`;

  // Automatically attach Authorization Bearer header if token exists
  const token = (elements["token-input"].value || localStorage.getItem("api_tester_jwt") || "").trim();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = { method, headers };

  if (!["GET", "DELETE"].includes(method) && elements.body.value.trim()) {
    try {
      options.body = JSON.stringify(JSON.parse(elements.body.value));
    } catch (err) {
      elements["request-error"].textContent = `JSON tidak valid: ${err.message}`;
      return;
    }
  }

  const start = performance.now();
  elements["response-meta"].textContent = "Loading...";

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    const duration = Math.round(performance.now() - start);

    elements["response-meta"].textContent = `${response.status} ${response.statusText} • ${duration}ms`;

    try {
      const parsed = JSON.parse(text);
      elements.response.textContent = JSON.stringify(parsed, null, 2);

      // Auto capture JWT token upon successful login/register
      const capturedToken = parsed.token || parsed.data?.token || (parsed.user && parsed.user.token);
      if (capturedToken && typeof capturedToken === "string") {
        elements["token-input"].value = capturedToken;
        localStorage.setItem("api_tester_jwt", capturedToken);
      }
    } catch (_) {
      elements.response.textContent = text;
    }
  } catch (err) {
    elements["response-meta"].textContent = "Request Gagal";
    elements.response.textContent = `Fetch error: ${err.message}`;
  }
});

elements.copy.addEventListener("click", () => {
  navigator.clipboard.writeText(elements.response.textContent);
  const prev = elements.copy.textContent;
  elements.copy.textContent = "Copied!";
  setTimeout(() => (elements.copy.textContent = prev), 1200);
});

async function checkHealth() {
  try {
    const response = await fetch(`${elements["base-url"].value}/health`);
    if (response.ok) {
      elements.status.textContent = "online";
      elements.status.className = "status online";
    } else {
      elements.status.textContent = "degraded";
      elements.status.className = "status offline";
    }
  } catch (_) {
    elements.status.textContent = "offline";
    elements.status.className = "status offline";
  }
}

renderCatalog();
checkHealth();
