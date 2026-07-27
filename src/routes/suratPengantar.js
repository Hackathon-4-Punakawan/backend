const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// Fallback in-memory store for cover letters if database schema cache is missing table
const memorySuratStore = [];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const BULAN_INDONESIA = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function formatIndonesianDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = BULAN_INDONESIA[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

function calculateMonthPeriod(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return "6 Bulan";
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "6 Bulan";

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() >= start.getDate() - 5) {
    months += 1;
  }
  months = Math.max(1, months);
  return `${months} Bulan`;
}

// 1. GET HELPER INFO FOR STEP 3 FORM (AUTO-POPULATED FROM STEP 1 & 2)
router.get("/helper-info", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan untuk user ini");
    }

    // Get latest Step 1 FIK application for official ID Magang
    const { data: latestPengajuan } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get latest Step 2 Proposal for start & end dates
    const { data: latestProposal } = await supabase
      .from("proposal_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const officialIdMagang = latestPengajuan?.id_magang_fakultas || latestPengajuan?.nomor_layanan_fik || "FIK6199364";
    const tglMulai = latestProposal?.tanggal_mulai || "2026-08-01";
    const tglSelesai = latestProposal?.tanggal_selesai || "2027-01-31";
    const periodeMagang = calculateMonthPeriod(tglMulai, tglSelesai);

    res.json({
      data: {
        judul_form: "PENGAJUAN SURAT PENGANTAR MAGANG MAHASISWA FAKULTAS ILMU KOMPUTER",
        email: mhs.email,
        id_magang: officialIdMagang,
        tanggal_mulai_magang: tglMulai,
        tanggal_berakhir_magang: tglSelesai,
        periode_magang: periodeMagang,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. SUBMIT PENGAJUAN SURAT PENGANTAR (MAHASISWA STEP 3)
router.post("/", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { id_magang, tanggal_mulai, tanggal_berakhir, tujuan_surat } = req.body;

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan");
    }

    const { data: latestPengajuan } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: latestProposal } = await supabase
      .from("proposal_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const finalIdMagang = id_magang || latestPengajuan?.id_magang_fakultas || latestPengajuan?.nomor_layanan_fik || "FIK6199364";
    const finalTglMulai = tanggal_mulai || latestProposal?.tanggal_mulai || "2026-08-01";
    const finalTglBerakhir = tanggal_berakhir || latestProposal?.tanggal_selesai || "2027-01-31";
    const finalPeriode = calculateMonthPeriod(finalTglMulai, finalTglBerakhir);
    const finalTujuanSurat = tujuan_surat || latestPengajuan?.tujuan_surat || "Kepada Yth. Pimpinan Instansi";
    const defaultSuratPdfUrl = `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${finalIdMagang}.pdf`;

    const payload = {
      id_surat: memorySuratStore.length + 1,
      id_pengajuan: latestPengajuan?.id_pengajuan || null,
      id_proposal: latestProposal?.id_proposal || null,
      nim: mhs.nim,
      email_mahasiswa: mhs.email,
      id_magang_fakultas: finalIdMagang,
      tanggal_mulai: finalTglMulai,
      tanggal_selesai: finalTglBerakhir,
      periode_magang: finalPeriode,
      nama_instansi: latestProposal?.nama_instansi || latestPengajuan?.nama_instansi || "-",
      alamat_instansi: latestProposal?.alamat_instansi || latestPengajuan?.alamat_instansi || "-",
      tujuan_surat: finalTujuanSurat,
      status_surat: "Disetujui",
      surat_pengantar_url: defaultSuratPdfUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      mahasiswa: {
        nama: mhs.nama,
        email: mhs.email,
        nim: mhs.nim,
        prodi: mhs.prodi || "Informatika",
      },
    };

    let data = null;
    const { data: directData, error: directErr } = await supabase
      .from("surat_pengantar_magang")
      .insert(payload)
      .select()
      .maybeSingle();

    if (directErr) {
      data = payload;
      memorySuratStore.unshift(data);
    } else {
      data = { ...directData, mahasiswa: payload.mahasiswa };
      memorySuratStore.unshift(data);
    }

    res.status(201).json({
      message: "Surat pengantar magang FIK berhasil diajukan dan diterbitkan",
      data,
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET MY SURAT PENGANTAR STATUS (MAHASISWA)
router.get("/my-status", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan");
    }

    const { data: list, error: errList } = await supabase
      .from("surat_pengantar_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (!errList && list && list.length > 0) {
      return res.json({ data: list });
    }

    // Fallback from in-memory store
    const userSuratList = memorySuratStore.filter((s) => s.nim === mhs.nim || s.email_mahasiswa === mhs.email);
    res.json({
      data: userSuratList,
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET ALL SURAT PENGANTAR (ADMIN)
router.get("/admin/list", authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = supabase.from("surat_pengantar_magang").select("*, mahasiswa(nama, email, nim, prodi)");

    if (status) {
      query = query.eq("status_surat", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return res.json({
        data,
        meta: { total: data.length },
      });
    }

    let filteredStore = [...memorySuratStore];
    if (status) {
      filteredStore = filteredStore.filter((s) => s.status_surat === status);
    }

    res.json({
      data: filteredStore,
      meta: {
        total: filteredStore.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
