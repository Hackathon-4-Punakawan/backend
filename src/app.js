require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRouter = require("./routes/api");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  req.body ||= {};
  next();
});
app.use("/api-tester", express.static(path.join(__dirname, "../public/api-tester")));

app.get("/", (req, res) => {
  res.json({
    message: "Konversi Amikom API is running",
    api: "/api/v1",
    tester: "/api-tester/",
  });
});

app.get("/health", async (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/v1", apiRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint tidak ditemukan" });
});

app.use((error, req, res, next) => {
  console.error(error);

  const databaseErrors = {
    23502: [400, "Field wajib belum diisi"],
    23503: [409, "Data masih digunakan atau referensi tidak ditemukan"],
    23505: [409, "Data duplikat"],
    23514: [422, "Data tidak memenuhi constraint"],
    "22P02": [400, "Format parameter tidak valid"],
  };
  const [status, message] = databaseErrors[error.code] || [error.status || 500, error.message || "Terjadi kesalahan server"];

  res.status(status).json({ error: message });
});

module.exports = app;
