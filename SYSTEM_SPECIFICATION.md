# 📄 BIMA REVAMP - FULL SYSTEM ARCHITECTURE & USERFLOW SPECIFICATION

**Project Name:** Konversi Amikom (BIMA Revamp - Hackathon Edition)  
**Architecture:** Decoupled Monorepo Architecture  
  • **Backend:** Node.js + Express.js (REST API + Magic Link Tokens + Socket.io)  
  • **Frontend:** Next.js / React (App Router + Tailwind CSS)  
  • **Database:** PostgreSQL (Prisma ORM / Supabase)  
  • **Mail Engine:** Resend / Nodemailer (Approval Link DPL & Mitra)  
**Deployment Host:** Render / Railway (Backend) + Vercel (Frontend)

---

## 🎯 1. BUSINESS DOMAIN & DASHBOARD INTEGRATION

Aplikasi ini adalah **BIMA Revamp**, portal terintegrasi di lingkup **Prodi S-1 Informatika Universitas AMIKOM Yogyakarta** untuk mengelola konversi magang MBKM berbasis **Outcome-Based Education (OBE)** secara otomatis, transparan, dan objektif.

### 🏛️ Integrasi Alur Fakultas ke Dalam Dashboard:
1. **Recreated Native Form Textfields (Tanpa Google Form External):** Formulir pendaftaran Fakultas (seperti *Surat Pra-Survey*, *Surat Pengantar Magang FIK*, *Penunjukan DPL*, dan *Surat Akhir Magang*) dibuat ulang menjadi form textfield bawaan di dalam **Dashboard Mahasiswa ➔ Fitur Pengajuan Magang**.
2. **Unified Timeline Stepper:** Dashboard menampilkan indikator progres lengkap dari *Tahap Pengajuan Surat Fakultas* hingga *Tahap Konversi OBE Prodi* (Proposal, Usulan CPMK, Logbook, Klaim, & Rilis Nilai).

---

## 🔄 2. INTEGRATED USERFLOW & DASHBOARD STEPPER (`USERFLOW.md`)

```
========================================================================================
DASHBOARD MAHASISWA ➔ FITUR PENGAJUAN MAGANG (SINGLE WINDOW)
[STEP 1: PENGAJUAN SURAT FAKULTAS & PROPOSAL]
├── Form Textfield Native: Jenis Surat, Nama Instansi, Alamat Instansi, Tujuan Surat, Semester, & Tahun Akademik
├── Unggah Draft Proposal Magang -> [REVIEW PRODI INFORMATIKA]
│
▼ (Status: ACC Proposal)
[STEP 2: SURAT PENGANTAR & PENUNJUKAN DPL]
├── Penerbitan Surat Pengantar Magang FIK
└── Penunjukan Dosen Pembimbing Lapangan (DPL) -> Notifikasi DPL via System
│
▼
[STEP 3: USULAN KONVERSI OBE (BIMA REVAMP)]
├── Pemetaan: [Aktivitas Magang] -> [CPMK] -> [Mata Kuliah]
└── [REVIEW OBJECTIVE DPL] ──► (Status: ACC Usulan)
│
▼
[STEP 4: PELAKSANAAN MAGANG & LOGBOOK]
└── Filling Logbook Mingguan (Terintegrasi SEMAR)
│
▼
[STEP 5: KLAIM KONVERSI & FAKULTAS CLOSING]
├── [Action Card] Klik Link Surat Ucapan Terima Kasih Fakultas
└── Upload Bukti: Laporan Akhir, Logbook, Sertifikat, & Surat Balasan
│
▼
[STEP 6: E-EVALUATION & RILIS NILAI]
├── [Mitra Review] via Magic Link Email (Skor 1-100)
├── [DPL Review] via Magic Link Email / Dashboard DPL
└── Auto-Calculate: Nilai Akhir = (70% * Mitra) + (30% * DPL)
│
▼
                  [ PRODI MERILIS NILAI AKHIR (EXCEL EXPORT) ]
========================================================================================
```

---

## 🗄️ 3. DATABASE SCHEMA (POSTGRESQL DDL)

```sql
-- 1. USERS & ROLES
CREATE TABLE mahasiswa (
  nim VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  prodi VARCHAR(50) NOT NULL,
  angkatan VARCHAR(10),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255)
);

CREATE TABLE dosen_pembimbing (
  nidn VARCHAR(20) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE mitra_industri (
  id_mitra SERIAL PRIMARY KEY,
  nama_perusahaan VARCHAR(150) NOT NULL,
  nama_supervisor VARCHAR(100) NOT NULL,
  email_supervisor VARCHAR(100) NOT NULL
);

CREATE TABLE admin_kaprodi (
  id_admin SERIAL PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  jabatan VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

-- 2. TAHAP 1 & INTEGRASI FAKULTAS
CREATE TABLE pengajuan_magang (
  id_pengajuan SERIAL PRIMARY KEY,
  id_magang_fakultas VARCHAR(50) NOT NULL, -- Input manual ID dari Pra-Survey Fakultas
  nim VARCHAR(20) REFERENCES mahasiswa(nim) ON DELETE CASCADE,
  id_mitra INT REFERENCES mitra_industri(id_mitra),
  nidn_dpl VARCHAR(20) REFERENCES dosen_pembimbing(nidn),
  posisi_magang VARCHAR(100) NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  bukti_diterima_url VARCHAR(255) NOT NULL,
  proposal_url VARCHAR(255),
  surat_pengantar_url VARCHAR(255), -- File Bukti dari Fakultas
  status_proposal VARCHAR(50) DEFAULT 'Review Proposal Prodi', -- Review Proposal Prodi -> Revisi -> ACC Proposal
  catatan_revisi_proposal TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. KURIKULUM OBE & TAHAP 2: USULAN KONVERSI
CREATE TABLE mata_kuliah (
  kode_mk VARCHAR(20) PRIMARY KEY,
  nama_mk VARCHAR(100) NOT NULL,
  sks INT NOT NULL
);

CREATE TABLE cpl_cpmk (
  id_cpmk SERIAL PRIMARY KEY,
  kode_mk VARCHAR(20) REFERENCES mata_kuliah(kode_mk) ON DELETE CASCADE,
  kode_cpmk VARCHAR(20) NOT NULL,
  deskripsi_cpmk TEXT NOT NULL
);

CREATE TABLE usulan_konversi (
  id_usulan SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  id_cpmk INT REFERENCES cpl_cpmk(id_cpmk),
  aktivitas_magang TEXT NOT NULL,
  status_usulan VARCHAR(50) DEFAULT 'Review Objective DPL', -- Review Objective DPL -> Revisi -> ACC Usulan
  catatan_revisi_usulan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TAHAP 3, 4, 5: KLAIM KONVERSI & PENILAIAN
CREATE TABLE klaim_konversi (
  id_klaim SERIAL PRIMARY KEY,
  id_usulan INT REFERENCES usulan_konversi(id_usulan) ON DELETE CASCADE,
  bukti_aktivitas TEXT NOT NULL,
  logbook_url VARCHAR(255) NOT NULL,
  laporan_url VARCHAR(255) NOT NULL,
  sertifikat_url VARCHAR(255) NOT NULL,
  surat_balasan_url VARCHAR(255),
  bukti_terima_kasih_fakultas_url VARCHAR(255), -- Bukti penyelesaian form Fakultas
  status_klaim VARCHAR(50) DEFAULT 'Menunggu Penilaian Mitra',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE penilaian_akhir (
  id_penilaian SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  nilai_mitra FLOAT CHECK (nilai_mitra >= 0 AND nilai_mitra <= 100),
  komentar_mitra TEXT,
  nilai_dpl FLOAT CHECK (nilai_dpl >= 0 AND nilai_dpl <= 100),
  komentar_dpl TEXT,
  nilai_akhir_angka FLOAT, -- Formula: (70% * nilai_mitra) + (30% * nilai_dpl)
  nilai_akhir_huruf VARCHAR(5),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. MAGIC LINK TOKENS (APPROVAL BEBAS LOGIN)
CREATE TABLE approval_tokens (
  id_token SERIAL PRIMARY KEY,
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan) ON DELETE CASCADE,
  target_role VARCHAR(20) NOT NULL, -- 'MITRA' atau 'DPL'
  token VARCHAR(255) UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. CHAT REALTIME
CREATE TABLE chat_room (
  id_room SERIAL PRIMARY KEY,
  nim_mahasiswa VARCHAR(20) REFERENCES mahasiswa(nim),
  nidn_dosen VARCHAR(20) REFERENCES dosen_pembimbing(nidn),
  id_pengajuan INT REFERENCES pengajuan_magang(id_pengajuan),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_message (
  id_message SERIAL PRIMARY KEY,
  id_room INT REFERENCES chat_room(id_room) ON DELETE CASCADE,
  sender_email VARCHAR(100) NOT NULL,
  sender_role VARCHAR(30) NOT NULL,
  pesan TEXT NOT NULL,
  attachment_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
