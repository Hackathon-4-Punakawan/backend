const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { memoryDplStore, memoryProposalStore, memorySuratStore } = require("../utils/sharedStore");

const router = express.Router();
const AUTO_ACC_DELAY_MS = 5000; // 5 Detik Auto-ACC Simulasi Plotting DPL

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// 1. GET HELPER INFO FOR STEP 4 PENGAJUAN DPL FORM
router.get("/helper-info", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Data mahasiswa tidak ditemukan untuk user ini");
    }

    // Auto-fetch ID Magang from Step 1 or Step 3
    let idMagang = "FIK6199364";

    const { data: listStep1 } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (listStep1 && listStep1.length > 0 && listStep1[0].id_magang_fakultas) {
      idMagang = listStep1[0].id_magang_fakultas;
    } else {
      const { data: listStep3 } = await supabase
        .from("surat_pengantar_magang")
        .select("*")
        .eq("nim", mhs.nim)
        .order("created_at", { ascending: false });

      if (listStep3 && listStep3.length > 0 && listStep3[0].id_magang_fakultas) {
        idMagang = listStep3[0].id_magang_fakultas;
      }
    }

    res.json({
      status: 200,
      message: "Data helper info form pengajuan DPL berhasil diambil",
      data: {
        email: mhs.email,
        id_magang: idMagang,
        nama_mahasiswa: mhs.nama,
        nim_mahasiswa: mhs.nim,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST SUBMIT PENGAJUAN DOSEN PEMBIMBING MAGANG (STEP 4)
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { sks_ditempuh, bukti_diterima_magang, file_khs } = req.body;

    if (!sks_ditempuh || isNaN(Number(sks_ditempuh)) || Number(sks_ditempuh) <= 0) {
      throw httpError(400, "Total jumlah SKS yang sudah ditempuh harus berupa angka yang valid (> 0)");
    }
    if (!bukti_diterima_magang || typeof bukti_diterima_magang !== "string" || !bukti_diterima_magang.trim()) {
      throw httpError(400, "Bukti Diterima Magang (Upload Dokumen) wajib diisi / dilampirkan");
    }
    if (!file_khs || typeof file_khs !== "string" || !file_khs.trim()) {
      throw httpError(400, "Dokumen KHS wajib diisi / dilampirkan");
    }

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Data mahasiswa tidak ditemukan");
    }

    // Resolve ID Magang
    let idMagang = "FIK6199364";
    const { data: listStep1 } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (listStep1 && listStep1.length > 0 && listStep1[0].id_magang_fakultas) {
      idMagang = listStep1[0].id_magang_fakultas;
    }

    const skDplUrl = `https://fik.amikom.ac.id/surat/SK-DPL-${idMagang}.pdf`;
    const payload = {
      nim: mhs.nim,
      email_mahasiswa: mhs.email,
      nama_mahasiswa: mhs.nama,
      id_magang_fakultas: idMagang,
      sks_ditempuh: Number(sks_ditempuh),
      bukti_diterima_magang: bukti_diterima_magang.trim(),
      file_khs: file_khs.trim(),
      status_pengajuan: "Diproses Fakultas",
      nidn_dpl: "0512038901",
      nama_dpl: "Drs. Kusrini, M.Kom.",
      sk_dpl_url: skDplUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let resultData = null;
    const { data: dbData, error: dbErr } = await supabase
      .from("pengajuan_dpl")
      .insert([payload])
      .select()
      .maybeSingle();

    if (dbErr || !dbData) {
      const newId = memoryDplStore.length + 1;
      resultData = { id_pengajuan_dpl: newId, ...payload };
      memoryDplStore.unshift(resultData);
    } else {
      resultData = dbData;
    }

    res.status(201).json({
      status: 201,
      message: "Pengajuan Dosen Pembimbing Magang berhasil dikirim dan sedang diproses oleh Fakultas/Prodi",
      data: resultData,
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET MONITORING STATUS PENGAJUAN DPL MAHASISWA
router.get("/my-status", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!mhs) {
      throw httpError(404, "Data mahasiswa tidak ditemukan");
    }

    let dplSubmission = null;
    const { data: dbData } = await supabase
      .from("pengajuan_dpl")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (dbData && dbData.length > 0) {
      dplSubmission = dbData[0];
    } else {
      const mem = memoryDplStore.find((item) => item.nim === mhs.nim);
      if (mem) dplSubmission = mem;
    }

    if (!dplSubmission) {
      return res.json({
        status: 200,
        message: "Mahasiswa belum mengajukan Dosen Pembimbing Magang (Step 4)",
        data: null,
      });
    }

    // Auto-ACC / Plotting Simulation check (5s)
    const now = new Date();
    const parsedDate = dplSubmission.created_at ? new Date(dplSubmission.created_at) : now;
    const createdAt = !isNaN(parsedDate.getTime()) ? parsedDate : now;
    const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
    const isApproved = dplSubmission.status_pengajuan === "Disetujui" || ageMs >= AUTO_ACC_DELAY_MS;

    const formattedData = {
      ...dplSubmission,
      status_pengajuan: isApproved ? "Disetujui" : "Diproses Fakultas",
      nidn_dpl: isApproved ? (dplSubmission.nidn_dpl || "0512038901") : null,
      nama_dpl: isApproved ? (dplSubmission.nama_dpl || "Drs. Kusrini, M.Kom.") : "Proses Plotting DPL",
      sk_dpl_url: isApproved ? dplSubmission.sk_dpl_url : null,
    };

    res.json({
      status: 200,
      message: "Data pengajuan Dosen Pembimbing Magang berhasil diambil",
      data: formattedData,
    });
  } catch (err) {
    next(err);
  }
});

// 4. ADMIN KAPRODI LIST & ASSIGN DPL
router.get("/admin/list", authenticateToken, requireRole("ADMIN_PRODI", "ADMIN_FAKULTAS"), async (req, res, next) => {
  try {
    let list = [];
    const { data: dbData } = await supabase
      .from("pengajuan_dpl")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbData && dbData.length > 0) {
      list = dbData;
    } else {
      list = memoryDplStore;
    }

    res.json({
      status: 200,
      message: "Daftar pengajuan Dosen Pembimbing Magang berhasil diambil",
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
