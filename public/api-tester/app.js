const endpointCatalog = [
  ["System", "GET", "/health", "Health check"],
  
  // AUTENTIKASI & USER MANAGEMENT
  ["Autentikasi", "POST", "/api/v1/auth/register-mahasiswa", "Registrasi Mahasiswa Mandiri", { nim: "21.11.4005", nama: "Rizky Ramadhan", email: "rizky.ramadhan@students.amikom.ac.id", password: "Password123" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login Mahasiswa (NIM)", { identifier: "21.11.4001", password: "Budi#1234" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login DPL (NIDN)", { identifier: "0512038901", password: "Dosen#1234" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login Mitra (Email)", { identifier: "rian.hidayat@goto.com", password: "Mtr#1234" }],
  ["Autentikasi", "POST", "/api/v1/auth/login", "Login Admin Kaprodi", { identifier: "kaprodi.if@amikom.ac.id", password: "Admin#1234" }],
  ["Autentikasi", "GET", "/api/v1/auth/me", "Profil User Aktif (/me)"],

  // ADMIN MANAGEMENT (SEND EMAIL CREDENTIALS)
  ["Admin", "POST", "/api/v1/admin/create-dpl", "Tambah DPL & Send Email (Admin Only)", { nidn: "0519049003", nama: "Fitriani, M.T.", email: "fitriani@amikom.ac.id", bidang_keahlian: "Cloud Infrastructure" }],
  ["Admin", "POST", "/api/v1/admin/create-mitra", "Tambah Mitra & Send Email (Admin Only)", { nama_perusahaan: "PT Bukalapak.com Tbk", nama_supervisor: "Hendra Wijaya", email: "hendra.wijaya@bukalapak.com", bidang_usaha: "E-Commerce" }],

  // MASTER & DATA ENTITIES
  ["Master", "GET", "/api/v1/mahasiswa", "Daftar mahasiswa"],
  ["Master", "POST", "/api/v1/mahasiswa", "Tambah mahasiswa", { nim: "21.11.4004", nama: "Nama Mahasiswa", email: "mahasiswa@example.com" }],
  ["Master", "GET", "/api/v1/dosen-pembimbing", "Daftar dosen"],
  ["Master", "GET", "/api/v1/mitra-industri", "Daftar mitra"],
  ["Master", "GET", "/api/v1/admin-kaprodi", "Daftar admin"],
  
  // AKADEMIK & OBE
  ["Akademik", "GET", "/api/v1/mata-kuliah", "Daftar mata kuliah (Amikom Data)"],
  ["Akademik", "POST", "/api/v1/mata-kuliah", "Tambah mata kuliah", { kode_mk: "ST999", nama_mk: "Contoh Mata Kuliah", sks: 2, semester: 6 }],
  ["Akademik", "GET", "/api/v1/cpl-cpmk", "Daftar CPL/CPMK"],
  ["Akademik", "GET", "/api/v1/pemetaan-cpl-mk", "Pemetaan CPL dan MK"],
  
  // PENGAJUAN & KONVERSI
  ["Pengajuan", "GET", "/api/v1/pengajuan-magang", "Daftar pengajuan"],
  ["Pengajuan", "POST", "/api/v1/pengajuan-magang", "Buat pengajuan", { nim: "21.11.4001", id_mitra: 1, jenis_program: "Magang Mandiri", posisi: "Backend Developer", durasi_bulan: 6 }],
  ["Pengajuan", "GET", "/api/v1/pengajuan-magang/1/progress", "Progress pengajuan"],
  ["Pengajuan", "POST", "/api/v1/pengajuan-magang/1/submit", "Kirim pengajuan", {}],
  ["Pengajuan", "POST", "/api/v1/pengajuan-magang/1/approve", "Setujui pengajuan", { nidn: "0512038901", id_admin: 1 }],
  
  // KONVERSI & PENILAIAN (70:30)
  ["Konversi", "GET", "/api/v1/item-konversi", "Daftar item konversi"],
  ["Konversi", "POST", "/api/v1/item-konversi/1/proposal/approve", "Approve usulan DPL", { catatan_dosen: "Sesuai dengan CPMK" }],
  ["Konversi", "POST", "/api/v1/item-konversi/1/mitra-assessment", "Penilaian mitra (70%)", { nilai_mitra: 90, komentar_mitra: "Kinerja sangat baik" }],
  ["Konversi", "POST", "/api/v1/item-konversi/1/dpl-assessment", "Penilaian final DPL (30%)", { nilai_dpl: 85, catatan_dpl: "Capaian sangat baik" }],
  
  // LOGBOOK
  ["Logbook", "GET", "/api/v1/logbook", "Daftar logbook"],
  ["Logbook", "POST", "/api/v1/logbook", "Tambah logbook", { id_pengajuan: 1, minggu_ke: 1, total_jam: 40, aktivitas_utama: "Pengembangan REST API" }],
  ["Logbook", "POST", "/api/v1/logbook/1/verify", "Verifikasi logbook", { umpan_balik_mentor: "Aktivitas sesuai" }],
  
  // EVALUASI
  ["Evaluasi", "GET", "/api/v1/evaluasi-mitra", "Daftar evaluasi"],
  ["Evaluasi", "PUT", "/api/v1/evaluasi-mitra/1/skor-cpl", "Isi skor CPL", { scores: [{ id_cpl: 1, skor: 90 }, { id_cpl: 2, skor: 85 }] }],
  ["Evaluasi", "POST", "/api/v1/evaluasi-mitra/1/submit", "Kirim evaluasi", {}],
  
  // DOKUMEN & CHAT
  ["Dokumen", "GET", "/api/v1/dokumen-pendukung", "Daftar dokumen"],
  ["Chat", "GET", "/api/v1/chat-rooms", "Daftar chat room"],
  ["Chat", "GET", "/api/v1/chat/rooms/1/messages", "Riwayat pesan"],
  ["Chat", "POST", "/api/v1/chat/rooms/1/messages", "Kirim pesan", { sender_email: "budi.santoso@students.amikom.ac.id", sender_role: "Mahasiswa", pesan: "Mohon review logbook saya." }],
  ["Notifikasi", "GET", "/api/v1/notifikasi", "Daftar notifikasi"],
  ["Notifikasi", "PATCH", "/api/v1/notifikasi/1/read", "Tandai dibaca", {}],
  ["Approval", "GET", "/api/v1/approval-tokens", "Daftar token approval"],
  ["Approval", "GET", "/api/v1/approval/tok_mitra_goto_8f91a2", "Validasi magic link"],
];

const elements = Object.fromEntries(
  ["base-url", "status", "search", "endpoint-list", "method", "path", "body", "send", "format", "request-error", "response", "response-meta", "copy"].map((id) => [
    id,
    document.getElementById(id),
  ])
);
elements["base-url"].value = window.location.origin;

function renderCatalog(query = "") {
  const needle = query.toLowerCase();
  const filtered = endpointCatalog.filter((item) => item.slice(0, 4).join(" ").toLowerCase().includes(needle));
  const groups = Object.groupBy ? Object.groupBy(filtered, (item) => item[0]) : filtered.reduce((all, item) => ((all[item[0]] ||= []).push(item), all), {});
  elements["endpoint-list"].replaceChildren();
  for (const [group, endpoints] of Object.entries(groups)) {
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group;
    elements["endpoint-list"].append(title);
    for (const endpoint of endpoints) {
      const button = document.createElement("button");
      button.className = "endpoint";
      button.innerHTML = `<span class="verb ${endpoint[1]}">${endpoint[1]}</span><span class="endpoint-path"></span><span class="endpoint-name"></span>`;
      button.querySelector(".endpoint-path").textContent = endpoint[2];
      button.querySelector(".endpoint-name").textContent = endpoint[3];
      button.addEventListener("click", () => selectEndpoint(endpoint, button));
      elements["endpoint-list"].append(button);
    }
  }
}

function selectEndpoint(endpoint, button) {
  document.querySelectorAll(".endpoint.active").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  elements.method.value = endpoint[1];
  elements.path.value = endpoint[2];
  elements.body.value = endpoint[4] === undefined ? "" : JSON.stringify(endpoint[4], null, 2);
  elements.body.disabled = ["GET", "DELETE"].includes(endpoint[1]);
  elements["request-error"].textContent = "";
}

async function sendRequest() {
  elements["request-error"].textContent = "";
  let payload;
  if (elements.body.value.trim() && !elements.body.disabled) {
    try {
      JSON.parse(elements.body.value);
      payload = elements.body.value;
    } catch (error) {
      elements["request-error"].textContent = `JSON tidak valid: ${error.message}`;
      return;
    }
  }
  if (elements.method.value === "DELETE" && !window.confirm("Endpoint DELETE dapat menghapus data. Lanjutkan?")) return;

  const url = new URL(elements.path.value, elements["base-url"].value).toString();
  const started = performance.now();
  elements.send.disabled = true;
  elements.send.textContent = "Sending...";

  // Retrieve stored JWT Token
  const token = localStorage.getItem("unika_token");
  const headers = { Accept: "application/json" };
  if (payload) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      method: elements.method.value,
      headers,
      body: payload,
    });
    const text = await response.text();
    let output = text;
    try {
      const parsed = JSON.parse(text);
      output = JSON.stringify(parsed, null, 2);

      // Auto save JWT Token to localStorage on Login / Register success
      if (response.ok && parsed.token) {
        localStorage.setItem("unika_token", parsed.token);
      }
    } catch (_) {}

    const elapsed = Math.round(performance.now() - started);
    elements.response.textContent = output || "(empty response)";
    elements["response-meta"].textContent = `${response.status} ${response.statusText} · ${elapsed} ms · ${new Blob([text]).size} B`;
    elements.status.textContent = response.ok ? "online" : "api error";
    elements.status.className = `status ${response.ok ? "online" : "offline"}`;
  } catch (error) {
    elements.response.textContent = error.stack || error.message;
    elements["response-meta"].textContent = "Network error";
    elements.status.textContent = "offline";
    elements.status.className = "status offline";
  } finally {
    elements.send.disabled = false;
    elements.send.textContent = "Send Request ⌘↵";
  }
}

elements.search.addEventListener("input", (e) => renderCatalog(e.target.value));
elements.send.addEventListener("click", sendRequest);
elements.format.addEventListener("click", () => {
  if (!elements.body.value.trim() || elements.body.disabled) return;
  try {
    elements.body.value = JSON.stringify(JSON.parse(elements.body.value), null, 2);
    elements["request-error"].textContent = "";
  } catch (err) {
    elements["request-error"].textContent = `Format JSON gagal: ${err.message}`;
  }
});

elements.copy.addEventListener("click", async () => {
  if (!elements.response.textContent) return;
  await navigator.clipboard.writeText(elements.response.textContent);
  elements.copy.textContent = "Copied!";
  setTimeout(() => (elements.copy.textContent = "Copy"), 1500);
});

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    sendRequest();
  }
});

renderCatalog();
