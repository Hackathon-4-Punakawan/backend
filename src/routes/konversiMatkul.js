const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { memoryKonversiStore, memoryProposalStore } = require("../utils/sharedStore");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const DEFAULT_COURSE_CATALOG = [
  {
    kode_mk: "ST084",
    nama_mk: "Pemrograman Web",
    sks: 4,
    semester: 6,
    cpmk: "CPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital\nCPMK18-Mahasiswa mampu menganalisis kebutuhan industri atau masyarakat",
    default_objective: "Memulai Dasar Pemrograman Web. 1. Meneliti, merancang, dan membangun web app responsif.",
  },
  {
    kode_mk: "ST116",
    nama_mk: "Pemrograman Basis Data",
    sks: 4,
    semester: 6,
    cpmk: "CPMK15-Mahasiswa mampu menganalisis perangkat lunak pada berbagai platform digital\nCPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital",
    default_objective: "Belajar Fundamen Database. 1. Menerapkan Microservices, SQL query, dan database optimization.",
  },
  {
    kode_mk: "ST091",
    nama_mk: "Analisis dan Desain Sistem Informasi",
    sks: 4,
    semester: 6,
    cpmk: "CPMK11-Mahasiswa mampu menghasilkan produk ekonomi kreatif digital dalam bidang informatika\nCPMK18-Mahasiswa mampu menganalisis kebutuhan industri atau masyarakat",
    default_objective: "Memulai Dasar Perancangan Sistem. 1. Meneliti, menganalisis sistem, UML diagram, dan proses bisnis.",
  },
  {
    kode_mk: "ST055",
    nama_mk: "Arsitektur REST API & Cloud Computing",
    sks: 4,
    semester: 6,
    cpmk: "CPMK12-Mahasiswa mampu membangun API microservices dan cloud infrastructure",
    default_objective: "Membangun REST API scalable, backend Node.js, dan deployment cloud server.",
  },
  {
    kode_mk: "ST060",
    nama_mk: "Etika Profesi & Manajemen Proyek TI",
    sks: 4,
    semester: 6,
    cpmk: "CPMK09-Mahasiswa mampu berkomunikasi dan bekerja sama secara profesional dalam tim",
    default_objective: "Manajemen proyek software berbasis Agile/Scrum dan komunikasi tim industri.",
  },
];

function calculateGradeLetter(score) {
  if (score === null || score === undefined || isNaN(Number(score))) return null;
  const val = Number(score);
  if (val >= 85) return "A";
  if (val >= 80) return "A-";
  if (val >= 75) return "B+";
  if (val >= 70) return "B";
  if (val >= 65) return "B-";
  if (val >= 60) return "C+";
  if (val >= 55) return "C";
  return "D";
}

// 1. GET COURSE CATALOG FOR MANUAL SELECTION
router.get("/catalog", authenticateToken, async (req, res, next) => {
  try {
    const { data: dbCatalog } = await supabase
      .from("mata_kuliah_catalog")
      .select("*")
      .order("kode_mk", { ascending: true });

    const catalog = dbCatalog && dbCatalog.length > 0 ? dbCatalog : DEFAULT_COURSE_CATALOG;

    res.json({
      status: 200,
      message: "Daftar katalog mata kuliah konversi SKS berhasil diambil",
      data: catalog,
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST AI RECOMMENDATION KONVERSI MATKUL
router.post("/ai-recommendation", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { deskripsi_kegiatan: inputDeskripsi } = req.body;

    const { data: mhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mhs) throw httpError(404, "Data mahasiswa tidak ditemukan");

    // Fetch internship activity description from proposal if not supplied
    let textToAnalyze = inputDeskripsi;
    if (!textToAnalyze) {
      const { data: dbProp } = await supabase
        .from("proposal_magang")
        .select("deskripsi_kegiatan, keahlian_utama")
        .eq("nim", mhs.nim)
        .order("created_at", { ascending: false })
        .maybeSingle();

      const memoryProp = memoryProposalStore.find((p) => p.nim === mhs.nim);
      const chosen = dbProp || memoryProp;

      if (chosen) {
        textToAnalyze = `${chosen.deskripsi_kegiatan || ""} ${chosen.keahlian_utama || ""}`;
      } else {
        textToAnalyze = "Pengembangan web application, REST API backend, pengelolaan database PostgreSQL, dan analisis sistem.";
      }
    }

    const lowerText = textToAnalyze.toLowerCase();

    // Fetch master course catalog
    const { data: dbCatalog } = await supabase
      .from("mata_kuliah_catalog")
      .select("*");

    const catalog = dbCatalog && dbCatalog.length > 0 ? dbCatalog : DEFAULT_COURSE_CATALOG;

    // AI Keyword & CPMK Matching Logic
    const recommendations = catalog.map((mk) => {
      let matchScore = 70; // baseline
      let reason = "Mata kuliah relevan dengan kurikulum semester berjalan";

      if (mk.kode_mk === "ST084" || mk.nama_mk.toLowerCase().includes("web")) {
        if (lowerText.includes("web") || lowerText.includes("frontend") || lowerText.includes("api") || lowerText.includes("fullstack")) {
          matchScore = 95;
          reason = "Aktivitas magang melibatkan pengembangan web & REST API yang sangat sesuai dengan CPMK16 & CPMK18";
        }
      } else if (mk.kode_mk === "ST116" || mk.nama_mk.toLowerCase().includes("basis data")) {
        if (lowerText.includes("database") || lowerText.includes("sql") || lowerText.includes("postgres") || lowerText.includes("data")) {
          matchScore = 92;
          reason = "Aktivitas magang mencakup pengelolaan database & query SQL yang cocok dengan CPMK15 & CPMK16";
        }
      } else if (mk.kode_mk === "ST091" || mk.nama_mk.toLowerCase().includes("analisis")) {
        if (lowerText.includes("analisis") || lowerText.includes("desain") || lowerText.includes("sistem") || lowerText.includes("obe") || lowerText.includes("uml")) {
          matchScore = 88;
          reason = "Aktivitas magang mencakup analisis kebutuhan sistem & desain arsitektur perangkat lunak";
        }
      } else if (mk.kode_mk === "ST055" || mk.nama_mk.toLowerCase().includes("rest api")) {
        if (lowerText.includes("api") || lowerText.includes("microservices") || lowerText.includes("cloud") || lowerText.includes("backend")) {
          matchScore = 90;
          reason = "Proyek magang membangun REST API & backend scalable untuk platform digital";
        }
      }

      return {
        kode_mk: mk.kode_mk,
        nama_mk: mk.nama_mk,
        sks: mk.sks,
        cpmk: mk.cpmk,
        objective: mk.default_objective || `Pencapaian kompetensi industri pada mata kuliah ${mk.nama_mk}`,
        durasi: "6 Bulan",
        nilai_angka: null,
        nilai_huruf: null,
        match_score: matchScore,
        alasan_rekomendasi: reason,
      };
    }).sort((a, b) => b.match_score - a.match_score);

    // Pick top 3 recommendations matching typical 12 SKS conversion package
    const top3Recommendations = recommendations.slice(0, 3);

    res.json({
      status: 200,
      message: "Rekomendasi AI konversi matkul berdasarkan deskripsi kegiatan & semester berhasil dibuat",
      data: {
        nim: mhs.nim,
        nama_mahasiswa: mhs.nama,
        deskripsi_dianalisis: textToAnalyze.substring(0, 200) + "...",
        total_sks_direkomendasikan: top3Recommendations.reduce((sum, item) => sum + item.sks, 0),
        rekomendasi_matkul: top3Recommendations,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST SUBMIT KONVERSI MATKUL (STEP 5 BATCH SUBMIT)
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { mode, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw httpError(400, "Daftar baris konversi mata kuliah (items array) wajib diisi");
    }

    const { data: mhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mhs) throw httpError(404, "Data mahasiswa tidak ditemukan");

    // Format & Validate each row
    const formattedItems = items.map((item, idx) => {
      if (!item.nama_mk || !item.nama_mk.trim()) {
        throw httpError(400, `Baris ke-${idx + 1}: Nama Mata Kuliah wajib dipilih / diisi`);
      }

      const scoreNum = item.nilai_angka !== undefined && item.nilai_angka !== null && !isNaN(Number(item.nilai_angka))
        ? Number(item.nilai_angka)
        : null;
      const letterGrade = item.nilai_huruf || calculateGradeLetter(scoreNum);

      return {
        id_item: idx + 1,
        nim: mhs.nim,
        kode_mk: item.kode_mk ? item.kode_mk.trim() : `ST08${idx + 4}`,
        nama_mk: item.nama_mk.trim(),
        sks: item.sks ? Number(item.sks) : 4,
        cpmk: item.cpmk || "CPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital",
        objective: item.objective ? item.objective.trim() : "Mencapai kompetensi magang industri secara hands-on",
        durasi: item.durasi ? item.durasi.trim() : "6 Bulan",
        nilai_angka: scoreNum,
        nilai_huruf: letterGrade,
        status_item: "Menunggu Persetujuan DPL",
        action: "Disimpan",
      };
    });

    const totalSks = formattedItems.reduce((acc, curr) => acc + curr.sks, 0);
    const modeInput = mode === "AI_RECOMMENDATION" ? "AI_RECOMMENDATION" : "MANUAL";

    const payloadHeader = {
      id_konversi: memoryKonversiStore.length + 1,
      nim: mhs.nim,
      nama_mahasiswa: mhs.nama,
      mode_input: modeInput,
      total_sks: totalSks,
      status_konversi: "Menunggu Review DPL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: formattedItems,
    };

    let result = null;
    const { data: dbHeader, error: dbErr } = await supabase
      .from("pengajuan_konversi_matkul")
      .insert({
        nim: mhs.nim,
        mode_input: modeInput,
        total_sks: totalSks,
        status_konversi: "Menunggu Review DPL",
      })
      .select()
      .maybeSingle();

    if (dbErr || !dbHeader) {
      result = payloadHeader;
    } else {
      result = { ...dbHeader, items: formattedItems };
    }

    memoryKonversiStore.unshift(result);

    res.status(201).json({
      status: 201,
      message: `Konversi SKS berhasil disimpan (${formattedItems.length} Mata Kuliah, Total ${totalSks} SKS, Mode: ${modeInput})`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET MONITORING STATUS KONVERSI MATKUL MAHASISWA
router.get("/my-status", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mhs) throw httpError(404, "Data mahasiswa tidak ditemukan");

    let konversiData = null;
    const { data: dbData } = await supabase
      .from("pengajuan_konversi_matkul")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (dbData && dbData.length > 0) {
      konversiData = dbData[0];
    } else {
      const mem = memoryKonversiStore.find((k) => k.nim === mhs.nim);
      if (mem) konversiData = mem;
    }

    if (!konversiData) {
      return res.json({
        status: 200,
        message: "Mahasiswa belum mengajukan Konversi SKS Mata Kuliah (Step 5)",
        data: null,
      });
    }

    res.json({
      status: 200,
      message: "Data konversi SKS mata kuliah mahasiswa berhasil diambil",
      data: konversiData,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
