const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

const AUTO_ACC_DELAY_MS = 5000;

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

// Function to trigger auto-ACC for a given Surat Pengantar ID after 5 seconds
async function triggerAutoAccSuratPengantar(idSurat, idMagang) {
  try {
    const pdfUrl = `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${idMagang}.pdf`;
    await supabase
      .from("surat_pengantar_magang")
      .update({
        status_surat: "Disetujui",
        surat_pengantar_url: pdfUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id_surat", idSurat);

    // Update in-memory store if present
    const storeItem = memorySuratStore.find((s) => s.id_surat === idSurat);
    if (storeItem) {
      storeItem.status_surat = "Disetujui";
      storeItem.surat_pengantar_url = pdfUrl;
    }
    console.log(`✅ Auto-ACC Surat Pengantar FIK berhasil untuk ID #${idSurat}`);
  } catch (err) {
    console.error(`⚠️ Gagal Auto-ACC Surat Pengantar ID #${idSurat}:`, err.message);
  }
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

// 2. SUBMIT PENGAJUAN SURAT PENGANTAR (MAHASISWA STEP 3) WITH 5-SECOND AUTO-ACC
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

    const newSuratId = memorySuratStore.length + 1;

    const payload = {
      id_surat: newSuratId,
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
      status_surat: "Diproses Fakultas",
      surat_pengantar_url: null,
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
      .insert({
        ...payload,
        status_surat: "Diproses Fakultas",
      })
      .select()
      .maybeSingle();

    if (directErr) {
      data = payload;
      memorySuratStore.unshift(data);
    } else {
      data = { ...directData, mahasiswa: payload.mahasiswa };
      memorySuratStore.unshift(data);
    }

    const createdId = data.id_surat || newSuratId;

    // Schedule 5-second Auto-ACC simulation background timer
    setTimeout(() => {
      triggerAutoAccSuratPengantar(createdId, finalIdMagang);
    }, AUTO_ACC_DELAY_MS);

    res.status(201).json({
      message: "Pengajuan surat pengantar magang FIK berhasil dikirim. Layanan akan diproses otomatis dalam 5 detik.",
      data: {
        ...data,
        tracking: {
          web_fik_url: "https://fik.amikom.ac.id/page/status-pengajuan-layanan",
          telegram_bot_url: "http://t.me/AMIKOMFakultasbot",
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET MY SURAT PENGANTAR STATUS (MAHASISWA) WITH EAGER 5-SECOND EVALUATION
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

    let rawList = [];
    const { data: dbList, error: errList } = await supabase
      .from("surat_pengantar_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (!errList && dbList && dbList.length > 0) {
      rawList = dbList;
    } else {
      rawList = memorySuratStore.filter((s) => s.nim === mhs.nim || s.email_mahasiswa === mhs.email);
    }

    const now = new Date();
    const formattedList = rawList.map((item) => {
      const parsedDate = item.created_at ? new Date(item.created_at) : null;
      const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
      const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
      const rawStatus = item.status_surat || "Diproses Fakultas";

      const isAutoApproved = rawStatus === "Disetujui" || ageMs >= AUTO_ACC_DELAY_MS;
      const finalStatus = isAutoApproved ? "Disetujui" : "Diproses Fakultas";
      const officialIdMagang = item.id_magang_fakultas || "FIK6199364";
      const defaultSuratUrl = item.surat_pengantar_url || `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialIdMagang}.pdf`;

      if (rawStatus !== "Disetujui" && ageMs >= AUTO_ACC_DELAY_MS) {
        triggerAutoAccSuratPengantar(item.id_surat, officialIdMagang);
      }

      return {
        ...item,
        status_surat: finalStatus,
        surat_pengantar_url: isAutoApproved ? defaultSuratUrl : item.surat_pengantar_url,
        tracking: {
          web_fik_url: "https://fik.amikom.ac.id/page/status-pengajuan-layanan",
          telegram_bot_url: "http://t.me/AMIKOMFakultasbot",
        },
      };
    });

    res.json({
      data: formattedList,
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
