const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const { memorySuratAkhirStore } = require("../utils/sharedStore");

function generateThankYouLetterUrl(idMagang) {
  const cleanId = String(idMagang || "FIK6199364").trim();
  return `https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-${cleanId}.pdf`;
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

// 1. GET HELPER INFO FOR SURAT AKHIR (PREFILL AUTOMATIC FIELDS)
router.get("/helper-info", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mhs) throw httpError(404, "Profil mahasiswa tidak ditemukan");

    // Fetch latest pengajuan_magang (Step 1/3)
    const { data: pengajuan } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch latest proposal_magang (Step 2)
    const { data: proposal } = await supabase
      .from("proposal_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const idMagang = pengajuan?.id_magang_fakultas || pengajuan?.nomor_layanan_fik || "FIK6199373";
    const tglMulai = pengajuan?.tanggal_mulai || proposal?.tanggal_mulai || "01 Agustus 2026";
    const tglBerakhir = pengajuan?.tanggal_selesai || proposal?.tanggal_selesai || "31 Januari 2027";
    const periode = pengajuan?.durasi_bulan ? `${pengajuan.durasi_bulan} Bulan` : "6 Bulan (Semester 6 - 2026/2027)";

    res.json({
      status: 200,
      message: "Data otomatis Form Pengajuan Surat Akhir & Ucapan Terima Kasih FIK berhasil diambil",
      data: {
        email: mhs.email,
        id_magang: idMagang,
        nama_mahasiswa: mhs.nama,
        nim: mhs.nim,
        prodi: mhs.prodi || "Informatika",
        nama_instansi: pengajuan?.nama_instansi || proposal?.nama_instansi || "PT Amikom Tech Digital",
        tanggal_mulai_magang: tglMulai,
        tanggal_berakhir_magang: tglBerakhir,
        periode_magang: periode,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. SUBMIT / EDIT PENGAJUAN SURAT AKHIR & UCAPAN TERIMA KASIH MAGANG FIK (MAHASISWA)
const handleSaveSuratAkhir = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mhs) throw httpError(404, "Profil mahasiswa tidak ditemukan");

    const { data: pengajuan } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const idMagang = req.body.id_magang || pengajuan?.id_magang_fakultas || "FIK6199373";
    const email = mhs.email;
    const tglMulai = req.body.tanggal_mulai_magang || pengajuan?.tanggal_mulai || "01 Agustus 2026";
    const tglBerakhir = req.body.tanggal_berakhir_magang || pengajuan?.tanggal_selesai || "31 Januari 2027";
    const periode = req.body.periode_magang || (pengajuan?.durasi_bulan ? `${pengajuan.durasi_bulan} Bulan` : "6 Bulan");

    const nowIso = new Date().toISOString();
    const pdfUrl = generateThankYouLetterUrl(idMagang);

    const payload = {
      id_pengajuan: pengajuan?.id_pengajuan || null,
      nim: mhs.nim,
      email: email,
      id_magang_fakultas: idMagang,
      tanggal_mulai_magang: tglMulai,
      tanggal_berakhir_magang: tglBerakhir,
      periode_magang: periode,
      status_surat: "Disetujui",
      surat_terima_kasih_url: pdfUrl,
      status_penilaian_mitra: "Belum Dinilai",
      nilai_mitra_angka: null,
      nilai_mitra_huruf: null,
      catatan_mitra: null,
      sertifikat_magang_url: null,
      created_at: nowIso,
      updated_at: nowIso,
    };

    let result = null;
    const { data: dbData, error: dbErr } = await supabase
      .from("surat_akhir_magang")
      .insert(payload)
      .select()
      .maybeSingle();

    if (dbErr || !dbData) {
      result = { id_surat_akhir: memorySuratAkhirStore.length + 1, ...payload };
    } else {
      result = dbData;
    }

    // Upsert to memory store
    const existingIndex = memorySuratAkhirStore.findIndex((s) => s.nim === mhs.nim);
    if (existingIndex >= 0) {
      memorySuratAkhirStore[existingIndex] = { ...memorySuratAkhirStore[existingIndex], ...result };
    } else {
      memorySuratAkhirStore.unshift(result);
    }

    res.status(201).json({
      status: 201,
      message: "Pengajuan Surat Akhir dan Ucapan Terima Kasih Magang FIK berhasil dikirim. Surat resmi otomatis diteruskan ke Dashboard Mitra.",
      data: {
        id_surat_akhir: result.id_surat_akhir || 1,
        email: email,
        id_magang: idMagang,
        nama_mahasiswa: mhs.nama,
        nim: mhs.nim,
        nama_instansi: pengajuan?.nama_instansi || "PT Amikom Tech Digital",
        tanggal_mulai_magang: tglMulai,
        tanggal_berakhir_magang: tglBerakhir,
        periode_magang: periode,
        status_surat: "Disetujui",
        surat_terima_kasih_url: pdfUrl,
        status_penilaian_mitra: result.status_penilaian_mitra || "Belum Dinilai",
        auto_acc_in_seconds: 5,
        created_at: nowIso,
      },
    });
  } catch (err) {
    next(err);
  }
};

router.post("/", authenticateToken, requireRole(["MAHASISWA"]), handleSaveSuratAkhir);
router.put("/", authenticateToken, requireRole(["MAHASISWA"]), handleSaveSuratAkhir);

// 3. GET MONITORING STATUS SURAT AKHIR (MAHASISWA VIEW)
router.get("/my-status", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mhs) throw httpError(404, "Profil mahasiswa tidak ditemukan");

    let suratAkhirData = null;
    const { data: dbData } = await supabase
      .from("surat_akhir_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (dbData && dbData.length > 0) {
      suratAkhirData = dbData[0];
    } else {
      const mem = memorySuratAkhirStore.find((s) => s.nim === mhs.nim);
      if (mem) suratAkhirData = mem;
    }

    if (!suratAkhirData) {
      return res.json({
        status: 200,
        message: "Mahasiswa belum mengajukan Surat Akhir & Ucapan Terima Kasih Magang FIK",
        data: null,
      });
    }

    res.json({
      status: 200,
      message: "Data Surat Akhir dan Ucapan Terima Kasih Magang FIK berhasil diambil",
      data: suratAkhirData,
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET DAFTAR SURAT AKHIR & UCAPAN TERIMA KASIH (DASHBOARD MITRA)
router.get("/mitra/list", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const { data: dbData } = await supabase
      .from("surat_akhir_magang")
      .select("*")
      .order("created_at", { ascending: false });

    const rawList = dbData && dbData.length > 0 ? dbData : memorySuratAkhirStore;

    // Enhance with student profile information
    const { data: students } = await supabase.from("mahasiswa").select("*");
    const { data: pengajuans } = await supabase.from("pengajuan_magang").select("*");

    const studentMap = new Map((students || []).map((s) => [s.nim, s]));
    const pengajuanMap = new Map((pengajuans || []).map((p) => [p.nim, p]));

    const enrichedList = rawList.map((item) => {
      const mhs = studentMap.get(item.nim) || {};
      const pengajuan = pengajuanMap.get(item.nim) || {};

      return {
        id_surat_akhir: item.id_surat_akhir,
        id_pengajuan: item.id_pengajuan,
        nim: item.nim,
        nama_mahasiswa: mhs.nama || "Budi Santoso",
        email: item.email || mhs.email || "budi.santoso@students.amikom.ac.id",
        prodi: mhs.prodi || "Informatika",
        id_magang_fakultas: item.id_magang_fakultas || pengajuan.id_magang_fakultas || "FIK6199373",
        nama_instansi: pengajuan.nama_instansi || "PT Amikom Tech Digital",
        posisi: pengajuan.posisi || "Fullstack Developer Intern",
        tanggal_mulai_magang: item.tanggal_mulai_magang,
        tanggal_berakhir_magang: item.tanggal_berakhir_magang,
        periode_magang: item.periode_magang,
        surat_terima_kasih_url: item.surat_terima_kasih_url,
        status_penilaian_mitra: item.status_penilaian_mitra || "Belum Dinilai",
        nilai_mitra: {
          nilai_angka: item.nilai_mitra_angka ?? null,
          nilai_huruf: item.nilai_mitra_huruf ?? null,
          catatan_mitra: item.catatan_mitra ?? null,
          sertifikat_magang_url: item.sertifikat_magang_url ?? null,
        },
        created_at: item.created_at,
      };
    });

    res.json({
      status: 200,
      message: "Daftar Surat Ucapan Terima Kasih Magang masuk ke Dashboard Mitra berhasil diambil",
      data: enrichedList,
    });
  } catch (err) {
    next(err);
  }
});

// 5. POST / PUT MITRA SUBMIT PENILAIAN & EVALUASI KINERJA MAHASISWA
const handleSubmitNilaiMitra = async (req, res, next) => {
  try {
    const { id_surat_akhir, nim, nilai_mitra_angka, nilai_mitra_huruf, catatan_mitra, sertifikat_magang_url } = req.body;

    if (!id_surat_akhir && !nim) {
      throw httpError(400, "Wajib menyertakan id_surat_akhir atau nim mahasiswa");
    }

    if (nilai_mitra_angka === undefined || nilai_mitra_angka === null || nilai_mitra_angka === "") {
      throw httpError(400, "nilai_mitra_angka wajib diisi oleh Mitra Industri");
    }

    const scoreNum = Number(nilai_mitra_angka);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      throw httpError(400, "nilai_mitra_angka harus berupa angka antara 0 - 100");
    }

    const finalLetter = nilai_mitra_huruf || calculateGradeLetter(scoreNum);
    const feedback = catatan_mitra || "Mahasiswa menunjukkan kinerja magang yang sangat baik, proaktif, dan disiplin.";
    const certUrl = sertifikat_magang_url || `https://drive.google.com/file/d/sertifikat_magang_${nim || "budi"}.pdf`;
    const nowIso = new Date().toISOString();

    const updatePayload = {
      status_penilaian_mitra: "Sudah Dinilai Mitra",
      nilai_mitra_angka: scoreNum,
      nilai_mitra_huruf: finalLetter,
      catatan_mitra: feedback,
      sertifikat_magang_url: certUrl,
      updated_at: nowIso,
    };

    let updatedRow = null;

    // Update in database if exists
    if (id_surat_akhir) {
      const { data } = await supabase
        .from("surat_akhir_magang")
        .update(updatePayload)
        .eq("id_surat_akhir", id_surat_akhir)
        .select()
        .maybeSingle();
      updatedRow = data;
    } else if (nim) {
      const { data } = await supabase
        .from("surat_akhir_magang")
        .update(updatePayload)
        .eq("nim", nim)
        .select()
        .maybeSingle();
      updatedRow = data;
    }

    // Update in memory store
    const memIndex = memorySuratAkhirStore.findIndex(
      (s) => (id_surat_akhir && s.id_surat_akhir === id_surat_akhir) || (nim && s.nim === nim)
    );

    if (memIndex >= 0) {
      memorySuratAkhirStore[memIndex] = {
        ...memorySuratAkhirStore[memIndex],
        ...updatePayload,
      };
      if (!updatedRow) updatedRow = memorySuratAkhirStore[memIndex];
    }

    if (!updatedRow) {
      updatedRow = {
        id_surat_akhir: id_surat_akhir || 1,
        nim: nim || "21.11.4001",
        ...updatePayload,
      };
      memorySuratAkhirStore.unshift(updatedRow);
    }

    res.json({
      status: 200,
      message: "Penilaian & evaluasi kinerja magang mahasiswa dari Mitra Industri berhasil disimpan",
      data: {
        id_surat_akhir: updatedRow.id_surat_akhir,
        nim: updatedRow.nim || nim,
        status_penilaian_mitra: "Sudah Dinilai Mitra",
        nilai_mitra: {
          nilai_angka: scoreNum,
          nilai_huruf: finalLetter,
          catatan_mitra: feedback,
          sertifikat_magang_url: certUrl,
        },
        updated_at: nowIso,
      },
    });
  } catch (err) {
    next(err);
  }
};

router.post("/mitra/submit-nilai", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), handleSubmitNilaiMitra);
router.put("/mitra/submit-nilai", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), handleSubmitNilaiMitra);

// 6. GET ALL SURAT AKHIR (ADMIN / DEKAN DASHBOARD)
router.get("/admin/list", authenticateToken, requireRole(["ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const { data: dbData } = await supabase
      .from("surat_akhir_magang")
      .select("*")
      .order("created_at", { ascending: false });

    res.json({
      status: 200,
      message: "Daftar pengajuan Surat Akhir & Ucapan Terima Kasih Magang FIK berhasil diambil",
      data: dbData && dbData.length > 0 ? dbData : memorySuratAkhirStore,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
