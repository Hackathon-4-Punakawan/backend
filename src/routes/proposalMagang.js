const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

const PROGRAM_DIIKUTI_ENUM = [
  "Magang Berdampak",
  "Studi Independen",
  "Magang Mandiri",
  "Studi Independen Mandiri",
];

const { memoryProposalStore } = require("../utils/sharedStore");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// 1. GET HELPER INFO FOR STEP 2 PROPOSAL FORM
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

    // Get latest pengajuan magang (from Step 1 FIK) for auto-filled place & address
    const { data: latestPengajuan } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({
      data: {
        mahasiswa: {
          nama: mhs.nama,
          email: mhs.email,
          nim: mhs.nim,
          prodi: mhs.prodi || "Informatika",
          angkatan: mhs.angkatan,
        },
        auto_filled_instansi: {
          id_pengajuan: latestPengajuan?.id_pengajuan || null,
          nama_instansi: latestPengajuan?.nama_instansi || latestPengajuan?.posisi || "",
          alamat_instansi: latestPengajuan?.alamat_instansi || "",
          tujuan_surat: latestPengajuan?.tujuan_surat || "",
          nama_pic: latestPengajuan?.tujuan_surat || "",
        },
        program_diikuti_options: PROGRAM_DIIKUTI_ENUM,
      },
    });
  } catch (err) {
    next(err);
  }
});

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

function resolveDurasiPelaksanaan(tanggal_mulai, tanggal_selesai, durasi_pelaksanaan) {
  if (tanggal_mulai && tanggal_selesai) {
    const tglMulaiFormatted = formatIndonesianDate(tanggal_mulai);
    const tglSelesaiFormatted = formatIndonesianDate(tanggal_selesai);
    return `${tglMulaiFormatted} sampai dengan ${tglSelesaiFormatted}`;
  }
  if (durasi_pelaksanaan && durasi_pelaksanaan.trim()) {
    return durasi_pelaksanaan.trim();
  }
  return "01 Agustus 2026 sampai dengan 31 Januari 2027";
}

// 2. SUBMIT PROPOSAL MAGANG (MAHASISWA STEP 2)
router.post("/", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      id_pengajuan,
      nama_program_kegiatan,
      nama_instansi,
      alamat_instansi,
      tanggal_mulai,
      tanggal_selesai,
      durasi_pelaksanaan,
      nama_pic,
      jabatan_pic,
      email_pic,
      no_hp_pic,
      program_diikuti,
      no_hp_mahasiswa,
      alasan_mendaftar,
      deskripsi_kegiatan,
      keahlian_utama,
      file_cv,
      file_krs,
      file_transkrip,
      file_proposal_pdf,
    } = req.body;

    if (!nama_program_kegiatan || !nama_program_kegiatan.trim()) {
      throw httpError(400, "Nama program kegiatan wajib diisi");
    }

    if (!program_diikuti || !PROGRAM_DIIKUTI_ENUM.includes(program_diikuti)) {
      throw httpError(
        400,
        `Program yang diikuti harus salah satu dari: ${PROGRAM_DIIKUTI_ENUM.join(", ")}`
      );
    }

    if (!alasan_mendaftar || !alasan_mendaftar.trim()) {
      throw httpError(400, "Alasan mendaftar wajib diisi (minimal 100 kata)");
    }

    if (!deskripsi_kegiatan || !deskripsi_kegiatan.trim()) {
      throw httpError(400, "Deskripsi singkat kegiatan wajib diisi (minimal 500 kata)");
    }

    if (!keahlian_utama || !keahlian_utama.trim()) {
      throw httpError(400, "Keahlian utama yang dikembangkan wajib diisi (minimal 200 kata)");
    }

    // Fetch student profile
    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan. Silakan lengkapi profil terlebih dahulu.");
    }

    // Find linked Step 1 Pengajuan if not provided
    let targetPengajuanId = id_pengajuan ? Number.parseInt(id_pengajuan, 10) : null;
    if (!targetPengajuanId) {
      const { data: latestP } = await supabase
        .from("pengajuan_magang")
        .select("id_pengajuan, nama_instansi, alamat_instansi")
        .eq("nim", mhs.nim)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestP) {
        targetPengajuanId = latestP.id_pengajuan;
      }
    }

    const finalDurasi = resolveDurasiPelaksanaan(tanggal_mulai, tanggal_selesai, durasi_pelaksanaan);

    const payload = {
      id_proposal: memoryProposalStore.length + 1,
      id_pengajuan: targetPengajuanId,
      nim: mhs.nim,
      nama_program_kegiatan: nama_program_kegiatan.trim(),
      nama_instansi: nama_instansi ? nama_instansi.trim() : null,
      alamat_instansi: alamat_instansi ? alamat_instansi.trim() : null,
      tanggal_mulai: tanggal_mulai || null,
      tanggal_selesai: tanggal_selesai || null,
      durasi_pelaksanaan: finalDurasi,
      nama_pic: nama_pic ? nama_pic.trim() : null,
      jabatan_pic: jabatan_pic ? jabatan_pic.trim() : null,
      email_pic: email_pic ? email_pic.trim().toLowerCase() : null,
      no_hp_pic: no_hp_pic ? no_hp_pic.trim() : null,
      program_diikuti: program_diikuti,
      no_hp_mahasiswa: no_hp_mahasiswa ? no_hp_mahasiswa.trim() : null,
      alasan_mendaftar: alasan_mendaftar.trim(),
      deskripsi_kegiatan: deskripsi_kegiatan.trim(),
      keahlian_utama: keahlian_utama.trim(),
      file_cv: file_cv || null,
      file_krs: file_krs || null,
      file_transkrip: file_transkrip || null,
      file_proposal_pdf: file_proposal_pdf || null,
      status_review: "Review Proposal Prodi",
      catatan_revisi: null,
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
      .from("proposal_magang")
      .insert(payload)
      .select()
      .maybeSingle();

    if (directErr || !directData) {
      data = payload;
    } else {
      data = { ...directData, mahasiswa: payload.mahasiswa };
    }
    memoryProposalStore.unshift(data);

    // Update status_proposal in pengajuan_magang
    if (targetPengajuanId) {
      await supabase
        .from("pengajuan_magang")
        .update({
          status_proposal: "Review Proposal Prodi",
          file_proposal_magang: file_proposal_pdf || file_cv || null,
        })
        .eq("id_pengajuan", targetPengajuanId);
    }

    res.status(201).json({
      message: "Proposal magang berhasil dikirim dan menunggu review Kaprodi / Admin Prodi",
      data,
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET MY PROPOSAL STATUS (FOR MAHASISWA)
router.get("/my-proposal", authenticateToken, async (req, res, next) => {
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
      .from("proposal_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (!errList && list && list.length > 0) {
      return res.json({ data: list });
    }

    // Fallback from in-memory store
    const userProposals = memoryProposalStore.filter((p) => p.nim === mhs.nim);
    res.json({
      data: userProposals,
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET ALL PROPOSALS FOR ADMIN KAPRODI DASHBOARD REVIEW
router.get("/admin/list", authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = supabase.from("proposal_magang").select("*, mahasiswa(nama, email, nim, prodi)");

    if (status) {
      query = query.eq("status_review", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return res.json({
        data,
        meta: { total: data.length },
      });
    }

    // Fallback from in-memory store
    let filteredStore = [...memoryProposalStore];
    if (status) {
      filteredStore = filteredStore.filter((p) => p.status_review === status);
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

// 5. REVIEW PROPOSAL (ACC / REVISI / REJECT BY ADMIN KAPRODI)
router.post("/:id/review", authenticateToken, async (req, res, next) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { action, catatan_revisi } = req.body;

    if (!action || !["ACC", "APPROVE", "REVISI", "REJECT", "TOLAK"].includes(action.toUpperCase())) {
      throw httpError(400, "Aksi review harus salah satu dari: ACC / APPROVE, REVISI, REJECT / TOLAK");
    }

    const uppercaseAction = action.toUpperCase();
    let status_review = "Review Proposal Prodi";
    if (uppercaseAction === "ACC" || uppercaseAction === "APPROVE") {
      status_review = "ACC Proposal";
    } else if (uppercaseAction === "REVISI") {
      status_review = "Revisi Proposal";
    } else if (uppercaseAction === "REJECT" || uppercaseAction === "TOLAK") {
      status_review = "Ditolak";
    }

    if ((status_review === "Revisi Proposal" || status_review === "Ditolak") && (!catatan_revisi || !catatan_revisi.trim())) {
      throw httpError(400, "Catatan keterangan wajib diisi untuk penolakan atau revisi proposal");
    }

    const updatePayload = {
      status_review,
      catatan_revisi: catatan_revisi ? catatan_revisi.trim() : null,
      reviewed_by: req.user.email,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let data = null;
    const { data: directData, error: directErr } = await supabase
      .from("proposal_magang")
      .update(updatePayload)
      .eq("id_proposal", id)
      .select()
      .maybeSingle();

    if (!directErr && directData) {
      data = directData;
    }

    // Update in-memory store
    const storeItem = memoryProposalStore.find((p) => p.id_proposal === id || p.id_pengajuan === id);
    if (storeItem) {
      Object.assign(storeItem, updatePayload);
      data = storeItem;
    }

    if (!data) {
      data = { id_proposal: id, ...updatePayload };
    }

    // Also update parent pengajuan_magang table
    const targetIdPengajuan = data?.id_pengajuan || id;
    if (targetIdPengajuan) {
      const parentPayload = {
        status_proposal: status_review,
        catatan_revisi_proposal: catatan_revisi ? catatan_revisi.trim() : null,
      };
      await supabase
        .from("pengajuan_magang")
        .update(parentPayload)
        .eq("id_pengajuan", targetIdPengajuan);
    }

    res.json({
      message: `Proposal magang berhasil di-review dengan hasil: ${status_review}`,
      data,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
