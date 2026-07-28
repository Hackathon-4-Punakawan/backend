require("dotenv").config();
const supabase = require("../src/config/supabase");
const { seedMataKuliah } = require("./seed_mata_kuliah");
const bcrypt = require("bcryptjs");

async function resetDatabaseClean() {
  console.log("🧹 Memulai Pengosongan Database & Memory Stores (Fresh State Tanpa Mahasiswa Dummy)...\n");

  const tablesToClear = [
    "approval_tokens",
    "mitra_logbook",
    "surat_akhir_magang",
    "item_konversi_detail",
    "item_konversi_mk",
    "pengajuan_konversi_matkul",
    "pengajuan_dpl",
    "surat_pengantar_magang",
    "proposal_magang",
    "pengajuan_magang",
    "mitra_industri",
    "dosen_pembimbing",
    "mahasiswa",
    "users",
  ];

  for (const table of tablesToClear) {
    try {
      const { error } = await supabase.from(table).delete().neq("id", -1);
      if (error && !error.message.includes("does not exist") && !error.message.includes("column \"id\"")) {
        await supabase.from(table).delete().neq("created_at", "1970-01-01T00:00:00Z");
      }
      console.log(`  ✓ Table '${table}' berhasil dikosongkan.`);
    } catch (err) {
      console.warn(`  ⚠️ Table '${table}' warning:`, err.message);
    }
  }

  // Clear In-Memory Stores safely
  const sharedStores = require("../src/utils/sharedStore");
  for (const [key, store] of Object.entries(sharedStores)) {
    if (Array.isArray(store)) {
      store.length = 0;
    } else if (store instanceof Set) {
      store.clear();
    }
  }

  console.log("\n  ✓ In-Memory stores backend berhasil dibersihkan.");

  // Re-seed Mata Kuliah Catalog from mk (1).json
  console.log("\n📚 Menyiapkan ulang Katalog Mata Kuliah & CPMK dari mk (1).json...");
  await seedMataKuliah();

  // Create ONLY 3 Master Accounts: Admin Prodi, DPL, Mitra
  console.log("\n👤 Membuat 3 Akun Master (Admin Prodi, DPL, Mitra Industri)...");

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);

  // 1. Akun Admin Kaprodi / Prodi (Eli Pujastuti, M.Kom.)
  const { data: adminUser } = await supabase.from("users").insert({
    email: "admin.fik@amikom.ac.id",
    password_hash: adminPasswordHash,
    role: "ADMIN_PRODI",
    name: "Eli Pujastuti, M.Kom.",
    is_active: true,
  }).select().maybeSingle();

  await supabase.from("admin_kaprodi").upsert({
    nidn: "0419077902",
    nama: "Eli Pujastuti, M.Kom.",
    email: "admin.fik@amikom.ac.id",
    jabatan: "Kepala Program Studi S1 Informatika",
    prodi: "Informatika",
    user_id: adminUser?.id
  });

  console.log("  ✓ Akun Admin Kaprodi (Eli Pujastuti, M.Kom.) created: admin.fik@amikom.ac.id / Admin123!");

  // 2. Akun Dosen Pembimbing Lapangan (DPL)
  const { data: dplUser } = await supabase.from("users").insert({
    email: "indah.susanti@amikom.ac.id",
    password_hash: adminPasswordHash,
    role: "DPL",
    name: "Dr. Indah Susanti, M.Kom",
    is_active: true,
  }).select().maybeSingle();

  await supabase.from("dosen_pembimbing").upsert({
    nidn: "0512038901",
    nama: "Dr. Indah Susanti, M.Kom",
    email: "indah.susanti@amikom.ac.id",
    bidang_keahlian: "Software Engineering & Web Dev",
    is_active: true,
    user_id: dplUser?.id,
  }, { onConflict: "nidn" });

  console.log("  ✓ Akun Dosen DPL created: indah.susanti@amikom.ac.id (NIDN: 0512038901) / Admin123!");

  // 3. Akun Mitra Industri / Supervisor
  const { data: mitraUser } = await supabase.from("users").insert({
    email: "rian.hidayat@goto.com",
    password_hash: adminPasswordHash,
    role: "MITRA",
    name: "Rian Hidayat (GoTo)",
    is_active: true,
  }).select().maybeSingle();

  await supabase.from("mitra_industri").insert({
    nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk",
    nama_supervisor: "Rian Hidayat",
    email_supervisor: "rian.hidayat@goto.com",
    kategori_industri: "Technology & E-Commerce",
    bidang_usaha: "On-Demand Services & Technology",
    kuota_magang: 10,
    kuota_terpakai: 0,
    user_id: mitraUser?.id,
  });

  console.log("  ✓ Akun Mitra Industri created: rian.hidayat@goto.com / Admin123!");

  console.log("\n========================================================");
  console.log("✅ RESET DATABASE BERHASIL! DATABASE KOSONG & 3 AKUN MASTER READY:");
  console.log("1. Admin Kaprodi / Prodi : admin.fik@amikom.ac.id / Admin123!");
  console.log("2. Dosen Pembimbing DPL  : indah.susanti@amikom.ac.id / Admin123! (NIDN: 0512038901)");
  console.log("3. Supervisor Mitra      : rian.hidayat@goto.com / Admin123!");
  console.log("--------------------------------------------------------");
  console.log("📌 Tabel Mahasiswa & Pengajuan: 100% KOSONG untuk testing pendaftaran baru!");
  console.log("========================================================\n");
}

if (require.main === module) {
  resetDatabaseClean()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Reset Error:", err);
      process.exit(1);
    });
}

module.exports = { resetDatabaseClean };
