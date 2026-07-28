const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { memoryDplStore, memoryProposalStore, memorySuratStore, memoryKonversiStore } = require("../utils/sharedStore");
const { sendExportResponse } = require("../utils/exportHelper");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function calculateGradeLetter(score) {
  if (score === null || score === undefined || score === "" || Number.isNaN(Number(score))) return null;
  const val = Math.ceil(Number(score));
  if (val >= 81) return "A";
  if (val >= 61) return "B";
  if (val >= 41) return "C";
  if (val >= 21) return "D";
  if (val >= 0) return "E";
  return "E";
}

// ----------------------------------------------------------------------
// DYNAMIC PER-STUDENT CATALOG STORE FOR DOSEN DPL
// ----------------------------------------------------------------------
const DYNAMIC_STUDENT_CATALOG = new Map([
  [
    "24.11.6666",
    {
      nim: "24.11.6666",
      nama: "Fathur Rahman",
      email: "fathur.6666@students.amikom.ac.id",
      prodi: "Informatika",
      angkatan: "2024",
      foto_profile: "https://ui-avatars.com/api/?name=Fathur+Rahman&background=4f46e5&color=fff&bold=true",
      magang: {
        id_magang_fakultas: "FIK24116666",
        nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
        posisi: "Fullstack Developer Intern",
        jenis_program: "Magang Mandiri / MSIB",
        durasi_bulan: 6,
        tanggal_mulai: "2026-07-27",
        tanggal_selesai: "2026-12-27",
        supervisor_mitra: "Rian Hidayat, S.T. (Lead Software Engineering GoTo)",
        email_supervisor_mitra: "rian.hidayat@goto.com",
      },
      status_konversi: "Disetujui DPL",
      courses: [
        { id_item: 101, id_item_konversi: 101, kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu merancang web app responsif berbasis REST API", objective: "Merancang & mendeploy dashboard React.js responsif.", durasi: "6 Bulan", status_step: "Disetujui DPL", nilai_angka: 95, nilai_huruf: "A", catatan_dosen: "Arsitektur frontend sangat rapi." },
        { id_item: 102, id_item_konversi: 102, kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu mengelola database relasional & SQL query", objective: "Mengoptimalkan query PostgreSQL & RLS Policy.", durasi: "6 Bulan", status_step: "Disetujui DPL", nilai_angka: 92, nilai_huruf: "A", catatan_dosen: "Query optimization sangat tepat." },
        { id_item: 103, id_item_konversi: 103, kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu merancang diagram UML & proses bisnis", objective: "Menyusun dokumentasi arsitektur sistem & Sequence Diagram.", durasi: "6 Bulan", status_step: "Disetujui DPL", nilai_angka: 90, nilai_huruf: "A", catatan_dosen: "Dokumentasi sangat lengkap." },
        { id_item: 104, id_item_konversi: 104, kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, cpmk: "CPMK12-Mahasiswa mampu membangun API microservices & integrasi AI", objective: "Membangun REST API Express.js & integrasi AI recommendation.", durasi: "6 Bulan", status_step: "Disetujui DPL", nilai_angka: 88, nilai_huruf: "A", catatan_dosen: "Integrasi AI berjalan lancar." },
        { id_item: 105, id_item_konversi: 105, kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, cpmk: "CPMK-Mahasiswa mampu meluncurkan cloud microservices & CI/CD", objective: "Deployment cloud microservices & CI/CD pipeline.", durasi: "6 Bulan", status_step: "Disetujui DPL", nilai_angka: 94, nilai_huruf: "A", catatan_dosen: "CI/CD pipeline tanpa hambatan." },
      ],
    },
  ],
  [
    "21.11.4002",
    {
      nim: "21.11.4002",
      nama: "Siti Rahmawati",
      email: "siti.rahmawati@students.amikom.ac.id",
      prodi: "Informatika",
      angkatan: "2021",
      foto_profile: "https://ui-avatars.com/api/?name=Siti+Rahmawati&background=ec4899&color=fff&bold=true",
      magang: {
        id_magang_fakultas: "FIK21114002",
        nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
        posisi: "Cloud & Backend Engineer Intern",
        jenis_program: "Magang MBKM / MSIB",
        durasi_bulan: 6,
        tanggal_mulai: "2026-02-01",
        tanggal_selesai: "2026-07-31",
        supervisor_mitra: "Hendra Wijaya (Head of Backend Cloud GoTo)",
        email_supervisor_mitra: "hendra.wijaya@goto.com",
      },
      status_konversi: "Menunggu Review DPL",
      courses: [
        { id_item: 201, id_item_konversi: 201, kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu merancang web app responsif", objective: "Mengembangkan microfrontend React.js & Tailwind CSS.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 202, id_item_konversi: 202, kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu mengelola database relasional", objective: "Merancang skema PostgreSQL & database clustering.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 203, id_item_konversi: 203, kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu merancang diagram UML", objective: "Membuat arsitektur sistem cloud microservices.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 204, id_item_konversi: 204, kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, cpmk: "CPMK12-Mahasiswa mampu membangun model AI", objective: "Implementasi model AI forecasting & data pipeline.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 205, id_item_konversi: 205, kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, cpmk: "CPMK-Mahasiswa mampu meluncurkan cloud container", objective: "Dockerization & Kubernetes orchestration.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
      ],
    },
  ],
  [
    "21.11.4001",
    {
      nim: "21.11.4001",
      nama: "Budi Santoso",
      email: "budi.4001@students.amikom.ac.id",
      prodi: "Informatika",
      angkatan: "2021",
      foto_profile: "https://ui-avatars.com/api/?name=Budi+Santoso&background=3b82f6&color=fff&bold=true",
      magang: {
        id_magang_fakultas: "FIK21114001",
        nama_instansi: "PT Google Indonesia",
        posisi: "Software Engineer Intern",
        jenis_program: "Magang Mandiri",
        durasi_bulan: 6,
        tanggal_mulai: "2026-02-01",
        tanggal_selesai: "2026-07-31",
        supervisor_mitra: "Budi Setiawan (Staff Software Engineer Google)",
        email_supervisor_mitra: "budi.setiawan@google.com",
      },
      status_konversi: "Menunggu Review DPL",
      courses: [
        { id_item: 301, id_item_konversi: 301, kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu merancang UI responsif", objective: "Sliced UI Figma to HTML5/CSS3 React.js.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 302, id_item_konversi: 302, kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu menulis SQL query", objective: "Menulis query SQL ganjil & stored procedure.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 303, id_item_konversi: 303, kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu merancang diagram sistem", objective: "Merancang Flowchart & ERD sistem informasi.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 304, id_item_konversi: 304, kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, cpmk: "CPMK12-Mahasiswa mampu mengintegrasikan API NLP", objective: "Integrasi API NLP & Text Classification.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 305, id_item_konversi: 305, kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, cpmk: "CPMK-Mahasiswa mampu meluncurkan cloud server", objective: "Cloud server deployment AWS EC2.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
      ],
    },
  ],
  [
    "24.11.4006",
    {
      nim: "24.11.4006",
      nama: "Ramadhan",
      email: "ramadhan.4006@students.amikom.ac.id",
      prodi: "Informatika",
      angkatan: "2024",
      foto_profile: "https://ui-avatars.com/api/?name=Ramadhan&background=8b5cf6&color=fff&bold=true",
      magang: {
        id_magang_fakultas: "FIK24114006",
        nama_instansi: "PT Amikom Tech Digital",
        posisi: "Fullstack Developer Intern",
        jenis_program: "Magang Mandiri",
        durasi_bulan: 6,
        tanggal_mulai: "2026-07-27",
        tanggal_selesai: "2026-12-27",
        supervisor_mitra: "Agus Pratama (Senior Fullstack Tech Lead)",
        email_supervisor_mitra: "agus.pratama@amikomtech.com",
      },
      status_konversi: "Menunggu Review DPL",
      courses: [
        { id_item: 401, id_item_konversi: 401, kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu membuat portal web", objective: "Membangun portal e-learning & CMS dashboard.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 402, id_item_konversi: 402, kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu mengoptimalkan skema database", objective: "Optimization & indexing Supabase database.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 403, id_item_konversi: 403, kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu merancang UI/UX wireframe", objective: "Perancangan UI/UX wireframe & system specification.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 404, id_item_konversi: 404, kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, cpmk: "CPMK12-Mahasiswa mampu fine-tuning AI model", objective: "Fine-tuning model generative AI.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 405, id_item_konversi: 405, kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, cpmk: "CPMK-Mahasiswa mampu setup server network", objective: "Setup VPN & Server Network Infrastructure.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
      ],
    },
  ],
  [
    "24.11.5556",
    {
      nim: "24.11.5556",
      nama: "Daus sedap",
      email: "rebelzi8@gmail.com",
      prodi: "Informatika",
      angkatan: "2024",
      foto_profile: "https://ui-avatars.com/api/?name=Daus+sedap&background=10b981&color=fff&bold=true",
      magang: {
        id_magang_fakultas: "FIK24115556",
        nama_instansi: "PT. ADM (PT. ADM)",
        posisi: "Fullstack Developer Intern",
        jenis_program: "Magang Mandiri",
        durasi_bulan: 6,
        tanggal_mulai: "2026-07-27",
        tanggal_selesai: "2026-12-27",
        supervisor_mitra: "Siti Rahmawati (Supervisor Industri ADM)",
        email_supervisor_mitra: "siti.rahma@adm.co.id",
      },
      status_konversi: "Menunggu Review DPL",
      courses: [
        { id_item: 501, id_item_konversi: 501, kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu membuat landing page admin", objective: "Membuat landing page & dashboard admin.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 502, id_item_konversi: 502, kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu mengelola relasi database", objective: "Operasi CRUD & relasi tabel database.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 503, id_item_konversi: 503, kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu menganalisis user stories", objective: "Analisis kebutuhan sistem & user stories.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 504, id_item_konversi: 504, kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, cpmk: "CPMK12-Mahasiswa mampu membangun chatbot AI", objective: "Implementasi chatbot AI customer support.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        { id_item: 505, id_item_konversi: 505, kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, cpmk: "CPMK-Mahasiswa mampu konfigurasi Nginx & SSL", objective: "Configuration Linux Nginx & SSL Certificate.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
      ],
    },
  ],
]);

// Helper: Resolve active DPL profile from JWT token / DB
async function resolveDplProfile(req) {
  const userId = req.user?.userId;
  const email = req.user?.email;
  const profileId = req.user?.profileId;

  let dpl = null;

  if (profileId) {
    const { data } = await supabase
      .from("dosen_pembimbing")
      .select("*")
      .eq("nidn", profileId)
      .maybeSingle();
    if (data) dpl = data;
  }

  if (!dpl && userId) {
    const { data } = await supabase
      .from("dosen_pembimbing")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) dpl = data;
  }

  if (!dpl && email) {
    const { data } = await supabase
      .from("dosen_pembimbing")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    if (data) dpl = data;
  }

  if (!dpl) {
    dpl = {
      nidn: profileId || "0512038901",
      nama: req.user?.name || "Dr. Indah Susanti, M.Kom",
      email: email || "indah.susanti@amikom.ac.id",
      bidang_keahlian: "Software Engineering & Cloud Microservices",
      foto_profile: `https://ui-avatars.com/api/?name=${encodeURIComponent(req.user?.name || "Dosen DPL")}&background=0284c7&color=fff&bold=true`,
      is_active: true,
    };
  }

  return dpl;
}

// ----------------------------------------------------------------------
// 1. GET /api/v1/dosen/dashboard-stats
// ----------------------------------------------------------------------
router.get("/dashboard-stats", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const requestedSemester = Number.parseInt(req.query.semester, 10) || 6;

    const advisees = Array.from(DYNAMIC_STUDENT_CATALOG.values());

    let countPerluReview = 0;
    let countDisetujui = 0;
    let countRevisi = 0;
    let totalSksDikembangkan = 0;

    for (const student of advisees) {
      for (const course of student.courses) {
        const st = course.status_step || "Menunggu Review DPL";
        if (st.includes("Revisi")) countRevisi++;
        else if (st.includes("Disetujui") || st.includes("ACC")) countDisetujui++;
        else countPerluReview++;
        totalSksDikembangkan += Number(course.sks || 4);
      }
    }

    res.json({
      status: 200,
      message: "Statistik Dashboard DPL berhasil diambil",
      data: {
        dosen: {
          nidn: dpl.nidn,
          nama: dpl.nama,
          email: dpl.email,
          bidang_keahlian: dpl.bidang_keahlian || "Informatika & Software Engineering",
        },
        filter_semester: requestedSemester,
        total_mahasiswa_ampu: advisees.length,
        ringkasan_konversi: {
          total_sks_dikembangkan: totalSksDikembangkan,
          total_perlu_review: countPerluReview,
          total_disetujui: countDisetujui,
          total_revisi: countRevisi,
        },
        mahasiswa_ampu_ringkasan: advisees.map((m) => ({
          nim: m.nim,
          nama: m.nama,
          prodi: m.prodi,
          angkatan: m.angkatan,
          posisi: m.magang.posisi,
          nama_instansi: m.magang.nama_instansi,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 2. GET /api/v1/dosen/mahasiswa
// Daftar Mahasiswa Bimbingan DPL
// ----------------------------------------------------------------------
router.get("/mahasiswa", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const searchKeyword = (req.query.search || "").toLowerCase().trim();
    const filterStatus = req.query.status_konversi || "";

    const { data: dbMhs } = await supabase.from("mahasiswa").select("*");
    const { data: dbStep1 } = await supabase.from("pengajuan_magang").select("*");
    const { data: dbStep2 } = await supabase.from("proposal_magang").select("*");
    const { data: dbStep4 } = await supabase.from("pengajuan_dpl").select("*");
    const { data: dbStep5 } = await supabase.from("pengajuan_konversi_matkul").select("*");

    const resultList = [];
    const catalogList = Array.from(DYNAMIC_STUDENT_CATALOG.values());

    for (const catalogItem of catalogList) {
      const nim = catalogItem.nim;
      const dbM = (dbMhs || []).find((m) => m.nim === nim);
      const db1 = (dbStep1 || []).find((s) => s.nim === nim);
      const db2 = (dbStep2 || []).find((p) => p.nim === nim);
      const db4 = (dbStep4 || []).find((d) => d.nim === nim);
      const db5 = (dbStep5 || []).find((k) => k.nim === nim);

      const mNama = dbM?.nama || catalogItem.nama;
      const mEmail = dbM?.email || catalogItem.email;
      const mProdi = dbM?.prodi || catalogItem.prodi;
      const mAngkatan = dbM?.angkatan || catalogItem.angkatan;
      const mInstansi = db1?.nama_instansi || db2?.nama_instansi || catalogItem.magang.nama_instansi;
      const mPosisi = db2?.program_diikuti || db1?.posisi || catalogItem.magang.posisi;

      // Status overall calculation
      const statuses = catalogItem.courses.map((c) => c.status_step);
      let overallStatus = catalogItem.status_konversi;
      if (statuses.some((s) => s.includes("Revisi"))) overallStatus = "Revisi DPL";
      else if (statuses.every((s) => s.includes("Disetujui") || s.includes("ACC"))) overallStatus = "Disetujui DPL";
      else overallStatus = "Menunggu Review DPL";

      catalogItem.status_konversi = overallStatus;

      const item = {
        nim: nim,
        nama: mNama,
        email: mEmail,
        prodi: mProdi,
        angkatan: mAngkatan,
        foto_profile: dbM?.foto_profile || catalogItem.foto_profile,
        magang: {
          id_magang_fakultas: db1?.id_magang_fakultas || catalogItem.magang.id_magang_fakultas,
          nama_instansi: mInstansi,
          posisi: mPosisi,
          jenis_program: db1?.jenis_program || catalogItem.magang.jenis_program,
          durasi_bulan: catalogItem.magang.durasi_bulan,
          tanggal_mulai: catalogItem.magang.tanggal_mulai,
          tanggal_selesai: catalogItem.magang.tanggal_selesai,
          supervisor_mitra: catalogItem.magang.supervisor_mitra,
        },
        plotting_dpl: {
          status_pengajuan: db4?.status_pengajuan || "Disetujui",
          sk_dpl_url: db4?.sk_dpl_url || `https://fik.amikom.ac.id/sk-dpl/SK-DPL-${nim}.pdf`,
          sks_ditempuh: db4?.sks_ditempuh || 110,
        },
        konversi_sks: {
          status_konversi: overallStatus,
          total_sks: catalogItem.courses.reduce((sum, c) => sum + Number(c.sks || 4), 0),
          total_matkul: catalogItem.courses.length,
          mode_input: db5?.mode_input || "AI_RECOMMENDATION",
          updated_at: db5?.updated_at || new Date().toISOString(),
        },
      };

      const matchSearch =
        !searchKeyword ||
        item.nama.toLowerCase().includes(searchKeyword) ||
        item.nim.toLowerCase().includes(searchKeyword) ||
        item.magang.nama_instansi.toLowerCase().includes(searchKeyword);

      const matchStatus =
        !filterStatus ||
        item.konversi_sks.status_konversi.toLowerCase().includes(filterStatus.toLowerCase());

      if (matchSearch && matchStatus) {
        resultList.push(item);
      }
    }

    res.json({
      status: 200,
      message: "Daftar mahasiswa yang diampu DPL berhasil diambil",
      data: {
        dosen: {
          nidn: dpl.nidn,
          nama: dpl.nama,
        },
        total_mahasiswa: resultList.length,
        mahasiswa: resultList,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 3. GET /api/v1/dosen/mahasiswa/:nim
// Detail Mahasiswa Bimbingan DPL & Form Review Klaim Nilai
// ----------------------------------------------------------------------
router.get("/mahasiswa/:nim", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const nimParam = req.params.nim.trim();

    // Query DB
    const { data: mProfile } = await supabase.from("mahasiswa").select("*").eq("nim", nimParam).maybeSingle();
    const { data: dplSub } = await supabase.from("pengajuan_dpl").select("*").eq("nim", nimParam).maybeSingle();
    const { data: magangSub } = await supabase.from("pengajuan_magang").select("*").eq("nim", nimParam).maybeSingle();
    const { data: proposalSub } = await supabase.from("proposal_magang").select("*").eq("nim", nimParam).maybeSingle();
    const { data: konversiHeader } = await supabase.from("pengajuan_konversi_matkul").select("*").eq("nim", nimParam).maybeSingle();
    const { data: dbItemDetails } = await supabase.from("item_konversi_detail").select("*").eq("nim", nimParam);
    const { data: dbItemsMk } = await supabase.from("item_konversi_mk").select("*").eq("nim", nimParam);

    // Resolve per-student catalog data
    let studentCatalog = DYNAMIC_STUDENT_CATALOG.get(nimParam);
    if (!studentCatalog) {
      studentCatalog = {
        nim: nimParam,
        nama: mProfile?.nama || `Mahasiswa (${nimParam})`,
        email: mProfile?.email || `${nimParam}@students.amikom.ac.id`,
        prodi: mProfile?.prodi || "Informatika",
        angkatan: mProfile?.angkatan || "2024",
        foto_profile: mProfile?.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(nimParam)}&background=4f46e5&color=fff&bold=true`,
        magang: {
          id_magang_fakultas: `FIK${nimParam.replace(/\./g, "")}`,
          nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
          posisi: "Fullstack Developer Intern",
          jenis_program: "Magang Mandiri",
          durasi_bulan: 6,
          tanggal_mulai: "2026-07-27",
          tanggal_selesai: "2026-12-27",
          supervisor_mitra: "Supervisor Industri",
          email_supervisor_mitra: "supervisor@mitra.com",
        },
        status_konversi: "Menunggu Review DPL",
        courses: [
          { id_item: 601, id_item_konversi: 601, kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu merancang web app responsif", objective: "Merancang & mendeploy dashboard React.js responsif.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
          { id_item: 602, id_item_konversi: 602, kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu mengelola database relasional", objective: "Mengoptimalkan query PostgreSQL & RLS Policy.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
          { id_item: 603, id_item_konversi: 603, kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu merancang diagram UML", objective: "Menyusun dokumentasi arsitektur sistem & Sequence Diagram.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
          { id_item: 604, id_item_konversi: 604, kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, cpmk: "CPMK12-Mahasiswa mampu membangun API microservices", objective: "Membangun REST API Express.js & integrasi AI recommendation.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
          { id_item: 605, id_item_konversi: 605, kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, cpmk: "CPMK-Mahasiswa mampu meluncurkan cloud microservices", objective: "Deployment cloud microservices & CI/CD pipeline.", durasi: "6 Bulan", status_step: "Menunggu Review DPL", nilai_angka: null, nilai_huruf: null, catatan_dosen: null },
        ],
      };
      DYNAMIC_STUDENT_CATALOG.set(nimParam, studentCatalog);
    }

    // Merge DB conversion items if present
    if (dbItemDetails && dbItemDetails.length > 0) {
      studentCatalog.courses = dbItemDetails.map((item) => ({
        id_item: item.id_item,
        id_item_konversi: item.id_item,
        kode_mk: item.kode_mk,
        nama_mk: item.nama_mk,
        sks: Number(item.sks || 4),
        cpmk: item.cpmk || "CPMK-Mampu menguasai modul teknologi industri",
        objective: item.objective || item.modul_industri || "-",
        durasi: item.durasi || "6 Bulan",
        status_step: item.status_item || "Menunggu Review DPL",
        catatan_dosen: item.catatan_dosen || null,
        nilai_angka: item.nilai_angka,
        nilai_huruf: item.nilai_huruf,
      }));
    } else if (dbItemsMk && dbItemsMk.length > 0) {
      studentCatalog.courses = dbItemsMk.map((item) => ({
        id_item: item.id_item_konversi,
        id_item_konversi: item.id_item_konversi,
        kode_mk: item.kode_mk,
        nama_mk: item.kode_mk === "ST084" ? "Pemrograman Web" : item.kode_mk === "ST116" ? "Pemrograman Basis Data" : item.kode_mk === "ST091" ? "Analisis dan Desain Sistem Informasi" : item.kode_mk === "ST055" ? "Kecerdasan Buatan (Artificial Intelligence)" : "Jaringan Komputer dan Cloud",
        sks: 4,
        cpmk: "CPMK-Mahasiswa mampu merancang perangkat lunak pada platform digital",
        objective: item.modul_industri || item.aktivitas_magang || "-",
        durasi: "6 Bulan",
        status_step: item.status_step || item.status_usulan || "Menunggu Review DPL",
        catatan_dosen: item.catatan_dosen || null,
        nilai_angka: item.nilai_akhir_angka,
        nilai_huruf: item.nilai_akhir_huruf,
      }));
    }

    const itemsKonversi = studentCatalog.courses;
    const totalSks = itemsKonversi.reduce((acc, curr) => acc + Number(curr.sks || 4), 0);
    const hasRevision = itemsKonversi.some((i) => (i.status_step || "").includes("Revisi"));
    const allApproved = itemsKonversi.every((i) => (i.status_step || "").includes("Disetujui") || (i.status_step || "").includes("ACC"));

    let overallStatus = konversiHeader?.status_konversi || studentCatalog.status_konversi;
    if (hasRevision) overallStatus = "Revisi DPL";
    else if (allApproved) overallStatus = "Disetujui DPL";

    studentCatalog.status_konversi = overallStatus;

    res.json({
      status: 200,
      message: `Detail data mahasiswa bimbingan ${mProfile?.nama || studentCatalog.nama} (NIM: ${nimParam}) berhasil diambil`,
      data: {
        dosen: {
          nidn: dpl.nidn,
          nama: dpl.nama,
        },
        mahasiswa: {
          nim: nimParam,
          nama: mProfile?.nama || studentCatalog.nama,
          email: mProfile?.email || studentCatalog.email,
          prodi: mProfile?.prodi || studentCatalog.prodi,
          angkatan: mProfile?.angkatan || studentCatalog.angkatan,
          foto_profile: mProfile?.foto_profile || studentCatalog.foto_profile,
        },
        pengajuan_magang: {
          id_pengajuan: magangSub?.id_pengajuan || 1,
          id_magang_fakultas: magangSub?.nomor_layanan_fik || magangSub?.id_magang_fakultas || dplSub?.id_magang_fakultas || studentCatalog.magang.id_magang_fakultas,
          nama_instansi: magangSub?.nama_instansi || proposalSub?.nama_instansi || studentCatalog.magang.nama_instansi,
          posisi: magangSub?.posisi || proposalSub?.program_diikuti || studentCatalog.magang.posisi,
          jenis_program: magangSub?.jenis_program || studentCatalog.magang.jenis_program,
          durasi_bulan: magangSub?.durasi_bulan || studentCatalog.magang.durasi_bulan,
          tanggal_mulai: magangSub?.tanggal_mulai || studentCatalog.magang.tanggal_mulai,
          tanggal_selesai: magangSub?.tanggal_selesai || studentCatalog.magang.tanggal_selesai,
          supervisor_mitra: magangSub?.nama_supervisor_mitra || studentCatalog.magang.supervisor_mitra,
          email_supervisor_mitra: magangSub?.email_supervisor_mitra || studentCatalog.magang.email_supervisor_mitra,
          status_pengajuan: magangSub?.status_pengajuan || "Disetujui",
          status_program: magangSub?.status_program || "Sedang Berjalan",
        },
        pengajuan_dpl: {
          id_pengajuan_dpl: dplSub?.id_pengajuan_dpl || 1,
          sks_ditempuh: dplSub?.sks_ditempuh || 110,
          bukti_diterima_magang: dplSub?.bukti_diterima_magang || `https://fik.amikom.ac.id/bukti/BUKTI-ACCEPTANCE-${nimParam}.pdf`,
          file_khs: dplSub?.file_khs || `https://fik.amikom.ac.id/khs/KHS-TRANSKRIP-${nimParam}.pdf`,
          sk_dpl_url: dplSub?.sk_dpl_url || `https://fik.amikom.ac.id/sk-dpl/SK-DPL-${nimParam}.pdf`,
          status_pengajuan: dplSub?.status_pengajuan || "Disetujui",
        },
        proposal_magang: proposalSub ? {
          id_proposal: proposalSub.id_proposal,
          file_proposal_pdf: proposalSub.file_proposal_pdf,
          status_review: proposalSub.status_review,
        } : {
          file_proposal_pdf: `https://drive.google.com/file/d/proposal_${nimParam.replace(/\./g, "_")}.pdf`,
          status_review: "Disetujui Kaprodi",
        },
        surat_pengantar: {
          surat_pengantar_url: `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK${nimParam.replace(/\./g, "")}.pdf`,
          status_surat: "Disetujui",
        },
        konversi_sks: {
          id_konversi: konversiHeader?.id_konversi || 1,
          mode_input: konversiHeader?.mode_input || "AI_RECOMMENDATION",
          total_sks: totalSks,
          status_konversi: overallStatus,
          items_konversi: itemsKonversi,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 4. POST & PUT /api/v1/dosen/konversi/review
// Review DPL: ACC / REVISI / INPUT NILAI
// ----------------------------------------------------------------------
const handleDosenKonversiReview = async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const {
      id_item_konversi,
      id_item,
      nim,
      action,
      catatan_dosen,
      catatan_revisi,
      keterangan,
      nilai_angka,
      nilai_huruf,
    } = req.body;

    const targetId = id_item_konversi || id_item;
    const targetNim = nim || req.body.nim_mahasiswa || "24.11.6666";

    const chosenAction = action ? action.toUpperCase() : "ACC";
    const validActions = ["ACC", "REVISI", "INPUT_NILAI"];

    if (!validActions.includes(chosenAction)) {
      throw httpError(400, `Action tidak valid. Harus salah satu dari: ${validActions.join(", ")}`);
    }

    const noteText = (catatan_dosen || catatan_revisi || keterangan || "").trim();
    if (chosenAction === "REVISI" && !noteText) {
      throw httpError(400, "Catatan / keterangan revisi wajib diisi ketika dosen meminta revisi");
    }

    const newStatusStep = chosenAction === "REVISI" ? "Revisi DPL" : "Disetujui DPL";
    const defaultNote = chosenAction === "ACC" ? "Capaian CPMK dan modul magang disetujui DPL" : noteText;
    const finalNote = noteText || defaultNote;

    const scoreNum =
      nilai_angka !== undefined && nilai_angka !== null && nilai_angka !== "" && !isNaN(Number(nilai_angka))
        ? Number(nilai_angka)
        : null;

    const finalLetter = scoreNum !== null ? (nilai_huruf || calculateGradeLetter(scoreNum)) : (nilai_huruf || null);

    // Update in Supabase tables
    if (targetId) {
      await supabase
        .from("item_konversi_mk")
        .update({
          status_step: newStatusStep,
          catatan_dosen: finalNote,
          nilai_akhir_angka: scoreNum,
          nilai_akhir_huruf: finalLetter,
          updated_at: new Date().toISOString(),
        })
        .eq("id_item_konversi", targetId);

      await supabase
        .from("item_konversi_detail")
        .update({
          status_item: newStatusStep,
          catatan_dosen: finalNote,
          nilai_angka: scoreNum,
          nilai_huruf: finalLetter,
          updated_at: new Date().toISOString(),
        })
        .eq("id_item", targetId);
    }

    // Synchronize memory catalog for this student
    const studentCatalog = DYNAMIC_STUDENT_CATALOG.get(targetNim);
    if (studentCatalog) {
      for (const course of studentCatalog.courses) {
        if (!targetId || Number(course.id_item) === Number(targetId) || Number(course.id_item_konversi) === Number(targetId)) {
          course.status_step = newStatusStep;
          course.catatan_dosen = finalNote;
          if (scoreNum !== null) course.nilai_angka = scoreNum;
          if (finalLetter) course.nilai_huruf = finalLetter;
        }
      }

      const statuses = studentCatalog.courses.map((c) => c.status_step);
      if (statuses.some((s) => s.includes("Revisi"))) studentCatalog.status_konversi = "Revisi DPL";
      else if (statuses.every((s) => s.includes("Disetujui") || s.includes("ACC"))) studentCatalog.status_konversi = "Disetujui DPL";
    }

    res.json({
      status: 200,
      message: `Review DPL untuk mahasiswa (${targetNim}) berhasil disimpan [Action: ${chosenAction}]`,
      data: {
        nim: targetNim,
        id_item_konversi: targetId || null,
        status_konversi: newStatusStep,
        catatan_dosen: finalNote,
        nilai_angka: scoreNum,
        nilai_huruf: finalLetter,
        reviewed_by: {
          nidn: dpl.nidn,
          nama: dpl.nama,
        },
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

router.post("/konversi/review", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), handleDosenKonversiReview);
router.put("/konversi/review", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), handleDosenKonversiReview);

// Shortcut routes
router.post("/konversi/acc", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), (req, res, next) => {
  req.body.action = "ACC";
  return handleDosenKonversiReview(req, res, next);
});

router.put("/konversi/acc", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), (req, res, next) => {
  req.body.action = "ACC";
  return handleDosenKonversiReview(req, res, next);
});

router.post("/konversi/revisi", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), (req, res, next) => {
  req.body.action = "REVISI";
  return handleDosenKonversiReview(req, res, next);
});

router.put("/konversi/revisi", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), (req, res, next) => {
  req.body.action = "REVISI";
  return handleDosenKonversiReview(req, res, next);
});

// ----------------------------------------------------------------------
// 5. EXPORT DATA MAHASISWA BIMBINGAN DPL TO EXCEL / CSV
// ----------------------------------------------------------------------
router.get(["/export/mahasiswa", "/export-mahasiswa"], authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const format = req.query.format || "excel";

    const catalogList = Array.from(DYNAMIC_STUDENT_CATALOG.values());

    const headers = [
      "NIM",
      "Nama Mahasiswa Bimbingan",
      "Prodi",
      "Angkatan",
      "Email Student",
      "Nama Instansi Magang",
      "Posisi Magang",
      "Total SKS Usulan",
      "Daftar Mata Kuliah Konversi",
      "Status Review DPL",
      "Catatan Review DPL",
      "Nilai Angka Rata-Rata",
      "Nilai Huruf Rata-Rata",
      "Tanggal Pengajuan",
    ];

    const rows = catalogList.map((mhs) => {
      const totalSks = mhs.courses.reduce((sum, c) => sum + Number(c.sks || 4), 0);
      const mkListStr = mhs.courses.map((i) => `${i.kode_mk} (${i.sks} SKS)`).join("; ");

      const scoredCourses = mhs.courses.filter((c) => c.nilai_angka !== null && c.nilai_angka !== undefined);
      const avgScore = scoredCourses.length > 0
        ? Math.round(scoredCourses.reduce((sum, c) => sum + Number(c.nilai_angka), 0) / scoredCourses.length)
        : null;
      const letterScore = calculateGradeLetter(avgScore);

      return [
        mhs.nim,
        mhs.nama,
        mhs.prodi,
        mhs.angkatan,
        mhs.email,
        mhs.magang.nama_instansi,
        mhs.magang.posisi,
        totalSks,
        mkListStr,
        mhs.status_konversi,
        mhs.courses[0]?.catatan_dosen || "Pemetaan modul industri sangat sesuai CPMK prodi.",
        avgScore !== null ? avgScore : "-",
        letterScore !== null ? letterScore : "-",
        mhs.magang.tanggal_mulai || "2026-07-27",
      ];
    });

    sendExportResponse(res, `Data_Mahasiswa_Bimbingan_DPL_${dpl.nidn}`, headers, rows, format);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
