const express = require("express");
const router = express.Router();

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// KNOWLEDGE BASE MATA KULIAH & CPMK INFORMATIKA AMIKOM (OBE CURRICULUM)
const KNOWLEDGE_BASE_CPMK = [
  {
    id: "IF184523",
    code: "IF184523",
    name: "Pengembangan Aplikasi Web Lanjut",
    sks: 4,
    cpmk: "Mampu merancang dan mengimplementasikan arsitektur web modern yang scalable, secure, dan berkinerja tinggi.",
    keywords: ["web", "api", "rest", "backend", "frontend", "express", "react", "vue", "node", "javascript", "typescript", "laravel", "php", "html", "css", "database", "crud", "http", "microservices", "next.js", "bootstrap", "tailwind"]
  },
  {
    id: "IF184524",
    code: "IF184524",
    name: "Manajemen Proyek Perangkat Lunak",
    sks: 3,
    cpmk: "Mampu merencanakan, mengelola, dan memantau daur hidup pengembangan software mengadopsi metodologi Agile/Scrum.",
    keywords: ["agile", "scrum", "manajemen", "proyek", "sprint", "jira", "trello", "sdlc", "tim", "koordinasi", "product owner", "scrum master", "backlog", "kanban", "timeline", "estimasi"]
  },
  {
    id: "IF184525",
    code: "IF184525",
    name: "Keamanan Sistem Informasi",
    sks: 3,
    cpmk: "Mampu menganalisis kerentanan keamanan, mengimplementasikan pengujian penetrasi (pen-test), serta protokol enkripsi data.",
    keywords: ["security", "keamanan", "cyber", "penetrasi", "pentest", "enkripsi", "vulnerability", "auth", "jwt", "ssl", "tls", "firewall", "owasp", "hacker", "audit", "proteksi"]
  },
  {
    id: "IF184526",
    code: "IF184526",
    name: "Pembelajaran Mesin (Machine Learning)",
    sks: 4,
    cpmk: "Mampu membangun, melatih, dan mengevaluasi model prediktif cerdas berbasis data menggunakan algoritma Machine Learning.",
    keywords: ["machine learning", "ml", "python", "model", "prediktif", "klasifikasi", "regresi", "clustering", "pandas", "numpy", "scikit-learn", "tensorflow", "pytorch", "dataset", "training"]
  },
  {
    id: "IF184527",
    code: "IF184527",
    name: "Kecerdasan Buatan (AI)",
    sks: 3,
    cpmk: "Mampu mendesain agen cerdas dan solusi otomasi menggunakan pemrosesan bahasa alami (NLP) atau komputer visi.",
    keywords: ["ai", "artificial intelligence", "nlp", "vision", "cv", "computer vision", "yolo", "opencv", "gemini", "gpt", "llm", "deep learning", "neural network", "kecerdasan buatan", "bot", "prompt"]
  },
  {
    id: "IF184528",
    code: "IF184528",
    name: "Desain UI/UX & Interaksi",
    sks: 3,
    cpmk: "Mampu merancang wireframe, murni pengalaman pengguna (UX), dan antarmuka interaktif (UI) berstandar usabilitas tinggi.",
    keywords: ["ui", "ux", "figma", "wireframe", "prototype", "design", "desain", "user experience", "user interface", "usability", "design system", "mockup", "interaction", "user testing"]
  },
  {
    id: "ST165",
    code: "ST165",
    name: "Proyek Pemrograman Mobile",
    sks: 4,
    cpmk: "Mampu mengembangkan aplikasi mobile Android/iOS yang responsif dan terintegrasi dengan RESTful Service.",
    keywords: ["mobile", "android", "ios", "flutter", "react native", "swift", "kotlin", "apk", "app store", "play store", "dart", "mobile app"]
  },
  {
    id: "ST167",
    code: "ST167",
    name: "Proyek Data Mining & Analytics",
    sks: 4,
    cpmk: "Mampu mengolah big data, membangun pipeline ETL, serta memvisualisasikan insight bisnis berbasis data.",
    keywords: ["data mining", "etl", "data warehouse", "big data", "bi", "business intelligence", "sql", "tableau", "power bi", "dashboard", "analytics", "visualisasi"]
  }
];

// POST /api/v1/ai/suggest-cpmk
router.post("/suggest-cpmk", async (req, res, next) => {
  try {
    const { aktivitas, deskripsi } = req.body;
    const text = String(aktivitas || deskripsi || "").toLowerCase().trim();

    if (!text || text.length < 3) {
      throw httpError(400, "Teks deskripsi aktivitas magang wajib disertakan minimal 3 karakter.");
    }

    const scored = KNOWLEDGE_BASE_CPMK.map((item) => {
      let matchCount = 0;
      const matchedWords = [];

      item.keywords.forEach((kw) => {
        if (text.includes(kw)) {
          matchCount += 1;
          matchedWords.push(kw);
        }
      });

      // Calculate confidence score (range 72% - 98%)
      let score = 70 + matchCount * 9;
      if (score > 98) score = 98;
      if (matchCount === 0) score = 65;

      return {
        ...item,
        confidence_score: score,
        match_count: matchCount,
        matched_keywords: matchedWords,
        reasoning: matchCount > 0
          ? `Aktivitas magang mengandung kata kunci terdeteksi: [${matchedWords.join(", ")}]. Sangat cocok dengan target CPMK ini.`
          : `Rekomendasi berbasis rumpun keahlian umum Kurikulum OBE Informatika Amikom.`
      };
    });

    // Sort by confidence score descending
    scored.sort((a, b) => b.confidence_score - a.confidence_score);

    // Take top 3 recommendations
    const recommendations = scored.slice(0, 3);

    res.json({
      status: 200,
      message: "Rekomendasi CPMK & Mata Kuliah berbasis AI berhasil dianalisis",
      data: {
        query_text: text,
        total_recommendations: recommendations.length,
        best_match: recommendations[0],
        recommendations
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
