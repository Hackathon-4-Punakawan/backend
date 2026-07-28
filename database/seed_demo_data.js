require("dotenv").config();
const supabase = require("../src/config/supabase");
const bcrypt = require("bcryptjs");
const { seedMataKuliah } = require("./seed_mata_kuliah");
const sharedStores = require("../src/utils/sharedStore");

async function seedDemoDataVariatif() {
  console.log("🚀 Memulai Seeding Data Demo Variatif MBKM OBE AMIKOM...\n");

  const defaultHash = await bcrypt.hash("12345678", 10);
  const adminHash = await bcrypt.hash("Admin123!", 10);

  // 1. Sync Catalog Mata Kuliah & CPMK from mk (1).json
  console.log("📚 1. Menyelaraskan Katalog 26 Mata Kuliah & 6 CPL-CPMK...");
  await seedMataKuliah();

  // 2. Clear Existing Demo Data
  console.log("\n🧹 2. Membersihkan data sampel lama...");
  const tables = [
    "approval_tokens", "mitra_logbook", "surat_akhir_magang", "item_konversi_detail",
    "item_konversi_mk", "pengajuan_konversi_matkul", "pengajuan_dpl",
    "surat_pengantar_magang", "proposal_magang", "pengajuan_magang",
    "mitra_industri", "dosen_pembimbing", "mahasiswa", "users"
  ];

  for (const table of tables) {
    try {
      await supabase.from(table).delete().neq("created_at", "1970-01-01T00:00:00Z");
    } catch (err) {
      // Ignore non-existing table/schema warning
    }
  }

  // Clear In-Memory Stores
  for (const [key, store] of Object.entries(sharedStores)) {
    if (Array.isArray(store)) store.length = 0;
    else if (store instanceof Set) store.clear();
  }

  // 3. Create Demo Users & Profiles
  console.log("\n👤 3. Membuat Akun & Profil Pengguna Variatif...");

  // A. Admin Kaprodi
  const { data: adminUser } = await supabase.from("users").insert({
    email: "admin.fik@amikom.ac.id",
    password_hash: adminHash,
    role: "ADMIN_PRODI",
    name: "Admin Kaprodi FIK",
    is_active: true
  }).select().maybeSingle();

  // B. Dosen DPL
  const { data: dpl1User } = await supabase.from("users").insert({
    email: "indah.susanti@amikom.ac.id",
    password_hash: adminHash,
    role: "DPL",
    name: "Dr. Indah Susanti, M.Kom",
    is_active: true
  }).select().maybeSingle();

  const { data: dpl1 } = await supabase.from("dosen_pembimbing").insert({
    nidn: "0512038901",
    nama: "Dr. Indah Susanti, M.Kom",
    email: "indah.susanti@amikom.ac.id",
    bidang_keahlian: "Software Engineering & Web Architecture",
    is_active: true,
    user_id: dpl1User?.id
  }).select().maybeSingle();

  const { data: dpl2User } = await supabase.from("users").insert({
    email: "andi.sunyoto@amikom.ac.id",
    password_hash: adminHash,
    role: "DPL",
    name: "Andi Sunyoto, M.Kom.",
    is_active: true
  }).select().maybeSingle();

  const { data: dpl2 } = await supabase.from("dosen_pembimbing").insert({
    nidn: "0514088201",
    nama: "Andi Sunyoto, M.Kom.",
    email: "andi.sunyoto@amikom.ac.id",
    bidang_keahlian: "Artificial Intelligence & Data Mining",
    is_active: true,
    user_id: dpl2User?.id
  }).select().maybeSingle();

  // C. Mitra Industri
  const { data: mitra1User } = await supabase.from("users").insert({
    email: "rian.hidayat@goto.com",
    password_hash: adminHash,
    role: "MITRA",
    name: "Rian Hidayat (GoTo)",
    is_active: true
  }).select().maybeSingle();

  const { data: mitra1 } = await supabase.from("mitra_industri").insert({
    nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk",
    nama_supervisor: "Rian Hidayat",
    email_supervisor: "rian.hidayat@goto.com",
    kategori_industri: "Technology & E-Commerce",
    bidang_usaha: "On-Demand & Ecosystem Software Engineering",
    kuota_magang: 10,
    kuota_terpakai: 2,
    user_id: mitra1User?.id
  }).select().maybeSingle();

  const { data: mitra2User } = await supabase.from("users").insert({
    email: "sarah.v@google.com",
    password_hash: adminHash,
    role: "MITRA",
    name: "Sarah Vernanda (Google)",
    is_active: true
  }).select().maybeSingle();

  const { data: mitra2 } = await supabase.from("mitra_industri").insert({
    nama_perusahaan: "Google Indonesia",
    nama_supervisor: "Sarah Vernanda",
    email_supervisor: "sarah.v@google.com",
    kategori_industri: "Cloud & Global AI Technology",
    bidang_usaha: "Artificial Intelligence & Cloud Computing",
    kuota_magang: 5,
    kuota_terpakai: 1,
    user_id: mitra2User?.id
  }).select().maybeSingle();

  // D. Mahasiswa Variatif (5 Mahasiswa dengan Status Berbeda)
  const sampleStudents = [
    {
      nim: "24.11.6666",
      nama: "Fathur Rahman",
      email: "fathur.6666@students.amikom.ac.id",
      instansi: "PT GoTo Gojek Tokopedia Tbk",
      id_mitra: mitra1?.id_mitra || 1,
      posisi: "Fullstack Engineer Intern",
      dpl: dpl1,
      statusStep1: "Ditetapkan",
      idMagang: "FIK6222971",
      statusKonversi: "Disetujui DPL",
      totalSks: 20,
      logbooksCount: 5
    },
    {
      nim: "24.11.5556",
      nama: "Daus Sedap",
      email: "rebelzi8@gmail.com",
      instansi: "Google Indonesia",
      id_mitra: mitra2?.id_mitra || 2,
      posisi: "AI Research Engineer Intern",
      dpl: dpl2,
      statusStep1: "Ditetapkan",
      idMagang: "FIK6222972",
      statusKonversi: "Menunggu Review DPL",
      totalSks: 20,
      logbooksCount: 3
    },
    {
      nim: "21.11.4001",
      nama: "Budi Santoso",
      email: "budi.santoso@students.amikom.ac.id",
      instansi: "PT Tokopedia Indonesia",
      id_mitra: mitra1?.id_mitra || 1,
      posisi: "Data Analyst Intern",
      dpl: null, // Belum Plotting DPL
      statusStep1: "Diproses",
      idMagang: "Diproses (Auto-ACC)",
      statusKonversi: "Belum Mengajukan",
      totalSks: 0,
      logbooksCount: 0
    },
    {
      nim: "21.11.4004",
      nama: "Anisa Rahmawati",
      email: "anisa.rahma@students.amikom.ac.id",
      instansi: "PT Shopee International Indonesia",
      id_mitra: 3,
      posisi: "Frontend Developer Intern",
      dpl: dpl1,
      statusStep1: "Ditetapkan",
      idMagang: "FIK6222973",
      statusKonversi: "Disetujui DPL",
      totalSks: 18,
      logbooksCount: 4
    },
    {
      nim: "21.11.4005",
      nama: "Daffa Rizky Pratama",
      email: "daffa.rizky@students.amikom.ac.id",
      instansi: "PT Traveloka Indonesia",
      id_mitra: 4,
      posisi: "Cyber Security Intern",
      dpl: dpl2,
      statusStep1: "Ditetapkan",
      idMagang: "FIK6222974",
      statusKonversi: "Revisi DPL",
      totalSks: 16,
      logbooksCount: 2
    }
  ];

  console.log("\n🎓 4. Mengisi Data Pengajuan 5 Mahasiswa dengan Variasi Status Workflow...");

  for (const s of sampleStudents) {
    // 1. User Account
    const { data: u } = await supabase.from("users").insert({
      email: s.email,
      password_hash: defaultHash,
      role: "MAHASISWA",
      name: s.nama,
      is_active: true
    }).select().maybeSingle();

    // 2. Mahasiswa Profile
    const { data: mhs } = await supabase.from("mahasiswa").insert({
      nim: s.nim,
      nama: s.nama,
      email: s.email,
      prodi: "Informatika",
      angkatan: s.nim.startsWith("24") ? "2024" : "2021",
      user_id: u?.id
    }).select().maybeSingle();

    // 3. Step 1: Pengajuan Magang FIK
    const payloadStep1 = {
      nim: s.nim,
      id_mitra: s.id_mitra,
      nidn: s.dpl ? s.dpl.nidn : null,
      id_admin: adminUser?.id || 1,
      nama_instansi: s.instansi,
      alamat_instansi: `Kawasan Industri Terpadu ${s.instansi}`,
      tujuan_surat: `Kepada Yth. Head of HRD ${s.instansi}`,
      jenis_program: "Magang Mandiri",
      posisi: s.posisi,
      durasi_bulan: 6,
      semester: 6,
      tahun_akademik: "2026/2027",
      status_pengajuan: s.statusStep1,
      status_program: "Sedang Berjalan",
      status_surat_fakultas: s.statusStep1 === "Ditetapkan" ? "Diterbitkan" : "Diproses Fakultas",
      id_magang_fakultas: s.idMagang,
      nomor_layanan_fik: `LAYANAN-${s.nim}`,
      created_at: new Date().toISOString()
    };

    const { data: pengajuanDb } = await supabase.from("pengajuan_magang").insert(payloadStep1).select().maybeSingle();
    sharedStores.memoryStep1Store.unshift(pengajuanDb || { id_pengajuan: Date.now() % 10000, ...payloadStep1 });

    if (s.statusStep1 === "Ditetapkan") {
      // 4. Step 2: Proposal Magang
      const payloadProp = {
        nim: s.nim,
        id_pengajuan: pengajuanDb?.id_pengajuan || 1,
        judul_proposal: `Proposal Program Magang Industri di ${s.instansi} - Pemetaan Kompetensi Software Engineering S-1 Informatika`,
        file_proposal_url: `https://raw.githubusercontent.com/Hackathon-4-Punakawan/backend/main/public/uploads/Proposal_Magang_${s.nim}.pdf`,
        file_transkrip_url: `https://raw.githubusercontent.com/Hackathon-4-Punakawan/backend/main/public/uploads/Transkrip_IPK_${s.nim}.pdf`,
        file_rekomendasi_url: `https://raw.githubusercontent.com/Hackathon-4-Punakawan/backend/main/public/uploads/Surat_Rekomendasi_${s.nim}.pdf`,
        status_review: "DISETUJUI",
        created_at: new Date().toISOString()
      };
      await supabase.from("proposal_magang").insert(payloadProp);
      sharedStores.memoryProposalStore.unshift(payloadProp);

      // 5. Step 3: Surat Pengantar FIK
      const payloadSurat = {
        nim: s.nim,
        id_pengajuan: pengajuanDb?.id_pengajuan || 1,
        nomor_surat: `45/FIK-IF/AMIKOM/STDM/VI/2026`,
        tujuan_instansi: s.instansi,
        alamat_instansi: payloadStep1.alamat_instansi,
        status_surat: "SELESAI",
        file_surat_url: `https://raw.githubusercontent.com/Hackathon-4-Punakawan/backend/main/public/uploads/Surat_Pengantar_${s.nim}.pdf`,
        qr_code_verification_url: `https://fik.amikom.ac.id/verify/${s.idMagang}`,
        created_at: new Date().toISOString()
      };
      await supabase.from("surat_pengantar_magang").insert(payloadSurat);
      sharedStores.memorySuratStore.unshift(payloadSurat);

      // 6. Step 4: DPL Assignment
      if (s.dpl) {
        const payloadDpl = {
          nim: s.nim,
          nidn_dpl: s.dpl.nidn,
          nama_dpl: s.dpl.nama,
          status_penetapan: "Ditetapkan",
          catatan_kaprodi: "Penugasan Dosen Pembimbing Lapangan resmi ditetapkan oleh Kaprodi S-1 Informatika.",
          created_at: new Date().toISOString()
        };
        await supabase.from("pengajuan_dpl").insert(payloadDpl);
        sharedStores.memoryDplStore.unshift(payloadDpl);
      }

      // 7. Step 5: Konversi Mata Kuliah & OBE CPMK
      if (s.statusKonversi !== "Belum Mengajukan") {
        const selectedCourses = [
          { kode_mk: "ST165", nama_mk: "Proyek Pemrograman", sks: 4, nilai_angka: 95, nilai_huruf: "A", objective: `Mengembangkan fitur backend REST API dan mikroservis di ${s.instansi}`, cpmk: "CPMK15, CPMK16" },
          { kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, nilai_angka: 90, nilai_huruf: "A", objective: `Merancang arsitektur basis data PostgreSQL & Supabase RLS`, cpmk: "CPMK11, CPMK18" },
          { kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, nilai_angka: 88, nilai_huruf: "A-", objective: `Membangun antarmuka dashboard interaktif React.js`, cpmk: "CPMK-01, CPMK-02" },
          { kode_mk: "ST170", nama_mk: "Rekayasa Perangkat Lunak", sks: 4, nilai_angka: 92, nilai_huruf: "A", objective: `Menerapkan SDLC Agile & CI/CD deployment pipeline`, cpmk: "CPMK-03, CPMK-04" },
          { kode_mk: "ST150", nama_mk: "Kepemimpinan", sks: 2, nilai_angka: 85, nilai_huruf: "B+", objective: `Memimpin tim sprint dan berkolaborasi secara profesional`, cpmk: "CPMK-05" },
          { kode_mk: "ST120", nama_mk: "Bahasa Indonesia", sks: 2, nilai_angka: 88, nilai_huruf: "A-", objective: `Menyusun laporan teknis akhir dan dokumentasi API`, cpmk: "CPMK-06" }
        ];

        const payloadKonversi = {
          nim: s.nim,
          total_sks: s.totalSks,
          status_review_dpl: s.statusKonversi,
          catatan_dosen: s.statusKonversi === "Disetujui DPL"
            ? "Hasil pemetaan modul magang industri sangat relevan dengan CPL-CPMK S-1 Informatika. Disetujui 20 SKS penuh."
            : "Mohon lengkapi rincian deskripsi objective pada mata kuliah ST150.",
          ai_relevance_score: 96.4,
          created_at: new Date().toISOString()
        };

        const { data: konversiDb } = await supabase.from("pengajuan_konversi_matkul").insert(payloadKonversi).select().maybeSingle();

        for (const course of selectedCourses) {
          await supabase.from("item_konversi_mk").insert({
            id_konversi: konversiDb?.id_konversi || 1,
            nim: s.nim,
            ...course,
            status_item: s.statusKonversi === "Disetujui DPL" ? "Disetujui DPL" : "Menunggu Review"
          });
        }

        sharedStores.memoryKonversiStore.unshift({ ...payloadKonversi, courses: selectedCourses });
      }

      // 8. Logbook Mingguan (1-5 Minggu)
      for (let w = 1; w <= s.logbooksCount; w++) {
        const payloadLogbook = {
          nim: s.nim,
          id_pengajuan: pengajuanDb?.id_pengajuan || 1,
          minggu_ke: w,
          tanggal_mulai: `2026-06-0${w}`,
          tanggal_selesai: `2026-06-0${w + 6}`,
          ringkasan_kegiatan: `Minggu ke-${w}: Mengimplementasikan modul fitur ${s.posisi} di ${s.instansi}. Melakukan integrasi REST API dan unit testing backend.`,
          file_lampiran_url: `https://raw.githubusercontent.com/Hackathon-4-Punakawan/backend/main/public/uploads/Logbook_Minggu_${w}_${s.nim}.pdf`,
          status_verifikasi: w <= 3 ? "Disetujui DPL" : (w === 4 ? "Pending Review" : "Disetujui Supervisor"),
          catatan_dpl: w <= 3 ? "Kegiatan sesuai rencana logbook mingguan." : null,
          created_at: new Date().toISOString()
        };
        await supabase.from("mitra_logbook").insert(payloadLogbook);
        if (sharedStores.memoryMitraLogbookStore) {
          sharedStores.memoryMitraLogbookStore.unshift(payloadLogbook);
        }
      }

      // 9. Surat Akhir Magang (Khusus Fathur Rahman - Selesai Complete)
      if (s.nim === "24.11.6666") {
        const payloadSuratAkhir = {
          nim: s.nim,
          id_pengajuan: pengajuanDb?.id_pengajuan || 1,
          email_mahasiswa: s.email,
          periode_magang: "6 Bulan (1 Februari 2026 - 31 Juli 2026)",
          tanggal_mulai: "2026-02-01",
          tanggal_selesai: "2026-07-31",
          status: "Disetujui Dekan",
          surat_akhir_url: `https://raw.githubusercontent.com/Hackathon-4-Punakawan/backend/main/public/uploads/Surat_Akhir_Magang_${s.nim}.pdf`,
          created_at: new Date().toISOString()
        };
        await supabase.from("surat_akhir_magang").insert(payloadSuratAkhir);
        sharedStores.memorySuratAkhirStore.unshift(payloadSuratAkhir);
      }
    }

    console.log(`  ✓ Data Mahasiswa '${s.nama}' (${s.nim}) - ${s.instansi} [${s.statusKonversi}] berhasil di-seed.`);
  }

  console.log("\n=======================================================================");
  console.log("🎉 SEEDING DATA DEMO VARIATIF BERHASIL DILAKUKAN (100% READY UNTUK DEMO)!");
  console.log("=======================================================================");
  console.log("🔑 DAFTAR AKUN DEMO SIAP DIGUNAKAN FOR PRESENTATION:\n");
  console.log("1. ADMIN KAPRODI FIK :");
  console.log("   • Email    : admin.fik@amikom.ac.id");
  console.log("   • Password : Admin123!\n");
  console.log("2. DOSEN DPL (Dr. Indah Susanti, M.Kom) :");
  console.log("   • Email    : indah.susanti@amikom.ac.id (NIDN: 0512038901)");
  console.log("   • Password : Admin123!\n");
  console.log("3. SUPERVISOR MITRA (Rian Hidayat - PT GoTo Tbk) :");
  console.log("   • Email    : rian.hidayat@goto.com");
  console.log("   • Password : Admin123!\n");
  console.log("4. MAHASISWA #1 (Fathur Rahman - Complete 20 SKS & Surat Akhir) :");
  console.log("   • NIM / Email : 24.11.6666 / fathur.6666@students.amikom.ac.id");
  console.log("   • Password    : 12345678\n");
  console.log("5. MAHASISWA #2 (Daus Sedap - AI Research Intern Google, In Progress) :");
  console.log("   • NIM / Email : 24.11.5556 / rebelzi8@gmail.com");
  console.log("   • Password    : 12345678\n");
  console.log("6. MAHASISWA #3 (Budi Santoso - Fresh / Pending DPL Plotting) :");
  console.log("   • NIM / Email : 21.11.4001 / budi.santoso@students.amikom.ac.id");
  console.log("   • Password    : 12345678");
  console.log("=======================================================================\n");
}

if (require.main === module) {
  seedDemoDataVariatif()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding Error:", err);
      process.exit(1);
    });
}

module.exports = { seedDemoDataVariatif };
