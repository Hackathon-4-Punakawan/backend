const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { sendCredentialEmail } = require("../services/mailer");

const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateRequired(body, required) {
  const missing = required.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
  if (missing.length) throw httpError(400, `Field wajib: ${missing.join(", ")}`);
}

function generateRandomPassword(prefix = "Unika#") {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomDigits}`;
}

// All admin routes require valid Admin JWT Token
router.use(authenticateToken, requireRole(["ADMIN_PRODI"]));

// 1. CREATE DPL ACCOUNT & SEND EMAIL CREDENTIALS
router.post("/create-dpl", async (req, res, next) => {
  try {
    validateRequired(req.body, ["nidn", "nama", "email"]);

    const nidn = req.body.nidn.trim();
    const nama = req.body.nama.trim();
    const email = req.body.email.trim().toLowerCase();
    const foto_profile = req.body.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=0284c7&color=fff&bold=true`;

    // Check duplicate user email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) throw httpError(409, "Email sudah terdaftar dalam sistem");

    // Check duplicate NIDN
    const { data: existingDpl } = await supabase
      .from("dosen_pembimbing")
      .select("nidn")
      .eq("nidn", nidn)
      .maybeSingle();

    if (existingDpl) throw httpError(409, "NIDN Dosen sudah terdaftar dalam sistem");

    // Generate random secure password & hash
    const rawPassword = req.body.custom_password || generateRandomPassword("Dosen#");
    const password_hash = await bcrypt.hash(rawPassword, 10);

    // 1. Create master user
    const { data: user, error: errUser } = await supabase
      .from("users")
      .insert({
        email,
        password_hash,
        role: "DPL",
        is_active: true,
      })
      .select()
      .single();

    if (errUser) throw httpError(400, errUser.message);

    // 2. Create dosen_pembimbing record
    const { data: dpl, error: errDpl } = await supabase
      .from("dosen_pembimbing")
      .insert({
        nidn,
        user_id: user.id,
        nama,
        email,
        foto_profile,
        is_active: true,
      })
      .select()
      .single();

    if (errDpl) {
      await supabase.from("users").delete().eq("id", user.id);
      throw httpError(400, errDpl.message);
    }

    // 3. Trigger Automated Email Credentials Mailer Engine
    await sendCredentialEmail({
      email,
      password: rawPassword,
      role: "DPL",
      name: nama,
    });

    res.status(201).json({
      message: "Akun DPL berhasil dibuat & kredensial telah dikirim via email",
      data: {
        ...dpl,
        user_id: user.id,
        temporary_password: rawPassword,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. CREATE MITRA SUPERVISOR ACCOUNT & SEND EMAIL CREDENTIALS
router.post("/create-mitra", async (req, res, next) => {
  try {
    validateRequired(req.body, ["nama_perusahaan", "nama_supervisor", "email"]);

    const nama_perusahaan = req.body.nama_perusahaan.trim();
    const nama_supervisor = req.body.nama_supervisor.trim();
    const email = req.body.email.trim().toLowerCase();
    const bidang_usaha = req.body.bidang_usaha ? req.body.bidang_usaha.trim() : null;

    // Check duplicate user email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) throw httpError(409, "Email supervisor sudah terdaftar dalam sistem");

    // Generate random secure password & hash
    const rawPassword = req.body.custom_password || generateRandomPassword("Mtr#");
    const password_hash = await bcrypt.hash(rawPassword, 10);

    // 1. Create master user
    const { data: user, error: errUser } = await supabase
      .from("users")
      .insert({
        email,
        password_hash,
        role: "MITRA",
        is_active: true,
      })
      .select()
      .single();

    if (errUser) throw httpError(400, errUser.message);

    // 2. Create mitra_industri record
    const { data: mitra, error: errMitra } = await supabase
      .from("mitra_industri")
      .insert({
        user_id: user.id,
        nama_perusahaan,
        nama_supervisor,
        email_supervisor: email,
        kategori_industri: req.body.kategori_industri || "Technology",
        bidang_usaha,
        kontak_pic: req.body.kontak_pic || email,
      })
      .select()
      .single();

    if (errMitra) {
      await supabase.from("users").delete().eq("id", user.id);
      throw httpError(400, errMitra.message);
    }

    // 3. Trigger Automated Email Credentials Mailer Engine
    await sendCredentialEmail({
      email,
      password: rawPassword,
      role: "MITRA",
      name: `${nama_supervisor} (${nama_perusahaan})`,
    });

    res.status(201).json({
      message: "Akun Mitra Industri berhasil dibuat & kredensial telah dikirim via email",
      data: {
        ...mitra,
        user_id: user.id,
        temporary_password: rawPassword,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
