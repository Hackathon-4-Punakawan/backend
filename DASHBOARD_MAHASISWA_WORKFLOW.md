# Dokumentasi Workflow & REST API: Dashboard Mahasiswa (Konversi MBKM Amikom)

Dokumen ini berisi panduan lengkap integrasi dan spesifikasi REST API untuk **Dashboard Mahasiswa Konversi MBKM**.

---

## 📌 Base Endpoint URL

```http
GET /api/v1/mahasiswa/dashboard
GET /api/v1/dashboard/mahasiswa
```

- **Authentication Required**: `Bearer <JWT_TOKEN>` (Header `Authorization`) atau opsional query parameter `?nim=24.11.6666` untuk kemudahan testing.
- **Roles**: `MAHASISWA` (atau `ADMIN_PRODI` / `DPL` untuk monitoring dashboard mahasiswa).

---

## 🎨 Komponen UI Dashboard & Struktur Data JSON

API ini mengembalikan seluruh data yang dibutuhkan oleh komponen UI Dashboard Mahasiswa dalam 1 kali panggilan request (*single-call aggregate endpoint*):

| No | Komponen UI | Field JSON Utama | Keterangan |
| :--- | :--- | :--- | :--- |
| 1 | **Profile Header** | `data.mahasiswa` | Nama, NIM, Email, Prodi, Angkatan, Foto Profile |
| 2 | **Hero Card (Purple)** | `data.hero_card` | Status Badge, Nama Instansi, Target Konversi (20/20 SKS, % Tercapai), Metric Pills |
| 3 | **Dosen Pembimbing Widget** | `data.dosen_pembimbing` | Nama DPL, NIDN, Inisial, Role Tag, Email DPL, Kontak WA |
| 4 | **Surat Akhir & Ucapan Terima Kasih** | `data.surat_akhir_terima_kasih` | Status Badge (`SIAP AJUKAN` / `SUDAH DIAJUKAN` / `SUDAH DINILAI MITRA`), Email, Periode, Tgl Mulai/Selesai, Button State |
| 5 | **Progress Konversi per MK Widget** | `data.progress_konversi_mk` | List progress per MK (% progress, warna badge status) |
| 6 | **Status Konversi Table** | `data.status_konversi_table` | Rincian tabel MK, SKS, Objective Pekerjaan, Nilai Angka, Nilai Huruf, Catatan DPL |

---

## 📄 Contoh JSON Response (`200 OK`)

```json
{
  "status": 200,
  "message": "Data Dashboard Mahasiswa berhasil diambil",
  "data": {
    "mahasiswa": {
      "nim": "24.11.6666",
      "nama": "Fathur Rahman",
      "email": "fathur.6666@students.amikom.ac.id",
      "prodi": "Informatika",
      "angkatan": "2024",
      "foto_profile": "https://ui-avatars.com/api/?name=Fathur+Rahman&background=4f46e5&color=fff&bold=true"
    },
    "hero_card": {
      "status_badge": "SELESAI VALIDASI",
      "jenis_program": "Magang Mandiri",
      "nama_instansi": "PT GoTo Gojek Tokopedia Tbk",
      "target_konversi": {
        "disetujui_sks": 20,
        "target_sks": 20,
        "persentase": 100,
        "label": "Target Konversi 20 / 20 SKS",
        "tercapai_label": "100% Tercapai"
      },
      "metrics": {
        "mk_diajukan": 5,
        "disetujui_kaprodi": 5,
        "proses_dosen": 0,
        "durasi_magang": "6 Bulan"
      }
    },
    "dosen_pembimbing": {
      "nidn": "0512038901",
      "nama": "Dr. Indah Susanti, M.Kom",
      "role_tag": "DOSEN INFORMATIKA",
      "bidang_keahlian": "Software Engineering & Web Dev",
      "email": "indah.susanti@amikom.ac.id",
      "telepon": "+62 812-3456-7890",
      "foto_profile": "https://ui-avatars.com/api/?name=Dr.+Indah+Susanti%2C+M.Kom&background=0284c7&color=fff&bold=true",
      "inisial": "IS"
    },
    "surat_akhir_terima_kasih": {
      "judul": "PENGAJUAN SURAT AKHIR DAN UCAPAN TERIMA KASIH MAGANG MAHASISWA FAKULTAS ILMU KOMPUTER",
      "deskripsi": "Pengajuan administrasi akhir setelah selesai melaksanakan program magang.",
      "badge_status": "SUDAH DINILAI MITRA",
      "email": "fathur.6666@students.amikom.ac.id",
      "periode_magang": "6 Bulan",
      "tanggal_mulai_magang": "2026-07-27",
      "tanggal_berakhir_magang": "2026-12-27",
      "is_submitted": true,
      "surat_terima_kasih_url": "https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-FIK24116666.pdf",
      "nilai_mitra_angka": 95,
      "nilai_mitra_huruf": "A",
      "catatan_mitra": "Fathur Rahman berkinerja luar biasa, proaktif, disiplin, dan mahir menguasai REST API, microservices Node.js, dan database PostgreSQL.",
      "sertifikat_magang_url": "https://drive.google.com/file/d/sertifikat_goto_24_11_6666.pdf",
      "action_button": {
        "label": "Surat Akhir & Terima Kasih Telah Diajukan",
        "is_enabled": false
      }
    },
    "progress_konversi_mk": {
      "judul": "Progress Konversi per Mata Kuliah",
      "deskripsi": "Pantau tahapan validasi untuk setiap mata kuliah.",
      "items": [
        {
          "kode_mk": "ST084",
          "nama_mk": "Pemrograman Web",
          "sks": 4,
          "status": "Disetujui DPL",
          "progress_percent": 100,
          "color": "green"
        },
        {
          "kode_mk": "ST116",
          "nama_mk": "Pemrograman Basis Data",
          "sks": 4,
          "status": "Disetujui DPL",
          "progress_percent": 100,
          "color": "green"
        },
        {
          "kode_mk": "ST091",
          "nama_mk": "Analisis dan Desain Sistem Informasi",
          "sks": 4,
          "status": "Disetujui DPL",
          "progress_percent": 100,
          "color": "green"
        },
        {
          "kode_mk": "ST055",
          "nama_mk": "Kecerdasan Buatan (Artificial Intelligence)",
          "sks": 4,
          "status": "Disetujui DPL",
          "progress_percent": 100,
          "color": "green"
        },
        {
          "kode_mk": "ST062",
          "nama_mk": "Jaringan Komputer dan Cloud",
          "sks": 4,
          "status": "Disetujui DPL",
          "progress_percent": 100,
          "color": "green"
        }
      ]
    },
    "status_konversi_table": {
      "judul": "Status Konversi Mata Kuliah",
      "deskripsi": "Detail pemetaan modul Industri ke mata kuliah universitas.",
      "action_button": "Simpan Nilai",
      "rows": [
        {
          "kode_mk": "ST084",
          "nama_mk": "Pemrograman Web",
          "mk_label": "ST084 - Pemrograman Web",
          "sks": 4,
          "objective": "Merancang & mendeploy dashboard React.js responsif.",
          "nilai_angka": 95,
          "nilai_huruf": "A",
          "status": "Disetujui DPL",
          "catatan_dosen": "Sangat baik, arsitektur frontend rapi."
        },
        {
          "kode_mk": "ST116",
          "nama_mk": "Pemrograman Basis Data",
          "mk_label": "ST116 - Pemrograman Basis Data",
          "sks": 4,
          "objective": "Mengoptimalkan query PostgreSQL & RLS Policy.",
          "nilai_angka": 92,
          "nilai_huruf": "A",
          "status": "Disetujui DPL",
          "catatan_dosen": "Query optimization & indexing sangat bagus."
        },
        {
          "kode_mk": "ST091",
          "nama_mk": "Analisis dan Desain Sistem Informasi",
          "mk_label": "ST091 - Analisis dan Desain Sistem Informasi",
          "sks": 4,
          "objective": "Menyusun dokumentasi arsitektur sistem & Sequence Diagram.",
          "nilai_angka": 90,
          "nilai_huruf": "A",
          "status": "Disetujui DPL",
          "catatan_dosen": "Dokumentasi sangat lengkap."
        },
        {
          "kode_mk": "ST055",
          "nama_mk": "Kecerdasan Buatan (Artificial Intelligence)",
          "mk_label": "ST055 - Kecerdasan Buatan (Artificial Intelligence)",
          "sks": 4,
          "objective": "Membangun REST API Express.js & integrasi AI recommendation.",
          "nilai_angka": 88,
          "nilai_huruf": "A",
          "status": "Disetujui DPL",
          "catatan_dosen": "Integrasi AI sangat canggih."
        },
        {
          "kode_mk": "ST062",
          "nama_mk": "Jaringan Komputer dan Cloud",
          "mk_label": "ST062 - Jaringan Komputer dan Cloud",
          "sks": 4,
          "objective": "Deployment cloud microservices & CI/CD pipeline.",
          "nilai_angka": 94,
          "nilai_huruf": "A",
          "status": "Disetujui DPL",
          "catatan_dosen": "CI/CD pipeline berjalan tanpa hambatan."
        }
      ]
    }
  }
}
```

---

## 🖥️ Contoh Panggilan cURL

```bash
curl -X GET "http://localhost:3001/api/v1/mahasiswa/dashboard" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Atau uji coba spesifik NIM:

```bash
curl -X GET "http://localhost:3001/api/v1/mahasiswa/dashboard?nim=24.11.6666" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```
