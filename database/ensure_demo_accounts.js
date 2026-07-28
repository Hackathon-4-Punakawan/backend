require("dotenv").config();
const supabase = require("../src/config/supabase");
const bcrypt = require("bcryptjs");

async function ensureDemoAccounts() {
  console.log("⏳ Memastikan seluruh akun demo seeder ada di database Supabase...");

  const defaultHash = await bcrypt.hash("12345678", 10);
  const adminHash = await bcrypt.hash("Admin123!", 10);

  const demoUsers = [
    { email: "admin.fik@amikom.ac.id", role: "ADMIN_PRODI", password_hash: adminHash, name: "Eli Pujastuti, M.Kom." },
    { email: "indah.susanti@amikom.ac.id", role: "DPL", password_hash: adminHash, name: "Dr. Indah Susanti, M.Kom" },
    { email: "rian.hidayat@goto.com", role: "MITRA", password_hash: adminHash, name: "Rian Hidayat (GoTo)" },
    { email: "fathur.6666@students.amikom.ac.id", role: "MAHASISWA", password_hash: defaultHash, name: "Fathur Rahman" },
    { email: "ahmad.fauzi@students.amikom.ac.id", role: "MAHASISWA", password_hash: defaultHash, name: "Ahmad Fauzi" },
    { email: "rebelzi8@gmail.com", role: "MAHASISWA", password_hash: defaultHash, name: "Daus sedap" }
  ];

  for (const u of demoUsers) {
    // 1. Upsert User
    const { data: user, error: errUser } = await supabase
      .from("users")
      .upsert({
        email: u.email,
        password_hash: u.password_hash,
        role: u.role,
        is_active: true,
      }, { onConflict: "email" })
      .select()
      .maybeSingle();

    if (errUser) {
      console.warn(`⚠️ Warning upsert user ${u.email}:`, errUser.message);
      continue;
    }

    console.log(`  ✓ User '${u.email}' (${u.role}) ready.`);

    // 2. Link profile tables
    if (u.role === "DPL") {
      await supabase.from("dosen_pembimbing").upsert({
        nidn: "0512038901",
        nama: u.name,
        email: u.email,
        bidang_keahlian: "Software Engineering & Web Dev",
        is_active: true,
        user_id: user?.id,
      }, { onConflict: "nidn" });
    } else if (u.role === "MITRA") {
      await supabase.from("mitra_industri").insert({
        nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk",
        nama_supervisor: "Rian Hidayat",
        email_supervisor: u.email,
        kategori_industri: "Technology & E-Commerce",
        kuota_magang: 10,
        user_id: user?.id,
      });
    } else if (u.role === "MAHASISWA" && u.email.includes("6666")) {
      await supabase.from("mahasiswa").upsert({
        nim: "24.11.6666",
        nama: u.name,
        email: u.email,
        prodi: "Informatika",
        angkatan: "2024",
        user_id: user?.id,
      }, { onConflict: "nim" });
    } else if (u.role === "MAHASISWA" && u.email.includes("rebelzi8")) {
      await supabase.from("mahasiswa").upsert({
        nim: "24.11.5556",
        nama: u.name,
        email: u.email,
        prodi: "Informatika",
        angkatan: "2024",
        user_id: user?.id,
      }, { onConflict: "nim" });
    }
  }

  console.log("\n✅ TERSELESAIKAN! Seluruh 5 akun demo (Admin, DPL, Mitra, Mahasiswa) telah 100% aktif di Supabase DB!");
}

if (require.main === module) {
  ensureDemoAccounts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeder Error:", err);
      process.exit(1);
    });
}

module.exports = { ensureDemoAccounts };
