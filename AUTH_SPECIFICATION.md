# 🔐 AUTHENTICATION & USER MANAGEMENT SPECIFICATION
**Application Name:** UNIKA.IN (Sistem Konversi Nilai Magang Berbasis OBE)  
**Authentication Type:** JWT (JSON Web Token) + Role-Based Access Control (RBAC)  
**Email Service:** Resend / Nodemailer (Credentials Mailer Engine)

---

## 🎯 1. AUTHENTICATION RULES & ACCESSIBILITY MATRIX

### 1. Mahasiswa (Self-Registration & Login)
* **Register:** BISA melakukan pendaftaran mandiri melalui form registrasi di aplikasi **UNIKA.IN**.
* **Identifier Login:** NIM / Email & Password.
* **Requirements:** Mengisi NIM, Nama Lengkap, Prodi, Angkatan, Email Aktif, dan Password.

### 2. Admin Prodi / Kaprodi (Super Admin - Pre-seeded & Admin Management)
* **Register:** **TIDAK BISA** registrasi mandiri.
* **Account Creation:** Akun awal di-seed melalui database (Seeder). Admin Prodi yang ada dapat membuatkan akun untuk Admin/Kaprodi baru jika diperlukan.
* **Identifier Login:** Email / Username & Password.

### 3. Dosen Pembimbing Lapangan / DPL (Admin-Created Only)
* **Register:** **TIDAK BISA** registrasi mandiri.
* **Account Creation:** Dibuatkan secara eksklusif oleh **Admin Prodi** melalui Dashboard Admin UNIKA.IN.
* **Identifier Login:** NIDN / Email & Password.
* **Automation:** Setelah Admin Prodi membuat akun, sistem otomatis mengirimkan **Email Kredensial UNIKA.IN** (Email & Random Password) ke inbox DPL.

### 4. Mitra Industri / Supervisor (Admin-Created Only + Magic Link Option)
* **Register:** **TIDAK BISA** registrasi mandiri.
* **Account Creation:** Dibuatkan oleh **Admin Prodi** (atau otomatis saat pengajuan magang disetujui) menggunakan data Email Supervisor yang diinput Mahasiswa.
* **Identifier Login:** Email & Password.
* **Automation:** Sistem otomatis mengirimkan **Email Kredensial UNIKA.IN** (Email & Auto-generated Password) ke Supervisor Mitra untuk login ke portal.

---

## 🔄 2. AUTOMATED CREDENTIALS MAIL WORKFLOW

```
                            [ ADMIN PRODI ]
                                   │
                  Membuka Form "Tambah DPL / Mitra"
                                   │
                                   ▼
              System Generator: Random Secure Password
             (e.g., "Dosen#8291" / "Mtr#9932")
                                   │
                                   ▼
               Save User to Database (Is_Active = True)
                                   │
                                   ▼
                 [ RESEND / NODEMAILER MAIL ENGINE ]
                                   │
     ┌─────────────────────────────┴─────────────────────────────┐
     │                                                           │
     ▼                                                           ▼
[ EMAIL KE DOSEN / DPL ]                                   [ EMAIL KE MITRA INDUSTRI ]
Subject: Akun Akses Dosen Pembimbing - UNIKA.IN            Subject: Akun Akses Partner Mitra - UNIKA.IN
Content:                                                   Content:
• Email: dosen@amikom.ac.id                                • Email: mentor@company.com
• Password Sementara: [Dosen#8291]                         • Password Sementara: [Mtr#9932]
• Link Login: https://unika.in/login                       • Link Login: https://unika.in/login
```

---

## 🗄️ 3. DATABASE SCHEMA UPDATE (POSTGRESQL DDL)

```sql
-- TABEL MASTER USERS UNTUK AUTHENTICATION UNIKA.IN
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('MAHASISWA', 'DPL', 'MITRA', 'ADMIN_PRODI')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MAHASISWA
CREATE TABLE mahasiswa (
  nim VARCHAR(20) PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL,
  prodi VARCHAR(50) NOT NULL,
  angkatan VARCHAR(10),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255)
);

-- DOSEN PEMBIMBING LAPANGAN (DPL)
CREATE TABLE dosen_pembimbing (
  nidn VARCHAR(20) PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL,
  bidang_keahlian VARCHAR(100),
  email VARCHAR(100) UNIQUE NOT NULL,
  foto_profile VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

-- MITRA INDUSTRI
CREATE TABLE mitra_industri (
  id_mitra SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama_perusahaan VARCHAR(150) NOT NULL,
  nama_supervisor VARCHAR(100),
  email_supervisor VARCHAR(100),
  kategori_industri VARCHAR(100),
  bidang_usaha VARCHAR(100),
  kontak_pic VARCHAR(100)
);

-- ADMIN / KAPRODI
CREATE TABLE admin_kaprodi (
  id_admin SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  nama VARCHAR(100) NOT NULL,
  jabatan VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);
```

---

## ⚡ 4. EXPRESS.JS REST API ENDPOINTS

### A. Public Routes (Authentikasi & Self-Registration)

#### 1. Registrasi Mandiri Mahasiswa
`POST /api/v1/auth/register-mahasiswa`

* **Request Body:**
  ```json
  {
    "nim": "21.11.4005",
    "nama": "Rizky Ramadhan",
    "email": "rizky.ramadhan@students.amikom.ac.id",
    "password": "Password123"
  }
  ```

* **Response Success (201 Created):**
  ```json
  {
    "message": "Registrasi mahasiswa berhasil",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 6,
      "email": "rizky.ramadhan@students.amikom.ac.id",
      "role": "MAHASISWA",
      "profile": {
        "nim": "21.11.4005",
        "nama": "Rizky Ramadhan",
        "prodi": "Informatika"
      }
    }
  }
  ```

#### 2. Login User (Dukungan Email / NIM / NIDN)
`POST /api/v1/auth/login`

* **Request Body:**
  ```json
  {
    "email_or_identifier": "kaprodi.if@amikom.ac.id",
    "password": "Admin#1234"
  }
  ```

* **Response Success (200 OK):**
  ```json
  {
    "message": "Login berhasil",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "kaprodi.if@amikom.ac.id",
      "role": "ADMIN_PRODI",
      "profile": {
        "id_admin": 1,
        "nama": "Dr. Amiruddin, M.T.",
        "jabatan": "Ketua Program Studi S1 Informatika"
      }
    }
  }
  ```

#### 3. Current User Profile
`GET /api/v1/auth/me` *(Requires Authorization: Bearer JWT)*

* **Response Success (200 OK):**
  ```json
  {
    "data": {
      "id": 1,
      "email": "kaprodi.if@amikom.ac.id",
      "role": "ADMIN_PRODI",
      "is_active": true,
      "profile": {
        "id_admin": 1,
        "nama": "Dr. Amiruddin, M.T.",
        "jabatan": "Ketua Program Studi S1 Informatika"
      }
    }
  }
  ```

---

### B. Admin Protected Routes (RBAC: Requires `ADMIN_PRODI` JWT Token)

#### 1. Tambah Akun DPL oleh Admin Prodi
`POST /api/v1/admin/create-dpl` *(Requires Authorization: Bearer Admin JWT)*

* **Request Body:**
  ```json
  {
    "nidn": "0519049003",
    "nama": "Fitriani, M.T.",
    "email": "fitriani@amikom.ac.id"
  }
  ```

* **Response Success (201 Created):**
  ```json
  {
    "message": "Akun DPL berhasil dibuat & kredensial telah dikirim via email",
    "data": {
      "nidn": "0519049003",
      "user_id": 7,
      "nama": "Fitriani, M.T.",
      "email": "fitriani@amikom.ac.id",
      "temporary_password": "Dosen#8291"
    }
  }
  ```

#### 2. Tambah Akun Supervisor Mitra oleh Admin Prodi
`POST /api/v1/admin/create-mitra` *(Requires Authorization: Bearer Admin JWT)*

* **Request Body:**
  ```json
  {
    "nama_perusahaan": "PT Bukalapak.com Tbk",
    "nama_supervisor": "Hendra Wijaya",
    "email": "hendra.wijaya@bukalapak.com",
    "bidang_usaha": "E-Commerce & Digital Platform"
  }
  ```

* **Response Success (201 Created):**
  ```json
  {
    "message": "Akun Mitra Industri berhasil dibuat & kredensial telah dikirim via email",
    "data": {
      "id_mitra": 4,
      "user_id": 8,
      "nama_perusahaan": "PT Bukalapak.com Tbk",
      "nama_supervisor": "Hendra Wijaya",
      "email_supervisor": "hendra.wijaya@bukalapak.com",
      "temporary_password": "Mtr#9932"
    }
  }
  ```

---

## 🔑 5. DATA KREDENSIAL AWAL & ATURAN LOGIN PER PERAN

Sistem autentikasi mendukung login sesuai dengan jenis identitas masing-masing peran:

| Peran (Role) | Identitas Login Utama (Identifier) | Password Bawaan | Keterangan & Hak Akses |
|---|---|---|---|
| 🎓 **MAHASISWA** | **NIM** (e.g. `21.11.4001`) | `Budi#1234` | Login menggunakan **NIM** & Password |
| 👨‍🏫 **DPL** | **NIDN** (e.g. `0512038901`) | `Dosen#1234` | Login menggunakan **NIDN** & Password |
| 🏢 **MITRA INDUSTRI** | **Email** (`rian.hidayat@goto.com`) | `Mtr#1234` | Login menggunakan **Email** & Password |
| 🏛️ **ADMIN_PRODI** | **Email** (`kaprodi.if@amikom.ac.id`) | `Admin#1234` | Login menggunakan **Email** & Password |

*(Catatan: Endpoint `/api/v1/auth/login` secara fleksibel dapat menerima payload `identifier`, `email`, `nim`, atau `nidn`)*
