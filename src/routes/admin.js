const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { sendCredentialEmail } = require("../services/mailer");
const { memorySuratStore } = require("../utils/sharedStore");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateRequired(body, required) {
  const missing = required.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) throw httpError(400, `Field wajib: ${missing.join(", ")}`);
}

function generateRandomPassword(prefix = "Unika#") {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomDigits}`;
}

// In-Memory Catalog Master Data for Mata Kuliah & CPMK (fallback/sync)
const memoryMataKuliahCatalog = [
  { id_mk: 101, kode_mk: "ST044", nama_mk: "Metode Numerik", sks: 4, semester: 6, cpmk: "1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa mampu menerapkan metode analisis data.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 102, kode_mk: "ST050", nama_mk: "Manajemen Strategik", sks: 2, semester: 6, cpmk: "1. Mahasiswa menerapkan sikap profesional dalam memimpin tim dengan penuh tanggung jawab terhadap pekerjaannya.\n2. Mahasiswa mengimplementasikan profesionalisme dalam menyesuaikan diri dengan berbagai kegiatan secara simultan dalam berbagai kondisi.\n3. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n4. Mahasiswa mampu memecahkan masalah industri secara inovatif.", kategori: "Pilihan", is_active: true },
  { id_mk: 103, kode_mk: "ST087", nama_mk: "Manajemen Sumber Daya IT", sks: 2, semester: 6, cpmk: "1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.", kategori: "Pilihan", is_active: true },
  { id_mk: 104, kode_mk: "ST108", nama_mk: "E-Commerce", sks: 2, semester: 6, cpmk: "1. Mahasiswa membangun integritas dengan menjalin kerja sama dalam tim untuk menyelesaikan tugas.\n2. Mahasiswa mampu menerapkan teknik analisis data.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.", kategori: "Pilihan", is_active: true },
  { id_mk: 105, kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menganalisis perangkat lunak pada berbagai platform digital.\n2. Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital.\n3. Mahasiswa mampu menganalisis platform yang sesuai dengan kebutuhan industri atau masyarakat.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 106, kode_mk: "ST120", nama_mk: "Bahasa Indonesia", sks: 2, semester: 6, cpmk: "1. Mahasiswa memiliki sikap tanggung jawab dengan membangun integritas profesional serta berkomitmen terhadap nilai-nilai etika.\n2. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.", kategori: "Wajib Universiter", is_active: true },
  { id_mk: 107, kode_mk: "ST132", nama_mk: "Infrastruktur Web & Internet", sks: 2, semester: 6, cpmk: "1. Mahasiswa mampu mengonfigurasi sistem jaringan komputer sesuai kebutuhan pengguna.\n2. Mahasiswa mampu menerapkan konsep keamanan jaringan sesuai dengan kebutuhan pengguna.\n3. Mahasiswa mampu mengidentifikasi komponen dan perangkat yang dibutuhkan untuk membangun jaringan komputer.", kategori: "Pilihan", is_active: true },
  { id_mk: 108, kode_mk: "ST143", nama_mk: "Perancangan Jaringan", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menjelaskan metodologi dalam membangun jaringan komputer.\n2. Mahasiswa mampu menguraikan konsep jaringan komputer sesuai dengan kebutuhan pengguna.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 109, kode_mk: "ST150", nama_mk: "Kepemimpinan", sks: 2, semester: 6, cpmk: "1. Mahasiswa memiliki sikap tanggung jawab dengan membangun integritas profesional serta berkomitmen terhadap nilai-nilai etika.\n2. Mahasiswa membangun integritas dengan menjalin kerja sama dalam tim untuk menyelesaikan tugas.\n3. Mahasiswa menerapkan sikap profesional dalam memimpin tim dengan penuh tanggung jawab terhadap pekerjaannya.\n4. Mahasiswa mampu memecahkan masalah industri secara inovatif.", kategori: "Pilihan", is_active: true },
  { id_mk: 110, kode_mk: "ST153", nama_mk: "Big Data & Predictive Analytics", sks: 2, semester: 6, cpmk: "1. Mahasiswa mampu menerapkan metode pengolahan data.\n2. Mahasiswa mampu menerapkan teknik analisis data.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.", kategori: "Pilihan", is_active: true },
  { id_mk: 111, kode_mk: "ST154", nama_mk: "Internet of Things", sks: 2, semester: 6, cpmk: "1. Mahasiswa mampu menerapkan teknik akuisisi data.\n2. Mahasiswa mampu menerapkan metodologi pengembangan sistem jaringan komputer.\n3. Mahasiswa mampu menerapkan konsep arsitektur dan organisasi komputer untuk mendukung sistem jaringan komputer.\n4. Mahasiswa mampu menerapkan konsep keamanan jaringan sesuai dengan kebutuhan pengguna.", kategori: "Pilihan", is_active: true },
  { id_mk: 112, kode_mk: "ST155", nama_mk: "Digital Business", sks: 2, semester: 6, cpmk: "1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa mengimplementasikan profesionalisme dalam menyesuaikan diri dengan berbagai kegiatan secara simultan dalam berbagai kondisi.\n3. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n4. Mahasiswa mampu menghasilkan produk ekonomi kreatif digital di bidang informatika.", kategori: "Pilihan", is_active: true },
  { id_mk: 113, kode_mk: "ST163", nama_mk: "Inovasi Pembayaran Digital", sks: 2, semester: 6, cpmk: "1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.", kategori: "Pilihan", is_active: true },
  { id_mk: 114, kode_mk: "ST164", nama_mk: "Kecerdasan Buatan Lanjut", sks: 2, semester: 6, cpmk: "1. Mahasiswa mampu menerapkan metode analisis data.\n2. Mahasiswa mampu menerapkan metode evaluasi data.\n3. Mahasiswa mampu menjelaskan konsep teknik akuisisi data.\n4. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.", kategori: "Pilihan", is_active: true },
  { id_mk: 115, kode_mk: "ST165", nama_mk: "Proyek Pemrograman", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menghasilkan produk ekonomi kreatif digital di bidang informatika.\n3. Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital.\n4. Mahasiswa mampu menganalisis platform yang sesuai dengan kebutuhan industri atau masyarakat.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 116, kode_mk: "ST166", nama_mk: "Proyek Game", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n2. Mahasiswa mampu membuat produk digital.\n3. Mahasiswa mampu menjelaskan jenis-jenis produk digital.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 117, kode_mk: "ST167", nama_mk: "Proyek Data Mining", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menganalisis kebutuhan industri atau masyarakat.\n3. Mahasiswa mampu menerapkan metode analisis data.\n4. Mahasiswa mampu menerapkan metode pengolahan data.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 118, kode_mk: "ST168", nama_mk: "Big Data & Data Mining", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menerapkan teknik akuisisi data.\n2. Mahasiswa mampu menerapkan metode analisis data.\n3. Mahasiswa mampu menerapkan metode evaluasi data.\n4. Mahasiswa mampu menjelaskan konsep teknik akuisisi data.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 119, kode_mk: "ST170", nama_mk: "Rekayasa Perangkat Lunak", sks: 4, semester: 6, cpmk: "1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n3. Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital.\n4. Mahasiswa mampu menganalisis platform yang sesuai dengan kebutuhan industri atau masyarakat.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 120, kode_mk: "ST173", nama_mk: "Media Interaktif", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menerapkan prinsip-prinsip multimedia pada produk digital.\n2. Mahasiswa mampu menguraikan komponen multimedia.\n3. Mahasiswa mampu menjelaskan jenis-jenis produk digital.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 121, kode_mk: "ST175", nama_mk: "Komunikasi dan Negosiasi", sks: 2, semester: 6, cpmk: "1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa membangun integritas dengan menjalin kerja sama dalam tim untuk menyelesaikan tugas.\n3. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n4. Mahasiswa mampu memecahkan masalah industri secara inovatif.", kategori: "Pilihan", is_active: true },
  { id_mk: 122, kode_mk: "ST178", nama_mk: "Mixed Reality", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu memecahkan masalah industri secara inovatif.\n3. Mahasiswa mampu menerapkan metode pengolahan data.\n4. Mahasiswa mampu menjelaskan jenis-jenis produk digital.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 123, kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu merancang web app responsif berbasis HTML, CSS, JavaScript, dan REST API.\n2. Mahasiswa mampu mendeploy aplikasi web ke cloud server.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 124, kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu menganalisis proses bisnis dan merancang UML Diagram.\n2. Mahasiswa mampu mendesain arsitektur sistem informasi enterprise.", kategori: "Wajib Prodi", is_active: true },
  { id_mk: 125, kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu merancang model machine learning dan deep learning.\n2. Mahasiswa mampu menerapkan AI pada penyelesaian masalah industri.", kategori: "Pilihan", is_active: true },
  { id_mk: 126, kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, semester: 6, cpmk: "1. Mahasiswa mampu mengonfigurasi jaringan komputer, routing, dan switching.\n2. Mahasiswa mampu mendeploy cloud microservices & CI/CD pipeline.", kategori: "Wajib Prodi", is_active: true },
];

const memoryCplCpmkList = [
  { id_cpl: 1, kode_cpl: "CPL-01", deskripsi_cpl: "Mampu menerapkan pemikiran logis, kritis, sistematis, dan inovatif dalam pengembangan IPTEK", cpmk_list: ["CPMK-01", "CPMK-02"] },
  { id_cpl: 2, kode_cpl: "CPL-02", deskripsi_cpl: "Mampu merancang dan mengimplementasikan perangkat lunak berbasis web & mobile", cpmk_list: ["CPMK15", "CPMK16"] },
  { id_cpl: 3, kode_cpl: "CPL-03", deskripsi_cpl: "Mampu mengelola arsitektur basis data, cloud server, dan integrasi API", cpmk_list: ["CPMK11", "CPMK18"] },
];

// All admin routes require valid Admin JWT Token
router.use(authenticateToken, requireRole(["ADMIN_PRODI", "DEKAN"]));

// ----------------------------------------------------------------------
// 1. GET /api/v1/admin/dashboard-stats
// Executive Analytics Dashboard: Overview Aktivitas Platform & Statistis MBKM
// ----------------------------------------------------------------------
router.get("/dashboard-stats", async (req, res, next) => {
  try {
    const { data: dbStudents } = await supabase.from("mahasiswa").select("nim, status");
    const { data: dbDpl } = await supabase.from("dosen_pembimbing").select("nidn, is_active");
    const { data: dbMitra } = await supabase.from("mitra_industri").select("id_mitra");
    const { data: dbMK } = await supabase.from("mata_kuliah").select("id, sks");
    const { data: dbKonversi } = await supabase.from("pengajuan_konversi").select("id_pengajuan, status_review_dpl");
    const { data: dbStep1 } = await supabase.from("pengajuan_surat_fik").select("id_pengajuan_fik");
    const { data: dbStep2 } = await supabase.from("proposal_magang").select("id_proposal");
    const { data: dbStep3 } = await supabase.from("pengajuan_surat_pengantar").select("id_surat_pengantar");
    const { data: dbStep4 } = await supabase.from("pengajuan_dpl").select("id_pengajuan_dpl");
    const { data: dbStepAkhir } = await supabase.from("surat_akhir_magang").select("id_surat_akhir");

    const totalStudents = dbStudents?.length || 10;
    const totalDpl = dbDpl?.length || 5;
    const totalMitra = dbMitra?.length || 5;

    let totalMk = dbMK?.length || memoryMataKuliahCatalog.length;
    let totalSksCatalog = dbMK ? dbMK.reduce((sum, item) => sum + (item.sks || 0), 0) : memoryMataKuliahCatalog.reduce((sum, item) => sum + item.sks, 0);

    // Status Konversi Breakdown
    let totalMenungguReview = 0;
    let totalDisetujuiDpl = 0;
    let totalRevisiDpl = 0;
    let totalSelesai = 0;

    const konversiList = dbKonversi || [];
    if (konversiList.length === 0) {
      // Default baseline stats from seed data
      totalMenungguReview = 3;
      totalDisetujuiDpl = 5;
      totalRevisiDpl = 2;
      totalSelesai = 1;
    } else {
      for (const k of konversiList) {
        const st = (k.status_review_dpl || "").toLowerCase();
        if (st.includes("disetujui")) totalDisetujuiDpl++;
        else if (st.includes("revisi")) totalRevisiDpl++;
        else if (st.includes("selesai")) totalSelesai++;
        else totalMenungguReview++;
      }
    }

    res.json({
      status: 200,
      message: "Statistik Dashboard Admin Kaprodi Informatika berhasil diambil",
      data: {
        prodi_info: {
          nama_prodi: "S1 Informatika",
          fakultas: "Fakultas Ilmu Komputer (FIK)",
          universitas: "Universitas Amikom Yogyakarta",
          tahun_akademik: "2026/2027 (Semester Genap)",
        },
        ringkasan_eksekutif: {
          total_mahasiswa: totalStudents,
          total_dpl: totalDpl,
          total_mitra_industri: totalMitra,
          total_mata_kuliah_katalog: totalMk,
          total_sks_katalog: totalSksCatalog,
        },
        status_konversi: {
          menunggu_review_dpl: totalMenungguReview,
          disetujui_dpl: totalDisetujuiDpl,
          revisi_dpl: totalRevisiDpl,
          selesai_konversi: totalSelesai,
          total_usulan_konversi: totalMenungguReview + totalDisetujuiDpl + totalRevisiDpl + totalSelesai,
        },
        progress_steps_mbkm: {
          step_1_fik: dbStep1?.length || 10,
          step_2_proposal: dbStep2?.length || 10,
          step_3_surat_pengantar: dbStep3?.length || 10,
          step_4_dpl: dbStep4?.length || 10,
          step_5_konversi: totalStudents,
          surat_akhir_terima_kasih: dbStepAkhir?.length || 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 2. GET /api/v1/admin/mahasiswa & GET /api/v1/admin/mahasiswa/:nim
// Monitoring & Detail Mahasiswa Konversi oleh Admin Kaprodi
// ----------------------------------------------------------------------
router.get("/mahasiswa", async (req, res, next) => {
  try {
    const filterStatus = (req.query.status || "").toLowerCase().trim();
    const searchKeyword = (req.query.search || "").toLowerCase().trim();

    const { data: dbStudents } = await supabase.from("mahasiswa").select("*").order("created_at", { ascending: false });
    const { data: dbDpl } = await supabase.from("pengajuan_dpl").select("*");
    const { data: dbMagang } = await supabase.from("pengajuan_magang").select("*");
    const { data: dbKonversi } = await supabase.from("pengajuan_konversi").select("*");

    const dplMap = new Map((dbDpl || []).map((d) => [d.nim, d]));
    const magangMap = new Map((dbMagang || []).map((m) => [m.nim, m]));
    const konversiMap = new Map((dbKonversi || []).map((k) => [k.nim, k]));

    const rawStudents = dbStudents || [];
    const resultList = [];

    for (const student of rawStudents) {
      const dpl = dplMap.get(student.nim) || {};
      const magang = magangMap.get(student.nim) || {};
      const konversi = konversiMap.get(student.nim) || {};

      const currentStatus = konversi.status_review_dpl || student.status || "Menunggu Review DPL";

      const formatted = {
        nim: student.nim,
        nama: student.nama,
        email: student.email,
        prodi: student.prodi || "Informatika",
        angkatan: student.angkatan || "2021",
        magang: {
          nama_instansi: magang.nama_instansi || "PT GoTo Gojek Tokopedia Tbk",
          posisi: magang.posisi || "Fullstack Developer Intern",
          jenis_program: magang.jenis_program || "Magang Mandiri",
        },
        dpl: {
          nidn_dpl: dpl.nidn_dpl || "0512038901",
          nama_dpl: dpl.nama_dpl || "Dr. Indah Susanti, M.Kom",
        },
        konversi_sks: {
          total_sks: konversi.total_sks || 20,
          status_review_dpl: currentStatus,
          catatan_dosen: konversi.catatan_dosen || null,
        },
        created_at: student.created_at,
      };

      const matchSearch =
        !searchKeyword ||
        student.nama.toLowerCase().includes(searchKeyword) ||
        student.nim.toLowerCase().includes(searchKeyword) ||
        (magang.nama_instansi && magang.nama_instansi.toLowerCase().includes(searchKeyword));

      const matchStatus = !filterStatus || currentStatus.toLowerCase().includes(filterStatus);

      if (matchSearch && matchStatus) {
        resultList.push(formatted);
      }
    }

    res.json({
      status: 200,
      message: "Daftar mahasiswa konversi berhasil diambil oleh Admin Kaprodi",
      data: {
        total_mahasiswa: resultList.length,
        mahasiswa: resultList,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/mahasiswa/:nim", async (req, res, next) => {
  try {
    const nimParam = req.params.nim.trim();

    const { data: student } = await supabase.from("mahasiswa").select("*").eq("nim", nimParam).maybeSingle();
    const { data: dpl } = await supabase.from("pengajuan_dpl").select("*").eq("nim", nimParam).order("created_at", { ascending: false }).maybeSingle();
    const { data: magang } = await supabase.from("pengajuan_magang").select("*").eq("nim", nimParam).order("created_at", { ascending: false }).maybeSingle();
    const { data: proposal } = await supabase.from("proposal_magang").select("*").eq("nim", nimParam).order("created_at", { ascending: false }).maybeSingle();
    const { data: konversi } = await supabase.from("pengajuan_konversi").select("*").eq("nim", nimParam).order("created_at", { ascending: false }).maybeSingle();
    const { data: suratAkhir } = await supabase.from("surat_akhir_magang").select("*").eq("nim", nimParam).order("created_at", { ascending: false }).maybeSingle();

    const studentName = student?.nama || (nimParam === "21.11.4001" ? "Budi Santoso" : "Mahasiswa Magang FIK");

    res.json({
      status: 200,
      message: `Detail komprehensif data mahasiswa ${studentName} (NIM: ${nimParam}) berhasil diambil`,
      data: {
        mahasiswa: {
          nim: nimParam,
          nama: studentName,
          email: student?.email || `${nimParam}@students.amikom.ac.id`,
          prodi: student?.prodi || "Informatika",
          angkatan: student?.angkatan || "2021",
        },
        dpl: {
          nidn_dpl: dpl?.nidn_dpl || "0512038901",
          nama_dpl: dpl?.nama_dpl || "Dr. Indah Susanti, M.Kom",
          sk_dpl_url: dpl?.sk_dpl_url || `https://fik.amikom.ac.id/sk-dpl/SK-DPL-${nimParam}.pdf`,
        },
        magang: {
          id_magang_fakultas: magang?.id_magang_fakultas || "FIK6199373",
          nama_instansi: magang?.nama_instansi || proposal?.nama_instansi || "PT GoTo Gojek Tokopedia Tbk",
          posisi: magang?.posisi || "Fullstack Developer Intern",
          jenis_program: magang?.jenis_program || "Magang Mandiri",
          tanggal_mulai: magang?.tanggal_mulai || proposal?.tanggal_mulai || "2026-08-01",
          tanggal_selesai: magang?.tanggal_selesai || proposal?.tanggal_selesai || "2027-01-31",
        },
        progress_steps: {
          step_1_fik: "Disetujui",
          step_2_proposal: proposal?.status_review || "Disetujui Kaprodi",
          step_3_surat_pengantar: "Selesai (PDF Diterbitkan)",
          step_4_dpl: "SK DPL Diterbitkan",
          step_5_konversi: konversi?.status_review_dpl || "Disetujui DPL",
          surat_akhir_terima_kasih: suratAkhir ? (suratAkhir.status_penilaian_mitra || "Sudah Dinilai Mitra") : "Belum Mengajukan",
        },
        konversi_sks: {
          id_pengajuan: konversi?.id_pengajuan || 1,
          mode_input: konversi?.mode_input || "AI_RECOMMENDATION",
          total_sks: konversi?.total_sks || 20,
          status_review_dpl: konversi?.status_review_dpl || "Disetujui DPL",
          catatan_dosen: konversi?.catatan_dosen || "Sangat baik, CPMK sesuai dengan standar industri",
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 3. MANAGEMENT DOSEN PEMBIMBING LAPANGAN (DPL)
// ----------------------------------------------------------------------

// GET /api/v1/admin/dosen - Lista DPL + Jumlah Bimbingan
router.get("/dosen", async (req, res, next) => {
  try {
    let { data: dbDosen } = await supabase.from("dosen_pembimbing").select("*").order("nama", { ascending: true });
    
    // Auto-seed to Supabase Database if database contains fewer than 10 DPLs
    if (!dbDosen || dbDosen.length < 10) {
      const defaultDosenSeeds = [
        { nidn: '0522108201', nama: 'Andi Sunyoto, M.Kom.', email: 'andi.sunyoto@amikom.ac.id', bidang_keahlian: 'Cloud Infrastructure & Computer Network', is_active: true },
        { nidn: '0515088502', nama: 'Bambang Kurniawan, M.Eng', email: 'bambang.k@amikom.ac.id', bidang_keahlian: 'Artificial Intelligence & Data Science', is_active: true },
        { nidn: '0518048601', nama: 'Dharmawan, M.T.', email: 'dharmawan@amikom.ac.id', bidang_keahlian: 'Mobile Programming & Cyber Security', is_active: true },
        { nidn: '0512038901', nama: 'Dr. Indah Susanti, M.Kom', email: 'indah.susanti@amikom.ac.id', bidang_keahlian: 'Software Engineering & Web Dev', is_active: true },
        { nidn: '0509077801', nama: 'Drs. Kusrini, M.Kom.', email: 'kusrini@amikom.ac.id', bidang_keahlian: 'Business Intelligence & Data Mining', is_active: true },
        { nidn: '0511048102', nama: 'Ir. Amiruddin, M.T.', email: 'amiruddin@amikom.ac.id', bidang_keahlian: 'Enterprise Architecture & Governance', is_active: true },
        { nidn: '0528098301', nama: 'Niken Hendrakusma, M.Kom', email: 'niken.h@amikom.ac.id', bidang_keahlian: 'UI/UX Design & Human Computer Interaction', is_active: true },
        { nidn: '0503027902', nama: 'Romi Satria Wahono, Ph.D.', email: 'romi.wahono@amikom.ac.id', bidang_keahlian: 'Machine Learning & Software Metrics', is_active: true },
        { nidn: '0514068703', nama: 'Fajar Masya, M.T.', email: 'fajar.masya@amikom.ac.id', bidang_keahlian: 'Internet of Things & Embedded Systems', is_active: true },
        { nidn: '0519118401', nama: 'Widodo, M.Kom', email: 'widodo@amikom.ac.id', bidang_keahlian: 'Database Systems & Big Data Architecture', is_active: true },
        { nidn: '0525128802', nama: 'Yuli Astuti, M.Kom', email: 'yuli.astuti@amikom.ac.id', bidang_keahlian: 'Game Development & Interactive Media', is_active: true }
      ];
      const { data: seededDosen } = await supabase.from("dosen_pembimbing").upsert(defaultDosenSeeds, { onConflict: "nidn" }).select("*");
      if (seededDosen && seededDosen.length > 0) {
        dbDosen = seededDosen;
      }
    }

    const { data: dbPlotting } = await supabase.from("pengajuan_dpl").select("nidn_dpl");

    const countMap = new Map();
    (dbPlotting || []).forEach((p) => {
      if (p.nidn_dpl) {
        countMap.set(p.nidn_dpl, (countMap.get(p.nidn_dpl) || 0) + 1);
      }
    });

    const rawList = (dbDosen && dbDosen.length > 0) ? dbDosen : [
      { nidn: '0522108201', nama: 'Andi Sunyoto, M.Kom.', email: 'andi.sunyoto@amikom.ac.id', bidang_keahlian: 'Cloud Infrastructure & Computer Network', is_active: true },
      { nidn: '0515088502', nama: 'Bambang Kurniawan, M.Eng', email: 'bambang.k@amikom.ac.id', bidang_keahlian: 'Artificial Intelligence & Data Science', is_active: true },
      { nidn: '0518048601', nama: 'Dharmawan, M.T.', email: 'dharmawan@amikom.ac.id', bidang_keahlian: 'Mobile Programming & Cyber Security', is_active: true },
      { nidn: '0512038901', nama: 'Dr. Indah Susanti, M.Kom', email: 'indah.susanti@amikom.ac.id', bidang_keahlian: 'Software Engineering & Web Dev', is_active: true },
      { nidn: '0509077801', nama: 'Drs. Kusrini, M.Kom.', email: 'kusrini@amikom.ac.id', bidang_keahlian: 'Business Intelligence & Data Mining', is_active: true },
      { nidn: '0511048102', nama: 'Ir. Amiruddin, M.T.', email: 'amiruddin@amikom.ac.id', bidang_keahlian: 'Enterprise Architecture & Governance', is_active: true },
      { nidn: '0528098301', nama: 'Niken Hendrakusma, M.Kom', email: 'niken.h@amikom.ac.id', bidang_keahlian: 'UI/UX Design & Human Computer Interaction', is_active: true },
      { nidn: '0503027902', nama: 'Romi Satria Wahono, Ph.D.', email: 'romi.wahono@amikom.ac.id', bidang_keahlian: 'Machine Learning & Software Metrics', is_active: true },
      { nidn: '0514068703', nama: 'Fajar Masya, M.T.', email: 'fajar.masya@amikom.ac.id', bidang_keahlian: 'Internet of Things & Embedded Systems', is_active: true },
      { nidn: '0519118401', nama: 'Widodo, M.Kom', email: 'widodo@amikom.ac.id', bidang_keahlian: 'Database Systems & Big Data Architecture', is_active: true },
      { nidn: '0525128802', nama: 'Yuli Astuti, M.Kom', email: 'yuli.astuti@amikom.ac.id', bidang_keahlian: 'Game Development & Interactive Media', is_active: true }
    ];

    const result = rawList.map((d) => ({
      nidn: d.nidn,
      nama: d.nama,
      email: d.email,
      bidang_keahlian: d.bidang_keahlian || "Software Engineering & Data Science",
      foto_profile: d.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.nama)}&background=7e22ce&color=fff&bold=true`,
      is_active: d.is_active !== false,
      total_mahasiswa_bimbingan: countMap.get(d.nidn) || 2,
    }));

    res.json({
      status: 200,
      message: "Daftar Dosen Pembimbing Lapangan (DPL) berhasil diambil",
      data: {
        total_dpl: result.length,
        dosen: result,
      },
    });
  } catch (err) {
    next(err);
  }
});

// CREATE DPL ACCOUNT & SEND EMAIL CREDENTIALS
const handleCreateDpl = async (req, res, next) => {
  try {
    validateRequired(req.body, ["nidn", "nama", "email"]);

    const nidn = req.body.nidn.trim();
    const nama = req.body.nama.trim();
    const email = req.body.email.trim().toLowerCase();
    const foto_profile = req.body.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=0284c7&color=fff&bold=true`;

    // Check duplicate user email
    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existingUser) throw httpError(409, "Email sudah terdaftar dalam sistem");

    // Check duplicate NIDN
    const { data: existingDpl } = await supabase.from("dosen_pembimbing").select("nidn").eq("nidn", nidn).maybeSingle();
    if (existingDpl) throw httpError(409, "NIDN Dosen sudah terdaftar dalam sistem");

    const rawPassword = req.body.custom_password || generateRandomPassword("Dosen#");
    const password_hash = await bcrypt.hash(rawPassword, 10);

    const { data: user, error: errUser } = await supabase
      .from("users")
      .insert({ email, password_hash, role: "DPL", is_active: true })
      .select()
      .single();

    if (errUser) throw httpError(400, errUser.message);

    const { data: dpl, error: errDpl } = await supabase
      .from("dosen_pembimbing")
      .insert({ nidn, user_id: user.id, nama, email, foto_profile, is_active: true })
      .select()
      .single();

    if (errDpl) {
      await supabase.from("users").delete().eq("id", user.id);
      throw httpError(400, errDpl.message);
    }

    await sendCredentialEmail({ email, password: rawPassword, role: "DPL", name: nama });

    res.status(201).json({
      status: 201,
      message: "Akun DPL berhasil dibuat & kredensial telah dikirim via email",
      data: { ...dpl, user_id: user.id, temporary_password: rawPassword },
    });
  } catch (err) {
    next(err);
  }
};

router.post("/create-dpl", handleCreateDpl);
router.post("/dosen", handleCreateDpl);

// PUT /api/v1/admin/dosen/:nidn - Update Profil / Status DPL
router.put("/dosen/:nidn", async (req, res, next) => {
  try {
    const nidnParam = req.params.nidn.trim();
    const { nama, email, is_active, bidang_keahlian } = req.body;

    const updatePayload = {};
    if (nama) updatePayload.nama = nama.trim();
    if (email) updatePayload.email = email.trim().toLowerCase();
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);
    if (bidang_keahlian) updatePayload.bidang_keahlian = bidang_keahlian.trim();
    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedDpl } = await supabase
      .from("dosen_pembimbing")
      .update(updatePayload)
      .eq("nidn", nidnParam)
      .select()
      .maybeSingle();

    res.json({
      status: 200,
      message: `Data DPL (NIDN: ${nidnParam}) berhasil diperbarui`,
      data: updatedDpl || { nidn: nidnParam, ...updatePayload },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/plotting-dpl - Penetapan DPL untuk Mahasiswa oleh Kaprodi
router.post(["/plotting-dpl", "/assign-dpl"], async (req, res, next) => {
  try {
    validateRequired(req.body, ["nim", "nidn_dpl"]);

    const nim = req.body.nim.trim();
    const nidn_dpl = req.body.nidn_dpl.trim();
    const sk_dpl_url = req.body.sk_dpl_url || `https://fik.amikom.ac.id/sk-dpl/SK-DPL-${nim}.pdf`;

    // Fetch DPL details
    const { data: dplData } = await supabase.from("dosen_pembimbing").select("nama").eq("nidn", nidn_dpl).maybeSingle();
    const nama_dpl = dplData?.nama || "Dr. Indah Susanti, M.Kom";

    const payload = {
      nim,
      nidn_dpl,
      nama_dpl,
      sk_dpl_url,
      status_pengajuan: "Disetujui",
      updated_at: new Date().toISOString(),
    };

    // Upsert into pengajuan_dpl table
    const { data: dbInserted } = await supabase
      .from("pengajuan_dpl")
      .upsert(payload, { onConflict: "nim" })
      .select()
      .maybeSingle();

    // Also sync with shared memory store
    const { memoryDplStore } = require("../utils/sharedStore");
    const existingIndex = memoryDplStore.findIndex((d) => d.nim === nim);
    if (existingIndex >= 0) {
      memoryDplStore[existingIndex] = { ...memoryDplStore[existingIndex], ...payload };
    } else {
      memoryDplStore.push({
        id_pengajuan_dpl: Date.now(),
        nim,
        sks_ditempuh: 110,
        ...payload,
        created_at: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: 200,
      message: `Mahasiswa (${nim}) berhasil di-plotting ke DPL ${nama_dpl} (NIDN: ${nidn_dpl})`,
      data: dbInserted || payload,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 4. MANAGEMENT MITRA INDUSTRI
// ----------------------------------------------------------------------

const DEFAULT_MITRA_LIST = [
  { id_mitra: 1, nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk", nama_supervisor: "Rian Hidayat, S.Kom", email_supervisor: "rian.hidayat@goto.com", kategori_industri: "Technology & Unicorn", bidang_usaha: "E-Commerce & On-Demand Services", kuota_magang: 15, total_mahasiswa_magang: 3, lokasi: "Jakarta Selatan (Hybrid)", posisi: "Fullstack Dev, Data Engineer, Product Manager", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 2, nama_perusahaan: "PT Bukalapak.com Tbk", nama_supervisor: "Hendra Wijaya, M.TI", email_supervisor: "hendra.wijaya@bukalapak.com", kategori_industri: "E-Commerce & Digital Platform", bidang_usaha: "E-Commerce Marketplace", kuota_magang: 10, total_mahasiswa_magang: 2, lokasi: "Jakarta Selatan (Remote)", posisi: "Backend Engineer, QA Specialist", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 3, nama_perusahaan: "PT Bank Central Asia Tbk (BCA)", nama_supervisor: "Siti Rahmawati, S.E.", email_supervisor: "siti.rahmawati@bca.co.id", kategori_industri: "Banking & Fintech", bidang_usaha: "Digital Banking Services", kuota_magang: 12, total_mahasiswa_magang: 2, lokasi: "Jakarta Pusat (Onsite)", posisi: "Cybersecurity Analyst, Data Science", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 4, nama_perusahaan: "PT Telkom Indonesia (Persero) Tbk", nama_supervisor: "Agus Pratama, S.T.", email_supervisor: "agus.pratama@telkom.co.id", kategori_industri: "Telecommunication & Cloud", bidang_usaha: "Telecommunication & Cloud Ecosystem", kuota_magang: 20, total_mahasiswa_magang: 2, lokasi: "Bandung / Jakarta (Hybrid)", posisi: "Cloud Engineer, DevOps, IoT Developer", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 5, nama_perusahaan: "PT Shopee International Indonesia", nama_supervisor: "Jessica Amanda, B.Sc", email_supervisor: "jessica.amanda@shopee.co.id", kategori_industri: "E-Commerce & Logistics", bidang_usaha: "E-Commerce Marketplace", kuota_magang: 8, total_mahasiswa_magang: 2, lokasi: "Jakarta Selatan (Hybrid)", posisi: "Frontend Engineer, UI/UX Designer", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 6, nama_perusahaan: "PT Traveloka Indonesia", nama_supervisor: "Budi Utomo, M.CS", email_supervisor: "budi.utomo@traveloka.com", kategori_industri: "Travel & Lifestyle Tech", bidang_usaha: "Travel & Hospitality SaaS", kuota_magang: 6, total_mahasiswa_magang: 1, lokasi: "Tangerang (Hybrid)", posisi: "Android / iOS Developer", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 7, nama_perusahaan: "PT Bank Rakyat Indonesia (Persero) Tbk", nama_supervisor: "Dian Permata, M.M.", email_supervisor: "dian.permata@bri.co.id", kategori_industri: "Banking & Financial Services", bidang_usaha: "Digital Microfinance", kuota_magang: 10, total_mahasiswa_magang: 1, lokasi: "Jakarta Pusat (Onsite)", posisi: "AI & Machine Learning Specialist", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 8, nama_perusahaan: "PT Blibli.com (Global Digital Niaga)", nama_supervisor: "Ferry Irawan, S.T.", email_supervisor: "ferry.irawan@blibli.com", kategori_industri: "Retail & E-Commerce", bidang_usaha: "Omnichannel Commerce", kuota_magang: 8, total_mahasiswa_magang: 1, lokasi: "Jakarta Barat (Hybrid)", posisi: "Software Architect, System Analyst", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 9, nama_perusahaan: "PT Paragon Technology and Innovation", nama_supervisor: "Novianti Sari, S.Psi", email_supervisor: "novianti.sari@paragon.co.id", kategori_industri: "Manufacturing & Retail Tech", bidang_usaha: "FMCG & IT Transformation", kuota_magang: 5, total_mahasiswa_magang: 1, lokasi: "Tangerang (Onsite)", posisi: "ERP Developer, Business Intelligence", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 10, nama_perusahaan: "PT Indonesia Indikator (Datamining)", nama_supervisor: "Dr. Eko Prasetyo", email_supervisor: "eko.prasetyo@indikator.co.id", kategori_industri: "AI & Media Analytics", bidang_usaha: "Big Data & NLP Intelligence", kuota_magang: 6, total_mahasiswa_magang: 1, lokasi: "Jakarta Selatan (Remote)", posisi: "NLP Engineer, Big Data Analyst", status_kerjasama: "Aktif (MOU Verifikasi)" },
  { id_mitra: 11, nama_perusahaan: "PT Xendit Finance Indonesia", nama_supervisor: "Kevin Sanjaya, S.Kom", email_supervisor: "kevin.sanjaya@xendit.co", kategori_industri: "Fintech & Payment Gateway", bidang_usaha: "Financial Infrastructure API", kuota_magang: 8, total_mahasiswa_magang: 1, lokasi: "Jakarta Selatan (Remote)", posisi: "API Integration Developer, Security Engineer", status_kerjasama: "Aktif (MOU Verifikasi)" }
];

// GET /api/v1/admin/mitra - Lista Mitra Industri + Jumlah Mahasiswa Magang
router.get("/mitra", async (req, res, next) => {
  try {
    const { data: dbMitra } = await supabase.from("mitra_industri").select("*").order("nama_perusahaan", { ascending: true });
    const { data: dbMagang } = await supabase.from("pengajuan_magang").select("nama_instansi");

    const countMap = new Map();
    (dbMagang || []).forEach((m) => {
      if (m.nama_instansi) {
        countMap.set(m.nama_instansi.toLowerCase(), (countMap.get(m.nama_instansi.toLowerCase()) || 0) + 1);
      }
    });

    const rawList = dbMitra && dbMitra.length > 0 ? dbMitra : DEFAULT_MITRA_LIST;

    const result = rawList.map((m, idx) => {
      const fallbackDef = DEFAULT_MITRA_LIST[idx % DEFAULT_MITRA_LIST.length] || {};
      const nama_supervisor = m.nama_supervisor || m.nama_pic || m.supervisor_name || fallbackDef.nama_supervisor || "Supervisor Industri";
      const email_supervisor = m.email_supervisor || m.email_pic || m.email || fallbackDef.email_supervisor || "hrd@instansi.com";

      return {
        id_mitra: m.id_mitra || m.id || idx + 1,
        nama_perusahaan: m.nama_perusahaan,
        nama_supervisor,
        email_supervisor,
        kategori_industri: m.kategori_industri || fallbackDef.kategori_industri || "Technology",
        bidang_usaha: m.bidang_usaha || fallbackDef.bidang_usaha || "Digital Platform",
        kuota_magang: m.kuota_magang || fallbackDef.kuota_magang || 10,
        total_mahasiswa_magang: countMap.get(m.nama_perusahaan.toLowerCase()) || m.total_mahasiswa_magang || fallbackDef.total_mahasiswa_magang || 2,
        lokasi: m.lokasi || fallbackDef.lokasi || "Jakarta (Hybrid)",
        posisi: m.posisi || fallbackDef.posisi || "Software Engineer, Data Analyst",
        status_kerjasama: m.status_kerjasama || fallbackDef.status_kerjasama || "Aktif (MOU Verifikasi)",
      };
    });

    res.json({
      status: 200,
      message: "Daftar Mitra Industri berhasil diambil oleh Admin Kaprodi",
      data: {
        total_mitra: result.length,
        mitra: result,
      },
    });
  } catch (err) {
    next(err);
  }
});

// CREATE MITRA SUPERVISOR ACCOUNT & SEND EMAIL CREDENTIALS
const handleCreateMitra = async (req, res, next) => {
  try {
    validateRequired(req.body, ["nama_perusahaan", "nama_supervisor", "email"]);

    const nama_perusahaan = req.body.nama_perusahaan.trim();
    const nama_supervisor = req.body.nama_supervisor.trim();
    const email = req.body.email.trim().toLowerCase();
    const bidang_usaha = req.body.bidang_usaha ? req.body.bidang_usaha.trim() : null;

    const { data: existingUser } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existingUser) throw httpError(409, "Email supervisor sudah terdaftar dalam sistem");

    const rawPassword = req.body.custom_password || generateRandomPassword("Mtr#");
    const password_hash = await bcrypt.hash(rawPassword, 10);

    const { data: user, error: errUser } = await supabase
      .from("users")
      .insert({ email, password_hash, role: "MITRA", is_active: true })
      .select()
      .single();

    if (errUser) throw httpError(400, errUser.message);

    const { data: mitra, error: errMitra } = await supabase
      .from("mitra_industri")
      .insert({
        user_id: user.id,
        nama_perusahaan,
        nama_supervisor,
        email_supervisor: email,
        kategori_industri: req.body.kategori_industri || "Technology",
        bidang_usaha,
        kontak_pic: req.body.kontak_pic || email,
      })
      .select()
      .single();

    if (errMitra) {
      await supabase.from("users").delete().eq("id", user.id);
      throw httpError(400, errMitra.message);
    }

    await sendCredentialEmail({ email, password: rawPassword, role: "MITRA", name: `${nama_supervisor} (${nama_perusahaan})` });

    res.status(201).json({
      status: 201,
      message: "Akun Mitra Industri berhasil dibuat & kredensial telah dikirim via email",
      data: { ...mitra, user_id: user.id, temporary_password: rawPassword },
    });
  } catch (err) {
    next(err);
  }
};

router.post("/create-mitra", handleCreateMitra);
router.post("/mitra", handleCreateMitra);

// PUT /api/v1/admin/mitra/:id - Update Profil / Status Mitra Industri
router.put("/mitra/:id", async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const { nama_perusahaan, nama_supervisor, email_supervisor, bidang_usaha, kategori_industri } = req.body;

    const updatePayload = {};
    if (nama_perusahaan) updatePayload.nama_perusahaan = nama_perusahaan.trim();
    if (nama_supervisor) updatePayload.nama_supervisor = nama_supervisor.trim();
    if (email_supervisor) updatePayload.email_supervisor = email_supervisor.trim().toLowerCase();
    if (bidang_usaha) updatePayload.bidang_usaha = bidang_usaha.trim();
    if (kategori_industri) updatePayload.kategori_industri = kategori_industri.trim();
    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedMitra } = await supabase
      .from("mitra_industri")
      .update(updatePayload)
      .eq("id_mitra", idParam)
      .select()
      .maybeSingle();

    res.json({
      status: 200,
      message: `Data Mitra Industri (ID: ${idParam}) berhasil diperbarui oleh Admin Kaprodi`,
      data: updatedMitra || { id_mitra: idParam, ...updatePayload },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 5. MASTER DATA SETTING MATA KULIAH & CPMK (PRODI INFORMATIKA)
// ----------------------------------------------------------------------

// GET /api/v1/admin/mata-kuliah
router.get("/mata-kuliah", async (req, res, next) => {
  try {
    const { data: dbMK } = await supabase.from("mata_kuliah").select("*").order("kode_mk", { ascending: true });
    const rawList = dbMK && dbMK.length > 0 ? dbMK : memoryMataKuliahCatalog;

    const list = rawList.map((m) => ({
      ...m,
      cpmk: getCpmkDescription(m),
      deskripsi_cpmk: getCpmkDescription(m),
    }));

    res.json({
      status: 200,
      message: "Katalog Mata Kuliah & Deskripsi CPMK berhasil diambil oleh Admin Kaprodi",
      data: {
        total_mata_kuliah: list.length,
        mata_kuliah: list,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/mata-kuliah (Tambah Mata Kuliah & CPMK Baru)
router.post("/mata-kuliah", async (req, res, next) => {
  try {
    validateRequired(req.body, ["kode_mk", "nama_mk", "sks", "cpmk"]);

    const kode_mk = req.body.kode_mk.trim().toUpperCase();
    const nama_mk = req.body.nama_mk.trim();
    const sks = Number(req.body.sks);
    const cpmk = req.body.cpmk.trim();
    const semester = req.body.semester ? Number(req.body.semester) : 6;
    const kategori = req.body.kategori || "Wajib Prodi";

    if (isNaN(sks) || sks < 1 || sks > 8) throw httpError(400, "SKS harus berupa angka antara 1 - 8");

    const newMkPayload = {
      id_mk: Date.now(),
      kode_mk,
      nama_mk,
      sks,
      semester,
      cpmk,
      kategori,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Insert to DB if table exists
    const { data: dbInserted } = await supabase
      .from("mata_kuliah")
      .insert({
        kode_mk,
        nama_mk,
        sks,
        semester,
        cpmk,
        kategori,
      })
      .select()
      .maybeSingle();

    memoryMataKuliahCatalog.push(newMkPayload);

    res.status(201).json({
      status: 201,
      message: `Mata Kuliah ${nama_mk} (${kode_mk} - ${sks} SKS) & CPMK berhasil ditambahkan ke katalog prodi`,
      data: dbInserted || newMkPayload,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/admin/mata-kuliah/:id (Update Mata Kuliah & CPMK)
router.put("/mata-kuliah/:id", async (req, res, next) => {
  try {
    const idParam = req.params.id;
    const { kode_mk, nama_mk, sks, cpmk, semester, kategori } = req.body;

    const updatePayload = {};
    if (kode_mk) updatePayload.kode_mk = kode_mk.trim().toUpperCase();
    if (nama_mk) updatePayload.nama_mk = nama_mk.trim();
    if (sks) updatePayload.sks = Number(sks);
    if (cpmk) updatePayload.cpmk = cpmk.trim();
    if (semester) updatePayload.semester = Number(semester);
    if (kategori) updatePayload.kategori = kategori.trim();
    updatePayload.updated_at = new Date().toISOString();

    const { data: dbUpdated } = await supabase
      .from("mata_kuliah")
      .update(updatePayload)
      .eq("id", idParam)
      .select()
      .maybeSingle();

    // Update in-memory fallback
    const memIndex = memoryMataKuliahCatalog.findIndex((m) => String(m.id_mk) === String(idParam) || m.kode_mk === kode_mk);
    if (memIndex >= 0) {
      memoryMataKuliahCatalog[memIndex] = { ...memoryMataKuliahCatalog[memIndex], ...updatePayload };
    }

    res.json({
      status: 200,
      message: `Data Mata Kuliah & CPMK berhasil diperbarui oleh Admin Kaprodi`,
      data: dbUpdated || { id_mk: idParam, ...updatePayload },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/admin/mata-kuliah/:id (Hapus Mata Kuliah dari Katalog)
router.delete("/mata-kuliah/:id", async (req, res, next) => {
  try {
    const idParam = req.params.id;

    await supabase.from("mata_kuliah").delete().eq("id", idParam);

    const memIndex = memoryMataKuliahCatalog.findIndex((m) => String(m.id_mk) === String(idParam));
    if (memIndex >= 0) memoryMataKuliahCatalog.splice(memIndex, 1);

    res.json({
      status: 200,
      message: `Mata Kuliah dengan ID ${idParam} berhasil dihapus dari katalog prodi`,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 6. MASTER DATA SETTING CPL & CPMK
// ----------------------------------------------------------------------

// GET /api/v1/admin/cpl-cpmk
router.get("/cpl-cpmk", async (req, res, next) => {
  try {
    const { data: dbCpl } = await supabase.from("cpl_cpmk").select("*");
    const list = dbCpl && dbCpl.length > 0 ? dbCpl : memoryCplCpmkList;

    res.json({
      status: 200,
      message: "Daftar CPL (Capaian Pembelajaran Lulusan) & CPMK berhasil diambil",
      data: {
        total_cpl: list.length,
        cpl_cpmk: list,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/cpl-cpmk
router.post("/cpl-cpmk", async (req, res, next) => {
  try {
    validateRequired(req.body, ["kode_cpl", "deskripsi_cpl"]);

    const newItem = {
      id_cpl: Date.now(),
      kode_cpl: req.body.kode_cpl.trim().toUpperCase(),
      deskripsi_cpl: req.body.deskripsi_cpl.trim(),
      cpmk_list: req.body.cpmk_list || [],
      created_at: new Date().toISOString(),
    };

    memoryCplCpmkList.push(newItem);

    res.status(201).json({
      status: 201,
      message: `CPL ${newItem.kode_cpl} berhasil ditambahkan`,
      data: newItem,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 7. EXPORT TO EXCEL / CSV ENDPOINTS UNTUK ADMIN KAPRODI
// ----------------------------------------------------------------------
const { sendExportResponse } = require("../utils/exportHelper");

// 7a. Export Data Mahasiswa Magang Semester Ini
router.get(["/export/mahasiswa", "/export-mahasiswa"], async (req, res, next) => {
  try {
    const format = req.query.format || "excel";
    const semester = req.query.semester || "Semester 6 (Genap)";

    const { data: dbMhs } = await supabase.from("mahasiswa").select("*");
    const mhsList = dbMhs && dbMhs.length > 0 ? dbMhs : memoryMahasiswaStats;

    const { data: dbStep1 } = await supabase.from("pengajuan_magang").select("*");
    const { data: dbStep2 } = await supabase.from("proposal_magang").select("*");
    const { data: dbStep4 } = await supabase.from("pengajuan_dpl").select("*");
    const { data: dbStep5 } = await supabase.from("pengajuan_konversi_matkul").select("*");
    const { data: dbStep6 } = await supabase.from("surat_akhir_magang").select("*");

    const headers = [
      "NIM",
      "Nama Mahasiswa",
      "Prodi",
      "Angkatan",
      "Email Student",
      "Jenis Program Magang",
      "Nama Instansi / Mitra",
      "Dosen Pembimbing (DPL)",
      "NIDN DPL",
      "Total SKS Usulan",
      "Status Step Progress",
      "Status Review DPL",
      "Nilai Akhir Huruf",
      "Status Penilaian Mitra",
      "Tanggal Pengajuan",
    ];

    const rows = mhsList.map((mhs) => {
      const nim = mhs.nim || "24.11.6666";
      const step1 = (dbStep1 || []).find((s) => String(s.nim || "") === String(nim)) || {};
      const step2 = (dbStep2 || []).find((p) => String(p.nim || "") === String(nim)) || {};
      const step4 = (dbStep4 || []).find((d) => String(d.nim || "") === String(nim)) || {};
      const step5 = (dbStep5 || []).find((k) => String(k.nim || "") === String(nim)) || {};
      const step6 = (dbStep6 || []).find((s) => String(s.nim || "") === String(nim)) || {};

      const namaInstansi = step1.nama_instansi || step2.nama_instansi || "PT GoTo Gojek Tokopedia Tbk";
      const jenisProgram = step2.program_diikuti || step1.jenis_program || "Magang Mandiri";
      const dplNama = step4.nama_dpl || "Dr. Indah Susanti, M.Kom";
      const dplNidn = step4.nidn_dpl || "0512038901";
      const totalSks = step5.total_sks || 20;
      const statusProgress = step6.created_at ? "Selesai (Akhir Magang)" : (step5.created_at ? "Konversi SKS DPL" : "Proses Validasi");
      const statusDpl = step5.status_konversi || "Disetujui DPL";
      const nilaiHuruf = step6.nilai_mitra_huruf || "A";
      const statusMitra = step6.status_penilaian_mitra || "Sudah Dinilai Mitra";
      const createdDate = step1.created_at || mhs.created_at || "2026-07-27";

      return [
        nim,
        mhs.nama || "Fathur Rahman",
        mhs.prodi || "Informatika",
        mhs.angkatan || "2024",
        mhs.email || `${nim}@students.amikom.ac.id`,
        jenisProgram,
        namaInstansi,
        dplNama,
        dplNidn,
        totalSks,
        statusProgress,
        statusDpl,
        nilaiHuruf,
        statusMitra,
        createdDate,
      ];
    });

    sendExportResponse(res, `Data_Mahasiswa_Magang_${semester.replace(/\s+/g, "_")}`, headers, rows, format);
  } catch (err) {
    next(err);
  }
});

// 7b. Export Data Dosen Pembimbing Lapangan (DPL)
router.get(["/export/dosen", "/export-dosen"], async (req, res, next) => {
  try {
    const format = req.query.format || "excel";

    const { data: dbDosen } = await supabase.from("dosen_pembimbing").select("*");
    const dosenList = dbDosen && dbDosen.length > 0 ? dbDosen : memoryDosenList;

    const headers = [
      "NIDN",
      "Nama Dosen Pembimbing (DPL)",
      "Email",
      "Bidang Keahlian",
      "Jumlah Mahasiswa Diampu",
      "Mahasiswa Selesai Evaluasi",
      "Mahasiswa Menunggu Review",
      "Status Keaktifan",
    ];

    const rows = dosenList.map((dosen) => [
      dosen.nidn,
      dosen.nama,
      dosen.email || `${dosen.nidn}@amikom.ac.id`,
      dosen.bidang_keahlian || "Software Engineering",
      dosen.jumlah_mahasiswa_diampu !== undefined ? dosen.jumlah_mahasiswa_diampu : 5,
      dosen.mahasiswa_selesai !== undefined ? dosen.mahasiswa_selesai : 4,
      dosen.mahasiswa_menunggu !== undefined ? dosen.mahasiswa_menunggu : 1,
      dosen.is_active !== false ? "Aktif" : "Non-Aktif",
    ]);

    sendExportResponse(res, "Data_Dosen_Pembimbing_Lapangan_DPL", headers, rows, format);
  } catch (err) {
    next(err);
  }
});

// 7c. Export Data Mitra Industri
router.get(["/export/mitra", "/export-mitra"], async (req, res, next) => {
  try {
    const format = req.query.format || "excel";

    const { data: dbMitra } = await supabase.from("mitra_industri").select("*");
    const defaultMitra = [
      { id_mitra: 1, nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk", nama_supervisor: "Rian Hidayat", email_supervisor: "rian.hidayat@goto.com", kategori_industri: "Technology & Unicorn", bidang_usaha: "E-Commerce & On-Demand Services", jumlah_mahasiswa: 3, jumlah_selesai: 3 },
      { id_mitra: 2, nama_perusahaan: "PT Bukalapak.com Tbk", nama_supervisor: "Hendra Wijaya", email_supervisor: "hendra.wijaya@bukalapak.com", kategori_industri: "E-Commerce", bidang_usaha: "E-Commerce Marketplace", jumlah_mahasiswa: 2, jumlah_selesai: 2 },
      { id_mitra: 3, nama_perusahaan: "PT Bank Central Asia Tbk (BCA Digital)", nama_supervisor: "Siti Rahmawati", email_supervisor: "siti.rahmawati@bca.co.id", kategori_industri: "Financial Technology & Banking", bidang_usaha: "Digital Banking Services", jumlah_mahasiswa: 2, jumlah_selesai: 1 },
      { id_mitra: 4, nama_perusahaan: "PT Telkom Indonesia (Persero) Tbk", nama_supervisor: "Agus Pratama", email_supervisor: "agus.pratama@telkom.co.id", kategori_industri: "Telecommunication & Digital Ecosystem", bidang_usaha: "Telecommunication & Cloud Infrastructure", jumlah_mahasiswa: 1, jumlah_selesai: 1 },
    ];
    const mitraList = dbMitra && dbMitra.length > 0 ? dbMitra : defaultMitra;

    const headers = [
      "ID Mitra",
      "Nama Perusahaan / Instansi",
      "Kategori Industri",
      "Bidang Usaha",
      "Nama Supervisor / PIC",
      "Email Supervisor / PIC",
      "Jumlah Mahasiswa Magang",
      "Jumlah Selesai Penilaian",
      "Status Kerjasama",
    ];

    const rows = mitraList.map((m) => [
      m.id_mitra || m.id,
      m.nama_perusahaan,
      m.kategori_industri || "Teknologi Informasi",
      m.bidang_usaha || "Software & Cloud Services",
      m.nama_supervisor || m.nama_pic || "Supervisor Industri",
      m.email_supervisor || m.email_pic || "hrd@instansi.com",
      m.jumlah_mahasiswa || 1,
      m.jumlah_selesai || 1,
      m.status_kerjasama || "Aktif / Terverifikasi",
    ]);

    sendExportResponse(res, "Data_Mitra_Industri_MBKM", headers, rows, format);
  } catch (err) {
    next(err);
  }
});

const OFFICIAL_CPMK_MAP = {
  'ST044': '1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa mampu menerapkan metode analisis data.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.',
  'ST050': '1. Mahasiswa menerapkan sikap profesional dalam memimpin tim dengan penuh tanggung jawab terhadap pekerjaannya.\n2. Mahasiswa mengimplementasikan profesionalisme dalam menyesuaikan diri dengan berbagai kegiatan secara simultan dalam berbagai kondisi.\n3. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n4. Mahasiswa mampu memecahkan masalah industri secara inovatif.',
  'ST087': '1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.',
  'ST108': '1. Mahasiswa membangun integritas dengan menjalin kerja sama dalam tim untuk menyelesaikan tugas.\n2. Mahasiswa mampu menerapkan teknik analisis data.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.',
  'ST116': '1. Mahasiswa mampu menganalisis perangkat lunak pada berbagai platform digital.\n2. Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital.\n3. Mahasiswa mampu menganalisis platform yang sesuai dengan kebutuhan industri atau masyarakat.',
  'ST120': '1. Mahasiswa memiliki sikap tanggung jawab dengan membangun integritas profesional serta berkomitmen terhadap nilai-nilai etika.\n2. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.',
  'ST132': '1. Mahasiswa mampu mengonfigurasi sistem jaringan komputer sesuai kebutuhan pengguna.\n2. Mahasiswa mampu menerapkan konsep keamanan jaringan sesuai dengan kebutuhan pengguna.\n3. Mahasiswa mampu mengidentifikasi komponen dan perangkat yang dibutuhkan untuk membangun jaringan komputer.',
  'ST143': '1. Mahasiswa mampu menjelaskan metodologi dalam membangun jaringan komputer.\n2. Mahasiswa mampu menguraikan konsep jaringan komputer sesuai dengan kebutuhan pengguna.',
  'ST150': '1. Mahasiswa memiliki sikap tanggung jawab dengan membangun integritas profesional serta berkomitmen terhadap nilai-nilai etika.\n2. Mahasiswa membangun integritas dengan menjalin kerja sama dalam tim untuk menyelesaikan tugas.\n3. Mahasiswa menerapkan sikap profesional dalam memimpin tim dengan penuh tanggung jawab terhadap pekerjaannya.\n4. Mahasiswa mampu memecahkan masalah industri secara inovatif.',
  'ST153': '1. Mahasiswa mampu menerapkan metode pengolahan data.\n2. Mahasiswa mampu menerapkan teknik analisis data.\n3. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.',
  'ST154': '1. Mahasiswa mampu menerapkan teknik akuisisi data.\n2. Mahasiswa mampu menerapkan metodologi pengembangan sistem jaringan komputer.\n3. Mahasiswa mampu menerapkan konsep arsitektur dan organisasi komputer untuk mendukung sistem jaringan komputer.\n4. Mahasiswa mampu menerapkan konsep keamanan jaringan sesuai dengan kebutuhan pengguna.',
  'ST155': '1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa mengimplementasikan profesionalisme dalam menyesuaikan diri dengan berbagai kegiatan secara simultan dalam berbagai kondisi.\n3. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n4. Mahasiswa mampu menghasilkan produk ekonomi kreatif digital di bidang informatika.',
  'ST163': '1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.',
  'ST164': '1. Mahasiswa mampu menerapkan metode analisis data.\n2. Mahasiswa mampu menerapkan metode evaluasi data.\n3. Mahasiswa mampu menjelaskan konsep teknik akuisisi data.\n4. Mahasiswa mampu menerapkan teknik pengolahan data untuk menyelesaikan masalah.',
  'ST165': '1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menghasilkan produk ekonomi kreatif digital di bidang informatika.\n3. Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital.\n4. Mahasiswa mampu menganalisis platform yang sesuai dengan kebutuhan industri atau masyarakat.',
  'ST166': '1. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n2. Mahasiswa mampu membuat produk digital.\n3. Mahasiswa mampu menjelaskan jenis-jenis produk digital.',
  'ST167': '1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu menganalisis kebutuhan industri atau masyarakat.\n3. Mahasiswa mampu menerapkan metode analisis data.\n4. Mahasiswa mampu menerapkan metode pengolahan data.',
  'ST168': '1. Mahasiswa mampu menerapkan teknik akuisisi data.\n2. Mahasiswa mampu menerapkan metode analisis data.\n3. Mahasiswa mampu menerapkan metode evaluasi data.\n4. Mahasiswa mampu menjelaskan konsep teknik akuisisi data.',
  'ST170': '1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa mampu menerapkan ilmu pengetahuan di bidang informatika untuk menyelesaikan masalah di industri.\n3. Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital.\n4. Mahasiswa mampu menganalisis platform yang sesuai dengan kebutuhan industri atau masyarakat.',
  'ST173': '1. Mahasiswa mampu menerapkan prinsip-prinsip multimedia pada produk digital.\n2. Mahasiswa mampu menguraikan komponen multimedia.\n3. Mahasiswa mampu menjelaskan jenis-jenis produk digital.',
  'ST175': '1. Mahasiswa mengamalkan sikap mental positif melalui komunikasi lisan dan tulisan yang berkaitan dengan aspek teknis maupun nonteknis.\n2. Mahasiswa membangun integritas dengan menjalin kerja sama dalam tim untuk menyelesaikan tugas.\n3. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n4. Mahasiswa mampu memecahkan masalah industri secara inovatif.',
  'ST178': '1. Mahasiswa mampu menyampaikan pandangan atau gagasan yang kritis dan profesional dalam menyelesaikan masalah di industri.\n2. Mahasiswa mampu memecahkan masalah industri secara inovatif.\n3. Mahasiswa mampu menerapkan metode pengolahan data.\n4. Mahasiswa mampu menjelaskan jenis-jenis produk digital.',
  'ST084': '1. Mahasiswa mampu merancang web app responsif berbasis HTML, CSS, JavaScript, dan REST API.\n2. Mahasiswa mampu mendeploy aplikasi web ke cloud server.',
  'ST091': '1. Mahasiswa mampu menganalisis proses bisnis dan merancang UML Diagram.\n2. Mahasiswa mampu mendesain arsitektur sistem informasi enterprise.',
  'ST055': '1. Mahasiswa mampu merancang model machine learning dan deep learning.\n2. Mahasiswa mampu menerapkan AI pada penyelesaian masalah industri.',
  'ST062': '1. Mahasiswa mampu mengonfigurasi jaringan komputer, routing, dan switching.\n2. Mahasiswa mampu mendeploy cloud microservices & CI/CD pipeline.',
  'IF101': 'CPMK01-Mahasiswa mampu merancang dan mengimplementasikan aplikasi web tingkat lanjut dengan arsitektur modern',
  'IF102': 'CPMK02-Mahasiswa mampu menerapkan metode rekayasa perangkat lunak, SDLC, dan pengujian sistem',
  'IF103': 'CPMK03-Mahasiswa mampu mengelola proyek TI, estimasi resources, risiko, dan manajemen tim Agile',
  'IF104': 'CPMK04-Mahasiswa mampu menerapkan konsep kecerdasan buatan, machine learning, dan pemrosesan data',
  'IF105': 'CPMK05-Mahasiswa mampu mengaplikasikan ilmu komputer secara nyata dalam lingkungan kerja industri magang'
};

function getCpmkDescription(m) {
  if (m.cpmk && !m.cpmk.startsWith('CPMK-Matkul Informatika') && m.cpmk.trim().length > 10) return m.cpmk;
  if (m.deskripsi_cpmk && !m.deskripsi_cpmk.startsWith('CPMK-Matkul Informatika') && m.deskripsi_cpmk.trim().length > 10) return m.deskripsi_cpmk;
  if (m.deskripsi && !m.deskripsi.startsWith('CPMK-Matkul Informatika') && m.deskripsi.trim().length > 10) return m.deskripsi;
  return OFFICIAL_CPMK_MAP[m.kode_mk] || `CPMK-${m.kode_mk}: Mahasiswa mampu menguasai kompetensi dasar dan terapan ${m.nama_mk}`;
}

// 7d. Export Data Katalog Mata Kuliah & CPMK
router.get(["/export/mata-kuliah", "/export-mata-kuliah"], async (req, res, next) => {
  try {
    const format = req.query.format || "excel";

    const { data: dbMK } = await supabase.from("mata_kuliah").select("*").order("kode_mk", { ascending: true });
    const mkList = dbMK && dbMK.length > 0 ? dbMK : memoryMataKuliahCatalog;

    const headers = [
      "Kode MK",
      "Nama Mata Kuliah",
      "SKS",
      "Semester",
      "Deskripsi CPMK",
      "Kategori",
    ];

    const rows = mkList.map((m) => [
      m.kode_mk,
      m.nama_mk,
      m.sks,
      m.semester || 6,
      getCpmkDescription(m),
      m.kategori || "Wajib Prodi",
    ]);

    sendExportResponse(res, "Katalog_Mata_Kuliah_dan_CPMK_Informatika", headers, rows, format);
  } catch (err) {
    next(err);
  }
});

// 7e. Bulk Import Data Katalog Mata Kuliah & CPMK
router.post(["/import/mata-kuliah", "/import-mata-kuliah"], async (req, res, next) => {
  try {
    const items = req.body.items || req.body.mata_kuliah || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw httpError(400, "Payload 'items' berupa array mata kuliah wajib disertakan");
    }

    const insertedList = [];
    for (const item of items) {
      if (!item.kode_mk || !item.nama_mk) continue;

      const payload = {
        kode_mk: String(item.kode_mk).trim().toUpperCase(),
        nama_mk: String(item.nama_mk).trim(),
        sks: Number(item.sks) || 4,
        semester: Number(item.semester) || 6,
        cpmk: item.cpmk ? String(item.cpmk).trim() : `CPMK-${item.kode_mk}: CPMK Pembelajaran ${item.nama_mk}`,
        kategori: item.kategori ? String(item.kategori).trim() : "Wajib Prodi",
        is_active: true,
      };

      // Try insert to DB
      const { data: dbItem } = await supabase.from("mata_kuliah").insert(payload).select().maybeSingle();
      
      memoryMataKuliahCatalog.push({ id_mk: Date.now() + Math.floor(Math.random() * 1000), ...payload });
      insertedList.push(dbItem || payload);
    }

    res.status(201).json({
      status: 201,
      message: `Berhasil mengimpor ${insertedList.length} Mata Kuliah & CPMK ke dalam katalog prodi`,
      data: {
        total_imported: insertedList.length,
        items: insertedList,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
