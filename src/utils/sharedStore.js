const memoryStep1Store = [
  {
    id_pengajuan: 6666,
    nim: "24.11.6666",
    id_mitra: 1,
    nidn: "0512038901",
    id_admin: 1,
    nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
    alamat_instansi: "Pasar Daya, Jakarta Selatan",
    tujuan_surat: "Kepada Yth. Head of Engineering PT GoTo",
    jenis_program: "Magang Mandiri",
    posisi: "Fullstack Developer Intern",
    durasi_bulan: 6,
    semester: 6,
    tahun_akademik: "2026/2027",
    status_pengajuan: "Disetujui",
    status_program: "Selesai",
    status_surat_fakultas: "Disetujui",
    id_magang_fakultas: "FIK24116666",
    nomor_layanan_fik: "FIK24116666",
    surat_pengantar_url: "https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK24116666.pdf",
    created_at: "2026-01-30T08:00:00.000Z",
  }
];

const memoryProposalStore = [
  {
    id_proposal: 6666,
    id_pengajuan: 6666,
    nim: "24.11.6666",
    nama_program_kegiatan: "Magang Fullstack Developer BIMA",
    program_diikuti: "Magang Mandiri",
    nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
    alamat_instansi: "Pasar Daya, Jakarta Selatan",
    tujuan_surat: "Kepada Yth. Head of Engineering PT GoTo",
    durasi_pelaksanaan: "6 Bulan",
    tanggal_mulai: "2026-02-01",
    tanggal_selesai: "2026-07-31",
    alasan_mendaftar: "Ingin mengasah keahlian pengembangan aplikasi web skala industri di PT GoTo Gojek Tokopedia Tbk.",
    deskripsi_kegiatan: "Pengembangan fitur microservices, integrasi REST API backend Node.js Express, dan pengelolaan database PostgreSQL Supabase.",
    keahlian_utama: "Software Engineering, Web Development, REST API, Node.js, React.js, PostgreSQL.",
    status_review: "Disetujui Kaprodi",
    catatan_revisi: "Proposal disetujui, rincian objective & CPMK sangat sesuai dengan standar Informatika Amikom.",
    file_proposal_pdf: "https://drive.google.com/file/d/proposal_24_11_6666.pdf",
    created_at: "2026-02-01T08:00:00.000Z",
  },
  {
    id_proposal: 4001,
    id_pengajuan: 1,
    nim: "21.11.4001",
    nama_program_kegiatan: "Magang Software Engineering Google",
    program_diikuti: "Magang Mandiri",
    nama_instansi: "PT Google Indonesia",
    alamat_instansi: "Pacific Century Place, Jakarta",
    tujuan_surat: "Kepada Yth. Lead Engineering Google",
    durasi_pelaksanaan: "6 Bulan",
    tanggal_mulai: "2026-02-01",
    tanggal_selesai: "2026-07-31",
    status_review: "Disetujui Kaprodi",
    catatan_revisi: "Proposal sangat bagus.",
    file_proposal_pdf: "https://drive.google.com/file/d/proposal_21_11_4001.pdf",
    created_at: "2026-02-01T08:00:00.000Z",
  }
];

const memorySuratStore = [
  {
    id_surat: 6666,
    id_pengajuan: 6666,
    id_proposal: 6666,
    nim: "24.11.6666",
    email_mahasiswa: "fathur.6666@students.amikom.ac.id",
    id_magang_fakultas: "FIK24116666",
    tanggal_mulai: "2026-02-01",
    tanggal_selesai: "2026-07-31",
    periode_magang: "6 Bulan",
    nama_instansi: "PT GoTo Gojek Tokopedia Tbk",
    tujuan_surat: "Kepada Yth. Head of HRD PT GoTo Gojek Tokopedia Tbk",
    status_surat: "Disetujui",
    surat_pengantar_url: "https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK24116666.pdf",
    created_at: "2026-02-02T08:00:00.000Z",
  },
  {
    id_surat: 4001,
    id_pengajuan: 1,
    id_proposal: 4001,
    nim: "21.11.4001",
    email_mahasiswa: "budi.santoso@students.amikom.ac.id",
    id_magang_fakultas: "FIK6199382",
    tanggal_mulai: "2026-02-01",
    tanggal_selesai: "2026-07-31",
    periode_magang: "6 Bulan",
    nama_instansi: "PT Google Indonesia",
    status_surat: "Disetujui",
    surat_pengantar_url: "https://fik.amikom.ac.id/surat/SURAT-PENGANTAR-FIK6199382.pdf",
    created_at: "2026-02-02T08:00:00.000Z",
  }
];

const memoryDplStore = [
  {
    id_pengajuan_dpl: 6666,
    nim: "24.11.6666",
    email_mahasiswa: "fathur.6666@students.amikom.ac.id",
    nama_mahasiswa: "Fathur Rahman",
    id_magang_fakultas: "FIK24116666",
    sks_ditempuh: 110,
    bukti_diterima_magang: "https://drive.google.com/bukti_goto_6666.pdf",
    file_khs: "https://drive.google.com/khs_6666.pdf",
    status_pengajuan: "Disetujui",
    nidn_dpl: "0512038901",
    nama_dpl: "Dr. Indah Susanti, M.Kom",
    sk_dpl_url: "https://fik.amikom.ac.id/sk-dpl/SK-DPL-24.11.6666.pdf",
    created_at: "2026-02-03T08:00:00.000Z",
  },
  {
    id_pengajuan_dpl: 4001,
    nim: "21.11.4001",
    email_mahasiswa: "budi.santoso@students.amikom.ac.id",
    nama_mahasiswa: "Budi Santoso",
    id_magang_fakultas: "FIK6199382",
    sks_ditempuh: 112,
    status_pengajuan: "Disetujui",
    nidn_dpl: "0512038901",
    nama_dpl: "Dr. Indah Susanti, M.Kom",
    sk_dpl_url: "https://fik.amikom.ac.id/sk-dpl/SK-DPL-21.11.4001.pdf",
    created_at: "2026-02-03T08:00:00.000Z",
  }
];

const memoryKonversiStore = [
  {
    id_konversi: 6666,
    nim: "24.11.6666",
    mode_input: "AI_RECOMMENDATION",
    total_sks: 20,
    status_konversi: "Disetujui DPL",
    catatan_dosen: "Seluruh 20 SKS usulan konversi disetujui DPL. Capaian CPMK dan objective magang sangat baik.",
    items: [
      { kode_mk: "ST084", nama_mk: "Pemrograman Web", sks: 4, cpmk: "CPMK16-Mahasiswa mampu merancang web app responsif berbasis REST API", objective: "Merancang & mendeploy dashboard React.js responsif.", status_item: "Disetujui DPL", catatan_dosen: "Sangat baik, arsitektur frontend rapi.", nilai_angka: 95, nilai_huruf: "A" },
      { kode_mk: "ST116", nama_mk: "Pemrograman Basis Data", sks: 4, cpmk: "CPMK15-Mahasiswa mampu mengolah database relasional & SQL query", objective: "Mengoptimalkan query PostgreSQL & RLS Policy.", status_item: "Disetujui DPL", catatan_dosen: "Query optimization & indexing sangat bagus.", nilai_angka: 92, nilai_huruf: "A" },
      { kode_mk: "ST091", nama_mk: "Analisis dan Desain Sistem Informasi", sks: 4, cpmk: "CPMK11-Mahasiswa mampu merekayasa perangkat lunak dan analisis proses bisnis", objective: "Menyusun dokumentasi arsitektur sistem & Sequence Diagram.", status_item: "Disetujui DPL", catatan_dosen: "Dokumentasi sangat lengkap.", nilai_angka: 90, nilai_huruf: "A" },
      { kode_mk: "ST055", nama_mk: "Kecerdasan Buatan (Artificial Intelligence)", sks: 4, cpmk: "CPMK12-Mahasiswa mampu menerapkan algoritma machine learning", objective: "Membangun REST API Express.js & integrasi AI recommendation.", status_item: "Disetujui DPL", catatan_dosen: "Integrasi AI sangat canggih.", nilai_angka: 88, nilai_huruf: "A" },
      { kode_mk: "ST062", nama_mk: "Jaringan Komputer dan Cloud", sks: 4, cpmk: "CPMK18-Mahasiswa mampu mengonfigurasi jaringan, DevOps, dan deployment cloud", objective: "Deployment cloud microservices & CI/CD pipeline.", status_item: "Disetujui DPL", catatan_dosen: "CI/CD pipeline berjalan tanpa hambatan.", nilai_angka: 94, nilai_huruf: "A" },
    ],
    created_at: "2026-02-04T08:00:00.000Z",
  }
];

const memorySuratAkhirStore = [
  {
    id_surat_akhir: 6666,
    id_pengajuan: 6666,
    nim: "24.11.6666",
    email: "fathur.6666@students.amikom.ac.id",
    id_magang_fakultas: "FIK24116666",
    tanggal_mulai_magang: "01 Februari 2026",
    tanggal_berakhir_magang: "31 Juli 2026",
    periode_magang: "6 Bulan",
    surat_terima_kasih_url: "https://fik.amikom.ac.id/surat/SURAT-UCAPAN-TERIMA-KASIH-FIK24116666.pdf",
    status_penilaian_mitra: "Sudah Dinilai Mitra",
    nilai_mitra_angka: 95,
    nilai_mitra_huruf: "A",
    catatan_mitra: "Fathur Rahman berkinerja luar biasa, proaktif, disiplin, dan mahir menguasai REST API, microservices Node.js, dan database PostgreSQL.",
    sertifikat_magang_url: "https://drive.google.com/file/d/sertifikat_goto_24_11_6666.pdf",
    created_at: "2026-02-05T08:00:00.000Z",
  }
];

const memorySemesterStore = new Set();

module.exports = {
  memoryStep1Store,
  memoryProposalStore,
  memorySuratStore,
  memoryDplStore,
  memoryKonversiStore,
  memorySuratAkhirStore,
  memorySemesterStore,
};
