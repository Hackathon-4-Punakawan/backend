const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "unika_secret_key_2026_hackathon";

/**
 * Middleware to verify JWT Token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Akses ditolak: Token autentikasi tidak ditemukan" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token autentikasi tidak valid atau kedaluwarsa" });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware factory for Role-Based Access Control (RBAC)
 * @param {Array<string>} roles Allowed roles (e.g. ['ADMIN_PRODI'], ['DPL', 'ADMIN_PRODI'])
 */
function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Autentikasi diperlukan" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Akses ditolak: Peran '${req.user.role}' tidak memiliki hak akses untuk resource ini`,
      });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole,
};
