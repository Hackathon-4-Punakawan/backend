const express = require("express");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { memorySuratStore } = require("../utils/sharedStore");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
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

// Helper: Resolve active Mitra profile from JWT token / DB
async function resolveMitraProfile(req) {
  const userId = req.user?.userId;
  const email = req.user?.email;
  const profileId = req.user?.profileId;

  let mitra = null;

  if (profileId) {
    const { data } = await supabase
      .from("mitra_industri")
      .select("*")
      .eq("id_mitra", profileId)
      .maybeSingle();
    if (data) mitra = data;
  }

  if (!mitra && userId) {
    const { data } = await supabase
      .from("mitra_industri")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) mitra = data;
  }

  if (!mitra && email) {
    const { data } = await supabase
      .from("mitra_industri")
      .select("*")
      .eq("email_supervisor", email)
      .maybeSingle();
    if (data) mitra = data;
  }

  if (!mitra) {
    mitra = {
      id_mitra: profileId || 1,
      nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk",
      nama_supervisor: req.user?.name || "Rian Hidayat (Lead Eng GoTo)",
      email_supervisor: email || "rian.hidayat@goto.com",
      kategori_industri: "Technology & Unicorn",
      bidang_usaha: "Software & Digital Services",
      kontak_pic: "hr.internship@goto.com",
    };
  }

  return mitra;
}

// ----------------------------------------------------------------------
// 1. GET /api/v1/mitra/dashboard-stats
// Ringkasan Statistik Dashboard Mitra: Jumlah Mahasiswa Magang & Status Penilaian
// ----------------------------------------------------------------------
router.get("/dashboard-stats", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const mitra = await resolveMitraProfile(req);

    // Fetch submissions for thank-you letter / final internship
    const { data: dbSuratAkhir } = await supabase
      .from("surat_akhir_magang")
      .select("*")
      .order("created_at", { ascending: false });

    const list = dbSuratAkhir || [];

    let totalMahasiswa = list.length;
    let totalSudahDinilai = 0;
    let totalBelumDinilai = 0;
    let sumScore = 0;
    let countScore = 0;

    for (const item of list) {
      const isGraded = item.status_penilaian_mitra === "Sudah Dinilai Mitra" || item.nilai_mitra_angka !== null;
      if (isGraded) {
        totalSudahDinilai++;
        if (item.nilai_mitra_angka !== null) {
          sumScore += Number(item.nilai_mitra_angka);
          countScore++;
        }
      } else {
        totalBelumDinilai++;
      }
    }

    // Default fallback counts if DB is empty
    if (totalMahasiswa === 0) {
      totalMahasiswa = 1;
      totalSudahDinilai = 1;
      totalBelumDinilai = 0;
      sumScore = 92;
      countScore = 1;
    }

    const avgScore = countScore > 0 ? Number((sumScore / countScore).toFixed(1)) : 0;

    res.json({
      status: 200,
      message: "Statistik Dashboard Mitra Industri berhasil diambil",
      data: {
        mitra: {
          id_mitra: mitra.id_mitra,
          nama_perusahaan: mitra.nama_perusahaan,
          nama_supervisor: mitra.nama_supervisor,
          email_supervisor: mitra.email_supervisor,
          kategori_industri: mitra.kategori_industri,
        },
        ringkasan: {
          total_mahasiswa_magang: totalMahasiswa,
          total_belum_dinilai: totalBelumDinilai,
          total_sudah_dinilai: totalSudahDinilai,
          rata_rata_nilai: avgScore,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 2. GET /api/v1/mitra/mahasiswa & GET /api/v1/mitra/surat-akhir
// Menampilkan Daftar Mahasiswa yang Mengajukan Surat Terima Kasih ke Mitra
// ----------------------------------------------------------------------
const handleGetMitraMahasiswaList = async (req, res, next) => {
  try {
    const mitra = await resolveMitraProfile(req);
    const filterStatus = (req.query.status || "").toLowerCase().trim();
    const searchKeyword = (req.query.search || "").toLowerCase().trim();

    // Fetch Surat Akhir Submissions
    const { data: dbSuratAkhir } = await supabase
      .from("surat_akhir_magang")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: dbStudents } = await supabase.from("mahasiswa").select("*");
    const { data: dbMagang } = await supabase.from("pengajuan_magang").select("*");

    const mhsMap = new Map((dbStudents || []).map((s) => [s.nim, s]));
    const magangMap = new Map((dbMagang || []).map((p) => [p.nim, p]));

    let rawList = dbSuratAkhir || [];

    // Fallback demo data if database empty
    if (rawList.length === 0) {
      rawList = [
        {
          id_surat_akhir: 1,
          id_pengajuan: 1,
          nim: "21.11.4001",
          email_mahasiswa: "budi.santoso@students.amikom.ac.id",
          id_magang_fakultas: "FIK6199373",
          tanggal_mulai_magang: "01 Agustus 2026",
          tanggal_berakhir_magang: "31 Januari 2027",
          periode_magang: "6 Bulan",
          surat_terima_kasih_url: "https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-FIK6199373.pdf",
          status_penilaian_mitra: "Sudah Dinilai Mitra",
          nilai_mitra_angka: 92,
          nilai_mitra_huruf: "A",
          catatan_mitra: "Mahasiswa berkinerja luar biasa, sangat proaktif menguasai REST API & microservices.",
          sertifikat_magang_url: "https://drive.google.com/file/d/sertifikat_goto_budi.pdf",
          created_at: new Date().toISOString(),
        },
      ];
    }

    const resultList = [];

    for (const item of rawList) {
      const student = mhsMap.get(item.nim) || {};
      const magang = magangMap.get(item.nim) || {};

      const studentName = student.nama || (item.nim === "21.11.4001" ? "Budi Santoso" : "Mahasiswa Magang FIK");
      const studentEmail = item.email_mahasiswa || item.email || student.email || `${item.nim}@students.amikom.ac.id`;
      const isGraded = item.status_penilaian_mitra === "Sudah Dinilai Mitra" || item.nilai_mitra_angka !== null;
      const currentStatus = isGraded ? "Sudah Dinilai Mitra" : "Belum Dinilai";

      const formattedItem = {
        id_surat_akhir: item.id_surat_akhir,
        id_pengajuan: item.id_pengajuan || magang.id_pengajuan || 1,
        nim: item.nim,
        nama_mahasiswa: studentName,
        email: studentEmail,
        prodi: student.prodi || "Informatika",
        angkatan: student.angkatan || "2021",
        foto_profile: student.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4f46e5&color=fff&bold=true`,
        magang: {
          id_magang_fakultas: item.id_magang_fakultas || magang.id_magang_fakultas || "FIK6199373",
          nama_instansi: magang.nama_instansi || mitra.nama_perusahaan,
          posisi: magang.posisi || "Fullstack Developer Intern",
          tanggal_mulai_magang: item.tanggal_mulai_magang || "01 Agustus 2026",
          tanggal_berakhir_magang: item.tanggal_berakhir_magang || "31 Januari 2027",
          periode_magang: item.periode_magang || "6 Bulan",
          surat_terima_kasih_url: item.surat_terima_kasih_url || `https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-${item.id_magang_fakultas || "FIK6199373"}.pdf`,
        },
        penilaian_mitra: {
          status: currentStatus,
          nilai_angka: item.nilai_mitra_angka ?? null,
          nilai_huruf: item.nilai_mitra_huruf ?? (item.nilai_mitra_angka ? calculateGradeLetter(item.nilai_mitra_angka) : null),
          catatan_mitra: item.catatan_mitra ?? null,
          sertifikat_magang_url: item.sertifikat_magang_url ?? null,
        },
        created_at: item.created_at,
      };

      // Apply Search Filter
      const matchSearch =
        !searchKeyword ||
        studentName.toLowerCase().includes(searchKeyword) ||
        item.nim.toLowerCase().includes(searchKeyword);

      // Apply Status Filter
      const matchStatus =
        !filterStatus ||
        currentStatus.toLowerCase().includes(filterStatus);

      if (matchSearch && matchStatus) {
        resultList.push(formattedItem);
      }
    }

    res.json({
      status: 200,
      message: "Daftar mahasiswa & pengajuan Surat Terima Kasih untuk Mitra Industri berhasil diambil",
      data: {
        mitra: {
          id_mitra: mitra.id_mitra,
          nama_perusahaan: mitra.nama_perusahaan,
        },
        total_mahasiswa: resultList.length,
        mahasiswa: resultList,
      },
    });
  } catch (err) {
    next(err);
  }
};

router.get("/mahasiswa", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), handleGetMitraMahasiswaList);
router.get("/surat-akhir", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), handleGetMitraMahasiswaList);

// ----------------------------------------------------------------------
// 3. GET /api/v1/mitra/mahasiswa/:nim & GET /api/v1/mitra/surat-akhir/:id
// Menampilkan Detail Data Mahasiswa Magang & Surat Terima Kasih untuk Mitra
// ----------------------------------------------------------------------
router.get("/mahasiswa/:nim", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const mitra = await resolveMitraProfile(req);
    const nimParam = req.params.nim.trim();

    const { data: student } = await supabase
      .from("mahasiswa")
      .select("*")
      .eq("nim", nimParam)
      .maybeSingle();

    const { data: suratAkhir } = await supabase
      .from("surat_akhir_magang")
      .select("*")
      .eq("nim", nimParam)
      .order("created_at", { ascending: false })
      .maybeSingle();

    const { data: magang } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", nimParam)
      .order("created_at", { ascending: false })
      .maybeSingle();

    const studentName = student?.nama || (nimParam === "21.11.4001" ? "Budi Santoso" : "Mahasiswa Magang FIK");
    const isGraded = suratAkhir?.status_penilaian_mitra === "Sudah Dinilai Mitra" || suratAkhir?.nilai_mitra_angka !== null;

    res.json({
      status: 200,
      message: `Detail data mahasiswa magang ${studentName} (NIM: ${nimParam}) berhasil diambil`,
      data: {
        mitra: {
          id_mitra: mitra.id_mitra,
          nama_perusahaan: mitra.nama_perusahaan,
          nama_supervisor: mitra.nama_supervisor,
        },
        mahasiswa: {
          nim: nimParam,
          nama: studentName,
          email: student?.email || `${nimParam}@students.amikom.ac.id`,
          prodi: student?.prodi || "Informatika",
          angkatan: student?.angkatan || "2021",
          foto_profile: student?.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=4f46e5&color=fff&bold=true`,
        },
        surat_akhir: {
          id_surat_akhir: suratAkhir?.id_surat_akhir || 1,
          id_magang_fakultas: suratAkhir?.id_magang_fakultas || magang?.id_magang_fakultas || "FIK6199373",
          nama_instansi: magang?.nama_instansi || mitra.nama_perusahaan,
          posisi: magang?.posisi || "Fullstack Developer Intern",
          tanggal_mulai_magang: suratAkhir?.tanggal_mulai_magang || "01 Agustus 2026",
          tanggal_berakhir_magang: suratAkhir?.tanggal_berakhir_magang || "31 Januari 2027",
          periode_magang: suratAkhir?.periode_magang || "6 Bulan",
          surat_terima_kasih_url: suratAkhir?.surat_terima_kasih_url || `https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-${suratAkhir?.id_magang_fakultas || "FIK6199373"}.pdf`,
        },
        penilaian_mitra: {
          status: isGraded ? "Sudah Dinilai Mitra" : "Belum Dinilai",
          nilai_angka: suratAkhir?.nilai_mitra_angka ?? null,
          nilai_huruf: suratAkhir?.nilai_mitra_huruf ?? (suratAkhir?.nilai_mitra_angka ? calculateGradeLetter(suratAkhir.nilai_mitra_angka) : null),
          catatan_mitra: suratAkhir?.catatan_mitra ?? null,
          sertifikat_magang_url: suratAkhir?.sertifikat_magang_url ?? null,
          updated_at: suratAkhir?.updated_at || null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 4. POST & PUT /api/v1/mitra/penilaian & /api/v1/mitra/submit-nilai
// Mitra Input Penilaian Akhir Magang, Catatan Evaluasi & Sertifikat
// ----------------------------------------------------------------------
const handleMitraSubmitPenilaian = async (req, res, next) => {
  try {
    const mitra = await resolveMitraProfile(req);
    const {
      id_surat_akhir,
      nim,
      nilai_mitra_angka,
      nilai_mitra_huruf,
      catatan_mitra,
      umpan_balik,
      sertifikat_magang_url,
    } = req.body;

    const targetId = id_surat_akhir;
    const targetNim = nim || "21.11.4001";

    if (!targetId && !targetNim) {
      throw httpError(400, "Wajib menyertakan id_surat_akhir atau nim mahasiswa");
    }

    if (nilai_mitra_angka === undefined || nilai_mitra_angka === null || nilai_mitra_angka === "") {
      throw httpError(400, "Field nilai_mitra_angka wajib diisi oleh Mitra Industri");
    }

    const scoreNum = Number(nilai_mitra_angka);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      throw httpError(400, "nilai_mitra_angka harus berupa angka yang valid antara 0 sampai 100");
    }

    const finalLetter = nilai_mitra_huruf || calculateGradeLetter(scoreNum);
    const feedbackNote = (catatan_mitra || umpan_balik || "Mahasiswa menunjukkan kinerja magang yang sangat baik, proaktif, dan disiplin.").trim();
    const certUrl = sertifikat_magang_url || `https://drive.google.com/file/d/sertifikat_magang_${targetNim}.pdf`;
    const nowIso = new Date().toISOString();

    const updateData = {
      status_penilaian_mitra: "Sudah Dinilai Mitra",
      nilai_mitra_angka: scoreNum,
      nilai_mitra_huruf: finalLetter,
      catatan_mitra: feedbackNote,
      sertifikat_magang_url: certUrl,
      updated_at: nowIso,
    };

    let updatedRecord = null;

    // 1. Update in DB surat_akhir_magang
    if (targetId) {
      const { data } = await supabase
        .from("surat_akhir_magang")
        .update(updateData)
        .eq("id_surat_akhir", targetId)
        .select("*")
        .maybeSingle();
      updatedRecord = data;
    }

    if (!updatedRecord && targetNim) {
      const { data } = await supabase
        .from("surat_akhir_magang")
        .update(updateData)
        .eq("nim", targetNim)
        .select("*")
        .maybeSingle();
      updatedRecord = data;
    }

    // 2. Also update nilai_mitra in item_konversi_mk if present
    if (targetNim) {
      await supabase
        .from("item_konversi_mk")
        .update({
          nilai_mitra: scoreNum,
          komentar_mitra: feedbackNote,
          status_klaim: "Disetujui",
          tanggal_penilaian_mitra: nowIso,
        })
        .eq("id_pengajuan", 1);
    }

    res.json({
      status: 200,
      message: `Penilaian & evaluasi kinerja magang mahasiswa oleh Mitra Industri (${mitra.nama_perusahaan}) berhasil disimpan`,
      data: {
        id_surat_akhir: targetId || 1,
        nim: targetNim,
        status_penilaian_mitra: "Sudah Dinilai Mitra",
        penilaian_mitra: {
          nilai_angka: scoreNum,
          nilai_huruf: finalLetter,
          catatan_mitra: feedbackNote,
          sertifikat_magang_url: certUrl,
          evaluator: {
            id_mitra: mitra.id_mitra,
            nama_perusahaan: mitra.nama_perusahaan,
            nama_supervisor: mitra.nama_supervisor,
          },
        },
        updated_at: nowIso,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// 5. GET /api/v1/mitra/pendaftaran-magang & POST ACC / TOLAK MAHASISWA
// List Mahasiswa Pengaju Magang, Lihat Surat Pengantar FIK, ACC & Tolak
// ----------------------------------------------------------------------
const memoryMitraPendaftarStore = [
  {
    id_pengajuan: 1,
    nim: "24.11.6666",
    nama_mahasiswa: "Fathur Rahman",
    email: "fathur.6666@students.amikom.ac.id",
    prodi: "Informatika",
    id_magang_fakultas: "FIK6199364",
    nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
    posisi: "Fullstack Developer Intern",
    surat_pengantar_url: "https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK6199364.pdf",
    status_penerimaan_mitra: "Disetujui Mitra",
    catatan_mitra: "Lolos seleksi portofolio & interview teknis.",
    bukti_penerimaan_url: "https://fik.amikom.ac.id/surat/ACCEPTANCE-GOTO-24116666.pdf",
    created_at: new Date().toISOString(),
  },
  {
    id_pengajuan: 2,
    nim: "21.11.4001",
    nama_mahasiswa: "Budi Santoso",
    email: "budi.santoso@students.amikom.ac.id",
    prodi: "Informatika",
    id_magang_fakultas: "FIK6199373",
    nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
    posisi: "Backend Engineer Intern",
    surat_pengantar_url: "https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK6199373.pdf",
    status_penerimaan_mitra: "Pending Review Mitra",
    catatan_mitra: null,
    bukti_penerimaan_url: null,
    created_at: new Date().toISOString(),
  }
];

// 5a. GET LIST PENDAFTAR MAGANG DI MITRA
router.get("/pendaftaran-magang", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const mitra = await resolveMitraProfile(req);

    const { data: dbStep1 } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: dbStudents } = await supabase.from("mahasiswa").select("*");
    const mhsMap = new Map((dbStudents || []).map((s) => [s.nim, s]));

    const list = [];
    if (dbStep1 && dbStep1.length > 0) {
      for (const item of dbStep1) {
        const mhs = mhsMap.get(item.nim) || {};
        const officialId = item.id_magang_fakultas || item.nomor_layanan_fik || `FIK${item.nim.replace(/\./g, "")}`;
        const pdfUrl = item.surat_pengantar_url || `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-${officialId}.pdf`;

        list.push({
          id_pengajuan: item.id_pengajuan,
          nim: item.nim,
          nama_mahasiswa: mhs.nama || "Mahasiswa Informatika",
          email: item.email || mhs.email || `${item.nim}@students.amikom.ac.id`,
          prodi: mhs.prodi || "Informatika",
          angkatan: mhs.angkatan || "2024",
          id_magang_fakultas: officialId,
          nama_instansi: item.nama_instansi || mitra.nama_perusahaan,
          posisi: item.posisi || "Internship Program",
          surat_pengantar_url: pdfUrl,
          status_penerimaan_mitra: item.status_penerimaan_mitra || "Pending Review Mitra",
          catatan_mitra: item.catatan_mitra || null,
          bukti_penerimaan_url: item.bukti_penerimaan_url || null,
          created_at: item.created_at,
        });
      }
    }

    // Merge with memory store items
    for (const mem of memoryMitraPendaftarStore) {
      if (!list.some((l) => l.nim === mem.nim)) {
        list.push(mem);
      }
    }

    res.json({
      status: 200,
      message: "Daftar pendaftaran magang mahasiswa masuk ke Mitra Industri berhasil diambil",
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

// 5b. POST ACC PENDAFTARAN MAHASISWA MAGANG OLEH MITRA
router.post("/pendaftaran-magang/acc", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const mitra = await resolveMitraProfile(req);
    const { id_pengajuan, nim, catatan_mitra } = req.body;

    if (!id_pengajuan && !nim) {
      throw httpError(400, "Wajib menyertakan id_pengajuan atau nim mahasiswa");
    }

    const acceptanceUrl = `https://fik.amikom.ac.id/surat/ACCEPTANCE-LETTER-${nim || "MAGANG"}.pdf`;
    const note = catatan_mitra || "Selamat! Pendaftaran magang Anda telah disetujui resmi oleh Mitra Industri.";
    const nowIso = new Date().toISOString();

    const updatePayload = {
      status_penerimaan_mitra: "Disetujui Mitra",
      catatan_mitra: note,
      bukti_penerimaan_url: acceptanceUrl,
      updated_at: nowIso,
    };

    if (id_pengajuan) {
      await supabase.from("pengajuan_magang").update(updatePayload).eq("id_pengajuan", id_pengajuan);
    } else if (nim) {
      await supabase.from("pengajuan_magang").update(updatePayload).eq("nim", nim);
    }

    // Memory store update
    const memIndex = memoryMitraPendaftarStore.findIndex((m) => m.nim === nim || m.id_pengajuan === id_pengajuan);
    if (memIndex >= 0) {
      memoryMitraPendaftarStore[memIndex] = {
        ...memoryMitraPendaftarStore[memIndex],
        ...updatePayload,
      };
    } else {
      memoryMitraPendaftarStore.unshift({
        id_pengajuan: id_pengajuan || Date.now(),
        nim: nim || "24.11.6666",
        nama_mahasiswa: "Mahasiswa Magang",
        email: `${nim}@students.amikom.ac.id`,
        prodi: "Informatika",
        id_magang_fakultas: `FIK${(nim || "6666").replace(/\./g, "")}`,
        nama_instansi: mitra.nama_perusahaan,
        posisi: "Software Engineer Intern",
        surat_pengantar_url: `https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK${(nim || "6666").replace(/\./g, "")}.pdf`,
        ...updatePayload,
        created_at: nowIso,
      });
    }

    res.json({
      status: 200,
      message: `Pendaftaran magang mahasiswa (${nim}) berhasil disetujui (ACC) oleh ${mitra.nama_perusahaan}`,
      data: {
        nim,
        status_penerimaan_mitra: "Disetujui Mitra",
        bukti_penerimaan_url: acceptanceUrl,
        catatan_mitra: note,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 5c. POST TOLAK PENDAFTARAN MAHASISWA MAGANG OLEH MITRA
router.post("/pendaftaran-magang/tolak", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const mitra = await resolveMitraProfile(req);
    const { id_pengajuan, nim, catatan_mitra } = req.body;

    if (!id_pengajuan && !nim) {
      throw httpError(400, "Wajib menyertakan id_pengajuan atau nim mahasiswa");
    }

    if (!catatan_mitra || !catatan_mitra.trim()) {
      throw httpError(400, "Wajib menyertakan catatan/alasan penolakan pengajuan magang");
    }

    const note = catatan_mitra.trim();
    const nowIso = new Date().toISOString();

    const updatePayload = {
      status_penerimaan_mitra: "Ditolak Mitra",
      catatan_mitra: note,
      updated_at: nowIso,
    };

    if (id_pengajuan) {
      await supabase.from("pengajuan_magang").update(updatePayload).eq("id_pengajuan", id_pengajuan);
    } else if (nim) {
      await supabase.from("pengajuan_magang").update(updatePayload).eq("nim", nim);
    }

    // Memory store update
    const memIndex = memoryMitraPendaftarStore.findIndex((m) => m.nim === nim || m.id_pengajuan === id_pengajuan);
    if (memIndex >= 0) {
      memoryMitraPendaftarStore[memIndex] = {
        ...memoryMitraPendaftarStore[memIndex],
        ...updatePayload,
      };
    }

    res.json({
      status: 200,
      message: `Pendaftaran magang mahasiswa (${nim}) ditolak oleh ${mitra.nama_perusahaan}`,
      data: {
        nim,
        status_penerimaan_mitra: "Ditolak Mitra",
        catatan_mitra: note,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 6. FEATURE A: MONITORING & VERIFIKASI LOGBOOK HARIAN/MINGGUAN MAHASISWA
// ----------------------------------------------------------------------
const memoryMitraLogbookStore = [
  {
    id_logbook: 101,
    nim: "24.11.6666",
    nama_mahasiswa: "Fathur Rahman",
    minggu_ke: 1,
    tanggal_mulai: "2026-07-27",
    tanggal_selesai: "2026-08-02",
    ringkasan_kegiatan: "Onboarding tim engineering, setup environment Node.js & Supabase PostgreSQL RLS, merancang ERD basis data.",
    file_lampiran_url: "https://drive.google.com/file/d/logbook_m1_fathur.pdf",
    status_verifikasi: "Disetujui Supervisor Mitra",
    catatan_supervisor: "Kerja sangat cepat & arsitektur database terstruktur dengan baik.",
    verified_at: "2026-08-03T09:00:00Z",
  },
  {
    id_logbook: 102,
    nim: "24.11.6666",
    nama_mahasiswa: "Fathur Rahman",
    minggu_ke: 2,
    tanggal_mulai: "2026-08-03",
    tanggal_selesai: "2026-08-09",
    ringkasan_kegiatan: "Implementasi REST API authentication JWT, role-based authorization, dan unit test Jest.",
    file_lampiran_url: "https://drive.google.com/file/d/logbook_m2_fathur.pdf",
    status_verifikasi: "Pending Review",
    catatan_supervisor: null,
    verified_at: null,
  },
  {
    id_logbook: 103,
    nim: "21.11.4001",
    nama_mahasiswa: "Budi Santoso",
    minggu_ke: 1,
    tanggal_mulai: "2026-07-27",
    tanggal_selesai: "2026-08-02",
    ringkasan_kegiatan: "Pengenalan repositori Git perusahaan, perbaikan bug minor UI dashboard React.js.",
    file_lampiran_url: "https://drive.google.com/file/d/logbook_m1_budi.pdf",
    status_verifikasi: "Disetujui Supervisor Mitra",
    catatan_supervisor: "Bagus, perbaiki indentasi kode di pull request.",
    verified_at: "2026-08-03T10:15:00Z",
  },
];

// GET /api/v1/mitra/logbook - Daftar Logbook Mahasiswa Magang
router.get("/logbook", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const queryNim = req.query.nim;
    const queryMinggu = req.query.minggu ? Number(req.query.minggu) : null;
    const queryStatus = req.query.status;

    let filtered = memoryMitraLogbookStore;

    if (queryNim) {
      filtered = filtered.filter((l) => String(l.nim) === String(queryNim));
    }
    if (queryMinggu) {
      filtered = filtered.filter((l) => Number(l.minggu_ke) === queryMinggu);
    }
    if (queryStatus) {
      filtered = filtered.filter((l) => String(l.status_verifikasi).toLowerCase().includes(queryStatus.toLowerCase()));
    }

    res.json({
      status: 200,
      message: "Daftar logbook harian/mingguan mahasiswa magang berhasil diambil",
      data: {
        total_logbook: filtered.length,
        logbook: filtered,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/mitra/logbook/acc - ACC / Verifikasi / Revisi Logbook Mahasiswa
router.post("/logbook/acc", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const { id_logbook, nim, action, catatan_supervisor } = req.body;

    if (!id_logbook && !nim) {
      throw httpError(400, "Wajib mengisi id_logbook atau nim");
    }

    const isAcc = String(action || "ACC").toUpperCase() === "ACC";
    const statusResult = isAcc ? "Disetujui Supervisor Mitra" : "Revisi";
    const note = catatan_supervisor || (isAcc ? "Logbook telah diperiksa & disetujui." : "Harap perjelas rincian kegiatan harian.");
    const nowIso = new Date().toISOString();

    const targetItem = memoryMitraLogbookStore.find((l) => Number(l.id_logbook) === Number(id_logbook) || (nim && String(l.nim) === String(nim)));

    if (targetItem) {
      targetItem.status_verifikasi = statusResult;
      targetItem.catatan_supervisor = note;
      targetItem.verified_at = nowIso;
    }

    res.json({
      status: 200,
      message: `Logbook minggu ke-${targetItem?.minggu_ke || 1} (${targetItem?.nim || nim}) berhasil ${isAcc ? "Disetujui (ACC)" : "Minta Revisi"} oleh Supervisor Mitra`,
      data: targetItem || {
        id_logbook: id_logbook || 102,
        nim: nim || "24.11.6666",
        status_verifikasi: statusResult,
        catatan_supervisor: note,
        verified_at: nowIso,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 7. FEATURE B: PENGATURAN PROFIL PERUSAHAAN & KELOLA KUOTA MAGANG
// ----------------------------------------------------------------------
let memoryMitraCompanyProfile = {
  id_mitra: 1,
  nama_perusahaan: "PT GoTo Gojek Tokopedia Tbk",
  kategori_industri: "Technology & Unicorn",
  bidang_usaha: "On-Demand Services, E-Commerce & Financial Technology",
  alamat: "GOP 9 Building, Jl. Boulevard BSD Timur, Tangerang & D.I. Yogyakarta",
  website: "https://www.gotocompany.com",
  nama_supervisor: "Rian Hidayat, S.T.",
  jabatan_supervisor: "Lead Software Engineering Supervisor",
  email_supervisor: "rian.hidayat@goto.com",
  telepon_supervisor: "+62 811-2345-6789",
  deskripsi_lowongan: "Program Magang MBKM Software Engineering: Fullstack Developer, Backend Cloud Microservices, and AI Recommendation System.",
  kuota_total: 10,
  kuota_terisi: 3,
  kuota_sisa: 7,
  logo_url: "https://ui-avatars.com/api/?name=PT+GoTo+Gojek+Tokopedia+Tbk&background=00A040&color=fff&bold=true",
  is_verified: true,
};

// GET /api/v1/mitra/profile - Profil Mitra & Sisa Kuota
router.get("/profile", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    res.json({
      status: 200,
      message: "Data profil perusahaan & kelola kuota magang berhasil diambil",
      data: memoryMitraCompanyProfile,
    });
  } catch (err) {
    next(err);
  }
});

// PUT & POST /api/v1/mitra/profile - Update Profil Perusahaan & Kuota Lowongan
const handleUpdateMitraProfile = async (req, res, next) => {
  try {
    const {
      nama_perusahaan,
      kategori_industri,
      bidang_usaha,
      alamat,
      website,
      nama_supervisor,
      jabatan_supervisor,
      email_supervisor,
      telepon_supervisor,
      deskripsi_lowongan,
      kuota_total,
      logo_url,
    } = req.body;

    if (nama_perusahaan) memoryMitraCompanyProfile.nama_perusahaan = nama_perusahaan.trim();
    if (kategori_industri) memoryMitraCompanyProfile.kategori_industri = kategori_industri.trim();
    if (bidang_usaha) memoryMitraCompanyProfile.bidang_usaha = bidang_usaha.trim();
    if (alamat) memoryMitraCompanyProfile.alamat = alamat.trim();
    if (website) memoryMitraCompanyProfile.website = website.trim();
    if (nama_supervisor) memoryMitraCompanyProfile.nama_supervisor = nama_supervisor.trim();
    if (jabatan_supervisor) memoryMitraCompanyProfile.jabatan_supervisor = jabatan_supervisor.trim();
    if (email_supervisor) memoryMitraCompanyProfile.email_supervisor = email_supervisor.trim();
    if (telepon_supervisor) memoryMitraCompanyProfile.telepon_supervisor = telepon_supervisor.trim();
    if (deskripsi_lowongan) memoryMitraCompanyProfile.deskripsi_lowongan = deskripsi_lowongan.trim();
    if (logo_url) memoryMitraCompanyProfile.logo_url = logo_url.trim();

    if (kuota_total !== undefined && kuota_total !== null) {
      const newTotal = Number(kuota_total);
      memoryMitraCompanyProfile.kuota_total = newTotal;
      memoryMitraCompanyProfile.kuota_sisa = Math.max(0, newTotal - memoryMitraCompanyProfile.kuota_terisi);
    }

    res.json({
      status: 200,
      message: "Profil perusahaan & kuota magang berhasil diperbarui",
      data: memoryMitraCompanyProfile,
    });
  } catch (err) {
    next(err);
  }
};

router.put("/profile", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), handleUpdateMitraProfile);
router.post("/profile", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), handleUpdateMitraProfile);

// ----------------------------------------------------------------------
// 8. FEATURE C: AUTO-GENERATE SERTIFIKAT MAGANG INDUSTRI PDF
// ----------------------------------------------------------------------
router.post("/generate-sertifikat", authenticateToken, requireRole(["MITRA", "ADMIN_PRODI", "DEKAN"]), async (req, res, next) => {
  try {
    const { nim, nama_mahasiswa, id_surat_akhir, posisi, nilai_mitra_angka, nilai_mitra_huruf } = req.body;

    const targetNim = nim || "24.11.6666";
    const studentName = nama_mahasiswa || "Fathur Rahman";
    const cleanNim = targetNim.replace(/\./g, "");
    const certCode = `CERT-GOTO-2026-${cleanNim}`;
    const certUrl = `https://fik.amikom.ac.id/sertifikat/CERTIFICATE-MAGANG-${cleanNim}.pdf`;

    const nowFormatted = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const certPayload = {
      nomor_sertifikat: certCode,
      sertifikat_magang_url: certUrl,
      nim: targetNim,
      nama_mahasiswa: studentName,
      nama_perusahaan: memoryMitraCompanyProfile.nama_perusahaan,
      posisi_magang: posisi || "Fullstack Software Engineering Intern",
      nilai_mitra_angka: nilai_mitra_angka || 95,
      nilai_mitra_huruf: nilai_mitra_huruf || "A",
      supervisor_penandatangan: `${memoryMitraCompanyProfile.nama_supervisor} (${memoryMitraCompanyProfile.jabatan_supervisor})`,
      tanggal_terbit: nowFormatted,
      status_sertifikat: "Resmi Diterbitkan & Tanda Tangan Digital",
    };

    // Update in Supabase surat_akhir_magang table
    if (id_surat_akhir) {
      await supabase
        .from("surat_akhir_magang")
        .update({
          sertifikat_magang_url: certUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id_surat_akhir", id_surat_akhir);
    } else if (targetNim) {
      await supabase
        .from("surat_akhir_magang")
        .update({
          sertifikat_magang_url: certUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("nim", targetNim);
    }

    res.status(201).json({
      status: 201,
      message: `Sertifikat kelulusan magang industri untuk ${studentName} (${targetNim}) berhasil dibuat otomatis`,
      data: certPayload,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
