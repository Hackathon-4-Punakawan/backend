const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { memoryDplStore, memoryProposalStore, memorySuratStore, memoryKonversiStore } = require("../utils/sharedStore");

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

  // Fallback default DPL profile if not linked in DB yet
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
// Ringkasan Statistik DPL: Jumlah Mahasiswa Diampu per Semester, Status Konversi
// ----------------------------------------------------------------------
router.get("/dashboard-stats", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const requestedSemester = Number.parseInt(req.query.semester, 10) || 6;

    // Fetch advisee submissions for this DPL
    const { data: dbDplSubs } = await supabase
      .from("pengajuan_dpl")
      .select("*");

    const { data: dbMagangSubs } = await supabase
      .from("pengajuan_magang")
      .select("*, mahasiswa(nim, nama, email, prodi, angkatan, foto_profile)");

    const { data: dbKonversiHeader } = await supabase
      .from("pengajuan_konversi_matkul")
      .select("*");

    const { data: dbKonversiItems } = await supabase
      .from("item_konversi_mk")
      .select("*");

    const { data: dbItemDetails } = await supabase
      .from("item_konversi_detail")
      .select("*");

    // Aggregate advisee students
    const adviseeMap = new Map();

    // 1. Combine DB items from pengajuan_magang
    for (const magang of dbMagangSubs || []) {
      const isMatchDpl = !magang.nidn || magang.nidn === dpl.nidn || req.user.role === "ADMIN_PRODI";
      if (isMatchDpl && magang.nim) {
        adviseeMap.set(magang.nim, {
          nim: magang.nim,
          nama: magang.mahasiswa?.nama || "Mahasiswa FIK",
          email: magang.mahasiswa?.email || `${magang.nim}@students.amikom.ac.id`,
          prodi: magang.mahasiswa?.prodi || "Informatika",
          angkatan: magang.mahasiswa?.angkatan || "2021",
          semester: magang.semester || requestedSemester,
          posisi: magang.posisi || "Fullstack Developer Intern",
          nama_instansi: magang.nama_instansi || "PT Amikom Digital",
          id_magang_fakultas: magang.nomor_layanan_fik || magang.id_magang_fakultas || "FIK6199364",
        });
      }
    }

    // 2. Combine from pengajuan_dpl
    for (const dplSub of dbDplSubs || []) {
      if ((dplSub.nidn_dpl === dpl.nidn || !dplSub.nidn_dpl || req.user.role === "ADMIN_PRODI") && dplSub.nim) {
        if (!adviseeMap.has(dplSub.nim)) {
          adviseeMap.set(dplSub.nim, {
            nim: dplSub.nim,
            nama: dplSub.nama_mahasiswa || "Mahasiswa FIK",
            email: dplSub.email_mahasiswa || `${dplSub.nim}@students.amikom.ac.id`,
            prodi: "Informatika",
            angkatan: "2021",
            semester: requestedSemester,
            posisi: "Software Engineer Intern",
            nama_instansi: "PT Technology Indonesia",
            id_magang_fakultas: dplSub.id_magang_fakultas || "FIK6199364",
          });
        }
      }
    }

    // Ensure fallback demo student 21.11.4001 is included if empty
    if (adviseeMap.size === 0) {
      adviseeMap.set("21.11.4001", {
        nim: "21.11.4001",
        nama: "Budi Santoso",
        email: "budi.santoso@students.amikom.ac.id",
        prodi: "Informatika",
        angkatan: "2021",
        semester: 6,
        posisi: "Fullstack Developer Intern",
        nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
        id_magang_fakultas: "FIK6199373",
      });
    }

    const advisees = Array.from(adviseeMap.values());

    // Calculate status breakdowns
    let countPerluReview = 0;
    let countDisetujui = 0;
    let countRevisi = 0;
    let totalSksDikembangkan = 0;

    // Evaluate items from item_konversi_mk
    for (const item of dbKonversiItems || []) {
      const status = item.status_step || item.status_usulan || "Menunggu Review DPL";
      if (status.includes("Revisi")) {
        countRevisi++;
      } else if (status.includes("Disetujui") || status.includes("ACC")) {
        countDisetujui++;
      } else {
        countPerluReview++;
      }
      totalSksDikembangkan += 4;
    }

    // Evaluate items from item_konversi_detail
    for (const item of dbItemDetails || []) {
      const status = item.status_item || "Menunggu Persetujuan DPL";
      const sks = item.sks || 4;
      if (status.includes("Revisi")) {
        countRevisi++;
      } else if (status.includes("Disetujui") || status.includes("ACC")) {
        countDisetujui++;
      } else {
        countPerluReview++;
      }
      totalSksDikembangkan += sks;
    }

    // Fallback counts if database has no items yet
    if (countPerluReview === 0 && countDisetujui === 0 && countRevisi === 0) {
      countPerluReview = 1;
      countDisetujui = 4;
      totalSksDikembangkan = 20;
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
          semester: m.semester,
          posisi: m.posisi,
          nama_instansi: m.nama_instansi,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 2. GET /api/v1/dosen/mahasiswa
// Menampilkan Daftar Mahasiswa yang Diampu oleh DPL
// ----------------------------------------------------------------------
router.get("/mahasiswa", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const searchKeyword = (req.query.search || "").toLowerCase().trim();
    const filterStatus = req.query.status_konversi || "";

    // Fetch DB Data
    const { data: dbMhs } = await supabase.from("mahasiswa").select("*");
    const { data: dbDplSub } = await supabase.from("pengajuan_dpl").select("*");
    const { data: dbMagangSub } = await supabase.from("pengajuan_magang").select("*");
    const { data: dbKonversiHeader } = await supabase.from("pengajuan_konversi_matkul").select("*");
    const { data: dbKonversiItems } = await supabase.from("item_konversi_mk").select("*");
    const { data: dbItemDetails } = await supabase.from("item_konversi_detail").select("*");

    const mhsMap = new Map();

    // Map all mahasiswa
    for (const m of dbMhs || []) {
      mhsMap.set(m.nim, m);
    }

    const resultList = [];

    // Grouping by student NIM
    const studentNims = new Set();
    for (const p of dbDplSub || []) if (p.nim) studentNims.add(p.nim);
    for (const m of dbMagangSub || []) if (m.nim) studentNims.add(m.nim);
    for (const k of dbKonversiHeader || []) if (k.nim) studentNims.add(k.nim);
    for (const i of dbItemDetails || []) if (i.nim) studentNims.add(i.nim);

    // Default demo student if DB empty
    if (studentNims.size === 0) {
      studentNims.add("21.11.4001");
    }

    for (const nim of studentNims) {
      const mProfile = mhsMap.get(nim) || {
        nim,
        nama: nim === "21.11.4001" ? "Budi Santoso" : "Mahasiswa Bimbingan FIK",
        email: `${nim}@students.amikom.ac.id`,
        prodi: "Informatika",
        angkatan: "2021",
        foto_profile: `https://ui-avatars.com/api/?name=${encodeURIComponent("Budi Santoso")}&background=4f46e5&color=fff&bold=true`,
      };

      // Find internship info
      const magangInfo = (dbMagangSub || []).find((m) => m.nim === nim) || {};
      const dplInfo = (dbDplSub || []).find((d) => d.nim === nim) || {};
      const konversiHeader = (dbKonversiHeader || []).find((k) => k.nim === nim) || {};

      // Filter conversion items for this student
      const studentItemsMk = (dbKonversiItems || []).filter((i) => i.id_pengajuan === magangInfo.id_pengajuan);
      const studentItemDetails = (dbItemDetails || []).filter((i) => i.nim === nim);

      const totalItemsCount = Math.max(studentItemsMk.length, studentItemDetails.length, 5);
      
      // Calculate Total SKS
      let totalSks = 0;
      if (studentItemDetails.length > 0) {
        totalSks = studentItemDetails.reduce((sum, item) => sum + Number(item.sks || 4), 0);
      } else if (studentItemsMk.length > 0) {
        totalSks = studentItemsMk.length * 4;
      } else {
        totalSks = konversiHeader.total_sks || 20;
      }

      // Determine Overall Status Konversi
      let overallStatus = konversiHeader.status_konversi || "Menunggu Review DPL";
      const allStatuses = [
        ...studentItemsMk.map((i) => i.status_step || i.status_usulan),
        ...studentItemDetails.map((i) => i.status_item),
      ].filter(Boolean);

      if (allStatuses.some((s) => s.includes("Revisi"))) {
        overallStatus = "Revisi DPL";
      } else if (allStatuses.length > 0 && allStatuses.every((s) => s.includes("Disetujui") || s.includes("ACC"))) {
        overallStatus = "Disetujui DPL";
      }

      const item = {
        nim: mProfile.nim,
        nama: mProfile.nama,
        email: mProfile.email,
        prodi: mProfile.prodi || "Informatika",
        angkatan: mProfile.angkatan || "2021",
        foto_profile: mProfile.foto_profile,
        magang: {
          id_magang_fakultas: magangInfo.nomor_layanan_fik || magangInfo.id_magang_fakultas || dplInfo.id_magang_fakultas || "FIK6199373",
          nama_instansi: magangInfo.nama_instansi || "PT GoTo Gojek Tokopedia Tbk",
          posisi: magangInfo.posisi || "Fullstack Developer Intern",
          jenis_program: magangInfo.jenis_program || "Magang Mandiri / MSIB",
          durasi_bulan: magangInfo.durasi_bulan || 6,
          tanggal_mulai: magangInfo.tanggal_mulai || "2026-02-01",
          tanggal_selesai: magangInfo.tanggal_selesai || "2026-07-31",
          supervisor_mitra: magangInfo.nama_supervisor_mitra || "Rian Hidayat (Lead Eng GoTo)",
        },
        plotting_dpl: {
          status_pengajuan: dplInfo.status_pengajuan || "Disetujui",
          sk_dpl_url: dplInfo.sk_dpl_url || "https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4001.pdf",
          sks_ditempuh: dplInfo.sks_ditempuh || 110,
        },
        konversi_sks: {
          status_konversi: overallStatus,
          total_sks: totalSks,
          total_matkul: totalItemsCount,
          mode_input: konversiHeader.mode_input || "AI_RECOMMENDATION",
          updated_at: konversiHeader.updated_at || new Date().toISOString(),
        },
      };

      // Filter Search
      const matchSearch =
        !searchKeyword ||
        item.nama.toLowerCase().includes(searchKeyword) ||
        item.nim.toLowerCase().includes(searchKeyword) ||
        item.magang.nama_instansi.toLowerCase().includes(searchKeyword);

      // Filter Status
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
// Menampilkan Data Detail Mahasiswa Bimbingan DPL
// ----------------------------------------------------------------------
router.get("/mahasiswa/:nim", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const dpl = await resolveDplProfile(req);
    const nimParam = req.params.nim.trim();

    // Query DB for specific student
    const { data: mProfile } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("nim", nimParam)
      .maybeSingle();

    const { data: dplSub } = await supabase
      .from("pengajuan_dpl")
      .select("*")
      .eq("nim", nimParam)
      .order("created_at", { ascending: false })
      .maybeSingle();

    const { data: magangSub } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", nimParam)
      .order("created_at", { ascending: false })
      .maybeSingle();

    const { data: proposalSub } = await supabase
      .from("proposal_magang")
      .select("*")
      .eq("nim", nimParam)
      .order("created_at", { ascending: false })
      .maybeSingle();

    const { data: suratPengantarSub } = await supabase
      .from("surat_pengantar_magang")
      .select("*")
      .eq("nim", nimParam)
      .order("created_at", { ascending: false })
      .maybeSingle();

    const { data: konversiHeader } = await supabase
      .from("pengajuan_konversi_matkul")
      .select("*")
      .eq("nim", nimParam)
      .maybeSingle();

    const { data: dbItemDetails } = await supabase
      .from("item_konversi_detail")
      .select("*")
      .eq("nim", nimParam)
      .order("id_item", { ascending: true });

    const { data: dbItemsMk } = await supabase
      .from("item_konversi_mk")
      .select("*")
      .order("id_item_konversi", { ascending: true });

    // Format Mahasiswa Detail Payload
    const studentName = mProfile?.nama || (nimParam === "21.11.4001" ? "Budi Santoso" : "Mahasiswa Bimbingan FIK");
    const studentEmail = mProfile?.email || `${nimParam}@students.amikom.ac.id`;

    // Process conversion items list
    let itemsKonversi = [];

    if (dbItemDetails && dbItemDetails.length > 0) {
      itemsKonversi = dbItemDetails.map((item) => ({
        id_item: item.id_item,
        id_item_konversi: item.id_item,
        kode_mk: item.kode_mk,
        nama_mk: item.nama_mk,
        sks: item.sks,
        cpmk: item.cpmk,
        objective: item.objective,
        durasi: item.durasi || "6 Bulan",
        status_step: item.status_item || "Menunggu Persetujuan DPL",
        catatan_dosen: item.catatan_dosen || item.catatan_revisi || null,
        nilai_angka: item.nilai_angka,
        nilai_huruf: item.nilai_huruf,
      }));
    } else if (dbItemsMk && dbItemsMk.length > 0) {
      itemsKonversi = dbItemsMk.map((item) => ({
        id_item: item.id_item_konversi,
        id_item_konversi: item.id_item_konversi,
        kode_mk: item.kode_mk,
        nama_mk: item.kode_mk === "ST084" ? "Pemrograman Web" : item.kode_mk === "ST116" ? "Pemrograman Basis Data" : item.kode_mk === "ST091" ? "Analisis dan Desain Sistem Informasi" : item.kode_mk === "ST055" ? "Arsitektur REST API & Cloud Computing" : "Rekayasa Perangkat Lunak",
        sks: 4,
        cpmk: "CPMK-Mahasiswa mampu merancang perangkat lunak pada platform digital",
        objective: item.aktivitas_magang || "Membangun REST API backend & microservices dashboard",
        durasi: "6 Bulan",
        status_step: item.status_step || item.status_usulan || "Menunggu Review DPL",
        catatan_dosen: item.catatan_dosen || null,
        nilai_angka: item.nilai_akhir_angka,
        nilai_huruf: item.nilai_akhir_huruf,
      }));
    } else {
      // Default fallback conversion list for preview/testing
      itemsKonversi = [
        {
          id_item: 101,
          id_item_konversi: 101,
          kode_mk: "ST084",
          nama_mk: "Pemrograman Web",
          sks: 4,
          cpmk: "CPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital\nCPMK18-Mahasiswa mampu menganalisis kebutuhan industri",
          objective: "Merancang dan merilis dashboard React.js responsif untuk kebutuhan internal perusahaan.",
          durasi: "6 Bulan",
          status_step: "Menunggu Review DPL",
          catatan_dosen: null,
          nilai_angka: null,
          nilai_huruf: null,
        },
        {
          id_item: 102,
          id_item_konversi: 102,
          kode_mk: "ST116",
          nama_mk: "Pemrograman Basis Data",
          sks: 4,
          cpmk: "CPMK15-Mahasiswa mampu menganalisis arsitektur basis data relasional & NoSQL",
          objective: "Mengoptimalkan skema PostgreSQL, menulis query kompleks, serta menerapkan indeks database.",
          durasi: "6 Bulan",
          status_step: "Disetujui DPL",
          catatan_dosen: "Penggunaan indexing dan query optimization sudah tepat.",
          nilai_angka: 88,
          nilai_huruf: "A",
        },
        {
          id_item: 103,
          id_item_konversi: 103,
          kode_mk: "ST055",
          nama_mk: "Arsitektur REST API & Cloud Computing",
          sks: 4,
          cpmk: "CPMK12-Mahasiswa mampu membangun API microservices dan cloud infrastructure",
          objective: "Mengembangkan REST API scalable dengan Node.js Express dan meluncurkan pada Cloud Server.",
          durasi: "6 Bulan",
          status_step: "Menunggu Review DPL",
          catatan_dosen: null,
          nilai_angka: null,
          nilai_huruf: null,
        },
        {
          id_item: 104,
          id_item_konversi: 104,
          kode_mk: "ST091",
          nama_mk: "Analisis dan Desain Sistem Informasi",
          sks: 4,
          cpmk: "CPMK11-Mahasiswa mampu menganalisis proses bisnis dan merancang UML Diagram",
          objective: "Menyusun dokumentasi arsitektur sistem, Use Case, Sequence Diagram, dan dokumentasi API Swagger.",
          durasi: "6 Bulan",
          status_step: "Disetujui DPL",
          catatan_dosen: "Dokumentasi sangat lengkap.",
          nilai_angka: 85,
          nilai_huruf: "A",
        },
        {
          id_item: 105,
          id_item_konversi: 105,
          kode_mk: "ST170",
          nama_mk: "Rekayasa Perangkat Lunak",
          sks: 4,
          cpmk: "CPMK-Mahasiswa mampu menerapkan software engineering & clean architecture",
          objective: "Menerapkan Agile/Scrum sprint, automated unit testing, dan CI/CD pipeline.",
          durasi: "6 Bulan",
          status_step: "Disetujui DPL",
          catatan_dosen: "Implementasi CI/CD berjalan lancar.",
          nilai_angka: 90,
          nilai_huruf: "A",
        },
      ];
    }

    const totalSks = itemsKonversi.reduce((acc, curr) => acc + Number(curr.sks || 4), 0);
    const hasRevision = itemsKonversi.some((i) => (i.status_step || "").includes("Revisi"));
    const allApproved = itemsKonversi.every((i) => (i.status_step || "").includes("Disetujui") || (i.status_step || "").includes("ACC"));

    let overallStatus = konversiHeader?.status_konversi || "Menunggu Review DPL";
    if (hasRevision) overallStatus = "Revisi DPL";
    else if (allApproved) overallStatus = "Disetujui DPL";

    res.json({
      status: 200,
      message: `Detail data mahasiswa bimbingan ${studentName} (NIM: ${nimParam}) berhasil diambil`,
      data: {
        dosen: {
          nidn: dpl.nidn,
          nama: dpl.nama,
        },
        mahasiswa: {
          nim: nimParam,
          nama: studentName,
          email: studentEmail,
          prodi: mProfile?.prodi || "Informatika",
          angkatan: mProfile?.angkatan || "2021",
          foto_profile: mProfile?.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4f46e5&color=fff&bold=true`,
        },
        pengajuan_magang: {
          id_pengajuan: magangSub?.id_pengajuan || 1,
          id_magang_fakultas: magangSub?.nomor_layanan_fik || magangSub?.id_magang_fakultas || dplSub?.id_magang_fakultas || "FIK6199373",
          nama_instansi: magangSub?.nama_instansi || proposalSub?.nama_instansi || "PT GoTo Gojek Tokopedia Tbk",
          posisi: magangSub?.posisi || proposalSub?.program_diikuti || "Fullstack Developer Intern",
          jenis_program: magangSub?.jenis_program || "Magang Mandiri / MSIB",
          durasi_bulan: magangSub?.durasi_bulan || 6,
          tanggal_mulai: magangSub?.tanggal_mulai || "2026-02-01",
          tanggal_selesai: magangSub?.tanggal_selesai || "2026-07-31",
          supervisor_mitra: magangSub?.nama_supervisor_mitra || "Rian Hidayat (Lead Eng GoTo)",
          email_supervisor_mitra: magangSub?.email_supervisor_mitra || "rian.hidayat@goto.com",
          status_pengajuan: magangSub?.status_pengajuan || "Disetujui",
          status_program: magangSub?.status_program || "Sedang Berjalan",
        },
        pengajuan_dpl: {
          id_pengajuan_dpl: dplSub?.id_pengajuan_dpl || 1,
          sks_ditempuh: dplSub?.sks_ditempuh || 110,
          bukti_diterima_magang: dplSub?.bukti_diterima_magang || "https://res.cloudinary.com/demo/image/upload/v1/bukti_diterima_goto.pdf",
          file_khs: dplSub?.file_khs || "https://res.cloudinary.com/demo/image/upload/v1/khs_budi.pdf",
          sk_dpl_url: dplSub?.sk_dpl_url || "https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4001.pdf",
          status_pengajuan: dplSub?.status_pengajuan || "Disetujui",
        },
        proposal_magang: proposalSub ? {
          id_proposal: proposalSub.id_proposal,
          file_proposal_pdf: proposalSub.file_proposal_pdf,
          status_review: proposalSub.status_review,
        } : null,
        surat_pengantar: suratPengantarSub ? {
          id_surat: suratPengantarSub.id_surat,
          surat_pengantar_url: suratPengantarSub.surat_pengantar_url,
          status_surat: suratPengantarSub.status_surat,
        } : null,
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
// Dosen Melakukan ACC / REVISI dengan Keterangan Wajib
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
    const targetNim = nim || req.body.nim_mahasiswa || "21.11.4001";

    if (!targetId && !targetNim) {
      throw httpError(400, "Wajib menyertakan id_item_konversi / id_item atau nim mahasiswa");
    }

    const chosenAction = action ? action.toUpperCase() : "ACC";
    const validActions = ["ACC", "REVISI", "INPUT_NILAI"];

    if (!validActions.includes(chosenAction)) {
      throw httpError(400, `Action tidak valid. Harus salah satu dari: ${validActions.join(", ")}`);
    }

    // MANDATORY REVISION NOTE VALIDATION
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

    // Update in item_konversi_mk
    if (targetId) {
      await supabase
        .from("item_konversi_mk")
        .update({
          status_step: newStatusStep,
          status_usulan: newStatusStep,
          catatan_dosen: finalNote,
          nilai_akhir_angka: scoreNum,
          nilai_akhir_huruf: finalLetter,
          updated_at: new Date().toISOString(),
        })
        .eq("id_item_konversi", targetId);
    }

    // Update in item_konversi_detail
    if (targetId) {
      await supabase
        .from("item_konversi_detail")
        .update({
          status_item: newStatusStep,
          catatan_dosen: finalNote,
          nilai_angka: scoreNum,
          nilai_huruf: finalLetter,
        })
        .eq("id_item", targetId);
    }

    // Also update all items for student if bulk NIM request
    if (targetNim && !targetId) {
      await supabase
        .from("item_konversi_detail")
        .update({
          status_item: newStatusStep,
          catatan_dosen: finalNote,
          nilai_angka: scoreNum,
          nilai_huruf: finalLetter,
        })
        .eq("nim", targetNim);
    }

    // Update Header pengajuan_konversi_matkul status
    if (targetNim) {
      await supabase
        .from("pengajuan_konversi_matkul")
        .update({
          status_konversi: newStatusStep,
          updated_at: new Date().toISOString(),
        })
        .eq("nim", targetNim);
    }

    res.json({
      status: 200,
      message: `Review konversi SKS oleh Dosen DPL (${dpl.nama}) berhasil disimpan (Status: ${newStatusStep})`,
      data: {
        id_item_konversi: targetId || 1,
        nim: targetNim,
        action: chosenAction,
        status_step: newStatusStep,
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

// ----------------------------------------------------------------------
// 5. HELPER SHORTCUT ENDPOINTS: ACC & REVISI
// ----------------------------------------------------------------------
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

module.exports = router;
