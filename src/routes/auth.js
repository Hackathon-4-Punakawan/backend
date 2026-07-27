const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { JWT_SECRET, authenticateToken } = require("../middleware/auth");

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

// 1. REGISTER MAHASISWA (SELF-REGISTRATION)
router.post("/register-mahasiswa", async (req, res, next) => {
  try {
    validateRequired(req.body, ["nim", "nama", "email", "password"]);

    const email = req.body.email.trim().toLowerCase();
    const nim = req.body.nim.trim();
    const nama = req.body.nama.trim();
    const password = req.body.password;
    const prodi = req.body.prodi ? req.body.prodi.trim() : "Informatika";
    const foto_profile = req.body.foto_profile || `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=4f46e5&color=fff&bold=true`;

    if (password.length < 6) {
      throw httpError(400, "Password minimal 6 karakter");
    }

    // Check existing email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      throw httpError(409, "Email sudah terdaftar dalam sistem");
    }

    // Check existing NIM
    const { data: existingMhs } = await supabase
      .from("mahasiswa")
      .select("nim")
      .eq("nim", nim)
      .maybeSingle();

    if (existingMhs) {
      throw httpError(409, "NIM sudah terdaftar dalam sistem");
    }

    // Auto-extract angkatan from first 2 digits of NIM (e.g. 24.11.4005 -> 2024)
    let angkatan = req.body.angkatan ? req.body.angkatan.trim() : "";
    if (!angkatan) {
      const matchNim = nim.match(/^(\d{2})/);
      if (matchNim) {
        angkatan = (2000 + Number.parseInt(matchNim[1], 10)).toString();
      } else {
        angkatan = new Date().getFullYear().toString();
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user entry
    const { data: user, error: errUser } = await supabase
      .from("users")
      .insert({
        email,
        password_hash,
        role: "MAHASISWA",
        is_active: true,
      })
      .select()
      .single();

    if (errUser) throw httpError(400, errUser.message);

    // Create mahasiswa entry
    const { data: mhs, error: errMhs } = await supabase
      .from("mahasiswa")
      .insert({
        nim,
        user_id: user.id,
        nama,
        prodi,
        angkatan,
        email,
        foto_profile,
      })
      .select()
      .single();

    if (errMhs) {
      // Rollback user if mahasiswa creation fails
      await supabase.from("users").delete().eq("id", user.id);
      throw httpError(400, errMhs.message);
    }

    // Generate JWT Token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      nim: mhs.nim,
      nama: mhs.nama,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      message: "Registrasi mahasiswa berhasil",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: mhs,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. LOGIN (PUBLIC - ALL ROLES)
router.post("/login", async (req, res, next) => {
  try {
    const identifier = (
      req.body.identifier ||
      req.body.email_or_identifier ||
      req.body.email ||
      req.body.nim ||
      req.body.nidn ||
      ""
    ).trim();
    const password = req.body.password;

    if (!identifier || !password) {
      throw httpError(400, "Identifier (NIM / NIDN / Email) dan password wajib diisi");
    }

    let targetEmail = identifier.toLowerCase();

    // Check if identifier is NIM
    if (!identifier.includes("@")) {
      const { data: mhs } = await supabase
        .from("mahasiswa")
        .select("email")
        .eq("nim", identifier)
        .maybeSingle();

      if (mhs) {
        targetEmail = mhs.email;
      } else {
        // Check if identifier is NIDN
        const { data: dpl } = await supabase
          .from("dosen_pembimbing")
          .select("email")
          .eq("nidn", identifier)
          .maybeSingle();
        if (dpl) targetEmail = dpl.email;
      }
    }

    // Find master user
    const { data: user, error: errUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", targetEmail)
      .maybeSingle();

    if (errUser || !user) {
      throw httpError(401, "Email, NIM/NIDN, atau password tidak valid");
    }

    if (!user.is_active) {
      throw httpError(403, "Akun Anda telah dinonaktifkan. Silakan hubungi Admin Prodi");
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw httpError(401, "Email, NIM/NIDN, atau password tidak valid");
    }

    // Fetch linked profile detail based on role
    let profile = null;
    if (user.role === "MAHASISWA") {
      const { data: p } = await supabase.from("mahasiswa").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    } else if (user.role === "DPL") {
      const { data: p } = await supabase.from("dosen_pembimbing").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    } else if (user.role === "MITRA") {
      const { data: p } = await supabase.from("mitra_industri").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    } else if (user.role === "ADMIN_PRODI") {
      const { data: p } = await supabase.from("admin_kaprodi").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    }

    // Create JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      profileId: profile ? (profile.nim || profile.nidn || profile.id_mitra || profile.id_admin) : null,
      name: profile ? profile.nama || profile.nama_perusahaan : "User",
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET LOGGED IN USER PROFILE (/me)
router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role, is_active, created_at")
      .eq("id", req.user.userId)
      .maybeSingle();

    if (error || !user) throw httpError(404, "User tidak ditemukan");

    let profile = null;
    if (user.role === "MAHASISWA") {
      const { data: p } = await supabase.from("mahasiswa").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    } else if (user.role === "DPL") {
      const { data: p } = await supabase.from("dosen_pembimbing").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    } else if (user.role === "MITRA") {
      const { data: p } = await supabase.from("mitra_industri").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    } else if (user.role === "ADMIN_PRODI") {
      const { data: p } = await supabase.from("admin_kaprodi").select("*").eq("user_id", user.id).maybeSingle();
      profile = p;
    }

    res.json({
      data: {
        ...user,
        profile,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
