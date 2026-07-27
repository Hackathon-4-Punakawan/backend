require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");

async function migrate() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("[YOUR-PASSWORD]")) {
    console.error("❌ Error: Harap isi DATABASE_URL dengan password Supabase yang benar pada file .env!");
    console.log("💡 Tips: Anda juga dapat copy-paste langsung isi database/schema.sql ke SQL Editor di Dashboard Supabase.");
    process.exit(1);
  }

  try {
    console.log("⏳ Menghubungkan ke Supabase & menerapkan schema.sql...");
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");

    await pool.query(sql);
    console.log("✅ Berhasil! Semua tabel, relasi, dan index pada schema.sql telah dibuat di Supabase.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Gagal menjalankan migration ke Supabase:", err);
    process.exit(1);
  }
}

migrate();
