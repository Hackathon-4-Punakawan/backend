const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, `${cleanName}_${uniqueSuffix}${ext}`);
  }
});

// File Filter (Accept PDF and images)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file format PDF, PNG, atau JPG yang diperbolehkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB Max Limit
  fileFilter: fileFilter
});

// POST /api/v1/upload (Single File Upload)
router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada file yang diunggah. Harap pilih file PDF terlebih dahulu.'
      });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: 'File PDF berhasil diunggah ke server!',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl,
        relativePath: `/uploads/${req.file.filename}`
      }
    });
  } catch (error) {
    console.error('Error handling upload:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengunggah file PDF.'
    });
  }
});

module.exports = router;
