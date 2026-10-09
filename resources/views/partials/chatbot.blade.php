{{--
    Widget Chatbot FAQ Dukcapil Kabupaten Cirebon (rule-based, tanpa server).

    Pemakaian (di layout utama, tepat sebelum </body>):
        @include('partials.chatbot')

    Opsi:
        @include('partials.chatbot', ['loadAlpine' => false])   // host pasti sudah memuat Alpine
        @include('partials.chatbot', ['alpineSrc' => asset('vendor/alpine.min.js')]) // Alpine self-host

    Urutan muat:
      1. CSS + data KB + engine dimuat SINKRON di sini (sebelum Alpine host start, karena
         script defer/module Vite baru jalan setelah HTML selesai di-parse).
      2. Saat DOMContentLoaded: jika Alpine belum ada (window.Alpine / komponen belum
         ter-init), Alpine CDN disuntikkan. Jika host sudah punya Alpine, tidak dimuat dobel.
--}}
@once
@php
    $dcLoadAlpine = $loadAlpine ?? true;
    $dcAlpineSrc = $alpineSrc ?? 'https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js';
    $dcVer = fn (string $path) => @filemtime(public_path($path)) ?: '1';
@endphp
<link rel="stylesheet" href="{{ asset('css/dukcapil-chatbot.css') }}?v={{ $dcVer('css/dukcapil-chatbot.css') }}">
<script src="{{ asset('js/dukcapil-kb.js') }}?v={{ $dcVer('js/dukcapil-kb.js') }}"></script>
<script src="{{ asset('js/dukcapil-chatbot.js') }}?v={{ $dcVer('js/dukcapil-chatbot.js') }}"></script>

<div id="dukcapil-chatbot" x-data="dukcapilChat()" :data-theme="theme" @keydown.escape="close()">
    {{-- Tombol mengambang --}}
    <button type="button" class="dc-launcher" x-ref="launcher"
            @click="toggle()"
            :aria-expanded="open.toString()"
            aria-controls="dukcapil-chatbot-panel"
            :aria-label="open ? 'Tutup chat layanan Dukcapil' : 'Buka chat layanan Dukcapil'"
            aria-label="Buka chat layanan Dukcapil">
        <svg x-show="!open" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.6-5A8.5 8.5 0 1 1 21 12Z"/>
            <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-width="3"/>
        </svg>
        <svg x-show="open" x-cloak viewBox="0 0 24 24" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18"/>
        </svg>
        <span class="dc-badge" x-show="unread" aria-hidden="true">1</span>
    </button>

    {{-- Panel chat --}}
    <section id="dukcapil-chatbot-panel" class="dc-panel" role="dialog" aria-modal="false"
             aria-labelledby="dukcapil-chatbot-title"
             x-show="open" x-cloak
             x-transition:enter="dc-tr" x-transition:enter-start="dc-tr-from" x-transition:enter-end="dc-tr-to"
             x-transition:leave="dc-tr" x-transition:leave-start="dc-tr-to" x-transition:leave-end="dc-tr-from">

        <header class="dc-header">
            <span class="dc-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2.5"/>
                    <circle cx="9" cy="11" r="2"/>
                    <path d="M6 16c.6-1.5 1.7-2.2 3-2.2s2.4.7 3 2.2M14.5 10H18M14.5 13.5H17"/>
                </svg>
            </span>
            <div class="dc-heading">
                <h2 class="dc-title" id="dukcapil-chatbot-title" x-ref="title" tabindex="-1">Asisten Dukcapil</h2>
                <p class="dc-subtitle"><span class="dc-dot" aria-hidden="true"></span>Kabupaten Cirebon &middot; Jawab otomatis</p>
            </div>
            <button type="button" class="dc-close" @click="close()" aria-label="Tutup chat">
                <svg viewBox="0 0 24 24" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18"/>
                </svg>
            </button>
        </header>

        <div class="dc-log" x-ref="log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Percakapan">
            <template x-for="m in messages" :key="m.id">
                <div class="dc-row" :class="m.from === 'bot' ? 'dc-row--bot' : 'dc-row--user'">
                    <span class="dc-sr" x-text="m.from === 'bot' ? 'Asisten:' : 'Anda:'"></span>
                    {{-- bubble(): jawaban bot dirender dari teks yang sudah di-escape; teks user di-escape penuh --}}
                    <div class="dc-bubble" x-html="bubble(m)"></div>
                </div>
            </template>

            <div class="dc-row dc-row--bot" x-show="typing" x-cloak>
                <div class="dc-bubble dc-typing" role="status" aria-label="Asisten sedang mengetik">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <div class="dc-chips" role="group" aria-label="Pilihan cepat" x-show="chips.length && !typing" x-cloak>
                <template x-for="c in chips" :key="c.intent">
                    <button type="button" class="dc-chip" :class="{ 'dc-chip--accent': c.intent === 'petugas' }"
                            @click="pick(c)" x-text="c.label"></button>
                </template>
            </div>
        </div>

        <form class="dc-form" @submit.prevent="send()" autocomplete="off">
            <label for="dukcapil-chatbot-input" class="dc-sr">Tulis pertanyaan Anda</label>
            <input id="dukcapil-chatbot-input" class="dc-input" type="text" x-ref="input" x-model="draft"
                   maxlength="300" placeholder="Tulis pertanyaan&hellip;" enterkeyhint="send" spellcheck="false">
            <button type="submit" class="dc-send" :disabled="!draft.trim()" aria-label="Kirim">
                <svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M4 12 20 4l-6 16-2.5-6.5L4 12Z"/>
                </svg>
            </button>
        </form>
        <p class="dc-foot">Jawaban otomatis berbasis aturan. Untuk kepastian, hubungi petugas.</p>
    </section>
</div>

<script>
(function () {
    var load = @json((bool) $dcLoadAlpine);
    var src = @json($dcAlpineSrc);
    if (!load) return;
    function ensureAlpine() {
        var root = document.getElementById('dukcapil-chatbot');
        // Host sudah punya Alpine (window.Alpine, Livewire, atau komponen sudah ter-init)
        if (window.Alpine || (root && root._x_dataStack) || document.querySelector('script[data-dukcapil-alpine]')) return;
        var s = document.createElement('script');
        s.src = src;
        s.defer = true;
        s.setAttribute('data-dukcapil-alpine', '');
        document.head.appendChild(s);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAlpine);
    else ensureAlpine();
})();
</script>
@endonce
