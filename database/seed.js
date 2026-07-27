require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const supabase = require("../src/config/supabase");
const { pool } = require("../src/config/db");

async function seed() {
  console.log("🌱 Memulai seeding data resmi & master users UNIKA.IN ke Supabase...");

  // If pg pool is active and configured
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[YOUR-PASSWORD]")) {
    try {
      console.log("📡 Menerapkan schema.sql & seeder.sql via Direct PostgreSQL Pool...");
      const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
      const seederSql = fs.readFileSync(path.join(__dirname, "seeder.sql"), "utf8");

      await pool.query(schemaSql);
      await pool.query(seederSql);
      console.log("✅ Schema & Seeding via PostgreSQL Direct Pool sukses!");
      process.exit(0);
    } catch (err) {
      console.warn("⚠️ Direct Postgres pool warning:", err.message);
    }
  }

  // Fallback to Supabase JS Client API insertion
  try {
    console.log("📡 Seeding master users & entitas menggunakan Supabase Client SDK...");

    // 0. Seed Master Users (with hashed passwords)
    const passAdmin = await bcrypt.hash("Admin#1234", 10);
    const passDosen = await bcrypt.hash("Dosen#1234", 10);
    const passMitra = await bcrypt.hash("Mtr#1234", 10);
    const passMhs = await bcrypt.hash("Budi#1234", 10);

    const { data: uAdmin } = await supabase.from("users").upsert([
      { email: "kaprodi.if@amikom.ac.id", password_hash: passAdmin, role: "ADMIN_PRODI", is_active: true }
    ], { onConflict: "email" }).select().single();

    const { data: uDpl1 } = await supabase.from("users").upsert([
      { email: "indah.susanti@amikom.ac.id", password_hash: passDosen, role: "DPL", is_active: true }
    ], { onConflict: "email" }).select().single();

    const { data: uDpl2 } = await supabase.from("users").upsert([
      { email: "bambang.k@amikom.ac.id", password_hash: passDosen, role: "DPL", is_active: true }
    ], { onConflict: "email" }).select().single();

    const { data: uMitra } = await supabase.from("users").upsert([
      { email: "rian.hidayat@goto.com", password_hash: passMitra, role: "MITRA", is_active: true }
    ], { onConflict: "email" }).select().single();

    const { data: uMhs1 } = await supabase.from("users").upsert([
      { email: "budi.santoso@students.amikom.ac.id", password_hash: passMhs, role: "MAHASISWA", is_active: true }
    ], { onConflict: "email" }).select().single();

    // 1. Mahasiswa
    await supabase.from("mahasiswa").upsert([
      { nim: "21.11.4001", user_id: uMhs1?.id || null, nama: "Budi Santoso", prodi: "Informatika", angkatan: "2021", email: "budi.santoso@students.amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde" },
      { nim: "21.11.4002", nama: "Siti Rahmawati", prodi: "Informatika", angkatan: "2021", email: "siti.rahma@students.amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1494790108377-be9c29b29330" },
      { nim: "21.11.4003", nama: "Ahmad Rizky", prodi: "Informatika", angkatan: "2021", email: "ahmad.rizky@students.amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61" }
    ], { onConflict: "nim" });

    // 2. Dosen Pembimbing
    await supabase.from("dosen_pembimbing").upsert([
      { nidn: "0512038901", user_id: uDpl1?.id || null, nama: "Dr. Indah Susanti, M.Kom", bidang_keahlian: "Software Engineering & Web Dev", email: "indah.susanti@amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2", is_active: true },
      { nidn: "0515088502", user_id: uDpl2?.id || null, nama: "Bambang Kurniawan, M.Eng", bidang_keahlian: "Artificial Intelligence & Data", email: "bambang.k@amikom.ac.id", foto_profile: "https://images.unsplash.com/photo-1560250097-0b93528c311a", is_active: true }
    ], { onConflict: "nidn" });

    // 3. Mitra Industri
    await supabase.from("mitra_industri").upsert([
      { id_mitra: 1, user_id: uMitra?.id || null, nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk", nama_supervisor: "Rian Hidayat", email_supervisor: "rian.hidayat@goto.com", kategori_industri: "Technology & Unicorn", bidang_usaha: "Software & Digital Services", kontak_pic: "hr.internship@goto.com" },
      { id_mitra: 2, nama_perusahaan: "PT Telkom Indonesia (Persero) Tbk", nama_supervisor: "Dedi Suhendra", email_supervisor: "dedi.s@telkom.co.id", kategori_industri: "Telecommunication & Cloud", bidang_usaha: "IT Solutions", kontak_pic: "internship@telkom.co.id" },
      { id_mitra: 3, nama_perusahaan: "PT Bank Central Asia Tbk (BCA)", nama_supervisor: "Budi Pratama", email_supervisor: "recruitment@bca.co.id", kategori_industri: "Banking & Fintech", bidang_usaha: "Financial Technology", kontak_pic: "recruitment@bca.co.id" }
    ], { onConflict: "id_mitra" });

    // 4. Admin Kaprodi
    await supabase.from("admin_kaprodi").upsert([
      { id_admin: 1, user_id: uAdmin?.id || null, nama: "Dr. Amiruddin, M.T.", jabatan: "Ketua Program Studi S1 Informatika", email: "kaprodi.if@amikom.ac.id" }
    ], { onConflict: "id_admin" });

    // 5. Mata Kuliah Resmi Amikom
    await supabase.from("mata_kuliah").upsert([
      { kode_mk: "ST044", nama_mk: "Metode Numerik", sks: 4, semester: 4 },
      { kode_mk: "ST050", nama_mk: "Manajemen Strategik", sks: 2, semester: 5 },
      { kode_mk: "ST087", nama_mk: "Manajemen Sumber Daya IT", sks: 2, semester: 5 },
      { kode_mk: "ST108", nama_mk: "E-Commerce", sks: 2, semester: 5 },
      { kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, semester: 5 },
      { kode_mk: "ST120", nama_mk: "Bahasa Indonesia", sks: 2, semester: 1 },
      { kode_mk: "ST132", nama_mk: "Infrastruktur Web & Internet", sks: 2, semester: 5 },
      { kode_mk: "ST143", nama_mk: "Perancangan Jaringan", sks: 4, semester: 6 },
      { kode_mk: "ST150", nama_mk: "Kepemimpinan", sks: 2, semester: 6 },
      { kode_mk: "ST153", nama_mk: "Big Data & Predictive Analytics", sks: 2, semester: 6 },
      { kode_mk: "ST154", nama_mk: "Internet of Things", sks: 2, semester: 6 },
      { kode_mk: "ST155", nama_mk: "Digital Business", sks: 2, semester: 6 },
      { kode_mk: "ST163", nama_mk: "Inovasi Pembayaran Digital", sks: 2, semester: 6 },
      { kode_mk: "ST164", nama_mk: "Kecerdasan Buatan Lanjut", sks: 2, semester: 6 },
      { kode_mk: "ST165", nama_mk: "Proyek Pemrograman", sks: 4, semester: 7 },
      { kode_mk: "ST166", nama_mk: "Proyek Game", sks: 4, semester: 7 },
      { kode_mk: "ST167", nama_mk: "Proyek Data Mining", sks: 4, semester: 7 },
      { kode_mk: "ST168", nama_mk: "Big Data & Data Mining", sks: 4, semester: 7 },
      { kode_mk: "ST170", nama_mk: "Rekayasa Perangkat Lunak", sks: 4, semester: 5 },
      { kode_mk: "ST173", nama_mk: "Media Interaktif", sks: 4, semester: 6 },
      { kode_mk: "ST175", nama_mk: "Komunikasi dan Negosiasi", sks: 2, semester: 6 },
      { kode_mk: "ST178", nama_mk: "Mixed Reality", sks: 4, semester: 7 }
    ], { onConflict: "kode_mk" });

    // 6. CPMK CPL
    await supabase.from("cpl_cpmk").upsert([
      { id_cpl: 1, kode_cpl: "CPMK-ST165-1", kategori: "Hard Skill", nama_kompetensi: "Menyampaikan pandangan/gagasan kritis & profesional", deskripsi: "Disampaikan melalui presentasi lisan maupun laporan", bobot_persen: 25.0 },
      { id_cpl: 2, kode_cpl: "CPMK-ST165-2", kategori: "Hard Skill", nama_kompetensi: "Menghasilkan produk ekonomi kreatif digital di bidang informatika", deskripsi: "Pengembangan software skala industri", bobot_persen: 30.0 },
      { id_cpl: 3, kode_cpl: "CPMK-ST165-3", kategori: "Hard Skill", nama_kompetensi: "Merancang perangkat lunak pada berbagai platform digital", deskripsi: "Frontend, Backend, & Mobile app", bobot_persen: 25.0 },
      { id_cpl: 4, kode_cpl: "CPMK-ST165-4", kategori: "Problem Solving", nama_kompetensi: "Menganalisis platform yang sesuai dengan kebutuhan industri", deskripsi: "Solusi arsitektur cloud & database", bobot_persen: 20.0 }
    ], { onConflict: "id_cpl" });

    // 7. Pengajuan Magang
    await supabase.from("pengajuan_magang").upsert([
      { id_pengajuan: 1, nim: "21.11.4001", id_mitra: 1, nidn: "0512038901", id_admin: 1, nama_supervisor_mitra: "Rian Hidayat (Lead Eng GoTo)", email_supervisor_mitra: "rian.hidayat@goto.com", jenis_program: "Magang Mandiri / MSIB", posisi: "Fullstack Developer Intern", durasi_bulan: 6, tanggal_mulai: "2026-02-01", tanggal_selesai: "2026-07-31", file_proposal_magang: "https://res.cloudinary.com/demo/image/upload/v1/proposal_budi.pdf", file_bukti_diterima: "https://res.cloudinary.com/demo/image/upload/v1/bukti_diterima_goto.pdf", status_pengajuan: "Disetujui", status_program: "Sedang Berjalan" }
    ], { onConflict: "id_pengajuan" });

    // 8. Item Konversi MK
    await supabase.from("item_konversi_mk").upsert([
      { id_item_konversi: 1, id_pengajuan: 1, kode_mk: "ST165", id_cpl: 2, aktivitas_magang: "Pengembangan Microservices REST API & Dashboard React", bukti_aktivitas: "Link Repositori Git & Deployment Vercel/Render", file_laporan_magang: "https://res.cloudinary.com/demo/image/upload/v1/laporan_magang_budi.pdf", file_sertifikat_magang: "https://res.cloudinary.com/demo/image/upload/v1/sertifikat_goto.pdf", status_usulan: "Disetujui DPL", status_klaim: "Disetujui", catatan_dosen: "Pencapaian CPMK Proyek Pemrograman sangat baik.", nilai_mitra: 90.0, komentar_mitra: "Kinerja luar biasa.", nilai_dpl: 85.0, catatan_dpl: "Sangat baik.", nilai_akhir_angka: 88.5, nilai_akhir_huruf: "A" }
    ], { onConflict: "id_item_konversi" });

    // 9. Approval Tokens
    await supabase.from("approval_tokens").upsert([
      { id_token: 1, token: "tok_mitra_goto_8f91a2", target_type: "mitra_penilaian", id_pengajuan: 1, email_recipient: "rian.hidayat@goto.com", expires_at: "2026-08-30 23:59:59", is_used: true }
    ], { onConflict: "id_token" });

    console.log("🎉 Berhasil! Master users & data dummy UNIKA.IN telah terisi ke Supabase.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Gagal melakukan seeding:", err);
    process.exit(1);
  }
}

seed();
