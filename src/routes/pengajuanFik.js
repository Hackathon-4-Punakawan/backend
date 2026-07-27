const crypto = require("crypto");
const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const JENIS_PENGAJUAN_VALID = ["Pengajuan ID Magang", "Pra Survey Magang", "Id Magang"];
const FIK_WEB_STATUS_URL = "https://fik.amikom.ac.id/page/status-pengajuan-layanan";
const FIK_TELEGRAM_BOT_URL = "http://t.me/AMIKOMFakultasbot";
const AUTO_ACC_DELAY_MS = 5000; // 5 Detik Auto-ACC Simulasi FIK
const { memoryProposalStore, memorySuratStore, memoryDplStore, memoryKonversiStore } = require("../utils/sharedStore");

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

function resolveAngkatan(mhs) {
  if (mhs && mhs.angkatan && String(mhs.angkatan).trim()) {
    return String(mhs.angkatan).trim();
  }
  if (mhs && mhs.nim) {
    const match = String(mhs.nim).trim().match(/^(\d{2})/);
    if (match) {
      return (2000 + Number.parseInt(match[1], 10)).toString();
    }
  }
  return new Date().getFullYear().toString();
}

function calculateSemesterAndAcademicYear(angkatanStr, referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1 to 12
  const entryYear = Number.parseInt(angkatanStr, 10) || currentYear;

  let academicYear = "";
  let semester = 1;

  if (currentMonth >= 8) {
    academicYear = `${currentYear}/${currentYear + 1}`;
    semester = (currentYear - entryYear) * 2 + 1;
  } else {
    academicYear = `${currentYear - 1}/${currentYear}`;
    semester = (currentYear - 1 - entryYear) * 2 + 2;
  }

  if (semester < 1) semester = 1;

  return { semester, tahunAkademik: academicYear };
}

function generateOfficialIdMagangFik(idPengajuan) {
  // Format persis FIK: FIK + 7-digit angka (contoh: FIK6199364)
  const baseNum = 6199360 + Number(idPengajuan || 1);
  return `FIK${baseNum}`;
}

// Function to trigger auto-ACC for a given application ID
async function triggerAutoAccFik(idPengajuan) {
  try {
    const formattedIdMagang = generateOfficialIdMagangFik(idPengajuan);
    const defaultSuratUrl = `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${formattedIdMagang}.pdf`;
    const payload = {
      id_magang_fakultas: formattedIdMagang,
      nomor_layanan_fik: formattedIdMagang,
      status_surat_fakultas: "Disetujui",
      status_pengajuan: "Disetujui",
      surat_pengantar_url: defaultSuratUrl,
      catatan_revisi_proposal: "ACC Otomatis oleh Sistem FIK (Simulasi Layanan)",
    };

    const { error } = await supabase
      .from("pengajuan_magang")
      .update(payload)
      .eq("id_pengajuan", idPengajuan);

    if (error && error.message && error.message.includes("schema cache")) {
      await supabase
        .from("pengajuan_magang")
        .update({ status_program: "Sedang Berjalan" })
        .eq("id_pengajuan", idPengajuan);
    }
    console.log(`✅ Auto-ACC FIK berhasil untuk ID Pengajuan #${idPengajuan} dengan ID Magang: ${formattedIdMagang}`);
  } catch (err) {
    console.error(`⚠️ Gagal Auto-ACC FIK untuk ID Pengajuan #${idPengajuan}:`, err.message);
  }
}

// 1. GET HELPER INFO FOR FIK SUBMISSION FORM
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

    const mhsAngkatan = resolveAngkatan(mhs);
    const { semester, tahunAkademik } = calculateSemesterAndAcademicYear(mhsAngkatan);

    res.json({
      data: {
        email: mhs.email,
        nama: mhs.nama,
        nim: mhs.nim,
        prodi: mhs.prodi || "Informatika",
        angkatan: mhsAngkatan,
        semester,
        tahun_akademik: tahunAkademik,
        jenis_pengajuan_options: JENIS_PENGAJUAN_VALID,
        auto_acc_delay_seconds: 5,
        tracking_urls: {
          web_fik: FIK_WEB_STATUS_URL,
          telegram_bot: FIK_TELEGRAM_BOT_URL,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. SUBMIT PENGAJUAN SURAT / ID MAGANG FIK
router.post("/", authenticateToken, requireRole(["MAHASISWA"]), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      jenis_pengajuan,
      kepada_yth,
      tujuan_surat,
      nama_instansi,
      alamat_instansi,
      jenis_program,
      posisi,
      durasi_bulan,
      tanggal_mulai,
      tanggal_selesai,
    } = req.body;

    if (!jenis_pengajuan || !JENIS_PENGAJUAN_VALID.includes(jenis_pengajuan)) {
      throw httpError(
        400,
        `Jenis pengajuan harus salah satu dari: ${JENIS_PENGAJUAN_VALID.join(", ")}`
      );
    }

    if (!nama_instansi || !nama_instansi.trim()) {
      throw httpError(400, "Nama instansi wajib diisi");
    }

    if (!alamat_instansi || !alamat_instansi.trim()) {
      throw httpError(400, "Alamat instansi wajib diisi");
    }

    // Get Student Profile
    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan. Silakan lengkapi profil terlebih dahulu.");
    }

    const mhsAngkatan = resolveAngkatan(mhs);
    const { semester: autoSemester, tahunAkademik: autoTahunAkademik } =
      calculateSemesterAndAcademicYear(mhsAngkatan);

    const semester = req.body.semester ? Number.parseInt(req.body.semester, 10) : autoSemester;
    const tahun_akademik = req.body.tahun_akademik || autoTahunAkademik;
    const targetTujuanSurat = kepada_yth || tujuan_surat || `Yth. Pimpinan ${nama_instansi.trim()}`;

    // Check if student already submitted an application in the SAME semester
    const { memorySemesterStore } = require("../utils/sharedStore");
    const semesterKey = `${mhs.nim}:${semester}`;

    // Seed default existing semester if student already has submissions
    const { data: dbSubmissions } = await supabase
      .from("pengajuan_magang")
      .select("id_pengajuan, created_at")
      .eq("nim", mhs.nim);

    if (dbSubmissions && dbSubmissions.length > 0 && !memorySemesterStore.has(semesterKey)) {
      // Mark baseline semester (semester 6) as submitted for existing student
      memorySemesterStore.add(`${mhs.nim}:6`);
    }

    if (memorySemesterStore.has(semesterKey)) {
      throw httpError(
        409,
        `Anda sudah memiliki pengajuan magang aktif pada Semester ${semester} (${tahun_akademik}). Mahasiswa hanya dapat melakukan pengajuan magang 1 kali per semester.`
      );
    }

    // Temporary pending tracking ID until approved
    const tempTrackingCode = `FIK-PENDING-${new Date().getFullYear()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const nowIso = new Date().toISOString();

    const fullPayload = {
      nim: mhs.nim,
      id_magang_fakultas: tempTrackingCode,
      nomor_layanan_fik: tempTrackingCode,
      jenis_surat_fakultas: jenis_pengajuan,
      nama_instansi: nama_instansi.trim(),
      alamat_instansi: alamat_instansi.trim(),
      tujuan_surat: targetTujuanSurat,
      semester,
      tahun_akademik,
      jenis_program: jenis_program || `FIK: ${jenis_pengajuan}`,
      posisi: posisi || `${nama_instansi.trim()} (${jenis_pengajuan})`,
      durasi_bulan: durasi_bulan ? Number.parseInt(durasi_bulan, 10) : 6,
      tanggal_mulai: tanggal_mulai || null,
      tanggal_selesai: tanggal_selesai || null,
      status_surat_fakultas: "Diproses Fakultas",
      status_pengajuan: "Menunggu Verifikasi",
      status_program: "Sedang Berjalan",
      created_at: nowIso,
    };

    let data = null;
    let { data: directData, error: directErr } = await supabase
      .from("pengajuan_magang")
      .insert(fullPayload)
      .select()
      .maybeSingle();

    memorySemesterStore.add(semesterKey);

    if (directErr && directErr.message && (directErr.message.includes("pengajuan_magang_pkey") || directErr.message.includes("duplicate key"))) {
      const { data: maxRow } = await supabase
        .from("pengajuan_magang")
        .select("id_pengajuan")
        .order("id_pengajuan", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextId = (maxRow?.id_pengajuan || 0) + 1;
      fullPayload.id_pengajuan = nextId;

      const { data: fixedData, error: fixedErr } = await supabase
        .from("pengajuan_magang")
        .insert(fullPayload)
        .select()
        .maybeSingle();

      if (fixedErr && fixedErr.message && fixedErr.message.includes("schema cache")) {
        const fallbackPayload = {
          id_pengajuan: nextId,
          nim: mhs.nim,
          jenis_program: jenis_program || `FIK: ${jenis_pengajuan}`,
          posisi: `${nama_instansi.trim()} (${posisi || jenis_pengajuan})`,
          durasi_bulan: durasi_bulan ? Number.parseInt(durasi_bulan, 10) : 6,
          tanggal_mulai: tanggal_mulai || null,
          tanggal_selesai: tanggal_selesai || null,
          status_program: "Sedang Berjalan",
          created_at: nowIso,
        };
        const { data: retryData, error: retryErr } = await supabase
          .from("pengajuan_magang")
          .insert(fallbackPayload)
          .select()
          .single();
        if (retryErr) throw httpError(400, retryErr.message);
        data = { ...retryData, created_at: retryData.created_at || nowIso };
      } else if (fixedErr) {
        throw httpError(400, fixedErr.message);
      } else {
        data = fixedData;
      }
    } else if (directErr) {
      if (directErr.message && directErr.message.includes("schema cache")) {
        const fallbackPayload = {
          nim: mhs.nim,
          jenis_program: jenis_program || `FIK: ${jenis_pengajuan}`,
          posisi: `${nama_instansi.trim()} (${posisi || jenis_pengajuan})`,
          durasi_bulan: durasi_bulan ? Number.parseInt(durasi_bulan, 10) : 6,
          tanggal_mulai: tanggal_mulai || null,
          tanggal_selesai: tanggal_selesai || null,
          status_program: "Sedang Berjalan",
          created_at: nowIso,
        };

        let { data: retryData, error: retryErr } = await supabase
          .from("pengajuan_magang")
          .insert(fallbackPayload)
          .select()
          .maybeSingle();

        if (retryErr && retryErr.message && retryErr.message.includes("pengajuan_magang_pkey")) {
          const { data: maxRow } = await supabase
            .from("pengajuan_magang")
            .select("id_pengajuan")
            .order("id_pengajuan", { ascending: false })
            .limit(1)
            .maybeSingle();
          fallbackPayload.id_pengajuan = (maxRow?.id_pengajuan || 0) + 1;
          const retrySeq = await supabase
            .from("pengajuan_magang")
            .insert(fallbackPayload)
            .select()
            .single();
          if (retrySeq.error) throw httpError(400, retrySeq.error.message);
          retryData = retrySeq.data;
        } else if (retryErr) {
          throw httpError(400, retryErr.message);
        }

        data = {
          ...retryData,
          id_magang_fakultas: tempTrackingCode,
          nomor_layanan_fik: tempTrackingCode,
          jenis_surat_fakultas: jenis_pengajuan,
          nama_instansi: nama_instansi.trim(),
          alamat_instansi: alamat_instansi.trim(),
          tujuan_surat: targetTujuanSurat,
          semester,
          tahun_akademik,
          status_surat_fakultas: "Diproses Fakultas",
          status_pengajuan: "Menunggu Verifikasi",
          created_at: retryData.created_at || nowIso,
        };
      } else {
        throw httpError(400, directErr.message);
      }
    } else {
      data = directData;
    }

    // Schedule 5-Second Auto-ACC Background Timer
    const createdId = data.id_pengajuan;
    if (createdId) {
      setTimeout(() => {
        triggerAutoAccFik(createdId);
      }, AUTO_ACC_DELAY_MS);
    }

    res.status(201).json({
      message: "Pengajuan ID Magang / Surat FIK berhasil dikirim. Status & ID Magang resmi FIK akan terbit dalam 5 detik.",
      data: {
        ...data,
        id_magang_fakultas: tempTrackingCode,
        status_surat_fakultas: "Diproses Fakultas",
        status_pengajuan: "Menunggu Verifikasi",
        mahasiswa: {
          nama: mhs.nama,
          nim: mhs.nim,
          email: mhs.email,
          prodi: mhs.prodi || "Informatika",
        },
        tracking_info: {
          id_magang_fakultas: tempTrackingCode,
          status_surat_fakultas: "Diproses Fakultas",
          auto_acc_in_seconds: 5,
          web_fik: FIK_WEB_STATUS_URL,
          telegram_bot: FIK_TELEGRAM_BOT_URL,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET MY FIK SUBMISSIONS STATUS (FOR DASHBOARD MONITORING WITH OFFICIAL ID MAGANG FIK)
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
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (errList) throw httpError(400, errList.message);

    const now = new Date();
    const formattedList = (list || []).map((item) => {
      const parsedDate = item.created_at ? new Date(item.created_at) : null;
      const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
      const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
      const rawStatus = item.status_surat_fakultas || "Diproses Fakultas";

      const isAutoApproved = rawStatus === "Disetujui" || ageMs >= AUTO_ACC_DELAY_MS;
      const finalStatus = isAutoApproved ? "Disetujui" : "Diproses Fakultas";
      const officialIdMagang = isAutoApproved
        ? generateOfficialIdMagangFik(item.id_pengajuan)
        : (item.id_magang_fakultas || "Diproses");

      const defaultSuratUrl = item.surat_pengantar_url || `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialIdMagang}.pdf`;

      if (rawStatus !== "Disetujui" && ageMs >= AUTO_ACC_DELAY_MS) {
        triggerAutoAccFik(item.id_pengajuan);
      }

      return {
        ...item,
        id_magang_fakultas: officialIdMagang,
        nomor_layanan_fik: officialIdMagang,
        jenis_surat_fakultas: item.jenis_surat_fakultas || item.jenis_program || "Pengajuan ID Magang",
        nama_instansi: item.nama_instansi || item.posisi || "-",
        alamat_instansi: item.alamat_instansi || "-",
        tujuan_surat: item.tujuan_surat || "Kepada Yth. Pimpinan Instansi",
        status_surat_fakultas: finalStatus,
        status_pengajuan: isAutoApproved ? "Disetujui" : (item.status_pengajuan || "Menunggu Verifikasi"),
        surat_pengantar_url: isAutoApproved ? defaultSuratUrl : item.surat_pengantar_url,
        mahasiswa: {
          nama: mhs.nama,
          nim: mhs.nim,
          email: mhs.email,
          prodi: mhs.prodi || "Informatika",
        },
        tracking: {
          id_magang_fakultas: officialIdMagang,
          status_surat_fakultas: finalStatus,
          surat_pengantar_url: isAutoApproved ? defaultSuratUrl : item.surat_pengantar_url,
          web_fik_url: FIK_WEB_STATUS_URL,
          telegram_bot_url: FIK_TELEGRAM_BOT_URL,
        },
      };
    });

    res.json({
      data: formattedList,
      meta: {
        total: formattedList.length,
        auto_acc_delay_seconds: 5,
        tracking_urls: {
          web_fik: FIK_WEB_STATUS_URL,
          telegram_bot: FIK_TELEGRAM_BOT_URL,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// 4. UPDATE STATUS SURAT FAKULTAS (FOR ADMIN / FAKULTAS)
router.patch("/:id/status", authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status_surat_fakultas, id_magang_fakultas, nomor_layanan_fik, surat_pengantar_url, catatan_revisi_proposal } = req.body;

    const updatePayload = {};
    if (status_surat_fakultas) updatePayload.status_surat_fakultas = status_surat_fakultas;
    
    // Auto-generate official ID Magang if status set to Disetujui and id_magang_fakultas not provided
    if (status_surat_fakultas === "Disetujui" && !id_magang_fakultas) {
      const generatedId = generateOfficialIdMagangFik(id);
      updatePayload.id_magang_fakultas = generatedId;
      updatePayload.nomor_layanan_fik = generatedId;
      if (!surat_pengantar_url) {
        updatePayload.surat_pengantar_url = `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK-${String(id).padStart(4, "0")}.pdf`;
      }
    } else {
      if (id_magang_fakultas) updatePayload.id_magang_fakultas = id_magang_fakultas;
      if (nomor_layanan_fik) updatePayload.nomor_layanan_fik = nomor_layanan_fik;
    }

    if (surat_pengantar_url) updatePayload.surat_pengantar_url = surat_pengantar_url;
    if (catatan_revisi_proposal !== undefined) updatePayload.catatan_revisi_proposal = catatan_revisi_proposal;

    if (Object.keys(updatePayload).length === 0) {
      throw httpError(400, "Tidak ada data status yang diperbarui");
    }

    let data = null;
    const { data: directData, error: directErr } = await supabase
      .from("pengajuan_magang")
      .update(updatePayload)
      .eq("id_pengajuan", id)
      .select()
      .maybeSingle();

    if (directErr && directErr.message && directErr.message.includes("schema cache")) {
      const { data: fetchRow } = await supabase
        .from("pengajuan_magang")
        .select("*")
        .eq("id_pengajuan", id)
        .maybeSingle();

      if (!fetchRow) throw httpError(404, "Data pengajuan tidak ditemukan");

      data = {
        ...fetchRow,
        status_surat_fakultas: status_surat_fakultas || fetchRow.status_surat_fakultas || "Diproses Fakultas",
        id_magang_fakultas: updatePayload.id_magang_fakultas || fetchRow.id_magang_fakultas,
      };
    } else if (directErr) {
      throw httpError(400, directErr.message);
    } else {
      data = directData;
    }

    res.json({
      message: "Status pengajuan surat FIK berhasil diperbarui",
      data,
    });
  } catch (err) {
    next(err);
  }
});

// 5. UNIFIED API GET ALL DATA STEP 1, STEP 2, AND STEP 3
router.get("/all-steps", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { nim: targetNim } = req.query;

    let studentNim = targetNim;
    let mhs = null;

    if (!studentNim) {
      const { data: fetchMhs, error: errMhs } = await supabase
        .from("mahasiswa")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (errMhs || !fetchMhs) {
        throw httpError(404, "Profil mahasiswa tidak ditemukan untuk user ini");
      }
      mhs = fetchMhs;
      studentNim = fetchMhs.nim;
    } else {
      const { data: fetchMhs } = await supabase
        .from("mahasiswa")
        .select("*")
        .eq("nim", studentNim)
        .maybeSingle();
      mhs = fetchMhs;
    }

    // Step 1: Fetch Pengajuan ID Magang FIK
    const { data: listStep1 } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", studentNim)
      .order("created_at", { ascending: false });

    const step1Data = (listStep1 && listStep1.length > 0) ? listStep1[0] : null;
    const now = new Date();
    let step1Formatted = null;

    if (step1Data) {
      const parsedDate = step1Data.created_at ? new Date(step1Data.created_at) : null;
      const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
      const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
      const rawStatus = step1Data.status_surat_fakultas || "Diproses Fakultas";
      const isAutoApproved = rawStatus === "Disetujui" || ageMs >= AUTO_ACC_DELAY_MS;
      const officialIdMagang = isAutoApproved ? generateOfficialIdMagangFik(step1Data.id_pengajuan) : (step1Data.id_magang_fakultas || "Diproses");
      const pdfUrl = step1Data.surat_pengantar_url || `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialIdMagang}.pdf`;

      step1Formatted = {
        ...step1Data,
        id_magang_fakultas: officialIdMagang,
        nomor_layanan_fik: officialIdMagang,
        status_surat_fakultas: isAutoApproved ? "Disetujui" : "Diproses Fakultas",
        surat_pengantar_url: isAutoApproved ? pdfUrl : step1Data.surat_pengantar_url,
      };
    }

    // Step 2: Fetch Proposal Magang
    let step2Data = null;
    const { data: dbProposals } = await supabase
      .from("proposal_magang")
      .select("*")
      .eq("nim", studentNim)
      .order("created_at", { ascending: false });

    if (dbProposals && dbProposals.length > 0) {
      step2Data = dbProposals[0];
    } else {
      const memoryProp = memoryProposalStore.find((p) => p.nim === studentNim || (mhs && p.nim === mhs.nim));
      if (memoryProp) step2Data = memoryProp;
    }

    // Step 3: Fetch Surat Pengantar Magang
    let step3Data = null;
    const { data: dbSurats } = await supabase
      .from("surat_pengantar_magang")
      .select("*")
      .eq("nim", studentNim)
      .order("created_at", { ascending: false });

    if (dbSurats && dbSurats.length > 0) {
      step3Data = dbSurats[0];
    } else {
      const memorySurat = memorySuratStore.find((s) => s.nim === studentNim || (mhs && s.email_mahasiswa === mhs.email));
      if (memorySurat) step3Data = memorySurat;
    }
    let step3Formatted = null;

    if (step3Data) {
      const parsedDate = step3Data.created_at ? new Date(step3Data.created_at) : null;
      const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
      const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
      const rawStatus = step3Data.status_surat || "Diproses Fakultas";
      const isApproved = rawStatus === "Disetujui" || ageMs >= AUTO_ACC_DELAY_MS;
      const officialId = step3Data.id_magang_fakultas || step1Formatted?.id_magang_fakultas || "FIK6199364";
      const pdfUrl = step3Data.surat_pengantar_url || `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialId}.pdf`;

      step3Formatted = {
        email: step3Data.email_mahasiswa || mhs?.email,
        id_magang: officialId,
        tanggal_mulai_magang: step3Data.tanggal_mulai || step2Data?.tanggal_mulai || "2026-08-01",
        tanggal_berakhir_magang: step3Data.tanggal_selesai || step2Data?.tanggal_selesai || "2027-01-31",
        periode_magang: step3Data.periode_magang || "6 Bulan",
        status_surat: isApproved ? "Disetujui" : "Diproses Fakultas",
        surat_pengantar_url: isApproved ? pdfUrl : null,
      };
    }

    // Step 4: Fetch Pengajuan DPL Magang
    let step4Data = null;
    const { data: dbDpls } = await supabase
      .from("pengajuan_dpl")
      .select("*")
      .eq("nim", studentNim)
      .order("created_at", { ascending: false });

    if (dbDpls && dbDpls.length > 0) {
      step4Data = dbDpls[0];
    } else {
      const memoryDpl = memoryDplStore.find((d) => d.nim === studentNim || (mhs && d.nim === mhs.nim));
      if (memoryDpl) step4Data = memoryDpl;
    }

    let step4Formatted = null;
    if (step4Data) {
      const parsedDate = step4Data.created_at ? new Date(step4Data.created_at) : null;
      const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
      const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
      const rawStatus = step4Data.status_pengajuan || "Diproses Fakultas";
      const isApproved = rawStatus === "Disetujui" || ageMs >= AUTO_ACC_DELAY_MS;
      const officialId = step4Data.id_magang_fakultas || step1Formatted?.id_magang_fakultas || "FIK6199364";
      const skUrl = step4Data.sk_dpl_url || `https://fik.amikom.ac.id/surat/SK-DPL-${officialId}.pdf`;

      step4Formatted = {
        ...step4Data,
        id_magang: officialId,
        status_pengajuan: isApproved ? "Disetujui" : "Diproses Fakultas",
        nidn_dpl: isApproved ? (step4Data.nidn_dpl || "0512038901") : null,
        nama_dpl: isApproved ? (step4Data.nama_dpl || "Drs. Kusrini, M.Kom.") : "Proses Plotting DPL",
        sk_dpl_url: isApproved ? skUrl : null,
      };
    }

    // Build unified table rows array for Frontend Dashboard Table (matching screenshot)
    const riwayatPengajuan = [];

    if (step1Formatted) {
      riwayatPengajuan.push({
        id: `step1-${step1Formatted.id_pengajuan}`,
        step: 1,
        jenis_pengajuan: "Pengajuan ID Magang",
        sub_info: `Semester ${step1Formatted.semester || 6} - ${step1Formatted.tahun_akademik || "2026/2027"}`,
        nama_instansi: step1Formatted.nama_instansi || step1Formatted.posisi || "-",
        kepada_yth: step1Formatted.tujuan_surat ? `Kepada: ${step1Formatted.tujuan_surat}` : "-",
        tanggal_pengajuan: formatIndonesianDate(step1Formatted.created_at || now),
        status: (step1Formatted.status_surat_fakultas || "DIPROSES FAKULTAS").toUpperCase(),
        id_magang_fakultas: step1Formatted.id_magang_fakultas,
        surat_pengantar_url: step1Formatted.surat_pengantar_url,
      });
    }

    if (step2Data) {
      riwayatPengajuan.push({
        id: `step2-${step2Data.id_proposal || 1}`,
        step: 2,
        jenis_pengajuan: "Pengajuan Proposal ke Prodi",
        sub_info: `Program: ${step2Data.program_diikuti || "Magang Mandiri"}`,
        nama_instansi: step2Data.nama_instansi || "-",
        kepada_yth: `Durasi: ${step2Data.durasi_pelaksanaan || "6 Bulan"}`,
        tanggal_pengajuan: formatIndonesianDate(step2Data.created_at || now),
        status: (step2Data.status_review || "REVIEW PROPOSAL PRODI").toUpperCase(),
        catatan_revisi: step2Data.catatan_revisi,
        file_proposal_pdf: step2Data.file_proposal_pdf,
      });
    }

    if (step3Formatted) {
      riwayatPengajuan.push({
        id: `step3-${step3Data?.id_surat || 1}`,
        step: 3,
        jenis_pengajuan: "Pengajuan Surat Pengantar Magang FIK",
        sub_info: `Periode: ${step3Formatted.periode_magang || "6 Bulan"}`,
        nama_instansi: step1Formatted?.nama_instansi || step2Data?.nama_instansi || "-",
        kepada_yth: `ID Magang: ${step3Formatted.id_magang}`,
        tanggal_pengajuan: formatIndonesianDate(step3Data?.created_at || now),
        status: (step3Formatted.status_surat || "DIPROSES FAKULTAS").toUpperCase(),
        surat_pengantar_url: step3Formatted.surat_pengantar_url,
      });
    }

    if (step4Formatted) {
      riwayatPengajuan.push({
        id: `step4-${step4Formatted.id_pengajuan_dpl || 1}`,
        step: 4,
        jenis_pengajuan: "Pengajuan Dosen Pembimbing",
        sub_info: `SKS Ditempuh: ${step4Formatted.sks_ditempuh} SKS`,
        nama_instansi: `DPL: ${step4Formatted.nama_dpl}`,
        kepada_yth: `ID Magang: ${step4Formatted.id_magang}`,
        tanggal_pengajuan: formatIndonesianDate(step4Data?.created_at || now),
        status: (step4Formatted.status_pengajuan || "DIPROSES FAKULTAS").toUpperCase(),
        sk_dpl_url: step4Formatted.sk_dpl_url,
        bukti_diterima_magang: step4Formatted.bukti_diterima_magang,
        file_khs: step4Formatted.file_khs,
      });
    }

    // Step 5: Fetch Konversi SKS Mata Kuliah
    let step5Data = null;

    if (step1Data && step1Data.id_pengajuan) {
      const { data: dbItems } = await supabase
        .from("item_konversi_mk")
        .select("*")
        .eq("id_pengajuan", step1Data.id_pengajuan);

      if (dbItems && dbItems.length > 0) {
        step5Data = {
          id_konversi: step1Data.id_pengajuan,
          total_sks: dbItems.length * 4,
          mode_input: "AI_RECOMMENDATION",
          status_konversi: dbItems[0]?.status_step || "Menunggu Review DPL",
          items: dbItems.map((item) => ({
            kode_mk: item.kode_mk,
            nama_mk: item.kode_mk,
            sks: 4,
            objective: item.modul_industri,
            nilai_angka: item.nilai_akhir_angka,
            nilai_huruf: item.nilai_akhir_huruf,
          })),
        };
      }
    }

    if (!step5Data) {
      const memoryK = memoryKonversiStore.find((k) => k.nim === studentNim || (mhs && k.nim === mhs.nim));
      if (memoryK) step5Data = memoryK;
    }

    if (step5Data) {
      const matkulNames = (step5Data.items && Array.isArray(step5Data.items))
        ? step5Data.items.map((i) => i.nama_mk).join(", ")
        : "Matkul Konversi";

      riwayatPengajuan.push({
        id: `step5-${step5Data.id_konversi || 1}`,
        step: 5,
        jenis_pengajuan: "Pengajuan Konversi",
        sub_info: `Mode: ${step5Data.mode_input === "AI_RECOMMENDATION" ? "Rekomendasi AI" : "Manual"}`,
        nama_instansi: `Mata Kuliah: ${matkulNames}`,
        kepada_yth: `Total: ${step5Data.total_sks || 12} SKS`,
        tanggal_pengajuan: formatIndonesianDate(step5Data.created_at || now),
        status: (step5Data.status_konversi || "MENUNGGU REVIEW DPL").toUpperCase(),
        items: step5Data.items || [],
      });
    }

    let currentStep = 1;
    if (step1Formatted && step1Formatted.status_surat_fakultas === "Disetujui") currentStep = 2;
    if (step2Data) currentStep = 3;
    if (step3Formatted && step3Formatted.status_surat === "Disetujui") currentStep = 4;
    if (step4Formatted) currentStep = 5;
    if (step5Data) currentStep = 6;

    res.json({
      status: 200,
      message: "Data pengajuan magang Step 1, 2, dan 3 berhasil diambil",
      data: {
        mahasiswa: mhs ? {
          nama: mhs.nama,
          nim: mhs.nim,
          email: mhs.email,
          prodi: mhs.prodi || "Informatika",
          angkatan: mhs.angkatan,
        } : null,
        current_step: currentStep,
        riwayat_pengajuan: riwayatPengajuan,
        tracking_status: {
          web_fik_url: FIK_WEB_STATUS_URL,
          telegram_bot_url: FIK_TELEGRAM_BOT_URL,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Alias route /summary and /history
router.get("/summary", authenticateToken, (req, res, next) => {
  req.url = "/all-steps";
  router.handle(req, res, next);
});

router.get("/history", authenticateToken, (req, res, next) => {
  req.url = "/all-steps";
  router.handle(req, res, next);
});

module.exports = router;
