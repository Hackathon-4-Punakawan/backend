require("dotenv").config();
const supabase = require("../src/config/supabase");
const { seedMataKuliah } = require("./seed_mata_kuliah");
const bcrypt = require("bcryptjs");

async function resetDatabase() {
  console.log("🧹 Memulai Pengosongan Database & Memory Stores untuk Testing Fresh State...\n");

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
        // Fallback delete if id column does not exist
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

  // Create default accounts for testing
  console.log("\n👤 Membuat akun default untuk testing...");

  const defaultPasswordHash = await bcrypt.hash("12345678", 10);
  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);

  // 1. Akun Admin Kaprodi
  const { data: adminUser } = await supabase.from("users").insert({
    email: "admin.fik@amikom.ac.id",
    password_hash: adminPasswordHash,
    role: "ADMIN_PRODI",
    name: "Admin Kaprodi FIK",
  }).select().maybeSingle();

  // 2. Akun DPL (Dr. Indah Susanti, M.Kom)
  const { data: dplUser } = await supabase.from("users").insert({
    email: "indah.susanti@amikom.ac.id",
    password_hash: adminPasswordHash,
    role: "DPL",
    name: "Dr. Indah Susanti, M.Kom",
  }).select().maybeSingle();

  await supabase.from("dosen_pembimbing").upsert({
    nidn: "0512038901",
    nama: "Dr. Indah Susanti, M.Kom",
    email: "indah.susanti@amikom.ac.id",
    bidang_keahlian: "Software Engineering & Web Dev",
    is_active: true,
    user_id: dplUser?.id,
  }, { onConflict: "nidn" });

  // 3. Akun Mitra Supervisor (GoTo)
  const { data: mitraUser } = await supabase.from("users").insert({
    email: "rian.hidayat@goto.com",
    password_hash: adminPasswordHash,
    role: "MITRA",
    name: "Rian Hidayat (GoTo)",
  }).select().maybeSingle();

  await supabase.from("mitra_industri").insert({
    nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk",
    nama_supervisor: "Rian Hidayat",
    email_supervisor: "rian.hidayat@goto.com",
    kategori_industri: "Technology & E-Commerce",
    bidang_usaha: "On-Demand Services & Technology",
    kuota_magang: 10,
    kuota_terpakai: 1,
    user_id: mitraUser?.id,
  });

  // 4. Akun Seeder Mahasiswa NIM 24.11.6666 (Fathur Rahman)
  const { data: mhsUser } = await supabase.from("users").insert({
    email: "fathur.6666@students.amikom.ac.id",
    password_hash: defaultPasswordHash,
    role: "MAHASISWA",
    name: "Fathur Rahman",
  }).select().maybeSingle();

  await supabase.from("mahasiswa").upsert({
    nim: "24.11.6666",
    nama: "Fathur Rahman",
    email: "fathur.6666@students.amikom.ac.id",
    prodi: "Informatika",
    angkatan: "2024",
    foto_profile: "https://ui-avatars.com/api/?name=Fathur+Rahman&background=4f46e5&color=fff&bold=true",
    user_id: mhsUser?.id,
  }, { onConflict: "nim" });

  // 5. Akun Seeder Mahasiswa NIM 24.11.5556 (Daus sedap)
  const { data: mhs2User } = await supabase.from("users").insert({
    email: "rebelzi8@gmail.com",
    password_hash: defaultPasswordHash,
    role: "MAHASISWA",
    name: "Daus sedap",
  }).select().maybeSingle();

  await supabase.from("mahasiswa").upsert({
    nim: "24.11.5556",
    nama: "Daus sedap",
    email: "rebelzi8@gmail.com",
    prodi: "Informatika",
    angkatan: "2024",
    foto_profile: "https://ui-avatars.com/api/?name=Daus+sedap&background=4f46e5&color=fff&bold=true",
    user_id: mhs2User?.id,
  }, { onConflict: "nim" });

  console.log("\n========================================================");
  console.log("✅ RESET DATABASE BERHASIL! DAPAT DIGUNAKAN UNTUK TESTING FRESH STATE:");
  console.log("1. Admin Kaprodi  : admin.fik@amikom.ac.id / Admin123!");
  console.log("2. Dosen DPL      : indah.susanti@amikom.ac.id / Admin123!");
  console.log("3. Supervisor     : rian.hidayat@goto.com / Admin123!");
  console.log("4. Mahasiswa #1   : NIM 24.11.6666 / Password: 12345678 (fathur.6666@students.amikom.ac.id)");
  console.log("5. Mahasiswa #2   : NIM 24.11.5556 / Password: 12345678 (rebelzi8@gmail.com)");
  console.log("========================================================\n");
}

if (require.main === module) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Reset Error:", err);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
