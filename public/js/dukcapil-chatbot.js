/*!
 * Chatbot FAQ Dukcapil Kabupaten Cirebon
 * Engine rule-based + komponen Alpine.js `dukcapilChat`.
 *
 * - Tanpa AI, tanpa server: semua jawaban disusun dari window.DUKCAPIL_KB
 *   (public/js/dukcapil-kb.js).
 * - Dimuat SEBELUM Alpine start (lihat partial Blade). Komponen didaftarkan lewat
 *   Alpine.data() dan juga tersedia global sebagai window.dukcapilChat, jadi
 *   `x-data="dukcapilChat()"` tetap jalan walau Alpine host tidak di-expose ke window.
 * - Engine bisa dites dari Console: DukcapilChatEngine.matchIntent("syarat bikin ktp")
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------------
   * Konstanta (diambil dari KB, dengan nilai cadangan agar aturan wajib tetap
   * berlaku walau KB salah edit)
   * ---------------------------------------------------------------------- */
  const DEFAULT_KONTAK = {
    telp: '085194268118',
    email: 'info@dukcapil.go.id',
    alamat: 'Jl. Sunan Muria No. 4, Kel. Sumber, Cirebon 45611'
  };
  const DEFAULT_CATATAN_IKD =
    'Sebelum menemui petugas, sebaiknya Anda sudah memiliki akun IKD ' +
    '(Identitas Kependudukan Digital) terlebih dahulu. Silakan unduh aplikasinya di ' +
    'Play Store atau App Store.';
  const TEKS_FALLBACK = 'Maaf, pertanyaan ini belum bisa saya jawab secara otomatis.';

  const kb = () => root.DUKCAPIL_KB || {};
  const kontak = () => Object.assign({}, DEFAULT_KONTAK, kb().kontak || {});
  const catatanIkd = () => kb().catatanIkd || DEFAULT_CATATAN_IKD;
  const daftarLayanan = () => (Array.isArray(kb().layanan) ? kb().layanan : []);
  const cariLayanan = (id) => daftarLayanan().find((l) => l.id === id) || null;

  /* ------------------------------------------------------------------------
   * Kata kunci per intent. Ditulis apa adanya; dinormalisasi otomatis
   * (huruf kecil, tanda baca jadi spasi) sebelum dicocokkan.
   * Skor = panjang frasa terpanjang yang cocok, jadi frasa spesifik menang
   * ("ktp digital" -> ikd mengalahkan "ktp" -> ktp).
   * ---------------------------------------------------------------------- */
  const KATA_KUNCI = {
    ktp: ['ktp', 'e-ktp', 'ektp', 'ktp-el', 'ktpel', 'ktp elektronik', 'kartu tanda penduduk',
      'perekaman', 'rekam ktp', 'rekam e-ktp', 'biometrik', 'ktp hilang', 'kehilangan ktp', 'ktp rusak'],
    kk: ['kk', 'kartu keluarga', 'kk hilang', 'kehilangan kk', 'kk baru', 'pecah kk', 'tambah anggota keluarga'],
    kia: ['kia', 'identitas anak', 'kartu identitas anak', 'kartu anak', 'ktp anak'],
    lahir: ['akta lahir', 'akta kelahiran', 'akte lahir', 'akte kelahiran', 'kelahiran', 'lahir',
      'bayi', 'surat lahir', 'baru lahir'],
    mati: ['akta kematian', 'akte kematian', 'akta mati', 'kematian', 'meninggal', 'meninggal dunia',
      'almarhum', 'almarhumah', 'wafat', 'surat kematian'],
    pindah: ['pindah', 'pindahan', 'pindah datang', 'domisili', 'pindah alamat', 'ganti alamat',
      'surat pindah', 'lapor datang', 'mutasi penduduk'],
    ikd: ['ikd', 'ktp digital', 'identitas kependudukan digital', 'kependudukan digital',
      'aktivasi', 'aktivasi ikd', 'aplikasi ikd', 'digital id'],
    biaya: ['biaya', 'gratis', 'bayar', 'berbayar', 'tarif', 'harga', 'pungutan', 'pungli', 'dipungut'],
    jam: ['jam', 'buka', 'tutup', 'jadwal', 'jam buka', 'jam layanan', 'jam operasional', 'jam kerja',
      'hari kerja', 'hari libur', 'sabtu', 'minggu'],
    lokasi: ['alamat', 'lokasi', 'dimana', 'di mana', 'alamat kantor', 'kantor dimana', 'kantor di mana',
      'letak', 'peta', 'maps', 'rute'],
    kontak: ['telepon', 'telp', 'telpon', 'kontak', 'nomor', 'no hp', 'nomor hp', 'nomor telepon',
      'no telp', 'email', 'e-mail', 'whatsapp', 'wa', 'hubungi', 'call center'],
    petugas: ['petugas', 'manusia', 'lapor', 'laporan', 'keluhan', 'komplain', 'complain', 'pengaduan',
      'aduan', 'cs', 'customer service', 'admin', 'operator', 'hubungi petugas', 'bicara dengan petugas',
      'chat petugas'],
    menu: ['menu', 'bantuan', 'help', 'topik', 'pilihan', 'layanan apa saja'],
    pembuka: ['halo', 'hallo', 'helo', 'hai', 'hi', 'hello', 'pagi', 'siang', 'sore', 'malam',
      'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'assalamualaikum',
      'assalamu alaikum', 'asalamualaikum', 'assalamualaikum wr wb', 'permisi', 'salam', 'punten',
      'sampurasun', 'misi'],
    penutup: ['terima kasih', 'terimakasih', 'makasih', 'makasi', 'trims', 'thanks', 'thank you',
      'nuhun', 'hatur nuhun', 'matur nuwun', 'tengkyu']
  };

  /* Intent "lemah" (sapaan) hanya menang jika tidak ada intent lain yang cocok,
   * agar "halo, mau bikin kk" dijawab KK, bukan sapaan. */
  const INTENT_LEMAH = { pembuka: true, penutup: true };

  function normalize(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/['’`]/g, '')             // assalamu'alaikum -> assalamualaikum
      .replace(/[^a-z0-9]+/g, ' ')        // tanda baca -> spasi
      .trim()
      .replace(/\s+/g, ' ');
  }

  let tabelCache = null;
  function tabelKataKunci() {
    if (tabelCache) return tabelCache;
    const tabel = {};
    Object.keys(KATA_KUNCI).forEach((id) => {
      tabel[id] = KATA_KUNCI[id].slice();
    });
    // Kata kunci tambahan dari KB (field opsional `kataKunci` di tiap layanan)
    daftarLayanan().forEach((l) => {
      if (!l || !l.id || !Array.isArray(l.kataKunci)) return;
      tabel[l.id] = (tabel[l.id] || []).concat(l.kataKunci);
    });
    Object.keys(tabel).forEach((id) => {
      tabel[id] = Array.from(new Set(tabel[id].map(normalize).filter(Boolean)));
    });
    return (tabelCache = tabel);
  }

  function matchIntent(text) {
    const norm = normalize(text);
    if (!norm) return null;
    // Varian kedua: buang akhiran "-nya" (ktpnya -> ktp, kknya -> kk)
    const tanpaNya = norm.split(' ')
      .map((t) => (t.length >= 5 && t.endsWith('nya') ? t.slice(0, -3) : t))
      .join(' ');
    const teks = [' ' + norm + ' ', ' ' + tanpaNya + ' '];

    const tabel = tabelKataKunci();
    let kuat = null, skorKuat = 0, lemah = null, skorLemah = 0;
    Object.keys(tabel).forEach((id) => {
      let skor = 0;
      tabel[id].forEach((kw) => {
        if (kw.length > skor && (teks[0].includes(' ' + kw + ' ') || teks[1].includes(' ' + kw + ' '))) {
          skor = kw.length;
        }
      });
      if (!skor) return;
      if (INTENT_LEMAH[id]) {
        if (skor > skorLemah) { lemah = id; skorLemah = skor; }
      } else if (skor > skorKuat) {
        kuat = id; skorKuat = skor;
      }
    });
    return kuat || lemah || null;
  }

  /* ------------------------------------------------------------------------
   * Penyusun jawaban. Jawaban = { blocks: [...], chips: [...] }
   * Block: { t:'p', text } | { t:'ul', items:[str] } | { t:'ol', items:[str|{ke,aksi}] }
   *        | { t:'note', text } | { t:'links', items:[{label, href}] }
   * Teks boleh mengandung **tebal**. Semua teks di-escape saat render.
   * ---------------------------------------------------------------------- */
  const LABEL_TOPIK = {
    jamlokasi: 'Jam & Lokasi',
    jam: 'Jam Layanan',
    lokasi: 'Lokasi',
    ikd: 'IKD',
    biaya: 'Biaya',
    kontak: 'Kontak',
    petugas: 'Hubungi petugas'
  };

  function chip(id) {
    const l = cariLayanan(id);
    const label = l ? (l.chip || l.nama) : LABEL_TOPIK[id];
    return label ? { intent: id, label } : null;
  }

  function chips(ids, denganPetugas) {
    const out = [];
    const seen = {};
    ids.concat(denganPetugas ? ['petugas'] : []).forEach((id) => {
      if (seen[id]) return;
      seen[id] = true;
      const c = chip(id);
      if (c) out.push(c);
    });
    return out;
  }

  const menuAwal = () => (Array.isArray(kb().menuAwal) && kb().menuAwal.length
    ? kb().menuAwal
    : ['ktp', 'kk', 'kia', 'lahir', 'mati', 'jamlokasi', 'ikd']);

  const telHref = (n) => 'tel:' + String(n).replace(/[^\d+]/g, '');

  /** Arahkan ke petugas: telp + alamat, lalu SELALU diakhiri CATATAN_IKD. */
  function arahkanPetugas() {
    const k = kontak();
    return [
      { t: 'p', text: 'Silakan hubungi petugas kami:' },
      { t: 'ul', items: ['**Telepon:** ' + k.telp, '**Alamat:** ' + k.alamat] },
      { t: 'links', items: [{ label: 'Telepon ' + k.telp, href: telHref(k.telp) }] },
      { t: 'note', text: catatanIkd() } // wajib di paling akhir
    ];
  }

  function blokLayanan(l) {
    const b = [{ t: 'p', text: '**' + l.nama + '**' }];
    if (l.ringkasan) b.push({ t: 'p', text: l.ringkasan });
    if (l.syarat && l.syarat.length) {
      b.push({ t: 'p', text: '**Syarat:**' }, { t: 'ul', items: l.syarat });
    }
    if (l.langkah && l.langkah.length) {
      b.push({ t: 'p', text: '**Langkah:**' }, { t: 'ol', items: l.langkah });
    }
    if (l.catatan && l.catatan.length) {
      b.push({ t: 'p', text: '**Catatan:**' }, { t: 'ul', items: l.catatan });
    }
    if (l.biaya) b.push({ t: 'p', text: '**Biaya:** ' + l.biaya });
    return b;
  }

  function blokJam() {
    const d = kb();
    const b = [
      { t: 'p', text: '**Jam layanan:** ' + (d.jam || 'Senin-Jumat 08.00-15.30 WIB') },
      { t: 'p', text: d.jamTutup || 'Sabtu, Minggu, dan hari libur: tutup.' },
      { t: 'p', text: 'Ada juga layanan keliling **Kudu Nglayap** setiap Sabtu ke desa-desa.' }
    ];
    b.push({ t: 'note', text: d.catatanJam || ('Jam dapat berubah, konfirmasi dulu ke ' + kontak().telp + '.') });
    return b;
  }

  function blokLokasi() {
    const k = kontak();
    const kanal = Array.isArray(kb().kanal) ? kb().kanal : [];
    const b = [
      { t: 'p', text: '**Alamat kantor ' + (kb().instansi || 'Disdukcapil') + ':**' },
      { t: 'p', text: k.alamat }
    ];
    if (kanal.length) b.push({ t: 'p', text: '**Kanal layanan:**' }, { t: 'ul', items: kanal });
    b.push({
      t: 'links',
      items: [{
        label: 'Buka di Google Maps',
        href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(k.alamat)
      }]
    });
    return b;
  }

  function blokSapaan(teks) {
    const salam = /assal|asal/.test(normalize(teks)) ? "Wa'alaikumsalam! " : 'Halo! ';
    return [
      { t: 'p', text: salam + 'Saya asisten otomatis **' + (kb().instansi || 'Disdukcapil Kabupaten Cirebon') + '**.' },
      { t: 'p', text: 'Silakan pilih topik di bawah atau ketik pertanyaan Anda, misalnya "syarat bikin KTP".' }
    ];
  }

  function answer(intent, teksAsli) {
    const l = cariLayanan(intent);
    if (l) {
      return {
        blocks: blokLayanan(l),
        chips: chips((l.terkait || []).concat(['jamlokasi']), true)
      };
    }
    const k = kontak();
    const d = kb();
    switch (intent) {
      case 'ikd': {
        const ikd = d.ikd || {};
        const b = [{ t: 'p', text: '**' + (ikd.nama || 'IKD (Identitas Kependudukan Digital)') + '**' }];
        if (ikd.ringkasan) b.push({ t: 'p', text: ikd.ringkasan });
        if (ikd.langkah && ikd.langkah.length) b.push({ t: 'p', text: '**Cara membuat:**' }, { t: 'ol', items: ikd.langkah });
        if (ikd.catatan && ikd.catatan.length) b.push({ t: 'ul', items: ikd.catatan });
        return { blocks: b, chips: chips(['ktp', 'jamlokasi'], true) };
      }
      case 'biaya': {
        const by = d.biaya || {};
        return {
          blocks: [
            { t: 'p', text: by.teks || 'Semua layanan administrasi kependudukan **GRATIS**.' },
            { t: 'note', text: by.catatan || 'Jika ada oknum memungut biaya, laporkan ke pemda setempat.' }
          ],
          chips: chips(menuAwal(), true)
        };
      }
      case 'jam':
        return { blocks: blokJam(), chips: chips(['lokasi', 'kontak'].concat(menuAwal()), true) };
      case 'lokasi':
        return { blocks: blokLokasi(), chips: chips(['jam', 'kontak'].concat(menuAwal()), true) };
      case 'jamlokasi':
        return { blocks: blokJam().concat(blokLokasi()), chips: chips(['kontak'].concat(menuAwal()), true) };
      case 'kontak':
        return {
          blocks: [
            { t: 'p', text: '**Kontak ' + (d.instansi || 'Disdukcapil') + ':**' },
            { t: 'ul', items: ['**Telepon:** ' + k.telp, '**Email:** ' + k.email, '**Alamat:** ' + k.alamat] },
            { t: 'links', items: [
              { label: 'Telepon', href: telHref(k.telp) },
              { label: 'Kirim email', href: 'mailto:' + k.email }
            ] }
          ],
          chips: chips(['jamlokasi'].concat(menuAwal()), true)
        };
      case 'petugas':
        return {
          blocks: [{ t: 'p', text: 'Baik, untuk bantuan langsung, keluhan, atau pengaduan:' }].concat(arahkanPetugas()),
          chips: chips(menuAwal(), false)
        };
      case 'menu':
        return {
          blocks: [{ t: 'p', text: 'Berikut topik yang bisa saya bantu. Silakan pilih:' }],
          chips: chips(menuAwal().concat(['pindah', 'biaya']), true)
        };
      case 'pembuka':
        return { blocks: blokSapaan(teksAsli), chips: chips(menuAwal(), true) };
      case 'penutup':
        return {
          blocks: [{ t: 'p', text: 'Sama-sama! Semoga urusan administrasi kependudukan Anda lancar. Ada lagi yang bisa dibantu?' }],
          chips: chips(menuAwal(), true)
        };
      default: // fallback
        return {
          blocks: [{ t: 'p', text: TEKS_FALLBACK }].concat(arahkanPetugas()),
          chips: chips(menuAwal(), false)
        };
    }
  }

  /* ------------------------------------------------------------------------
   * Render aman: SEMUA teks di-escape dulu, baru **tebal** diubah ke <strong>.
   * ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const hrefAman = (h) => /^(tel:|mailto:|https:\/\/)/i.test(String(h)) ? esc(h) : '#';

  function render(blocks) {
    return (blocks || []).map((b) => {
      switch (b.t) {
        case 'ul':
          return '<ul class="dc-ul">' + b.items.map((i) => '<li>' + inline(i) + '</li>').join('') + '</ul>';
        case 'ol':
          return '<ol class="dc-ol">' + b.items.map((i) => (
            typeof i === 'string'
              ? '<li>' + inline(i) + '</li>'
              : '<li><strong class="dc-ke">Ke ' + esc(i.ke) + ':</strong> ' + inline(i.aksi) + '</li>'
          )).join('') + '</ol>';
        case 'note':
          return '<p class="dc-note">' + inline(b.text) + '</p>';
        case 'links':
          return '<p class="dc-links">' + b.items.map((a) => {
            const ext = /^https:/i.test(a.href);
            return '<a class="dc-link" href="' + hrefAman(a.href) + '"' +
              (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(a.label) + '</a>';
          }).join('') + '</p>';
        default:
          return '<p>' + inline(b.text) + '</p>';
      }
    }).join('');
  }

  /* ------------------------------------------------------------------------
   * Tema: class "dark" pada <html> (pola toggle situs), fallback ke
   * prefers-color-scheme bila situs tampak tidak mengelola tema.
   * ---------------------------------------------------------------------- */
  function pembacaTema() {
    let situsKelolaTema = false;
    const mq = root.matchMedia ? root.matchMedia('(prefers-color-scheme: dark)') : null;
    return function deteksi() {
      const html = document.documentElement;
      const dt = html.getAttribute('data-theme');
      if (html.classList.contains('dark') || dt === 'dark') { situsKelolaTema = true; return 'dark'; }
      if (html.classList.contains('light') || dt === 'light') { situsKelolaTema = true; return 'light'; }
      if (situsKelolaTema) return 'light';
      try {
        const simpan = root.localStorage.getItem('theme');
        if (simpan === 'light' || simpan === 'dark') { situsKelolaTema = true; return 'light'; }
      } catch (e) { /* storage diblokir: abaikan */ }
      return mq && mq.matches ? 'dark' : 'light';
    };
  }

  const kurangiGerak = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pointerHalus = () => !!(root.matchMedia && root.matchMedia('(pointer: fine)').matches);

  /* ------------------------------------------------------------------------
   * Komponen Alpine
   * ---------------------------------------------------------------------- */
  function dukcapilChat() {
    let observer = null, mq = null, onMq = null;
    return {
      open: false,
      unread: true,
      started: false,
      typing: false,
      draft: '',
      messages: [],
      chips: [],
      theme: 'light',
      _seq: 0,
      _queue: Promise.resolve(),

      init() {
        const deteksi = pembacaTema();
        const perbarui = () => { this.theme = deteksi(); };
        perbarui();
        if (root.MutationObserver) {
          observer = new MutationObserver(perbarui);
          observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
        }
        if (root.matchMedia) {
          mq = root.matchMedia('(prefers-color-scheme: dark)');
          onMq = perbarui;
          if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
        }
      },

      destroy() {
        if (observer) observer.disconnect();
        if (mq && onMq) {
          if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq);
        }
      },

      toggle() { this.open ? this.close() : this.show(); },

      show() {
        this.open = true;
        this.unread = false;
        if (!this.started) {
          this.started = true;
          const a = answer('pembuka', '');
          this.push('bot', { blocks: a.blocks });
          this.chips = a.chips;
        }
        this.$nextTick(() => {
          this.scrollBawah(true);
          if (pointerHalus() && this.$refs.input) this.$refs.input.focus();
          else if (this.$refs.title) this.$refs.title.focus();
        });
      },

      close() {
        if (!this.open) return;
        this.open = false;
        this.$nextTick(() => this.$refs.launcher && this.$refs.launcher.focus());
      },

      send() {
        const teks = this.draft.replace(/\s+/g, ' ').trim().slice(0, 300);
        if (!teks) return;
        this.draft = '';
        this.push('user', { text: teks });
        this.respond(matchIntent(teks), teks);
      },

      pick(c) {
        this.push('user', { text: c.label });
        this.respond(c.intent, c.label);
        if (pointerHalus() && this.$refs.input) this.$nextTick(() => this.$refs.input.focus());
      },

      respond(intent, teksAsli) {
        this.chips = [];
        this._queue = this._queue.then(() => new Promise((selesai) => {
          const a = answer(intent, teksAsli);
          const panjang = a.blocks.reduce((n, b) => n + JSON.stringify(b).length, 0);
          const jeda = kurangiGerak() ? 250 : Math.min(450 + panjang * 0.8, 1300);
          this.typing = true;
          this.scrollBawah();
          setTimeout(() => {
            this.typing = false;
            this.push('bot', { blocks: a.blocks });
            this.chips = a.chips;
            selesai();
          }, jeda);
        }));
      },

      push(from, data) {
        this.messages.push(Object.assign({ id: ++this._seq, from }, data));
        this.scrollBawah();
      },

      scrollBawah(instan) {
        this.$nextTick(() => {
          const log = this.$refs.log;
          if (!log) return;
          log.scrollTo({ top: log.scrollHeight, behavior: instan || kurangiGerak() ? 'auto' : 'smooth' });
        });
      },

      bubble(m) {
        return m.from === 'bot' ? render(m.blocks) : esc(m.text);
      }
    };
  }

  /* ------------------------------------------------------------------------
   * Ekspor & registrasi
   * ---------------------------------------------------------------------- */
  root.DukcapilChatEngine = { matchIntent, answer, render, normalize, arahkanPetugas, esc };
  root.dukcapilChat = dukcapilChat;

  let terdaftar = false;
  function daftar() {
    if (terdaftar || !root.Alpine || typeof root.Alpine.data !== 'function') return;
    root.Alpine.data('dukcapilChat', dukcapilChat);
    terdaftar = true;
  }
  daftar();
  if (typeof document !== 'undefined') document.addEventListener('alpine:init', daftar);
})(typeof window !== 'undefined' ? window : globalThis);
