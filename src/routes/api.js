const crypto = require("crypto");
const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

const resources = [
  { path: "mahasiswa", table: "mahasiswa", id: "nim", fields: ["nim", "nama", "prodi", "angkatan", "email", "foto_profile"], required: ["nim", "nama", "prodi", "email"] },
  { path: "dosen-pembimbing", table: "dosen_pembimbing", id: "nidn", fields: ["nidn", "nama", "bidang_keahlian", "email", "foto_profile", "is_active"], required: ["nidn", "nama", "email"] },
  { path: "mitra-industri", table: "mitra_industri", id: "id_mitra", fields: ["nama_perusahaan", "kategori_industri", "bidang_usaha", "kontak_pic"], required: ["nama_perusahaan"] },
  { path: "admin-kaprodi", table: "admin_kaprodi", id: "id_admin", fields: ["nama", "jabatan", "email"], required: ["nama", "jabatan", "email"] },
  { path: "mata-kuliah", table: "mata_kuliah", id: "kode_mk", fields: ["kode_mk", "nama_mk", "sks", "semester"], required: ["kode_mk", "nama_mk", "sks"] },
  { path: "cpl-cpmk", table: "cpl_cpmk", id: "id_cpl", fields: ["kode_cpl", "kategori", "nama_kompetensi", "deskripsi", "bobot_persen"], required: ["kode_cpl", "kategori", "nama_kompetensi"] },
  { path: "pemetaan-cpl-mk", table: "pemetaan_cpl_mk", id: "id_pemetaan", fields: ["kode_mk", "id_cpl"], required: ["kode_mk", "id_cpl"] },
  { path: "pengajuan-magang", table: "pengajuan_magang", id: "id_pengajuan", fields: ["nim", "id_mitra", "nidn", "id_admin", "nama_supervisor_mitra", "email_supervisor_mitra", "jenis_program", "posisi", "durasi_bulan", "tanggal_mulai", "tanggal_selesai", "file_proposal_magang", "file_bukti_diterima", "status_pengajuan", "status_program"], required: ["nim", "jenis_program", "posisi"] },
  { path: "item-konversi", table: "item_konversi_mk", id: "id_item_konversi", fields: ["id_pengajuan", "kode_mk", "id_cpl", "aktivitas_magang", "bukti_aktivitas", "file_laporan_magang", "file_sertifikat_magang", "status_usulan", "status_klaim", "catatan_dosen", "nilai_mitra", "komentar_mitra", "tanggal_penilaian_mitra", "nilai_dpl", "catatan_dpl", "tanggal_penilaian_dpl", "nilai_akhir_angka", "nilai_akhir_huruf"], required: ["id_pengajuan", "kode_mk"] },
  { path: "logbook", table: "logbook_mingguan", id: "id_logbook", fields: ["id_pengajuan", "minggu_ke", "periode_mulai", "periode_selesai", "total_jam", "kompetensi_utama", "aktivitas_utama", "kendala_solusi", "umpan_balik_mentor", "status_verifikasi"], required: ["id_pengajuan", "minggu_ke"] },
  { path: "dokumen-pendukung", table: "dokumen_pendukung", id: "id_dokumen", fields: ["id_pengajuan", "id_logbook", "jenis_dokumen", "file_path"], required: ["id_pengajuan", "jenis_dokumen", "file_path"] },
  { path: "evaluasi-mitra", table: "evaluasi_mitra", id: "id_evaluasi", fields: ["id_pengajuan", "periode_evaluasi", "status_draf", "skor_total"], required: ["id_pengajuan", "periode_evaluasi"] },
  { path: "detail-skor-cpl", table: "detail_skor_cpl", id: "id_detail", fields: ["id_evaluasi", "id_cpl", "skor"], required: ["id_evaluasi", "id_cpl", "skor"] },
  { path: "chat-rooms", table: "chat_room", id: "id_room", fields: ["nim_mahasiswa", "nidn_dosen", "id_pengajuan", "jenis_room"], required: ["id_pengajuan"] },
  { path: "chat-messages", table: "chat_message", id: "id_message", fields: ["id_room", "sender_email", "sender_role", "pesan", "attachment_url", "is_read"], required: ["id_room", "sender_email", "sender_role", "pesan"] },
  { path: "notifikasi", table: "notifikasi", id: "id_notifikasi", fields: ["receiver_email", "judul", "pesan", "is_read"], required: ["receiver_email", "judul", "pesan"] },
  { path: "approval-tokens", table: "approval_tokens", id: "id_token", fields: ["token", "target_type", "id_pengajuan", "email_recipient", "expires_at", "is_used"], required: ["target_type", "id_pengajuan", "email_recipient", "expires_at"] },
];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateRequired(body, required) {
  const missing = required.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) throw httpError(400, `Field wajib: ${missing.join(", ")}`);
}

function pickFields(body, allowed) {
  const result = {};
  for (const field of allowed) {
    if (body[field] !== undefined) {
      result[field] = body[field];
    }
  }
  return result;
}

function gradeLetter(score) {
  if (score >= 80) return "A";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "E";
}

// GENERIC CRUD ROUTES USING SUPABASE CLIENT SDK
for (const resource of resources) {
  const base = `/${resource.path}`;

  // GET LIST
  router.get(base, async (req, res, next) => {
    try {
      const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
      const offset = (page - 1) * limit;

      let query = supabase.from(resource.table).select("*", { count: "exact" });

      for (const field of resource.fields) {
        if (req.query[field] !== undefined) {
          query = query.eq(field, req.query[field]);
        }
      }

      const { data, count, error } = await query
        .order(resource.id, { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw httpError(400, error.message);

      res.json({
        data: data || [],
        meta: { page, limit, total: count || 0 },
      });
    } catch (err) {
      next(err);
    }
  });

  // POST CREATE
  router.post(base, async (req, res, next) => {
    try {
      if (resource.table === "approval_tokens" && !req.body.token) {
        req.body.token = crypto.randomBytes(32).toString("hex");
      }
      validateRequired(req.body, resource.required);
      const payload = pickFields(req.body, resource.fields);

      const { data, error } = await supabase.from(resource.table).insert(payload).select().single();
      if (error) throw httpError(400, error.message);

      res.status(201).json({ data });
    } catch (err) {
      next(err);
    }
  });

  // GET BY ID
  router.get(`${base}/:id`, async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from(resource.table)
        .select("*")
        .eq(resource.id, req.params.id)
        .maybeSingle();

      if (error) throw httpError(400, error.message);
      if (!data) throw httpError(404, "Data tidak ditemukan");

      res.json({ data });
    } catch (err) {
      next(err);
    }
  });

  // PATCH UPDATE
  router.patch(`${base}/:id`, async (req, res, next) => {
    try {
      const updatableFields = resource.fields.filter((f) => f !== resource.id);
      const payload = pickFields(req.body, updatableFields);
      if (Object.keys(payload).length === 0) {
        throw httpError(400, "Tidak ada field yang dapat diperbarui");
      }

      if (resource.table === "item_konversi_mk" || resource.table === "chat_room") {
        payload.updated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from(resource.table)
        .update(payload)
        .eq(resource.id, req.params.id)
        .select()
        .maybeSingle();

      if (error) throw httpError(400, error.message);
      if (!data) throw httpError(404, "Data tidak ditemukan");

      res.json({ data });
    } catch (err) {
      next(err);
    }
  });

  // DELETE BY ID
  router.delete(`${base}/:id`, async (req, res, next) => {
    try {
      const { data, error } = await supabase
        .from(resource.table)
        .delete()
        .eq(resource.id, req.params.id)
        .select()
        .maybeSingle();

      if (error) throw httpError(400, error.message);
      if (!data) throw httpError(404, "Data tidak ditemukan");

      res.json({ message: "Data berhasil dihapus", data });
    } catch (err) {
      next(err);
    }
  });
}

// CUSTOM WORKFLOW ENDPOINTS

// 1. Submit Pengajuan
router.post("/pengajuan-magang/:id/submit", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("pengajuan_magang")
      .update({ status_pengajuan: "Menunggu Verifikasi" })
      .eq("id_pengajuan", req.params.id)
      .eq("status_pengajuan", "Draft")
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(409, "Hanya pengajuan Draft yang dapat dikirim");

    res.json({ message: "Pengajuan berhasil dikirim", data });
  } catch (err) {
    next(err);
  }
});

// 2. Approve Pengajuan (Kaprodi / Admin)
router.post("/pengajuan-magang/:id/approve", async (req, res, next) => {
  try {
    validateRequired(req.body, ["nidn", "id_admin"]);
    const { data, error } = await supabase
      .from("pengajuan_magang")
      .update({
        status_pengajuan: "Disetujui",
        nidn: req.body.nidn,
        id_admin: req.body.id_admin,
      })
      .eq("id_pengajuan", req.params.id)
      .eq("status_pengajuan", "Menunggu Verifikasi")
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(409, "Pengajuan tidak berada pada status Menunggu Verifikasi");

    res.json({ message: "Pengajuan disetujui", data });
  } catch (err) {
    next(err);
  }
});

// 3. Reject Pengajuan
router.post("/pengajuan-magang/:id/reject", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("pengajuan_magang")
      .update({ status_pengajuan: "Ditolak" })
      .eq("id_pengajuan", req.params.id)
      .eq("status_pengajuan", "Menunggu Verifikasi")
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(409, "Pengajuan tidak berada pada status Menunggu Verifikasi");

    res.json({ message: "Pengajuan ditolak", reason: req.body.reason || null, data });
  } catch (err) {
    next(err);
  }
});

// 4. Complete Program Magang
router.post("/pengajuan-magang/:id/complete", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("pengajuan_magang")
      .update({ status_program: "Selesai" })
      .eq("id_pengajuan", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(404, "Pengajuan tidak ditemukan");

    res.json({ message: "Program magang diselesaikan", data });
  } catch (err) {
    next(err);
  }
});

// 5. Progress Tracking Pengajuan
router.get("/pengajuan-magang/:id/progress", async (req, res, next) => {
  try {
    const { data: pengajuan, error: errP } = await supabase
      .from("pengajuan_magang")
      .select("*")
      .eq("id_pengajuan", req.params.id)
      .maybeSingle();

    if (errP) throw httpError(400, errP.message);
    if (!pengajuan) throw httpError(404, "Pengajuan tidak ditemukan");

    const { count: total_logbook } = await supabase
      .from("logbook_mingguan")
      .select("*", { count: "exact", head: true })
      .eq("id_pengajuan", req.params.id);

    const { count: logbook_terverifikasi } = await supabase
      .from("logbook_mingguan")
      .select("*", { count: "exact", head: true })
      .eq("id_pengajuan", req.params.id)
      .eq("status_verifikasi", "Disetujui");

    const { count: total_konversi } = await supabase
      .from("item_konversi_mk")
      .select("*", { count: "exact", head: true })
      .eq("id_pengajuan", req.params.id);

    const { count: konversi_disetujui } = await supabase
      .from("item_konversi_mk")
      .select("*", { count: "exact", head: true })
      .eq("id_pengajuan", req.params.id)
      .eq("status_klaim", "Disetujui");

    const { count: evaluasi_terkirim } = await supabase
      .from("evaluasi_mitra")
      .select("*", { count: "exact", head: true })
      .eq("id_pengajuan", req.params.id)
      .eq("status_draf", "Kirim");

    res.json({
      data: {
        ...pengajuan,
        total_logbook: total_logbook || 0,
        logbook_terverifikasi: logbook_terverifikasi || 0,
        total_konversi: total_konversi || 0,
        konversi_disetujui: konversi_disetujui || 0,
        evaluasi_terkirim: evaluasi_terkirim || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 6. Proposal Approve DPL
router.post("/item-konversi/:id/proposal/approve", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("item_konversi_mk")
      .update({
        status_usulan: "Disetujui DPL",
        catatan_dosen: req.body.catatan_dosen || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id_item_konversi", req.params.id)
      .eq("status_usulan", "Menunggu Persetujuan DPL")
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(409, "Usulan tidak dapat disetujui pada status saat ini");

    res.json({ message: "Usulan disetujui DPL", data });
  } catch (err) {
    next(err);
  }
});

// 7. Proposal Reject DPL
router.post("/item-konversi/:id/proposal/reject", async (req, res, next) => {
  try {
    validateRequired(req.body, ["catatan_dosen"]);
    const { data, error } = await supabase
      .from("item_konversi_mk")
      .update({
        status_usulan: "Ditolak",
        catatan_dosen: req.body.catatan_dosen,
        updated_at: new Date().toISOString(),
      })
      .eq("id_item_konversi", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(404, "Item konversi tidak ditemukan");

    res.json({ message: "Usulan ditolak", data });
  } catch (err) {
    next(err);
  }
});

// 8. Penilaian Mitra (70%)
router.post("/item-konversi/:id/mitra-assessment", async (req, res, next) => {
  try {
    validateRequired(req.body, ["nilai_mitra"]);
    const score = Number(req.body.nilai_mitra);
    if (isNaN(score) || score < 0 || score > 100) throw httpError(422, "Nilai mitra harus antara 0 dan 100");

    const { data, error } = await supabase
      .from("item_konversi_mk")
      .update({
        nilai_mitra: score,
        komentar_mitra: req.body.komentar_mitra || null,
        tanggal_penilaian_mitra: new Date().toISOString(),
        status_klaim: "Menunggu Review DPL",
        updated_at: new Date().toISOString(),
      })
      .eq("id_item_konversi", req.params.id)
      .eq("status_usulan", "Disetujui DPL")
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(409, "Usulan harus disetujui DPL sebelum dinilai mitra");

    res.json({ message: "Penilaian mitra tersimpan", data });
  } catch (err) {
    next(err);
  }
});

// 9. DPL Request Revision
router.post("/item-konversi/:id/request-revision", async (req, res, next) => {
  try {
    validateRequired(req.body, ["catatan_dpl"]);
    const { data, error } = await supabase
      .from("item_konversi_mk")
      .update({
        status_klaim: "Minta Revisi",
        catatan_dpl: req.body.catatan_dpl,
        updated_at: new Date().toISOString(),
      })
      .eq("id_item_konversi", req.params.id)
      .eq("status_klaim", "Menunggu Review DPL")
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(409, "Klaim tidak dapat direvisi pada status saat ini");

    res.json({ message: "Revisi diminta", data });
  } catch (err) {
    next(err);
  }
});

// 10. DPL Assessment & Final Grade Calculation (70% Mitra + 30% DPL)
router.post("/item-konversi/:id/dpl-assessment", async (req, res, next) => {
  try {
    validateRequired(req.body, ["nilai_dpl"]);
    const score = Number(req.body.nilai_dpl);
    if (isNaN(score) || score < 0 || score > 100) throw httpError(422, "Nilai DPL harus antara 0 dan 100");

    // Fetch current item to get nilai_mitra
    const { data: current, error: errFetch } = await supabase
      .from("item_konversi_mk")
      .select("*")
      .eq("id_item_konversi", req.params.id)
      .maybeSingle();

    if (errFetch) throw httpError(400, errFetch.message);
    if (!current) throw httpError(404, "Item konversi tidak ditemukan");
    if (current.nilai_mitra === null || current.nilai_mitra === undefined) {
      throw httpError(409, "Penilaian mitra belum tersedia");
    }

    const finalScore = Number((current.nilai_mitra * 0.7 + score * 0.3).toFixed(2));
    const letter = gradeLetter(finalScore);

    const { data, error } = await supabase
      .from("item_konversi_mk")
      .update({
        nilai_dpl: score,
        catatan_dpl: req.body.catatan_dpl || null,
        tanggal_penilaian_dpl: new Date().toISOString(),
        nilai_akhir_angka: finalScore,
        nilai_akhir_huruf: letter,
        status_klaim: "Disetujui",
        updated_at: new Date().toISOString(),
      })
      .eq("id_item_konversi", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);

    res.json({ message: "Nilai akhir berhasil dihitung", data });
  } catch (err) {
    next(err);
  }
});

// 11. Logbook Verify
router.post("/logbook/:id/verify", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("logbook_mingguan")
      .update({
        status_verifikasi: "Disetujui",
        umpan_balik_mentor: req.body.umpan_balik_mentor || null,
      })
      .eq("id_logbook", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(404, "Logbook tidak ditemukan");

    res.json({ message: "Logbook terverifikasi", data });
  } catch (err) {
    next(err);
  }
});

// 12. Logbook Reject
router.post("/logbook/:id/reject", async (req, res, next) => {
  try {
    validateRequired(req.body, ["umpan_balik_mentor"]);
    const { data, error } = await supabase
      .from("logbook_mingguan")
      .update({
        status_verifikasi: "Ditolak",
        umpan_balik_mentor: req.body.umpan_balik_mentor,
      })
      .eq("id_logbook", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(404, "Logbook tidak ditemukan");

    res.json({ message: "Logbook ditolak", data });
  } catch (err) {
    next(err);
  }
});

// 13. Evaluasi Mitra - Update Skor CPL
router.put("/evaluasi-mitra/:id/skor-cpl", async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.scores) || !req.body.scores.length) {
      throw httpError(400, "scores harus berupa array dan tidak boleh kosong");
    }

    const { data: evaluation, error: errEval } = await supabase
      .from("evaluasi_mitra")
      .select("*")
      .eq("id_evaluasi", req.params.id)
      .eq("status_draf", "Draf")
      .maybeSingle();

    if (errEval) throw httpError(400, errEval.message);
    if (!evaluation) throw httpError(409, "Evaluasi tidak ditemukan atau sudah dikirim");

    // Delete existing scores
    await supabase.from("detail_skor_cpl").delete().eq("id_evaluasi", req.params.id);

    const insertedRows = [];
    for (const item of req.body.scores) {
      const score = Number(item.skor);
      if (!item.id_cpl || isNaN(score) || score < 0 || score > 100) {
        throw httpError(422, "Setiap skor membutuhkan id_cpl dan nilai 0-100");
      }
      const { data, error } = await supabase
        .from("detail_skor_cpl")
        .insert({ id_evaluasi: req.params.id, id_cpl: item.id_cpl, skor: score })
        .select()
        .single();

      if (error) throw httpError(400, error.message);
      insertedRows.push(data);
    }

    res.json({ message: "Detail skor berhasil disimpan", data: insertedRows });
  } catch (err) {
    next(err);
  }
});

// 14. Evaluasi Mitra - Submit
router.post("/evaluasi-mitra/:id/submit", async (req, res, next) => {
  try {
    const { data: scores, error: errScores } = await supabase
      .from("detail_skor_cpl")
      .select("skor, cpl_cpmk(bobot_persen)")
      .eq("id_evaluasi", req.params.id);

    if (errScores) throw httpError(400, errScores.message);
    if (!scores || !scores.length) throw httpError(409, "Detail skor CPL belum diisi");

    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const s of scores) {
      const weight = s.cpl_cpmk?.bobot_persen || 1;
      totalWeightedScore += s.skor * weight;
      totalWeight += weight;
    }
    const finalSkorTotal = Number((totalWeightedScore / (totalWeight || 1)).toFixed(2));

    const { data, error } = await supabase
      .from("evaluasi_mitra")
      .update({
        status_draf: "Kirim",
        skor_total: finalSkorTotal,
        tanggal_evaluasi: new Date().toISOString(),
      })
      .eq("id_evaluasi", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);

    res.json({ message: "Evaluasi berhasil dikirim", data });
  } catch (err) {
    next(err);
  }
});

// 15. Evaluasi Mitra - Get Hasil
router.get("/evaluasi-mitra/:id/hasil", async (req, res, next) => {
  try {
    const { data: evaluation, error: errEval } = await supabase
      .from("evaluasi_mitra")
      .select("*")
      .eq("id_evaluasi", req.params.id)
      .maybeSingle();

    if (errEval) throw httpError(400, errEval.message);
    if (!evaluation) throw httpError(404, "Evaluasi tidak ditemukan");

    const { data: scores, error: errScores } = await supabase
      .from("detail_skor_cpl")
      .select("*, cpl_cpmk(kode_cpl, nama_kompetensi, bobot_persen)")
      .eq("id_evaluasi", req.params.id);

    if (errScores) throw httpError(400, errScores.message);

    res.json({ data: { ...evaluation, scores: scores || [] } });
  } catch (err) {
    next(err);
  }
});

// 16. Chat Room Messages
router.get("/chat/rooms/:id/messages", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("chat_message")
      .select("*")
      .eq("id_room", req.params.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw httpError(400, error.message);
    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

router.post("/chat/rooms/:id/messages", async (req, res, next) => {
  try {
    validateRequired(req.body, ["sender_email", "sender_role", "pesan"]);
    const { data, error } = await supabase
      .from("chat_message")
      .insert({
        id_room: req.params.id,
        sender_email: req.body.sender_email,
        sender_role: req.body.sender_role,
        pesan: req.body.pesan,
        attachment_url: req.body.attachment_url || null,
      })
      .select()
      .single();

    if (error) throw httpError(400, error.message);
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/chat/rooms/:id/read", async (req, res, next) => {
  try {
    let query = supabase.from("chat_message").update({ is_read: true }).eq("id_room", req.params.id);
    if (req.body.reader_email) {
      query = query.neq("sender_email", req.body.reader_email);
    }
    const { data, error } = await query.select("id_message");
    if (error) throw httpError(400, error.message);
    res.json({ message: "Pesan ditandai sudah dibaca", updated: data ? data.length : 0 });
  } catch (err) {
    next(err);
  }
});

// 17. Notifikasi Read
router.patch("/notifikasi/:id/read", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("notifikasi")
      .update({ is_read: true })
      .eq("id_notifikasi", req.params.id)
      .select()
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(404, "Notifikasi tidak ditemukan");

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/notifikasi/read-all", async (req, res, next) => {
  try {
    validateRequired(req.body, ["receiver_email"]);
    const { data, error } = await supabase
      .from("notifikasi")
      .update({ is_read: true })
      .eq("receiver_email", req.body.receiver_email)
      .eq("is_read", false)
      .select("id_notifikasi");

    if (error) throw httpError(400, error.message);
    res.json({ message: "Semua notifikasi ditandai sudah dibaca", updated: data ? data.length : 0 });
  } catch (err) {
    next(err);
  }
});

// 18. Approval Magic Link Tokens (Tanpa Login)
router.get("/approval/:token", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("approval_tokens")
      .select("id_token, target_type, id_pengajuan, email_recipient, expires_at, pengajuan_magang(jenis_program, posisi, nama_supervisor_mitra)")
      .eq("token", req.params.token)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(404, "Token tidak valid, sudah digunakan, atau kedaluwarsa");

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post("/approval/:token/use", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("approval_tokens")
      .update({ is_used: true })
      .eq("token", req.params.token)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .select("id_token, target_type, id_pengajuan, email_recipient")
      .maybeSingle();

    if (error) throw httpError(400, error.message);
    if (!data) throw httpError(409, "Token tidak valid, sudah digunakan, atau kedaluwarsa");

    res.json({ message: "Token approval berhasil digunakan", data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
