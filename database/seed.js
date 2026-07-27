require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const supabase = require("../src/config/supabase");
const { pool } = require("../src/config/db");

async function seed() {
  console.log("🌱 Memulai seeding data resmi & master users Multi-DPL ke Database...");

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

    // Seed Admin Kaprodi
    const { data: uAdmin } = await supabase.from("users").upsert([
      { email: "kaprodi.if@amikom.ac.id", password_hash: passAdmin, role: "ADMIN_PRODI", is_active: true }
    ], { onConflict: "email" }).select().single();

    // Seed 5 DPL Users
    const dplUsers = [
      { email: "indah.susanti@amikom.ac.id", name: "Dr. Indah Susanti, M.Kom", nidn: "0512038901", bidang: "Software Engineering & Web Dev" },
      { email: "bambang.k@amikom.ac.id", name: "Bambang Kurniawan, M.Eng", nidn: "0515088502", bidang: "Artificial Intelligence & Data Science" },
      { email: "kusrini@amikom.ac.id", name: "Dr. Kusrini, M.Kom.", nidn: "0509077801", bidang: "Business Intelligence & Data Mining" },
      { email: "andi.sunyoto@amikom.ac.id", name: "Andi Sunyoto, M.Kom.", nidn: "0522108201", bidang: "Cloud Infrastructure & Computer Network" },
      { email: "dharmawan@amikom.ac.id", name: "Dharmawan, M.T.", nidn: "0518048601", bidang: "Mobile Programming & Cyber Security" },
    ];

    const dplUserMap = new Map();
    for (const d of dplUsers) {
      const { data: u } = await supabase.from("users").upsert([
        { email: d.email, password_hash: passDosen, role: "DPL", is_active: true }
      ], { onConflict: "email" }).select().single();
      if (u) dplUserMap.set(d.nidn, u.id);
    }

    // Seed 10 Mahasiswa Users & Profiles
    const mhsList = [
      { nim: "21.11.4001", nama: "Budi Santoso", email: "budi.santoso@students.amikom.ac.id", nidn: "0512038901", dplName: "Dr. Indah Susanti, M.Kom", instansi: "PT GoTo Gojek Tokopedia Tbk", posisi: "Fullstack Developer Intern", status: "Disetujui DPL" },
      { nim: "21.11.4002", nama: "Siti Rahmawati", email: "siti.rahma@students.amikom.ac.id", nidn: "0515088502", dplName: "Bambang Kurniawan, M.Eng", instansi: "PT Telkom Indonesia (Persero) Tbk", posisi: "Cloud Engineer Intern", status: "Menunggu Review DPL" },
      { nim: "21.11.4003", nama: "Ahmad Rizky", email: "ahmad.rizky@students.amikom.ac.id", nidn: "0509077801", dplName: "Dr. Kusrini, M.Kom.", instansi: "PT Bank Central Asia Tbk (BCA)", posisi: "Data Analyst Intern", status: "Revisi DPL" },
      { nim: "21.11.4004", nama: "Dewa Pratama", email: "dewa.pratama@students.amikom.ac.id", nidn: "0522108201", dplName: "Andi Sunyoto, M.Kom.", instansi: "PT Tokopedia", posisi: "DevOps Engineer Intern", status: "Disetujui DPL" },
      { nim: "21.11.4005", nama: "Nabila Putri", email: "nabila.putri@students.amikom.ac.id", nidn: "0518048601", dplName: "Dharmawan, M.T.", instansi: "PT Shopee International Indonesia", posisi: "Mobile Developer Intern", status: "Menunggu Review DPL" },
      { nim: "21.11.4006", nama: "Ramadhan Supriadi", email: "ramadhan.s@students.amikom.ac.id", nidn: "0512038901", dplName: "Dr. Indah Susanti, M.Kom", instansi: "PT Amikom Tech Digital", posisi: "Fullstack Web Developer Intern", status: "Menunggu Review DPL" },
      { nim: "21.11.4007", nama: "Fadhil Azhar", email: "fadhil.azhar@students.amikom.ac.id", nidn: "0515088502", dplName: "Bambang Kurniawan, M.Eng", instansi: "PT Nodeflux Teknologi Indonesia", posisi: "AI & Computer Vision Intern", status: "Disetujui DPL" },
      { nim: "21.11.4008", nama: "Clarissa Anindya", email: "clarissa.a@students.amikom.ac.id", nidn: "0509077801", dplName: "Dr. Kusrini, M.Kom.", instansi: "PT Traveloka Indonesia", posisi: "Product Data Scientist Intern", status: "Revisi DPL" },
      { nim: "21.11.4009", nama: "Muhammad Farhan", email: "m.farhan@students.amikom.ac.id", nidn: "0522108201", dplName: "Andi Sunyoto, M.Kom.", instansi: "PT Biznet Networks", posisi: "Cyber Security & Network Intern", status: "Menunggu Review DPL" },
      { nim: "21.11.4010", nama: "Stephanie Vania", email: "stephanie.v@students.amikom.ac.id", nidn: "0518048601", dplName: "Dharmawan, M.T.", instansi: "PT Global Digital Niaga (Blibli)", posisi: "iOS Developer Intern", status: "Disetujui DPL" },
    ];

    for (const m of mhsList) {
      const { data: u } = await supabase.from("users").upsert([
        { email: m.email, password_hash: passMhs, role: "MAHASISWA", is_active: true }
      ], { onConflict: "email" }).select().single();

      await supabase.from("mahasiswa").upsert([
        { nim: m.nim, user_id: u?.id || null, nama: m.nama, prodi: "Informatika", angkatan: "2021", email: m.email, foto_profile: `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nama)}&background=4f46e5&color=fff&bold=true` }
      ], { onConflict: "nim" });
    }

    // 2. Dosen Pembimbing
    for (const d of dplUsers) {
      await supabase.from("dosen_pembimbing").upsert([
        { nidn: d.nidn, user_id: dplUserMap.get(d.nidn) || null, nama: d.name, bidang_keahlian: d.bidang, email: d.email, foto_profile: `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name)}&background=0284c7&color=fff&bold=true`, is_active: true }
      ], { onConflict: "nidn" });
    }

    // 3. Admin Kaprodi
    await supabase.from("admin_kaprodi").upsert([
      { id_admin: 1, user_id: uAdmin?.id || null, nama: "Dr. Amiruddin, M.T.", jabatan: "Ketua Program Studi S1 Informatika", email: "kaprodi.if@amikom.ac.id" }
    ], { onConflict: "id_admin" });

    // 4. Pengajuan Magang & DPL
    let idx = 1;
    for (const m of mhsList) {
      await supabase.from("pengajuan_magang").upsert([
        { id_pengajuan: idx, nim: m.nim, nidn: m.nidn, id_admin: 1, nama_instansi: m.instansi, posisi: m.posisi, jenis_program: "Magang Mandiri / MSIB", durasi_bulan: 6, tanggal_mulai: "2026-02-01", tanggal_selesai: "2026-07-31", status_pengajuan: "Disetujui", status_program: "Sedang Berjalan", nomor_layanan_fik: `FIK619937${idx + 2}`, semester: 6 }
      ], { onConflict: "id_pengajuan" });

      await supabase.from("pengajuan_dpl").upsert([
        { id_pengajuan_dpl: idx, nim: m.nim, email_mahasiswa: m.email, nama_mahasiswa: m.nama, id_magang_fakultas: `FIK619937${idx + 2}`, sks_ditempuh: 110, bukti_diterima_magang: `https://drive.google.com/file/d/bukti_${m.nim}.pdf`, file_khs: `https://drive.google.com/file/d/khs_${m.nim}.pdf`, status_pengajuan: "Disetujui", nidn_dpl: m.nidn, nama_dpl: m.dplName, sk_dpl_url: `https://fik.amikom.ac.id/sk-dpl/SK-DPL-${m.nim}.pdf` }
      ], { onConflict: "id_pengajuan_dpl" });

      await supabase.from("pengajuan_konversi_matkul").upsert([
        { id_konversi: idx, nim: m.nim, mode_input: "AI_RECOMMENDATION", total_sks: 20, status_konversi: m.status }
      ], { onConflict: "id_konversi" });

      idx++;
    }

    console.log("🎉 Berhasil! Seeding 10 Mahasiswa dengan 5 DPL Berbeda-beda selesai.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Gagal melakukan seeding:", err);
    process.exit(1);
  }
}

seed();
