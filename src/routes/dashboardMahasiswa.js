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
} = require("../utils/sharedStore");

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

function getInitials(nameStr) {
  if (!nameStr) return "SW";
  const clean = nameStr.replace(/^(Prof\.|Dr\.|Drs\.|M\.Kom|M\.T\.|S\.T\.|,\s*)/gi, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (words[0] ? words[0].substring(0, 2) : "SW").toUpperCase();
}

async function getMahasiswaDashboard(req, res, next) {
  try {
    const userId = req.user?.userId;
    const queryNim = req.query?.nim;

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

    if (!mhs && queryNim) {
      const { data: fetchMhs } = await supabase
        .from("mahasiswa")
        .select("*")
        .eq("nim", queryNim)
        .maybeSingle();
      if (fetchMhs) mhs = fetchMhs;
    }

    // Default fallback to 24.11.6666 or 21.11.4001 if no user found
    const targetNim = mhs ? mhs.nim : (queryNim || req.user?.nim || "24.11.6666");

    if (!mhs) {
      mhs = {
        nim: targetNim,
        nama: targetNim === "24.11.6666" ? "Fathur Rahman" : "Budi Santoso",
        prodi: "Informatika",
        angkatan: targetNim === "24.11.6666" ? "2024" : "2021",
        email: targetNim === "24.11.6666" ? "fathur.6666@students.amikom.ac.id" : "budi.santoso@students.amikom.ac.id",
        foto_profile: `https://ui-avatars.com/api/?name=${encodeURIComponent(targetNim === "24.11.6666" ? "Fathur Rahman" : "Budi Santoso")}&background=4f46e5&color=fff&bold=true`,
      };
    }

    // 1. Fetch Step 1 (Pengajuan Magang / FIK)
    let step1Data = null;
    const { data: dbStep1 } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("nim", targetNim)
      .order("created_at", { ascending: false });
    if (dbStep1 && dbStep1.length > 0) step1Data = dbStep1[0];

    if (!step1Data) {
      const mem1 = memoryStep1Store.find((s) => String(s.nim || "") === String(targetNim));
      if (mem1) step1Data = mem1;
    }

    // 2. Fetch Step 2 (Proposal Magang)
    let step2Data = null;
    const { data: dbStep2 } = await supabase
      .from("proposal_magang")
      .select("*")
      .eq("nim", targetNim)
      .order("created_at", { ascending: false });
    if (dbStep2 && dbStep2.length > 0) step2Data = dbStep2[0];

    if (!step2Data) {
      const mem2 = memoryProposalStore.find((p) => String(p.nim || "") === String(targetNim));
      if (mem2) step2Data = mem2;
    }

    // 3. Fetch Step 3 (Surat Pengantar Magang)
    let step3Data = null;
    let { data: dbStep3 } = await supabase
      .from("pengajuan_surat_pengantar")
      .select("*")
      .eq("nim", targetNim)
      .order("created_at", { ascending: false });
    if (!dbStep3 || dbStep3.length === 0) {
      const { data: dbStep3Alt } = await supabase
        .from("surat_pengantar_magang")
        .select("*")
        .eq("nim", targetNim)
        .order("created_at", { ascending: false });
      if (dbStep3Alt && dbStep3Alt.length > 0) dbStep3 = dbStep3Alt;
    }
    if (dbStep3 && dbStep3.length > 0) step3Data = dbStep3[0];

    if (!step3Data) {
      const mem3 = memorySuratStore.find((s) => String(s.nim || "") === String(targetNim));
      if (mem3) step3Data = mem3;
    }

    // 4. Fetch Step 4 (Pengajuan DPL)
    let step4Data = null;
    const { data: dbStep4 } = await supabase
      .from("pengajuan_dpl")
      .select("*")
      .eq("nim", targetNim)
      .order("created_at", { ascending: false });
    if (dbStep4 && dbStep4.length > 0) step4Data = dbStep4[0];

    if (!step4Data) {
      const mem4 = memoryDplStore.find((d) => String(d.nim || "") === String(targetNim));
      if (mem4) step4Data = mem4;
    }

    // 5. Fetch Step 5 (Konversi SKS Header & Detail)
    let step5Header = null;
    let step5Items = [];
    const { data: dbHeader } = await supabase
      .from("pengajuan_konversi_matkul")
      .select("*")
      .eq("nim", targetNim)
      .order("created_at", { ascending: false });
    if (dbHeader && dbHeader.length > 0) {
      step5Header = dbHeader[0];
      const { data: dbDetails } = await supabase
        .from("item_konversi_detail")
        .select("*")
        .eq("id_konversi", step5Header.id_konversi);
      if (dbDetails && dbDetails.length > 0) {
        step5Items = dbDetails;
      }
    }

    if (!step5Header) {
      const mem5 = memoryKonversiStore.find((k) => String(k.nim || "") === String(targetNim));
      if (mem5) {
        step5Header = mem5;
        step5Items = mem5.items || [];
      }
    }

    // 6. Fetch Step 6 (Surat Akhir & Terima Kasih)
    let step6Data = null;
    const { data: dbStep6 } = await supabase
      .from("surat_akhir_magang")
      .select("*")
      .eq("nim", targetNim)
      .order("created_at", { ascending: false });
    if (dbStep6 && dbStep6.length > 0) step6Data = dbStep6[0];

    if (!step6Data) {
      const mem6 = memorySuratAkhirStore.find((s) => String(s.nim || "") === String(targetNim));
      if (mem6) step6Data = mem6;
    }

    // DPL Profile Lookup
    let dplProfile = {
      nidn: step4Data?.nidn_dpl || "0512038901",
      nama: step4Data?.nama_dpl || "Dr. Indah Susanti, M.Kom",
      role_tag: "DOSEN INFORMATIKA",
      bidang_keahlian: "Software Engineering & Web Dev",
      email: "indah.susanti@amikom.ac.id",
      telepon: "+62 812-3456-7890",
      foto_profile: "https://ui-avatars.com/api/?name=Dr.+Indah+Susanti%2C+M.Kom&background=0284c7&color=fff&bold=true",
      inisial: getInitials(step4Data?.nama_dpl || "Dr. Indah Susanti, M.Kom"),
    };

    if (step4Data?.nidn_dpl) {
      const { data: dbDosen } = await supabase
        .from("dosen_pembimbing")
        .select("*")
        .eq("nidn", step4Data.nidn_dpl)
        .maybeSingle();
      if (dbDosen) {
        dplProfile = {
          nidn: dbDosen.nidn,
          nama: dbDosen.nama,
          role_tag: "DOSEN INFORMATIKA",
          bidang_keahlian: dbDosen.bidang_keahlian || "Software Engineering & Web Dev",
          email: dbDosen.email || "dosen@amikom.ac.id",
          telepon: dbDosen.telepon || "+62 812-3456-7890",
          foto_profile: dbDosen.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(dbDosen.nama)}&background=0284c7&color=fff&bold=true`,
          inisial: getInitials(dbDosen.nama),
        };
      }
    }

    // Calculate Hero Metrics & Targets
    const mkDiajukanCount = step5Items.length || 5;
    const disetujuiKaprodiCount = step2Data?.status_review?.includes("Disetujui") ? mkDiajukanCount : mkDiajukanCount;
    const isDplApproved = step5Header?.status_konversi?.includes("Disetujui") || step5Items.every((i) => i.status_item?.includes("Disetujui"));
    const prosesDosenCount = isDplApproved ? 0 : mkDiajukanCount;

    const totalSksUsulan = step5Header?.total_sks || (mkDiajukanCount * 4);
    const totalSksDisetujui = isDplApproved ? totalSksUsulan : 0;
    const percentage = totalSksUsulan > 0 ? Math.round((totalSksDisetujui / totalSksUsulan) * 100) : 0;

    const namaInstansi = step1Data?.nama_instansi || step2Data?.nama_instansi || "PT GoTo Gojek Tokopedia Tbk";
    const jenisProgram = step2Data?.program_diikuti || step1Data?.jenis_program || "Magang Mandiri";
    const durasiMagang = step3Data?.periode_magang || step2Data?.durasi_pelaksanaan || "6 Bulan";

    let heroStatusBadge = "SELESAI VALIDASI";
    if (!isDplApproved && step5Header) heroStatusBadge = "MENUNGGU REVIEW DOSEN";
    if (!step5Header) heroStatusBadge = "PROSES PENGAJUAN";

    // Format Table Rows
    const tableRows = step5Items.map((item) => ({
      kode_mk: item.kode_mk,
      nama_mk: item.nama_mk || item.kode_mk,
      mk_label: `${item.kode_mk} - ${item.nama_mk || item.kode_mk}`,
      sks: item.sks || 4,
      objective: item.objective || item.modul_industri || "-",
      nilai_angka: item.nilai_angka !== undefined && item.nilai_angka !== null ? item.nilai_angka : null,
      nilai_huruf: item.nilai_huruf || calculateGradeLetter(item.nilai_angka),
      status: item.status_item || (isDplApproved ? "Disetujui DPL" : "Menunggu Review DPL"),
      catatan_dosen: item.catatan_dosen || null,
    }));

    // Format Progress per MK Card Items
    const progressPerMk = tableRows.map((row) => ({
      kode_mk: row.kode_mk,
      nama_mk: row.nama_mk,
      sks: row.sks,
      status: row.status,
      progress_percent: row.status.includes("Disetujui") ? 100 : 50,
      color: row.status.includes("Disetujui") ? "green" : "purple",
    }));

    // Format Surat Akhir Card Data
    const tglMulai = step3Data?.tanggal_mulai || step2Data?.tanggal_mulai || "2026-07-27";
    const tglSelesai = step3Data?.tanggal_selesai || step3Data?.tanggal_berakhir || step2Data?.tanggal_selesai || "2026-12-27";

    const isSuratAkhirSubmitted = !!step6Data;
    let suratAkhirBadge = "SIAP AJUKAN";
    if (step6Data?.status_penilaian_mitra === "Sudah Dinilai Mitra") suratAkhirBadge = "SUDAH DINILAI MITRA";
    else if (step6Data) suratAkhirBadge = "SUDAH DIAJUKAN";

    const suratAkhirCard = {
      judul: "PENGAJUAN SURAT AKHIR DAN UCAPAN TERIMA KASIH MAGANG MAHASISWA FAKULTAS ILMU KOMPUTER",
      deskripsi: "Pengajuan administrasi akhir setelah selesai melaksanakan program magang.",
      badge_status: suratAkhirBadge,
      email: mhs.email,
      periode_magang: durasiMagang,
      tanggal_mulai_magang: tglMulai,
      tanggal_berakhir_magang: tglSelesai,
      is_submitted: isSuratAkhirSubmitted,
      surat_terima_kasih_url: step6Data?.surat_terima_kasih_url || `https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-FIK24116666.pdf`,
      nilai_mitra_angka: step6Data?.nilai_mitra_angka || null,
      nilai_mitra_huruf: step6Data?.nilai_mitra_huruf || null,
      catatan_mitra: step6Data?.catatan_mitra || null,
      sertifikat_magang_url: step6Data?.sertifikat_magang_url || null,
      action_button: {
        label: isSuratAkhirSubmitted ? "Surat Akhir & Terima Kasih Telah Diajukan" : "+ Kirim Pengajuan Surat Akhir & Ucapan Terima Kasih",
        is_enabled: !isSuratAkhirSubmitted,
      },
    };

    res.json({
      status: 200,
      message: "Data Dashboard Mahasiswa berhasil diambil",
      data: {
        mahasiswa: {
          nim: mhs.nim,
          nama: mhs.nama,
          email: mhs.email,
          prodi: mhs.prodi || "Informatika",
          angkatan: mhs.angkatan || "2024",
          foto_profile: mhs.foto_profile,
        },
        hero_card: {
          status_badge: heroStatusBadge,
          jenis_program: jenisProgram,
          nama_instansi: namaInstansi,
          target_konversi: {
            disetujui_sks: totalSksDisetujui,
            target_sks: totalSksUsulan,
            persentase: percentage,
            label: `Target Konversi ${totalSksDisetujui} / ${totalSksUsulan} SKS`,
            tercapai_label: `${percentage}% Tercapai`,
          },
          metrics: {
            mk_diajukan: mkDiajukanCount,
            disetujui_kaprodi: disetujuiKaprodiCount,
            proses_dosen: prosesDosenCount,
            durasi_magang: durasiMagang,
          },
        },
        dosen_pembimbing: dplProfile,
        surat_akhir_terima_kasih: suratAkhirCard,
        progress_konversi_mk: {
          judul: "Progress Konversi per Mata Kuliah",
          deskripsi: "Pantau tahapan validasi untuk setiap mata kuliah.",
          items: progressPerMk,
        },
        status_konversi_table: {
          judul: "Status Konversi Mata Kuliah",
          deskripsi: "Detail pemetaan modul Industri ke mata kuliah universitas.",
          action_button: "Simpan Nilai",
          rows: tableRows,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

router.get("/dashboard", authenticateToken, getMahasiswaDashboard);
router.get("/overview", authenticateToken, getMahasiswaDashboard);

module.exports = {
  router,
  getMahasiswaDashboard,
};
