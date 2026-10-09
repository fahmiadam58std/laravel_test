/*
 * ============================================================================
 *  DATA LAYANAN CHATBOT DUKCAPIL KABUPATEN CIREBON
 * ============================================================================
 *  File ini HANYA berisi data. Aman diedit oleh non-programmer.
 *
 *  Aturan singkat mengedit:
 *  - Teks selalu diapit tanda kutip "...". Jika di dalam teks perlu tanda kutip,
 *    pakai kutip tunggal '...' atau tulis \" .
 *  - Setiap item dalam daftar [ ... ] dipisah koma.
 *  - Teks di antara **dua bintang** akan tampil tebal (bold).
 *  - Setelah mengedit, buka halaman situs dan coba chatbot-nya. Jika chatbot
 *    tidak muncul, biasanya ada koma/kutip yang kurang. Buka Console browser
 *    (F12) untuk melihat baris yang salah.
 *
 *  Struktur satu layanan:
 *    {
 *      id:        kode unik (jangan diubah, dipakai mesin pencocok kata kunci),
 *      nama:      nama layanan,
 *      chip:      label tombol pilihan cepat,
 *      ringkasan: (opsional) penjelasan satu kalimat,
 *      syarat:    daftar persyaratan (tampil sebagai bullet),
 *      langkah:   daftar { ke: "tujuan", aksi: "yang dilakukan" }
 *                 tampil sebagai: "1. Ke <tujuan>: <aksi>",
 *      catatan:   daftar catatan tambahan,
 *      biaya:     teks biaya,
 *      terkait:   (opsional) id layanan/topik lain untuk tombol lanjutan,
 *      kataKunci: (opsional) kata kunci TAMBAHAN agar pertanyaan warga dikenali,
 *                 contoh: ["surat keterangan lahir"]
 *    }
 *
 *  Nilai "ke" yang umum dipakai:
 *    "Desa/Kelurahan" | "Kecamatan" | "Loket Disdukcapil" | "Faskes/RS/Bidan"
 *    | "Kepolisian" | "Operator Disdukcapil"
 * ============================================================================
 */
window.DUKCAPIL_KB = {
  instansi: "Disdukcapil Kabupaten Cirebon",

  /* ---------- Kontak resmi ---------- */
  kontak: {
    telp: "085194268118",
    email: "info@dukcapil.go.id",
    alamat: "Jl. Sunan Muria No. 4, Kel. Sumber, Cirebon 45611"
  },

  /* ---------- Jam layanan ---------- */
  jam: "Senin-Jumat 08.00-15.30 WIB",
  jamTutup: "Sabtu, Minggu, dan hari libur: tutup.",
  catatanJam: "Jam dapat berubah, konfirmasi dulu ke 085194268118.",

  /* ---------- Kanal layanan ---------- */
  kanal: [
    "Datang langsung ke kantor Disdukcapil atau kantor kecamatan.",
    "Layanan keliling **Kudu Nglayap** setiap hari Sabtu ke desa-desa.",
    "Layanan digital melalui aplikasi **IKD** (Identitas Kependudukan Digital)."
  ],

  /* ---------- Catatan wajib sebelum menemui petugas ---------- */
  catatanIkd:
    "Sebelum menemui petugas, sebaiknya Anda sudah memiliki akun IKD " +
    "(Identitas Kependudukan Digital) terlebih dahulu. Silakan unduh aplikasinya di " +
    "Play Store atau App Store.",

  /* ---------- IKD (KTP digital) ---------- */
  ikd: {
    nama: "IKD (Identitas Kependudukan Digital)",
    ringkasan: "KTP-el versi digital di ponsel Anda, resmi dari Dukcapil.",
    langkah: [
      { ke: "Play Store / App Store", aksi: "Unduh aplikasi Identitas Kependudukan Digital (IKD)" },
      { ke: "Aplikasi IKD", aksi: "Isi NIK, alamat email, dan nomor HP yang aktif" },
      { ke: "Operator Disdukcapil", aksi: "Aktivasi akun dengan scan kode QR bersama petugas" }
    ],
    catatan: ["Aktivasi wajib dilakukan bersama petugas (tidak bisa mandiri sepenuhnya)."]
  },

  /* ---------- Biaya ---------- */
  biaya: {
    teks: "Semua layanan administrasi kependudukan di Disdukcapil Kabupaten Cirebon **GRATIS** (tidak dipungut biaya).",
    catatan: "Jika ada oknum memungut biaya, laporkan ke pemda setempat."
  },

  /* ---------- Tombol pilihan cepat saat chat pertama dibuka ---------- */
  menuAwal: ["ktp", "kk", "kia", "lahir", "mati", "jamlokasi", "ikd"],

  /* ---------- Daftar layanan ---------- */
  layanan: [
    {
      id: "ktp",
      nama: "KTP-el",
      chip: "KTP-el",
      ringkasan: "Wajib untuk warga 17 tahun ke atas atau yang sudah/pernah menikah.",
      syarat: [
        "Sudah melakukan perekaman biometrik",
        "Fotokopi Kartu Keluarga (KK)",
        "Jika hilang: surat kehilangan dari kepolisian",
        "Jika rusak: KTP-el lama"
      ],
      langkah: [
        { ke: "Kecamatan/Loket Disdukcapil", aksi: "Lakukan perekaman biometrik (foto, sidik jari, iris) bila belum pernah" },
        { ke: "Loket Disdukcapil", aksi: "Serahkan fotokopi KK, petugas memverifikasi data" },
        { ke: "Operator Disdukcapil", aksi: "Data diproses dan KTP-el dicetak. Bila blangko kosong, diberi Surat Keterangan (Suket) pengganti sementara" }
      ],
      catatan: ["Tanpa surat pengantar RT/RW"],
      biaya: "Gratis",
      terkait: ["ikd", "kk"]
    },
    {
      id: "kk",
      nama: "Kartu Keluarga",
      chip: "Kartu Keluarga",
      syarat: [
        "KK lama (untuk perubahan data)",
        "Dokumen pendukung: akta kelahiran / buku nikah / akta perceraian / ijazah sesuai keperluan",
        "Jika hilang: surat kehilangan dari kepolisian + fotokopi KTP-el"
      ],
      langkah: [
        { ke: "RT/RW & Desa/Kelurahan", aksi: "Minta surat pengantar domisili (HANYA jika belum punya NIK/KTP-el)" },
        { ke: "Loket Disdukcapil", aksi: "Serahkan berkas, petugas memverifikasi" },
        { ke: "Operator Disdukcapil", aksi: "Data dientri, KK baru diterbitkan dan ditandatangani pejabat" }
      ],
      catatan: ["Jika sudah punya KTP-el, tidak perlu surat pengantar RT/RW"],
      biaya: "Gratis",
      terkait: ["ktp", "lahir", "pindah"]
    },
    {
      id: "kia",
      nama: "KIA (Kartu Identitas Anak)",
      chip: "KIA",
      ringkasan: "Identitas resmi anak di bawah 17 tahun.",
      syarat: [
        "Fotokopi akta kelahiran anak",
        "Fotokopi KK",
        "Fotokopi KTP-el kedua orang tua",
        "Pas foto anak (khusus usia di atas 5 tahun)"
      ],
      langkah: [
        { ke: "Loket Disdukcapil/Kecamatan", aksi: "Serahkan berkas persyaratan" },
        { ke: "Operator Disdukcapil", aksi: "Verifikasi berkas dan pencetakan KIA" }
      ],
      catatan: ["Anak di bawah 5 tahun bisa diterbitkan bersamaan dengan akta kelahiran"],
      biaya: "Gratis",
      terkait: ["lahir", "kk"]
    },
    {
      id: "lahir",
      nama: "Akta Kelahiran",
      chip: "Akta Kelahiran",
      syarat: [
        "Surat keterangan lahir dari RS/bidan/faskes/desa",
        "Fotokopi KK orang tua",
        "Fotokopi KTP-el orang tua",
        "Fotokopi buku nikah/akta perkawinan",
        "Fotokopi KTP-el 2 orang saksi"
      ],
      langkah: [
        { ke: "Faskes/RS/Bidan/Desa", aksi: "Minta surat keterangan kelahiran" },
        { ke: "Loket Disdukcapil", aksi: "Serahkan berkas, petugas memverifikasi" },
        { ke: "Operator Disdukcapil", aksi: "Data dientri, kutipan akta kelahiran terbit (bisa sekaligus KK baru dan KIA)" }
      ],
      catatan: ["Tanpa surat pengantar RT/RW", "Dokumen yang disimpan warga adalah kutipan akta"],
      biaya: "Gratis",
      terkait: ["kia", "kk"]
    },
    {
      id: "mati",
      nama: "Akta Kematian",
      chip: "Akta Kematian",
      syarat: [
        "Surat keterangan kematian dari dokter/RS/desa/lurah",
        "KTP-el dan KK almarhum (asli)",
        "Fotokopi KTP-el pelapor",
        "Akta kelahiran & surat nikah almarhum (jika ada)"
      ],
      langkah: [
        { ke: "Dokter/RS/Desa", aksi: "Minta surat keterangan kematian" },
        { ke: "Loket Disdukcapil", aksi: "Serahkan berkas, petugas memverifikasi" },
        { ke: "Operator Disdukcapil", aksi: "Data dientri, kutipan akta kematian terbit, data almarhum dinonaktifkan & KK diperbarui" }
      ],
      catatan: ["Tanpa surat pengantar RT/RW"],
      biaya: "Gratis",
      terkait: ["kk"]
    },
    {
      id: "pindah",
      nama: "Pindah / Pindah Datang",
      chip: "Pindah Domisili",
      syarat: ["KK asli", "KTP-el"],
      langkah: [
        { ke: "Loket Disdukcapil (daerah asal)", aksi: "Ajukan permohonan pindah, terbit data pindah antar-daerah secara online" },
        { ke: "Loket Disdukcapil (daerah tujuan)", aksi: "Lapor datang, KK & KTP-el disesuaikan dengan alamat baru" }
      ],
      catatan: ["Tanpa surat pengantar RT/RW", "Diproses online antar daerah"],
      biaya: "Gratis",
      terkait: ["kk", "ktp"]
    }
  ]
};
