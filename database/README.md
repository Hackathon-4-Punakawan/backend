# Database

Folder ini berisi schema PostgreSQL untuk aplikasi Konversi Amikom.

## File

- `schema.sql`: DDL utama untuk membuat tabel, relasi foreign key, constraint, default value, dan index.

## Cara Menjalankan

Via `psql`:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

Via Supabase SQL Editor:

1. Buka project Supabase.
2. Masuk ke menu SQL Editor.
3. Paste isi `database/schema.sql`.
4. Jalankan query.

## Catatan

- Schema menggunakan `CREATE TABLE IF NOT EXISTS`, sehingga aman jika tabel belum ada.
- Jika struktur tabel yang sudah ada berbeda, PostgreSQL tidak akan otomatis mengubah kolom existing. Perubahan lanjutan sebaiknya dibuat sebagai migration baru.
