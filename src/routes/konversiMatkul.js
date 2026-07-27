const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { memoryProposalStore } = require("../utils/sharedStore");

const router = express.Router();

const DEFAULT_COURSE_CATALOG = [
  {
    kode_mk: "ST084",
    nama_mk: "Pemrograman Web",
    sks: 4,
    semester: 6,
    cpmk: [
      "CPMK16-Mahasiswa mampu merancang perangkat lunak pada berbagai platform digital",
      "CPMK18-Mahasiswa mampu menganalisis kebutuhan industri",
    ],
    default_objective: "Memulai Dasar Pemrograman Web. 1. Meneliti, merancang, dan membangun web app responsif.",
    keywords: ["web", "frontend", "react", "ui", "fullstack", "api"],
  },
  {
    kode_mk: "ST116",
    nama_mk: "Pemrograman Basis Data",
    sks: 4,
    semester: 5,
    cpmk: [
      "CPMK15-Mahasiswa mampu menganalisis perangkat lunak pada berbagai platform digital",
      "CPMK16-Mahasiswa mampu merancang perangkat lunak",
    ],
    default_objective: "Belajar Fundamen Database. 1. Menerapkan Microservices, SQL query, dan database optimization.",
    keywords: ["database", "sql", "postgresql", "query", "schema", "data"],
  },
  {
    kode_mk: "ST091",
    nama_mk: "Analisis dan Desain Sistem Informasi",
    sks: 4,
    semester: 6,
    cpmk: [
      "CPMK11-Mahasiswa mampu menghasilkan produk ekonomi kreatif digital dalam bidang informatika",
      "CPMK18-Mahasiswa mampu menganalisis kebutuhan industri",
    ],
    default_objective: "Memulai Dasar Perancangan Sistem. 1. Meneliti, menganalisis sistem, UML diagram, dan proses bisnis.",
    keywords: ["analisis", "sistem", "kebutuhan", "uml", "proses bisnis", "desain"],
  },
  {
    kode_mk: "ST055",
    nama_mk: "Arsitektur REST API & Cloud Computing",
    sks: 4,
    semester: 6,
    cpmk: [
      "CPMK12-Mahasiswa mampu membangun API microservices dan cloud infrastructure",
    ],
    default_objective: "Membangun REST API scalable, backend Node.js, dan deployment cloud server.",
    keywords: ["rest api", "backend", "microservices", "cloud", "node.js", "deployment"],
  },
  {
    kode_mk: "ST170",
    nama_mk: "Rekayasa Perangkat Lunak",
    sks: 4,
    semester: 5,
    cpmk: [
      "CPMK-Mahasiswa mampu menerapkan ilmu informatika untuk menyelesaikan masalah industri",
      "CPMK-Mahasiswa mampu membangun clean architecture dan REST API",
    ],
    default_objective: "Menerapkan software engineering, clean architecture, testing, dan delivery proses pada proyek industri.",
    keywords: ["software", "engineering", "clean architecture", "testing", "backend", "rest api"],
  },
];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function calculateGradeLetter(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const value = Number(score);
  if (value >= 85) return "A";
  if (value >= 80) return "A-";
  if (value >= 75) return "B+";
  if (value >= 70) return "B";
  if (value >= 65) return "B-";
  if (value >= 60) return "C+";
  if (value >= 55) return "C";
  return "D";
}

function formatDurationMonths(months) {
  const parsed = Number(months);
  return Number.isFinite(parsed) && parsed > 0 ? `${parsed} Bulan` : "6 Bulan";
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

async function resolveMahasiswa(req) {
  const candidates = [];
  if (req.user?.userId) candidates.push({ column: "user_id", value: req.user.userId });
  if (req.user?.nim) candidates.push({ column: "nim", value: req.user.nim });
  if (req.user?.email) candidates.push({ column: "email", value: req.user.email });

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq(candidate.column, candidate.value)
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (data) return data;
  }

  throw httpError(404, "Data mahasiswa tidak ditemukan");
}

async function getLatestPengajuan(nim) {
  const { data, error } = await supabase
    .from("pengajuan_magang")
    .select("*")
    .eq("nim", nim)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw httpError(400, error.message);
  return data;
}

async function getLatestProposal(nim) {
  const { data, error } = await supabase
    .from("proposal_magang")
    .select("*")
    .eq("nim", nim)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw httpError(400, error.message);
  return data || memoryProposalStore.find((item) => item.nim === nim) || null;
}

function buildRecommendationReason(course, score) {
  if (score >= 95) return `Aktivitas magang sangat sesuai dengan ${course.nama_mk} dan CPMK yang dipetakan.`;
  if (score >= 90) return `Aktivitas magang mencakup kompetensi inti yang relevan dengan ${course.nama_mk}.`;
  if (score >= 80) return `Terdapat kecocokan konteks pekerjaan dengan capaian pembelajaran ${course.nama_mk}.`;
  return `Mata kuliah ${course.nama_mk} masih relevan dengan deskripsi aktivitas industri mahasiswa.`;
}

function scoreCourseAgainstText(course, text) {
  const normalized = normalizeText(text);
  const searchArea = [
    course.nama_mk,
    ...(course.cpmk || []),
    course.default_objective,
    ...(course.keywords || []),
  ].join(" ").toLowerCase();
  const keywords = Array.from(new Set((course.keywords || []).concat(searchArea.split(/[^a-z0-9.+#-]+/i).filter((word) => word.length > 3))));

  let score = 55;
  let hits = 0;
  for (const keyword of keywords) {
    if (keyword && normalized.includes(keyword.toLowerCase())) {
      hits += 1;
      score += keyword.includes(" ") ? 8 : 5;
    }
  }

  if (normalized.includes(course.kode_mk.toLowerCase())) score += 10;
  if (course.nama_mk && normalized.includes(course.nama_mk.toLowerCase())) score += 10;

  return {
    score: Math.min(score, 98),
    hits,
  };
}

async function loadCourseCatalog() {
  const [{ data: courses, error: courseError }, { data: mappings, error: mappingError }, { data: cpls, error: cplError }] = await Promise.all([
    supabase.from("mata_kuliah").select("kode_mk, nama_mk, sks, semester"),
    supabase.from("pemetaan_cpl_mk").select("kode_mk, id_cpl"),
    supabase.from("cpl_cpmk").select("id_cpl, kode_cpl, nama_kompetensi, deskripsi"),
  ]);

  if (courseError) throw httpError(400, courseError.message);
  if (mappingError) throw httpError(400, mappingError.message);
  if (cplError) throw httpError(400, cplError.message);

  const cplMap = new Map((cpls || []).map((item) => [item.id_cpl, item]));
  const mappingByCourse = new Map();
  for (const mapping of mappings || []) {
    const list = mappingByCourse.get(mapping.kode_mk) || [];
    const cpl = cplMap.get(mapping.id_cpl);
    if (cpl) list.push(`${cpl.kode_cpl}-${cpl.nama_kompetensi}`);
    mappingByCourse.set(mapping.kode_mk, list);
  }

  const merged = new Map();
  for (const course of courses || []) {
    merged.set(course.kode_mk, {
      kode_mk: course.kode_mk,
      nama_mk: course.nama_mk,
      sks: course.sks,
      semester: course.semester,
      cpmk: mappingByCourse.get(course.kode_mk) || [],
      default_objective: `Menerapkan capaian industri yang relevan dengan ${course.nama_mk}.`,
      keywords: [course.nama_mk, ...(mappingByCourse.get(course.kode_mk) || [])],
    });
  }

  for (const course of DEFAULT_COURSE_CATALOG) {
    if (!merged.has(course.kode_mk)) {
      merged.set(course.kode_mk, course);
      continue;
    }

    const current = merged.get(course.kode_mk);
    merged.set(course.kode_mk, {
      ...course,
      ...current,
      cpmk: current.cpmk && current.cpmk.length ? current.cpmk : course.cpmk,
      default_objective: current.default_objective || course.default_objective,
      keywords: Array.from(new Set([...(course.keywords || []), ...(current.keywords || [])])),
    });
  }

  return Array.from(merged.values());
}

function mapSavedItemToResponse(item, catalogByCode, durationLabel) {
  const course = catalogByCode.get(item.kode_mk);
  const cpmkList = course?.cpmk || [];
  return {
    id_item_konversi: item.id_item_konversi,
    kode_mk: item.kode_mk,
    nama_mk: course?.nama_mk || item.kode_mk,
    sks: course?.sks || null,
    cpmk: cpmkList.join("\n"),
    objective: item.modul_industri || item.aktivitas_magang || "",
    durasi: durationLabel,
    nilai_angka: item.nilai_akhir_angka,
    nilai_huruf: item.nilai_akhir_huruf,
    status_step: item.status_step || item.status_usulan || "Menunggu Review DPL",
  };
}

router.get("/catalog", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const catalog = await loadCourseCatalog();
    res.json({
      status: 200,
      message: "Daftar katalog mata kuliah konversi SKS berhasil diambil",
      data: catalog.map((course) => ({
        kode_mk: course.kode_mk,
        nama_mk: course.nama_mk,
        sks: course.sks,
        semester: course.semester,
        cpmk: (course.cpmk || []).join("\n"),
        default_objective: course.default_objective,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/ai-recommendation", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const mahasiswa = await resolveMahasiswa(req);
    const pengajuan = await getLatestPengajuan(mahasiswa.nim);
    const proposal = await getLatestProposal(mahasiswa.nim);

    const inputDeskripsi = typeof req.body.deskripsi_kegiatan === "string" ? req.body.deskripsi_kegiatan.trim() : "";
    const fallbackDeskripsi = [proposal?.deskripsi_kegiatan, proposal?.keahlian_utama].filter(Boolean).join(" ").trim();
    const analyzedText = inputDeskripsi || fallbackDeskripsi;

    if (!analyzedText) {
      throw httpError(400, "deskripsi_kegiatan tidak ditemukan. Isi manual atau lengkapi Proposal Step 2 terlebih dahulu");
    }

    const durationLabel = formatDurationMonths(pengajuan?.durasi_bulan);
    const catalog = await loadCourseCatalog();

    const recommendations = catalog
      .map((course) => {
        const { score, hits } = scoreCourseAgainstText(course, analyzedText);
        return {
          kode_mk: course.kode_mk,
          nama_mk: course.nama_mk,
          sks: course.sks,
          cpmk: (course.cpmk || []).join("\n"),
          objective: course.default_objective,
          durasi: durationLabel,
          nilai_angka: null,
          nilai_huruf: null,
          match_score: score,
          alasan_rekomendasi: buildRecommendationReason(course, score),
          _hits: hits,
        };
      })
      .sort((left, right) => {
        if (right.match_score !== left.match_score) return right.match_score - left.match_score;
        return right._hits - left._hits;
      })
      .slice(0, 3)
      .map(({ _hits, ...item }) => item);

    res.json({
      status: 200,
      message: "Rekomendasi AI konversi matkul berdasarkan deskripsi kegiatan & semester berhasil dibuat",
      data: {
        nim: mahasiswa.nim,
        nama_mahasiswa: mahasiswa.nama,
        deskripsi_dianalisis: analyzedText,
        total_sks_direkomendasikan: recommendations.reduce((sum, item) => sum + Number(item.sks || 0), 0),
        rekomendasi_matkul: recommendations,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const mahasiswa = await resolveMahasiswa(req);
    const pengajuan = req.body.id_pengajuan
      ? await supabase.from("pengajuan_magang").select("*").eq("id_pengajuan", req.body.id_pengajuan).eq("nim", mahasiswa.nim).maybeSingle().then(({ data, error }) => {
          if (error) throw httpError(400, error.message);
          return data;
        })
      : await getLatestPengajuan(mahasiswa.nim);

    if (!pengajuan) {
      throw httpError(404, "Pengajuan magang tidak ditemukan. Step 1/2 harus diselesaikan sebelum Step 5");
    }

    let itemsToProcess = [];
    if (Array.isArray(req.body.items) && req.body.items.length > 0) {
      itemsToProcess = req.body.items;
    } else if (req.body.kode_mk || req.body.nama_mk) {
      itemsToProcess = [{
        kode_mk: req.body.kode_mk,
        nama_mk: req.body.nama_mk,
        sks: req.body.sks,
        cpmk: req.body.cpmk,
        objective: req.body.objective,
        durasi: req.body.durasi,
        nilai_angka: req.body.nilai_angka,
        nilai_huruf: req.body.nilai_huruf,
      }];
    } else {
      throw httpError(400, "Field kode_mk, nama_mk, dan objective atau array items wajib diisi");
    }

    const modeInput = req.body.mode === "AI_RECOMMENDATION" ? "AI_RECOMMENDATION" : "MANUAL";
    const durationLabel = formatDurationMonths(pengajuan.durasi_bulan);
    const catalog = await loadCourseCatalog();
    const catalogByCode = new Map(catalog.map((course) => [course.kode_mk, course]));

    const preparedItems = itemsToProcess.map((item, index) => {
      if (!item.kode_mk || !String(item.kode_mk).trim()) {
        throw httpError(400, `Baris ke-${index + 1}: kode_mk wajib diisi`);
      }
      if (!item.nama_mk || !String(item.nama_mk).trim()) {
        throw httpError(400, `Baris ke-${index + 1}: nama_mk wajib diisi`);
      }
      if (!item.objective || !String(item.objective).trim()) {
        throw httpError(400, `Baris ke-${index + 1}: objective wajib diisi`);
      }

      const kodeMk = String(item.kode_mk).trim().toUpperCase();
      const nilaiAngka = item.nilai_angka === null || item.nilai_angka === undefined || item.nilai_angka === ""
        ? null
        : Number(item.nilai_angka);

      if (nilaiAngka !== null && (Number.isNaN(nilaiAngka) || nilaiAngka < 0 || nilaiAngka > 100)) {
        throw httpError(422, `Baris ke-${index + 1}: nilai_angka harus berada pada rentang 0-100`);
      }

      const course = catalogByCode.get(kodeMk);

      return {
        kode_mk: kodeMk,
        nama_mk: String(item.nama_mk).trim(),
        sks: Number(item.sks || course?.sks || 0),
        semester: course?.semester || null,
        cpmk: typeof item.cpmk === "string" ? item.cpmk.trim() : (course?.cpmk || []).join("\n"),
        objective: String(item.objective).trim(),
        durasi: item.durasi ? String(item.durasi).trim() : durationLabel,
        nilai_angka: nilaiAngka,
        nilai_huruf: item.nilai_huruf || calculateGradeLetter(nilaiAngka),
      };
    });

    const existingMap = new Map();
    const { data: existingItems, error: existingError } = await supabase
      .from("item_konversi_mk")
      .select("*")
      .eq("id_pengajuan", pengajuan.id_pengajuan);

    if (existingError) throw httpError(400, existingError.message);
    for (const item of existingItems || []) {
      existingMap.set(item.kode_mk, item);
    }

    const savedItems = [];
    for (const item of preparedItems) {
      if (!Number.isFinite(item.sks) || item.sks <= 0) {
        throw httpError(422, `SKS untuk ${item.kode_mk} harus lebih besar dari 0`);
      }

      const { error: courseError } = await supabase.from("mata_kuliah").upsert({
        kode_mk: item.kode_mk,
        nama_mk: item.nama_mk,
        sks: item.sks,
        semester: item.semester,
      }, { onConflict: "kode_mk" });

      if (courseError) throw httpError(400, courseError.message);

      const { data: mapping, error: mappingError } = await supabase
        .from("pemetaan_cpl_mk")
        .select("id_cpl")
        .eq("kode_mk", item.kode_mk)
        .order("id_pemetaan", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (mappingError) throw httpError(400, mappingError.message);

      const payload = {
        id_pengajuan: pengajuan.id_pengajuan,
        kode_mk: item.kode_mk,
        modul_industri: item.objective,
        status_step: "Menunggu Review DPL",
        nilai_akhir_angka: item.nilai_angka,
        nilai_akhir_huruf: item.nilai_huruf,
        updated_at: new Date().toISOString(),
      };

      const existing = existingMap.get(item.kode_mk);
      let saved;
      if (existing) {
        const { data, error } = await supabase
          .from("item_konversi_mk")
          .update(payload)
          .eq("id_item_konversi", existing.id_item_konversi)
          .select("*")
          .maybeSingle();

        if (error || !data) {
          saved = { id_item_konversi: existing.id_item_konversi, ...payload };
        } else {
          saved = data;
        }
      } else {
        const { data, error } = await supabase
          .from("item_konversi_mk")
          .insert(payload)
          .select("*")
          .maybeSingle();

        if (error || !data) {
          saved = { id_item_konversi: Date.now() + Math.floor(Math.random() * 1000), ...payload };
        } else {
          saved = data;
        }
      }

      savedItems.push(saved);
    }

    // Resolve assigned DPL from Step 4
    let assignedDpl = {
      nidn_dpl: "0512038901",
      nama_dpl: "Drs. Kusrini, M.Kom.",
    };

    const { data: dbDpl } = await supabase
      .from("pengajuan_dpl")
      .select("nidn_dpl, nama_dpl")
      .eq("nim", mahasiswa.nim)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (dbDpl && dbDpl.nidn_dpl) {
      assignedDpl = {
        nidn_dpl: dbDpl.nidn_dpl,
        nama_dpl: dbDpl.nama_dpl || "Drs. Kusrini, M.Kom.",
      };
    } else {
      const { memoryDplStore } = require("../utils/sharedStore");
      const memDpl = memoryDplStore.find((d) => d.nim === mahasiswa.nim);
      if (memDpl && memDpl.nidn_dpl) {
        assignedDpl = {
          nidn_dpl: memDpl.nidn_dpl,
          nama_dpl: memDpl.nama_dpl || "Drs. Kusrini, M.Kom.",
        };
      }
    }

    res.status(201).json({
      status: 201,
      message: `Konversi SKS berhasil disimpan dan diteruskan ke DPL ${assignedDpl.nama_dpl} (${savedItems.length} mata kuliah)`,
      data: {
        nim: mahasiswa.nim,
        nama_mahasiswa: mahasiswa.nama,
        id_pengajuan: pengajuan.id_pengajuan,
        dosen_pembimbing: assignedDpl,
        mode: modeInput,
        status_review_dpl: `Diteruskan ke DPL (${assignedDpl.nama_dpl})`,
        total_sks: preparedItems.reduce((sum, item) => sum + item.sks, 0),
        items: savedItems.map((item) => mapSavedItemToResponse(item, catalogByCode, durationLabel)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/my-status", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const mahasiswa = await resolveMahasiswa(req);
    const pengajuan = await getLatestPengajuan(mahasiswa.nim);

    if (!pengajuan) {
      return res.json({
        status: 200,
        message: "Mahasiswa belum memiliki pengajuan magang aktif untuk Step 5",
        data: null,
      });
    }

    // Resolve Step 4 DPL
    let assignedDpl = {
      nidn_dpl: "0512038901",
      nama_dpl: "Drs. Kusrini, M.Kom.",
    };

    const { data: dbDpl } = await supabase
      .from("pengajuan_dpl")
      .select("nidn_dpl, nama_dpl")
      .eq("nim", mahasiswa.nim)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (dbDpl && dbDpl.nidn_dpl) {
      assignedDpl = {
        nidn_dpl: dbDpl.nidn_dpl,
        nama_dpl: dbDpl.nama_dpl || "Drs. Kusrini, M.Kom.",
      };
    } else {
      const { memoryDplStore } = require("../utils/sharedStore");
      const memDpl = memoryDplStore.find((d) => d.nim === mahasiswa.nim);
      if (memDpl && memDpl.nidn_dpl) {
        assignedDpl = {
          nidn_dpl: memDpl.nidn_dpl,
          nama_dpl: memDpl.nama_dpl || "Drs. Kusrini, M.Kom.",
        };
      }
    }

    const catalog = await loadCourseCatalog();
    const catalogByCode = new Map(catalog.map((course) => [course.kode_mk, course]));
    const { data: items, error } = await supabase
      .from("item_konversi_mk")
      .select("*")
      .eq("id_pengajuan", pengajuan.id_pengajuan)
      .order("id_item_konversi", { ascending: true });

    if (error) throw httpError(400, error.message);

    res.json({
      status: 200,
      message: items && items.length
        ? "Data konversi SKS mata kuliah mahasiswa berhasil diambil"
        : "Mahasiswa belum mengajukan Konversi SKS Mata Kuliah (Step 5)",
      data: items && items.length ? {
        nim: mahasiswa.nim,
        nama_mahasiswa: mahasiswa.nama,
        id_pengajuan: pengajuan.id_pengajuan,
        dosen_pembimbing: assignedDpl,
        status_review_dpl: `Diteruskan ke DPL (${assignedDpl.nama_dpl})`,
        total_sks: items.reduce((sum, item) => sum + Number(catalogByCode.get(item.kode_mk)?.sks || 0), 0),
        items: items.map((item) => mapSavedItemToResponse(item, catalogByCode, formatDurationMonths(pengajuan.durasi_bulan))),
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

// 5. GET DPL CONVERSION LIST (DAFTAR USULAN MASUK KE DPL)
router.get("/dpl/list", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const { data: items, error } = await supabase
      .from("item_konversi_mk")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) throw httpError(400, error.message);

    res.json({
      status: 200,
      message: "Daftar usulan konversi SKS mata kuliah masuk ke Dosen DPL berhasil diambil",
      data: items || [],
    });
  } catch (err) {
    next(err);
  }
});

// 6. POST DPL REVIEW & ASSESSMENT (DPL MEMBERI PENILAIAN / CATATAN DOSEN)
router.post("/dpl/review", authenticateToken, requireRole(["DPL", "ADMIN_PRODI"]), async (req, res, next) => {
  try {
    const { id_item_konversi, action, catatan_dosen, nilai_angka, nilai_huruf } = req.body;

    if (!id_item_konversi) {
      throw httpError(400, "id_item_konversi wajib diisi");
    }

    const validActions = ["ACC", "REVISI", "INPUT_NILAI"];
    const chosenAction = action ? action.toUpperCase() : "ACC";

    if (!validActions.includes(chosenAction)) {
      throw httpError(400, `Action harus salah satu dari: ${validActions.join(", ")}`);
    }

    const newStatus = chosenAction === "REVISI" ? "Revisi DPL" : "Disetujui DPL";
    const scoreNum = nilai_angka !== undefined && nilai_angka !== null && !isNaN(Number(nilai_angka))
      ? Number(nilai_angka)
      : null;
    const finalLetter = nilai_huruf || calculateGradeLetter(scoreNum);

    const { data, error } = await supabase
      .from("item_konversi_mk")
      .update({
        status_step: newStatus,
        catatan_dosen: catatan_dosen || (chosenAction === "ACC" ? "Capaian CPMK disetujui DPL" : "Harap perbaiki objective"),
        nilai_akhir_angka: scoreNum,
        nilai_akhir_huruf: finalLetter,
        updated_at: new Date().toISOString(),
      })
      .eq("id_item_konversi", id_item_konversi)
      .select("*")
      .maybeSingle();

    res.json({
      status: 200,
      message: `Review DPL berhasil disimpan (Status: ${newStatus})`,
      data: data || {
        id_item_konversi,
        status_step: newStatus,
        catatan_dosen: catatan_dosen || "Review DPL disimpan",
        nilai_akhir_angka: scoreNum,
        nilai_akhir_huruf: finalLetter,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
