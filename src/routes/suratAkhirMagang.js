const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { memorySuratStore } = require("../utils/sharedStore");

const router = express.Router();
const AUTO_ACC_DELAY_MS = 5000;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const memorySuratAkhirStore = [];

function generateThankYouLetterUrl(idMagang) {
  const cleanId = String(idMagang || "FIK6199364").trim();
  return `https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-${cleanId}.pdf`;
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

// 2. SUBMIT / EDIT PENGAJUAN SURAT AKHIR & UCAPAN TERIMA KASIH MAGANG FIK
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

    memorySuratAkhirStore.unshift(result);

    // Auto-ACC simulation response in 5 seconds
    res.status(201).json({
      status: 201,
      message: "Pengajuan Surat Akhir dan Ucapan Terima Kasih Magang FIK berhasil dikirim. Surat resmi FIK akan terbit dalam 5 detik.",
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

// 3. GET MONITORING STATUS SURAT AKHIR MAHASISWA
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

// 4. GET ALL SURAT AKHIR (ADMIN / DEKAN DASHBOARD)
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
