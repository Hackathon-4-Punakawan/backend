const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken } = require("../middleware/auth");
const {
  memoryStep1Store,
  memoryProposalStore,
  memorySuratStore,
  memoryDplStore,
  memoryKonversiStore,
  memorySuratAkhirStore,
  memorySemesterStore,
} = require("../utils/sharedStore");

const router = express.Router();

const AUTO_ACC_DELAY_MS = 5000;
const FIK_WEB_STATUS_URL = "https://fik.amikom.ac.id/page/status-pengajuan-layanan";
const FIK_TELEGRAM_BOT_URL = "http://t.me/AMIKOMFakultasbot";

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

function calculateAcademicYearAndSemester(nim, overrideSemester) {
  const match = String(nim || "").match(/^(\d{2})/);
  const angkatanYear = match ? 2000 + Number.parseInt(match[1], 10) : 2021;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  let calculatedSemester = (currentYear - angkatanYear) * 2;
  if (currentMonth >= 2 && currentMonth <= 7) {
    calculatedSemester += 0; // Genap
  } else {
    calculatedSemester += 1; // Ganjil
  }
  if (calculatedSemester < 1) calculatedSemester = 6;

  const semesterNum = overrideSemester ? Number.parseInt(overrideSemester, 10) : calculatedSemester;
  const isOdd = semesterNum % 2 !== 0;
  const startAcademicYear = angkatanYear + Math.floor((semesterNum - 1) / 2);
  const academicYearStr = `${startAcademicYear}/${startAcademicYear + 1}`;
  const semesterTypeStr = isOdd ? "Ganjil" : "Genap";

  return {
    semesterNumber: semesterNum,
    semesterLabel: `Semester ${semesterNum} (${semesterTypeStr})`,
    academicYear: academicYearStr,
    fullLabel: `Semester ${semesterNum} - ${academicYearStr}`,
  };
}

function generateOfficialIdMagangFik(pengajuanId) {
  const numId = Number.parseInt(pengajuanId, 10);
  if (isNaN(numId)) return "FIK6199364";
  return `FIK${6199364 + numId}`;
}

// Function to trigger auto-ACC for a given pengajuan_magang ID after 5 seconds
async function triggerAutoAccPengajuanFik(idPengajuan) {
  try {
    const officialIdMagang = generateOfficialIdMagangFik(idPengajuan);
    const pdfUrl = `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialIdMagang}.pdf`;

    await supabase
      .from("pengajuan_magang")
      .update({
        status_surat_fakultas: "Disetujui",
        id_magang_fakultas: officialIdMagang,
        nomor_layanan_fik: officialIdMagang,
        surat_pengantar_url: pdfUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id_pengajuan", idPengajuan);

    console.log(`✅ Auto-ACC Pengajuan FIK berhasil untuk ID #${idPengajuan} (${officialIdMagang})`);
  } catch (err) {
    console.error(`⚠️ Gagal Auto-ACC Pengajuan FIK ID #${idPengajuan}:`, err.message);
  }
}

// ----------------------------------------------------------------------
// 1. GET HELPER INFO FOR FORM REGISTRATION (PRE-FILL FORM STEP 1)
// ----------------------------------------------------------------------
router.get("/helper-info", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan. Silakan isi profil terlebih dahulu.");
    }

    const { fullLabel, semesterNumber, academicYear } = calculateAcademicYearAndSemester(mhs.nim);

    res.json({
      status: 200,
      message: "Data pre-fill form pengajuan FIK berhasil diambil",
      data: {
        mahasiswa: {
          nama: mhs.nama,
          email: mhs.email,
          nim: mhs.nim,
          prodi: mhs.prodi || "Informatika",
          angkatan: mhs.angkatan,
        },
        auto_filled: {
          semester: semesterNumber,
          tahun_akademik: academicYear,
          sub_info_label: fullLabel,
          jenis_pengajuan: "Pengajuan ID Magang",
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 2. SUBMIT FORM PENDAFTARAN FIK (CREATE ID MAGANG & PENGAJUAN SURAT)
// ----------------------------------------------------------------------
router.post("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const {
      jenis_pengajuan,
      kepada_yth,
      nama_instansi,
      alamat_instansi,
      posisi,
      jenis_program,
      semester: inputSemester,
      tujuan_surat,
    } = req.body;

    if (!nama_instansi || !nama_instansi.trim()) {
      throw httpError(400, "Nama instansi/perusahaan wajib diisi");
    }

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan.");
    }

    const { fullLabel, semesterNumber, academicYear } = calculateAcademicYearAndSemester(mhs.nim, inputSemester);

    let idMitra = 1;
    const { data: existingMitra } = await supabase
      .from("mitra_industri")
      .select("id_mitra")
      .ilike("nama_perusahaan", `%${nama_instansi.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (existingMitra) {
      idMitra = existingMitra.id_mitra;
    }

    let defaultDplNidn = "0512038901";
    const { data: defaultDpl } = await supabase
      .from("dosen_pembimbing")
      .select("nidn")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (defaultDpl) {
      defaultDplNidn = defaultDpl.nidn;
    }

    const payload = {
      nim: mhs.nim,
      id_mitra: idMitra,
      nidn: defaultDplNidn,
      id_admin: 1,
      nama_instansi: nama_instansi.trim(),
      alamat_instansi: alamat_instansi ? alamat_instansi.trim() : null,
      tujuan_surat: kepada_yth || tujuan_surat || "Kepada Yth. Head of HRD / Engineering",
      jenis_program: jenis_program || "Magang Mandiri",
      posisi: posisi ? posisi.trim() : "Software Engineer Intern",
      durasi_bulan: 6,
      semester: semesterNumber,
      tahun_akademik: academicYear,
      status_pengajuan: "Diproses",
      status_program: "Sedang Berjalan",
      status_surat_fakultas: "Diproses Fakultas",
      surat_pengantar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newPengajuan, error: errInsert } = await supabase
      .from("pengajuan_magang")
      .insert(payload)
      .select()
      .single();

    if (errInsert) {
      throw httpError(400, errInsert.message);
    }

    const createdId = newPengajuan ? newPengajuan.id_pengajuan : (memoryStep1Store.length + 1);
    memoryStep1Store.unshift(newPengajuan || { id_pengajuan: createdId, ...payload });

    setTimeout(() => {
      triggerAutoAccPengajuanFik(createdId);
    }, AUTO_ACC_DELAY_MS);

    res.status(201).json({
      status: 201,
      message: "Form Pendaftaran FIK berhasil dikirim. Pengajuan ID Magang sedang diproses (Auto-ACC 5s).",
      data: {
        id_pengajuan: createdId,
        id_magang_fakultas: "Diproses (Auto-ACC 5s)",
        status_surat_fakultas: "Diproses Fakultas",
        sub_info: fullLabel,
        mahasiswa: {
          nama: mhs.nama,
          nim: mhs.nim,
          email: mhs.email,
        },
        detail: newPengajuan,
        tracking: {
          web_fik_url: FIK_WEB_STATUS_URL,
          telegram_bot_url: FIK_TELEGRAM_BOT_URL,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 3. MONITORING STATUS PENGAJUAN FIK (MY-STATUS)
// ----------------------------------------------------------------------
router.get("/my-status", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (errMhs || !mhs) {
      throw httpError(404, "Profil mahasiswa tidak ditemukan.");
    }

    const { data: listPengajuan } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", mhs.nim)
      .order("created_at", { ascending: false });

    if (!listPengajuan || listPengajuan.length === 0) {
      return res.json({
        status: 200,
        message: "Mahasiswa belum mengajukan Pendaftaran ID Magang FIK",
        data: null,
      });
    }

    const latest = listPengajuan[0];
    const now = new Date();
    const parsedDate = latest.created_at ? new Date(latest.created_at) : null;
    const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
    const ageMs = Math.max(0, now.getTime() - createdAt.getTime());

    const isAutoApproved = latest.status_surat_fakultas === "Disetujui" || ageMs >= AUTO_ACC_DELAY_MS;
    const officialIdMagang = isAutoApproved ? generateOfficialIdMagangFik(latest.id_pengajuan) : (latest.id_magang_fakultas || "Diproses");
    const pdfUrl = latest.surat_pengantar_url || `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialIdMagang}.pdf`;

    if (isAutoApproved && latest.status_surat_fakultas !== "Disetujui") {
      await supabase
        .from("pengajuan_magang")
        .update({
          status_surat_fakultas: "Disetujui",
          id_magang_fakultas: officialIdMagang,
          nomor_layanan_fik: officialIdMagang,
          surat_pengantar_url: pdfUrl,
        })
        .eq("id_pengajuan", latest.id_pengajuan);
    }

    const { fullLabel } = calculateAcademicYearAndSemester(mhs.nim, latest.semester);

    res.json({
      status: 200,
      message: "Status pengajuan ID Magang FIK berhasil diambil",
      data: {
        id_pengajuan: latest.id_pengajuan,
        id_magang_fakultas: officialIdMagang,
        nomor_layanan_fik: officialIdMagang,
        jenis_pengajuan: "Pengajuan ID Magang",
        sub_info: fullLabel,
        nama_instansi: latest.nama_instansi,
        tujuan_surat: latest.tujuan_surat,
        posisi: latest.posisi,
        status_surat_fakultas: isAutoApproved ? "Disetujui" : "Diproses Fakultas",
        surat_pengantar_url: isAutoApproved ? pdfUrl : null,
        created_at: latest.created_at,
        tracking: {
          web_fik_url: FIK_WEB_STATUS_URL,
          telegram_bot_url: FIK_TELEGRAM_BOT_URL,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 4. UNIFIED 5-STEP HISTORY & TRACKING (GET /all-steps & GET /history)
// ----------------------------------------------------------------------
router.get("/all-steps", authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const studentNim = req.user.nim || req.query.nim;

    let mhs = null;
    if (userId) {
      const { data: fetchMhs } = await supabase
        .from("mahasiswa")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (fetchMhs) mhs = fetchMhs;
    }

    if (!mhs && req.user?.email) {
      const { data: fetchMhs } = await supabase
        .from("mahasiswa")
        .select("*")
        .eq("email", req.user.email)
        .maybeSingle();
      if (fetchMhs) mhs = fetchMhs;
    }

    if (!mhs && studentNim) {
      const { data: fetchMhs } = await supabase
        .from("mahasiswa")
        .select("*")
        .eq("nim", studentNim)
        .maybeSingle();
      if (fetchMhs) mhs = fetchMhs;
    }

    const targetNim = mhs ? mhs.nim : (req.user?.nim || studentNim);

    // Step 1: Fetch Pengajuan ID Magang FIK
    let listStep1 = [];
    if (targetNim) {
      const { data } = await supabase
        .from("pengajuan_magang")
        .select("*")
        .eq("nim", targetNim)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) listStep1 = data;
    }

    if (listStep1.length === 0 && targetNim) {
      const memStep1 = memoryStep1Store.filter((s) => String(s.nim || "") === String(targetNim) || (mhs && String(s.nim || "") === String(mhs.nim)));
      if (memStep1.length > 0) listStep1 = memStep1;
    }

    const step1Data = listStep1.length > 0 ? listStep1[0] : null;
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
    if (targetNim) {
      const { data: dbProposals } = await supabase
        .from("proposal_magang")
        .select("*")
        .eq("nim", targetNim)
        .order("created_at", { ascending: false });
      if (dbProposals && dbProposals.length > 0) {
        step2Data = dbProposals[0];
      }
    }

    if (!step2Data && targetNim) {
      const memoryProp = memoryProposalStore.find((p) => String(p.nim || "") === String(targetNim) || (mhs && String(p.nim || "") === String(mhs.nim)));
      if (memoryProp) step2Data = memoryProp;
    }

    // Step 3: Fetch Surat Pengantar Magang FIK (Check both table names for compatibility)
    let step3Data = null;
    if (targetNim) {
      let { data: dbSurats } = await supabase
        .from("pengajuan_surat_pengantar")
        .select("*")
        .eq("nim", targetNim)
        .order("created_at", { ascending: false });

      if (!dbSurats || dbSurats.length === 0) {
        const { data: dbSuratsAlt } = await supabase
          .from("surat_pengantar_magang")
          .select("*")
          .eq("nim", targetNim)
          .order("created_at", { ascending: false });
        if (dbSuratsAlt && dbSuratsAlt.length > 0) dbSurats = dbSuratsAlt;
      }

      if (dbSurats && dbSurats.length > 0) {
        step3Data = dbSurats[0];
      }
    }

    if (!step3Data && targetNim) {
      const memorySurat = memorySuratStore.find((s) => String(s.nim || "") === String(targetNim) || (mhs && String(s.email_mahasiswa || "") === String(mhs.email)));
      if (memorySurat) step3Data = memorySurat;
    }

    let step3Formatted = null;
    if (step3Data) {
      const parsedDate = step3Data.created_at ? new Date(step3Data.created_at) : null;
      const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
      const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
      const rawStatus = step3Data.status_surat || "Diproses Fakultas";
      const isApproved = rawStatus === "Disetujui" || rawStatus === "Selesai" || ageMs >= AUTO_ACC_DELAY_MS;
      const officialId = step3Data.id_magang_fakultas || step1Formatted?.id_magang_fakultas || "FIK6199364";
      const pdfUrl = step3Data.surat_pengantar_url || step3Data.file_surat_pengantar_pdf || `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialId}.pdf`;

      step3Formatted = {
        ...step3Data,
        email: step3Data.email_mahasiswa || mhs?.email,
        id_magang: officialId,
        tanggal_mulai_magang: step3Data.tanggal_mulai || step2Data?.tanggal_mulai || "2026-08-01",
        tanggal_berakhir_magang: step3Data.tanggal_selesai || step3Data.tanggal_berakhir || step2Data?.tanggal_selesai || "2027-01-31",
        periode_magang: step3Data.periode_magang || "6 Bulan",
        status_surat: isApproved ? "Disetujui" : "Diproses Fakultas",
        surat_pengantar_url: isApproved ? pdfUrl : null,
      };
    }

    // Step 4: Fetch Pengajuan DPL Magang
    let step4Data = null;
    if (targetNim) {
      const { data: dbDpls } = await supabase
        .from("pengajuan_dpl")
        .select("*")
        .eq("nim", targetNim)
        .order("created_at", { ascending: false });
      if (dbDpls && dbDpls.length > 0) {
        step4Data = dbDpls[0];
      }
    }

    if (!step4Data && targetNim) {
      const memoryDpl = memoryDplStore.find((d) => String(d.nim || "") === String(targetNim) || (mhs && String(d.nim || "") === String(mhs.nim)));
      if (memoryDpl) step4Data = memoryDpl;
    }

    let step4Formatted = null;
    if (step4Data) {
      const parsedDate = step4Data.created_at ? new Date(step4Data.created_at) : null;
      const createdAt = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : now;
      const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
      const rawStatus = step4Data.status_pengajuan || "Diproses Fakultas";
      const isApproved = rawStatus === "Disetujui" || rawStatus === "SK DPL Diterbitkan" || ageMs >= AUTO_ACC_DELAY_MS;
      const officialId = step4Data.id_magang_fakultas || step1Formatted?.id_magang_fakultas || "FIK6199364";
      const skUrl = step4Data.sk_dpl_url || `https://fik.amikom.ac.id/surat/SK-DPL-${officialId}.pdf`;

      step4Formatted = {
        ...step4Data,
        id_magang: officialId,
        status_pengajuan: isApproved ? "Disetujui" : "Diproses Fakultas",
        nidn_dpl: isApproved ? (step4Data.nidn_dpl || "0512038901") : null,
        nama_dpl: isApproved ? (step4Data.nama_dpl || "Dr. Indah Susanti, M.Kom") : "Proses Plotting DPL",
        sk_dpl_url: isApproved ? skUrl : null,
      };
    }

    // Step 5: Fetch Konversi SKS Mata Kuliah
    let step5Data = null;
    if (targetNim) {
      const { data: dbHeader } = await supabase
        .from("pengajuan_konversi_matkul")
        .select("*")
        .eq("nim", targetNim)
        .order("created_at", { ascending: false });

      if (dbHeader && dbHeader.length > 0) {
        const h = dbHeader[0];
        const { data: dbDetails } = await supabase
          .from("item_konversi_detail")
          .select("*")
          .eq("id_konversi", h.id_konversi);

        step5Data = {
          id_konversi: h.id_konversi,
          total_sks: h.total_sks || 20,
          mode_input: h.mode_input || "AI_RECOMMENDATION",
          status_konversi: h.status_konversi || "Menunggu Review DPL",
          catatan_dosen: h.catatan_dosen || null,
          items: (dbDetails && dbDetails.length > 0) ? dbDetails.map((item) => ({
            kode_mk: item.kode_mk,
            nama_mk: item.nama_mk || item.kode_mk,
            sks: item.sks || 4,
            objective: item.objective || item.modul_industri,
            nilai_angka: item.nilai_angka,
            nilai_huruf: item.nilai_huruf,
          })) : [],
          created_at: h.created_at,
        };
      } else if (step1Data && step1Data.id_pengajuan) {
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
    }

    if (!step5Data && targetNim) {
      const memoryK = memoryKonversiStore.find((k) => String(k.nim || "") === String(targetNim) || (mhs && String(k.nim || "") === String(mhs.nim)));
      if (memoryK) step5Data = memoryK;
    }

    // Step 6: Fetch Surat Akhir Magang & Terima Kasih
    let step6Data = null;
    if (targetNim) {
      const { data: dbSuratAkhir } = await supabase
        .from("surat_akhir_magang")
        .select("*")
        .eq("nim", targetNim)
        .order("created_at", { ascending: false });

      if (dbSuratAkhir && dbSuratAkhir.length > 0) {
        step6Data = dbSuratAkhir[0];
      }
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
        id: `step3-${step3Formatted.id_surat || step3Formatted.id_surat_pengantar || 1}`,
        step: 3,
        jenis_pengajuan: "Pengajuan Surat Pengantar Magang FIK",
        sub_info: `Periode: ${step3Formatted.periode_magang || "6 Bulan"}`,
        nama_instansi: step1Formatted?.nama_instansi || step2Data?.nama_instansi || "-",
        kepada_yth: `ID Magang: ${step3Formatted.id_magang}`,
        tanggal_pengajuan: formatIndonesianDate(step3Formatted.created_at || now),
        status: (step3Formatted.status_surat || "DIPROSES FAKULTAS").toUpperCase(),
        surat_pengantar_url: step3Formatted.surat_pengantar_url,
      });
    }

    if (step4Formatted) {
      riwayatPengajuan.push({
        id: `step4-${step4Formatted.id_pengajuan_dpl || 1}`,
        step: 4,
        jenis_pengajuan: "Pengajuan Dosen Pembimbing",
        sub_info: `SKS Ditempuh: ${step4Formatted.sks_ditempuh || 110} SKS`,
        nama_instansi: `DPL: ${step4Formatted.nama_dpl}`,
        kepada_yth: `ID Magang: ${step4Formatted.id_magang}`,
        tanggal_pengajuan: formatIndonesianDate(step4Formatted.created_at || now),
        status: (step4Formatted.status_pengajuan || "DIPROSES FAKULTAS").toUpperCase(),
        sk_dpl_url: step4Formatted.sk_dpl_url,
        bukti_diterima_magang: step4Formatted.bukti_diterima_magang,
        file_khs: step4Formatted.file_khs,
      });
    }

    if (step5Data) {
      const matkulNames = (step5Data.items && Array.isArray(step5Data.items) && step5Data.items.length > 0)
        ? step5Data.items.map((i) => i.nama_mk).join(", ")
        : "Konversi 20 SKS";

      riwayatPengajuan.push({
        id: `step5-${step5Data.id_konversi || 1}`,
        step: 5,
        jenis_pengajuan: "Pengajuan Konversi",
        sub_info: `Mode: ${step5Data.mode_input === "AI_RECOMMENDATION" ? "Rekomendasi AI" : "Manual"}`,
        nama_instansi: `Mata Kuliah: ${matkulNames}`,
        kepada_yth: `Total: ${step5Data.total_sks || 20} SKS`,
        tanggal_pengajuan: formatIndonesianDate(step5Data.created_at || now),
        status: (step5Data.status_konversi || "MENUNGGU REVIEW DPL").toUpperCase(),
        catatan_dosen: step5Data.catatan_dosen,
        items: step5Data.items || [],
      });
    }

    if (step6Data) {
      riwayatPengajuan.push({
        id: `step6-${step6Data.id_surat_akhir || 1}`,
        step: 6,
        jenis_pengajuan: "Surat Akhir & Ucapan Terima Kasih FIK",
        sub_info: `Status Mitra: ${step6Data.status_penilaian_mitra || "Sudah Dinilai Mitra"}`,
        nama_instansi: `Nilai Mitra: ${step6Data.nilai_mitra_angka || 95} (${step6Data.nilai_mitra_huruf || "A"})`,
        kepada_yth: `Catatan: ${step6Data.catatan_mitra || "-"}`,
        tanggal_pengajuan: formatIndonesianDate(step6Data.created_at || now),
        status: (step6Data.status_penilaian_mitra || "SUDAH DINILAI MITRA").toUpperCase(),
        surat_terima_kasih_url: step6Data.surat_terima_kasih_url,
        sertifikat_magang_url: step6Data.sertifikat_magang_url,
      });
    }

    let currentStep = 1;
    if (step1Formatted && step1Formatted.status_surat_fakultas === "Disetujui") currentStep = 2;
    if (step2Data) currentStep = 3;
    if (step3Formatted && (step3Formatted.status_surat === "Disetujui" || step3Formatted.status_surat === "Selesai")) currentStep = 4;
    if (step4Formatted && (step4Formatted.status_pengajuan === "Disetujui" || step4Formatted.status_pengajuan === "SK DPL Diterbitkan")) currentStep = 5;
    if (step5Data) currentStep = 6;

    res.json({
      status: 200,
      message: "Data pengajuan magang seluruh tahapan berhasil diambil",
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

router.get("/riwayat-semester", authenticateToken, (req, res, next) => {
  const { getMahasiswaRiwayatSemester } = require("./dashboardMahasiswa");
  return getMahasiswaRiwayatSemester(req, res, next);
});

router.get("/dokumen-acc", authenticateToken, (req, res, next) => {
  const { getMahasiswaRiwayatSemester } = require("./dashboardMahasiswa");
  return getMahasiswaRiwayatSemester(req, res, next);
});

router.get("/logbook", authenticateToken, (req, res, next) => {
  const { getMahasiswaLogbook } = require("./dashboardMahasiswa");
  return getMahasiswaLogbook(req, res, next);
});

router.post("/logbook", authenticateToken, (req, res, next) => {
  const { postMahasiswaLogbook } = require("./dashboardMahasiswa");
  return postMahasiswaLogbook(req, res, next);
});

module.exports = router;
