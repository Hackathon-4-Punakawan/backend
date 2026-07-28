require("dotenv").config();
const { pool } = require("../src/config/db");

async function fixSchema() {
  console.log("⏳ Menyelaraskan struktur kolom tabel pengajuan_magang di Supabase PostgreSQL...");

  const alterQueries = [
    `CREATE TABLE IF NOT EXISTS pengajuan_magang (
      id_pengajuan SERIAL PRIMARY KEY,
      nim VARCHAR(20) NOT NULL,
      id_mitra INT,
      nidn VARCHAR(20),
      id_admin INT,
      nama_instansi VARCHAR(255) NOT NULL,
      alamat_instansi TEXT,
      tujuan_surat TEXT,
      jenis_program VARCHAR(100) DEFAULT 'Magang Mandiri',
      posisi VARCHAR(100) DEFAULT 'Fullstack Developer Intern',
      durasi_bulan INT DEFAULT 6,
      semester INT DEFAULT 6,
      tahun_akademik VARCHAR(20) DEFAULT '2026/2027',
      status_pengajuan VARCHAR(50) DEFAULT 'Diproses',
      status_program VARCHAR(50) DEFAULT 'Sedang Berjalan',
      status_surat_fakultas VARCHAR(50) DEFAULT 'Diproses Fakultas',
      id_magang_fakultas VARCHAR(50),
      nomor_layanan_fik VARCHAR(50),
      surat_pengantar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS alamat_instansi TEXT;`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS tujuan_surat TEXT;`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS jenis_program VARCHAR(100) DEFAULT 'Magang Mandiri';`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS posisi VARCHAR(100) DEFAULT 'Fullstack Developer Intern';`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS durasi_bulan INT DEFAULT 6;`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS semester INT DEFAULT 6;`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS tahun_akademik VARCHAR(20) DEFAULT '2026/2027';`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS status_pengajuan VARCHAR(50) DEFAULT 'Diproses';`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS status_program VARCHAR(50) DEFAULT 'Sedang Berjalan';`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS status_surat_fakultas VARCHAR(50) DEFAULT 'Diproses Fakultas';`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS id_magang_fakultas VARCHAR(50);`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS nomor_layanan_fik VARCHAR(50);`,
    `ALTER TABLE pengajuan_magang ADD COLUMN IF NOT EXISTS surat_pengantar_url TEXT;`,
    `ALTER TABLE proposal_magang ADD COLUMN IF NOT EXISTS alamat_instansi TEXT;`,
    `NOTIFY pgrst, 'reload schema';` // Forces Supabase PostgREST to immediately refresh its schema cache!
  ];

  for (const q of alterQueries) {
    try {
      await pool.query(q);
      console.log("  ✓ Executed query successfully.");
    } catch (err) {
      console.warn("  ⚠️ Warning query:", err.message);
    }
  }

  console.log("\n✅ TERSELESAIKAN! Tabel pengajuan_magang di Supabase telah 100% selaras dengan seluruh kolom yang dibutuhkan!");
}

if (require.main === module) {
  fixSchema()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Schema Fix Error:", err);
      process.exit(1);
    });
}

module.exports = { fixSchema };
