# 📦 Dokumentasi & Spesifikasi Data Seeder (Multi-DPL & Mahasiswa Konversi SKS)

Dokumen ini menjelaskan struktur data dummy (**seeders**), pemetaan mahasiswa bimbingan antar DPL, master data akademik, mitra industri, serta panduan bagaimana menjalankan seeder ke database Supabase / PostgreSQL.

---

## 📌 1. Ikhtisar Data Seeder

Seeder dirancang untuk menyajikan skenario riil pengujian sistem **BIMA (MBKM Amikom)** dengan variasi:
- **5 Dosen Pembimbing Lapangan (DPL)** dengan keahlian & NIDN berbeda.
- **10 Mahasiswa Informatika** yang mengambil program magang MSIB / Mandiri.
- **9 Mitra Industri** skala nasional & unicorn technology.
- **3 Variasi Status Konversi**: `Disetujui DPL`, `Menunggu Review DPL`, dan `Revisi DPL` *(lengkap dengan catatan revisi DPL)*.

---

## 👨‍🏫 2. Master Data Dosen Pembimbing Lapangan (DPL)

| NIDN | Nama Dosen | Bidang Keahlian | Email | Akses Login (Password) |
| :--- | :--- | :--- | :--- | :--- |
| `0512038901` | Dr. Indah Susanti, M.Kom | Software Engineering & Web Dev | `indah.susanti@amikom.ac.id` | `Dosen#1234` |
| `0515088502` | Bambang Kurniawan, M.Eng | Artificial Intelligence & Data Science | `bambang.k@amikom.ac.id` | `Dosen#1234` |
| `0509077801` | Dr. Kusrini, M.Kom. | Business Intelligence & Data Mining | `kusrini@amikom.ac.id` | `Dosen#1234` |
| `0522108201` | Andi Sunyoto, M.Kom. | Cloud Infrastructure & Computer Network | `andi.sunyoto@amikom.ac.id` | `Dosen#1234` |
| `0518048601` | Dharmawan, M.T. | Mobile Programming & Cyber Security | `dharmawan@amikom.ac.id` | `Dosen#1234` |

---

## 🎓 3. Tabel Pemetaan Mahasiswa, DPL, Mitra & Status Konversi

| NIM | Nama Mahasiswa | DPL Pembimbing | Mitra Industri & Posisi | ID Magang FIK | Total SKS | Status Konversi |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `21.11.4001` | Budi Santoso | Dr. Indah Susanti, M.Kom | PT GoTo Gojek Tokopedia Tbk *(Fullstack Dev)* | `FIK6199373` | 20 SKS | **Disetujui DPL** |
| `21.11.4002` | Siti Rahmawati | Bambang Kurniawan, M.Eng | PT Telkom Indonesia *(Cloud Engineer)* | `FIK6199374` | 20 SKS | **Menunggu Review DPL** |
| `21.11.4003` | Ahmad Rizky | Dr. Kusrini, M.Kom. | PT Bank BCA Tbk *(Data Analyst)* | `FIK6199375` | 20 SKS | **Revisi DPL** *(Catatan revisi ada)* |
| `21.11.4004` | Dewa Pratama | Andi Sunyoto, M.Kom. | PT Tokopedia *(DevOps Engineer)* | `FIK6199376` | 20 SKS | **Disetujui DPL** |
| `21.11.4005` | Nabila Putri | Dharmawan, M.T. | PT Shopee Indonesia *(Mobile Developer)* | `FIK6199377` | 20 SKS | **Menunggu Review DPL** |
| `21.11.4006` | Ramadhan Supriadi | Dr. Indah Susanti, M.Kom | PT Amikom Tech Digital *(Fullstack Web)* | `FIK6199378` | 20 SKS | **Menunggu Review DPL** |
| `21.11.4007` | Fadhil Azhar | Bambang Kurniawan, M.Eng | PT Nodeflux *(AI & Computer Vision)* | `FIK6199379` | 20 SKS | **Disetujui DPL** |
| `21.11.4008` | Clarissa Anindya | Dr. Kusrini, M.Kom. | PT Traveloka Indonesia *(Product Data Scientist)* | `FIK6199380` | 20 SKS | **Revisi DPL** *(Catatan revisi ada)* |
| `21.11.4009` | Muhammad Farhan | Andi Sunyoto, M.Kom. | PT Biznet Networks *(Cyber Security)* | `FIK6199381` | 20 SKS | **Menunggu Review DPL** |
| `21.11.4010` | Stephanie Vania | Dharmawan, M.T. | PT Blibli *(iOS Developer Intern)* | `FIK6199382` | 20 SKS | **Disetujui DPL** |

*Catatan: Semua Mahasiswa di atas dapat digunakan untuk login dengan password default:* `Budi#1234`.

---

## 📚 4. Master Mata Kuliah & CPMK Informatika (OBE)

| Kode MK | Nama Mata Kuliah | SKS | Semester | CPMK Utama |
| :--- | :--- | :--- | :--- | :--- |
| `ST084` | Pemrograman Web | 4 | 6 | CPMK16-Mahasiswa mampu merancang web app responsif |
| `ST116` | Pemrograman Basis Data | 4 | 5 | CPMK15-Mahasiswa mampu mengoptimalkan database relasional & SQL |
| `ST091` | Analisis dan Desain Sistem Informasi | 4 | 6 | CPMK11-Mahasiswa mampu merancang UML & analisis bisnis |
| `ST055` | Arsitektur REST API & Cloud Computing | 4 | 6 | CPMK12-Mahasiswa mampu membangun REST API microservices |
| `ST170` | Rekayasa Perangkat Lunak | 4 | 5 | CPMK-Mahasiswa mampu menerapkan Clean Architecture & TDD |
| `ST143` | Perancangan Jaringan | 4 | 6 | CPMK-Mahasiswa mampu merancang jaringan high availability |
| `ST153` | Big Data & Predictive Analytics | 2 | 6 | CPMK-Mahasiswa mampu mengolah data besar & predictive analytics |
| `ST164` | Kecerdasan Buatan Lanjut | 2 | 6 | CPMK-Mahasiswa mampu menerapkan Deep Learning & Object Detection |
| `ST167` | Proyek Data Mining | 4 | 7 | CPMK-Mahasiswa mampu menerapkan pemodelan data mining & machine learning |

---

## 🛠️ 5. Cara Menjalankan Seeder

### Opsi A: Menggunakan Command Script NPM (Rekomendasi)
```bash
npm run db:seed
```

### Opsi B: Menggunakan Node.js Langsung
```bash
node database/seed.js
```

### Opsi C: Menggunakan PostgreSQL CLI (psql)
```bash
psql -h <HOST> -U <USER> -d <DATABASE> -f database/seeder.sql
```

---

## 🔐 6. Kredensial Login Pengujian

| Role | Identifier (Email / NIM / NIDN) | Password |
| :--- | :--- | :--- |
| **Admin Kaprodi** | `kaprodi.if@amikom.ac.id` | `Admin#1234` |
| **DPL 1 (Indah Susanti)** | `0512038901` atau `indah.susanti@amikom.ac.id` | `Dosen#1234` |
| **DPL 2 (Bambang Kurniawan)** | `0515088502` atau `bambang.k@amikom.ac.id` | `Dosen#1234` |
| **DPL 3 (Dr. Kusrini)** | `0509077801` atau `kusrini@amikom.ac.id` | `Dosen#1234` |
| **DPL 4 (Andi Sunyoto)** | `0522108201` atau `andi.sunyoto@amikom.ac.id` | `Dosen#1234` |
| **DPL 5 (Dharmawan)** | `0518048601` atau `dharmawan@amikom.ac.id` | `Dosen#1234` |
| **Mahasiswa (Budi Santoso)** | `21.11.4001` atau `budi.santoso@students.amikom.ac.id` | `Budi#1234` |
| **Mitra (GoTo)** | `rian.hidayat@goto.com` | `Mtr#1234` |
