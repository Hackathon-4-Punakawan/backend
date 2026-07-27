require("dotenv").config();
const fs = require("fs");
const path = require("path");
const supabase = require("../src/config/supabase");
const { pool } = require("../src/config/db");

async function seed() {
  console.log("🌱 Memulai seeding data awal ke Supabase...");

  // Try pg pool first if valid DATABASE_URL exists
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR-PASSWORD]")) {
    try {
      console.log("📡 Mengirim seeder.sql via PostgreSQL Direct Pool...");
      const seederPath = path.join(__dirname, "seeder.sql");
      const sql = fs.readFileSync(seederPath, "utf8");
      await pool.query(sql);
      console.log("✅ Seeding via PostgreSQL pool sukses!");
      process.exit(0);
    } catch (err) {
      console.warn("⚠️ Direct Postgres pool error, fallback to Supabase SDK API:", err.message);
    }
  }

  // Fallback to Supabase JS Client API insertion
  try {
    console.log("📡 Seeding data entitas menggunakan Supabase Client SDK...");

    // 1. Mahasiswa
    const { error: err1 } = await supabase.from("mahasiswa").upsert([
      { nim: "21.11.4001", nama: "Budi Santoso", prodi: "Informatika", angkatan: "2021", email: "budi.santoso@students.amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde" },
      { nim: "21.11.4002", nama: "Siti Rahmawati", prodi: "Informatika", angkatan: "2021", email: "siti.rahma@students.amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1494790108377-be9c29b29330" },
      { nim: "21.11.4003", nama: "Ahmad Rizky", prodi: "Informatika", angkatan: "2021", email: "ahmad.rizky@students.amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61" }
    ], { onConflict: "nim" });
    if (err1) console.warn("Mahasiswa error:", err1.message);

    // 2. Dosen Pembimbing
    const { error: err2 } = await supabase.from("dosen_pembimbing").upsert([
      { nidn: "0512038901", nama: "Dr. Indah Susanti, M.Kom", bidang_keahlian: "Software Engineering & Web Dev", email: "indah.susanti@amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2", is_active: true },
      { nidn: "0515088502", nama: "Bambang Kurniawan, M.Eng", bidang_keahlian: "Artificial Intelligence & Data", email: "bambang.k@amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1560250097-0b93528c311a", is_active: true }
    ], { onConflict: "nidn" });
    if (err2) console.warn("Dosen error:", err2.message);

    // 3. Mitra Industri
    const { error: err3 } = await supabase.from("mitra_industri").upsert([
      { id_mitra: 1, nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk", kategori_industri: "Technology & Unicorn", bidang_usaha: "Software & Digital Services", kontak_pic: "hr.internship@goto.com" },
      { id_mitra: 2, nama_perusahaan: "PT Telkom Indonesia (Persero) Tbk", kategori_industri: "Telecommunication & Cloud", bidang_usaha: "IT Solutions", kontak_pic: "internship@telkom.co.id" },
      { id_mitra: 3, nama_perusahaan: "PT Bank Central Asia Tbk (BCA)", kategori_industri: "Banking & Fintech", bidang_usaha: "Financial Technology", kontak_pic: "recruitment@bca.co.id" }
    ], { onConflict: "id_mitra" });
    if (err3) console.warn("Mitra error:", err3.message);

    // 4. Admin Kaprodi
    const { error: err4 } = await supabase.from("admin_kaprodi").upsert([
      { id_admin: 1, nama: "Dr. Amiruddin, M.T.", jabatan: "Ketua Program Studi S1 Informatika", email: "kaprodi.if@amikom.ac.id" }
    ], { onConflict: "id_admin" });
    if (err4) console.warn("Admin error:", err4.message);

    // 5. Mata Kuliah
    const { error: err5 } = await supabase.from("mata_kuliah").upsert([
      { kode_mk: "IF101", nama_mk: "Pemrograman Web Lanjut", sks: 4, semester: 5 },
      { kode_mk: "IF102", nama_mk: "Rekayasa Perangkat Lunak", sks: 4, semester: 5 },
      { kode_mk: "IF103", nama_mk: "Manajemen Proyek TI", sks: 3, semester: 6 },
      { kode_mk: "IF104", nama_mk: "Kecerdasan Buatan", sks: 3, semester: 6 },
      { kode_mk: "IF105", nama_mk: "Magang Industri / MBKM", sks: 6, semester: 7 }
    ], { onConflict: "kode_mk" });
    if (err5) console.warn("Mata Kuliah error:", err5.message);

    // 6. CPL CPMK
    const { error: err6 } = await supabase.from("cpl_cpmk").upsert([
      { id_cpl: 1, kode_cpl: "CPL-01", kategori: "Hard Skill", nama_kompetensi: "Pengembangan Perangkat Lunak Frontend & Backend", deskripsi: "Mampu merancang dan mengimplementasikan aplikasi skala industri", bobot_persen: 30.0 },
      { id_cpl: 2, kode_cpl: "CPL-02", kategori: "Problem Solving", nama_kompetensi: "Analisis Sistem & Problem Solving", deskripsi: "Mampu menganalisis masalah kompleks industri", bobot_persen: 25.0 },
      { id_cpl: 3, kode_cpl: "CPL-03", kategori: "Soft Skill", nama_kompetensi: "Kerja Sama Tim & Komunikasi Profesional", deskripsi: "Mampu berkolaborasi dalam tim multidisiplin", bobot_persen: 25.0 },
      { id_cpl: 4, kode_cpl: "CPL-04", kategori: "Soft Skill", nama_kompetensi: "Kedisiplinan & Etika Profesi", deskripsi: "Mematuhi aturan kerja dan etika profesionalitas", bobot_persen: 20.0 }
    ], { onConflict: "id_cpl" });
    if (err6) console.warn("CPL error:", err6.message);

    // 7. Pengajuan Magang
    const { error: err7 } = await supabase.from("pengajuan_magang").upsert([
      { id_pengajuan: 1, nim: "21.11.4001", id_mitra: 1, nidn: "0512038901", id_admin: 1, jenis_program: "Magang Mandiri / MSIB", posisi: "Fullstack Developer Intern", durasi_bulan: 6, tanggal_mulai: "2026-02-01", tanggal_selesai: "2026-07-31", status_program: "Sedang Berjalan" },
      { id_pengajuan: 2, nim: "21.11.4002", id_mitra: 2, nidn: "0515088502", id_admin: 1, jenis_program: "Studi Independen MSIB", posisi: "Cloud & Backend Engineer Intern", durasi_bulan: 6, tanggal_mulai: "2026-02-01", tanggal_selesai: "2026-07-31", status_program: "Sedang Berjalan" }
    ], { onConflict: "id_pengajuan" });
    if (err7) console.warn("Pengajuan Magang error:", err7.message);

    // 8. Item Konversi MK
    const { error: err8 } = await supabase.from("item_konversi_mk").upsert([
      { id_item_konversi: 1, id_pengajuan: 1, kode_mk: "IF101", modul_industri: "Pengembangan React Next.js & Express REST API", status_step: "Setuju Kaprodi", catatan_dosen: "Modul industri memenuhi capaian CPL Pemrograman Web Lanjut.", nilai_akhir_angka: 88.5, nilai_akhir_huruf: "A" },
      { id_item_konversi: 2, id_pengajuan: 1, kode_mk: "IF102", modul_industri: "Arsitektur Software Microservices & Clean Code", status_step: "Validasi Dosen", catatan_dosen: "Logbook mingguan menunjukkan pengerjaan refactoring yang baik.", nilai_akhir_angka: 85.0, nilai_akhir_huruf: "A" }
    ], { onConflict: "id_item_konversi" });
    if (err8) console.warn("Item Konversi error:", err8.message);

    // 9. Logbook Mingguan
    const { error: err9 } = await supabase.from("logbook_mingguan").upsert([
      { id_logbook: 1, id_pengajuan: 1, minggu_ke: 1, periode_mulai: "2026-02-01", periode_selesai: "2026-02-07", total_jam: 40, kompetensi_utama: "Onboarding & Git Workflow", aktivitas_utama: "Mengikuti onboarding tim engineering, setup environment, integrasi CI/CD.", kendala_solusi: "Memahami arsitektur monorepo internal. Solusi: Membaca dokumentasi repositori.", umpan_balik_mentor: "Budi sangat cepat beradaptasi dengan teknologi internal.", status_verifikasi: "Disetujui" },
      { id_logbook: 2, id_pengajuan: 1, minggu_ke: 2, periode_mulai: "2026-02-08", periode_selesai: "2026-02-14", total_jam: 40, kompetensi_utama: "Backend API Development", aktivitas_utama: "Membuat REST API authentication & integrasi Supabase PostgreSQL.", kendala_solusi: "Menyesuaikan RLS policy. Solusi: Diskusi bersama lead developer.", umpan_balik_mentor: "Penggunaan Async/Await dan error handling sudah baik.", status_verifikasi: "Disetujui" }
    ], { onConflict: "id_logbook" });
    if (err9) console.warn("Logbook error:", err9.message);

    // 10. Chat Room & Message
    const { error: err10 } = await supabase.from("chat_room").upsert([
      { id_room: 1, nim_mahasiswa: "21.11.4001", nidn_dosen: "0512038901", id_pengajuan: 1, jenis_room: "konsultasi_dosen" }
    ], { onConflict: "id_room" });
    if (err10) console.warn("Chat Room error:", err10.message);

    const { error: err11 } = await supabase.from("chat_message").upsert([
      { id_message: 1, id_room: 1, sender_email: "budi.santoso@students.amikom.ac.id", sender_role: "Mahasiswa", pesan: "Selamat pagi Bu Indah, saya sudah mengunggah logbook minggu ke-2 dan draf modul konversi IF101.", is_read: true },
      { id_message: 2, id_room: 1, sender_email: "indah.susanti@amikom.ac.id", sender_role: "Dosen", pesan: "Selamat pagi Budi, baik sudah saya periksa dan verifikasi. Tinggal menunggu evaluasi mid-term dari mentor GoTo ya.", is_read: false }
    ], { onConflict: "id_message" });
    if (err11) console.warn("Chat Message error:", err11.message);

    console.log("🎉 Berhasil! Seeding data awal ke Supabase telah selesai.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Gagal melakukan seeding:", err);
    process.exit(1);
  }
}

seed();
