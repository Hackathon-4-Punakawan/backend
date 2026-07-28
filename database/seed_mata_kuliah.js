require("dotenv").config();
const fs = require("fs");
const path = require("path");
const supabase = require("../src/config/supabase");

async function seedMataKuliah() {
  console.log("⏳ Membaca file mk (1).json dan menyelaraskan database mata_kuliah...");

  const jsonPath = path.join(__dirname, "../mk (1).json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ File mk (1).json tidak ditemukan di root backend!");
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, "utf8");
  const mkList = JSON.parse(rawData);

  console.log(`📋 Ditemukan ${mkList.length} mata kuliah dari mk (1).json:`);

  const formattedItems = mkList.map((item, index) => {
    const cpmkText = Array.isArray(item.cpmk)
      ? item.cpmk.map((str, idx) => `${idx + 1}. ${str}`).join("\n")
      : String(item.cpmk || "");

    return {
      id_mk: index + 101,
      kode_mk: item.kode.trim().toUpperCase(),
      nama_mk: item.nama.trim(),
      sks: Number(item.sks),
      semester: 6,
      cpmk: cpmkText,
      cpmk_list: item.cpmk,
      kategori: item.sks === 4 ? "Wajib Prodi" : "Pilihan",
      is_active: true,
    };
  });

  // Additional core subjects commonly used in tests/system if missing
  const defaultExtras = [
    { kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu merancang web app responsif.\n2. Mahasiswa mampu membangun backend REST API.", kategori: "Wajib Prodi", is_active: true },
    { kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu merancang diagram UML.\n2. Mahasiswa mampu merekayasa arsitektur sistem informasi.", kategori: "Wajib Prodi", is_active: true },
    { kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menerapkan algoritma AI.\n2. Mahasiswa mampu mengintegrasikan model machine learning.", kategori: "Pilihan", is_active: true },
    { kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu mengonfigurasi jaringan server.\n2. Mahasiswa mampu mendeploy cloud microservices & CI/CD.", kategori: "Wajib Prodi", is_active: true },
  ];

  for (const extra of defaultExtras) {
    if (!formattedItems.some((i) => i.kode_mk === extra.kode_mk)) {
      formattedItems.push({ id_mk: formattedItems.length + 101, ...extra });
    }
  }

  console.log(`\n⏳ Mengunggah / Upserting ${formattedItems.length} mata kuliah ke Supabase database...`);

  let dbSuccessCount = 0;
  for (const item of formattedItems) {
    const payload = {
      kode_mk: item.kode_mk,
      nama_mk: item.nama_mk,
      sks: item.sks,
      semester: item.semester,
    };

    const { error } = await supabase.from("mata_kuliah").upsert(payload, { onConflict: "kode_mk" });
    if (!error) {
      dbSuccessCount++;
    } else {
      console.warn(`⚠️ Warning Supabase upsert for ${item.kode_mk}:`, error.message);
    }
  }

  console.log(`✅ Berhasil menyelaraskan ${dbSuccessCount} / ${formattedItems.length} Mata Kuliah ke Supabase DB!`);
  return formattedItems;
}

if (require.main === module) {
  seedMataKuliah()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seed Error:", err);
      process.exit(1);
    });
}

module.exports = { seedMataKuliah };
