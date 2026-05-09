/* i18n.js — TR/EN Çeviri Sistemi */
(function () {
  const STORAGE_KEY = 'sinyal_lang';

  const translations = {
    tr: {
      'brand': 'Sinyalizasyon',
      'loading': 'Yükleniyor...',
      'nav.login': 'Giriş Yap',
      // Hero
      'hero.eyebrow': "Türkiye'nin İlk Akıllı Bekleme Uygulaması",
      'hero.title.1': 'Trafik Işığında',
      'hero.title.2': 'Vakit Kaybetme',
      'hero.desc': 'GPS ile durduğunuzu algılıyoruz, yeşile dönme sayacını gösteriyoruz ve bekleme sürenizi oyunlar, bilgi kartları ve daha fazlasıyla değerlendirmenize yardım ediyoruz.',
      'hero.cta.primary': 'Hemen Başla',
      'hero.cta.secondary': 'Nasıl Çalışır?',
      'hero.float.games': 'Oyunlar',
      'hero.float.cards': 'Bilgi Kartları',
      // Steps
      'steps.tag': 'Nasıl Çalışır?',
      'steps.title': '3 Adımda Başla',
      'steps.subtitle': 'Kurulum gerekmez. GPS izni ver, trafik ışığında dur, eğlen.',
      'step1.title': 'Konumunu Paylaş',
      'step1.desc': 'Uygulama açılışında tek seferlik GPS izni veriyorsun. Konumun güvende.',
      'step2.title': 'Dur, Algılansın',
      'step2.desc': 'Hız sıfırlandığında akıllı algoritmamız durduğunu anlıyor, rotanı hesaba katarak doğru trafik ışığını buluyor.',
      'step3.title': 'Vakti Değerlendir',
      'step3.desc': 'Yeşile dönme sayacı sağ üstte beliriyor, menüden oyun oynayabilir veya bilgi kartı okuyabilirsin.',
      // Features
      'features.tag': 'Özellikler',
      'features.title': 'Her Şey Burada',
      'feat.games.title': 'Mini Oyunlar',
      'feat.games.desc': 'Hafıza eşleştirme, refleks testi ve kelime bulmaca.',
      'feat.cards.title': 'Bilgi Kartları',
      'feat.cards.desc': '"Vay be!" dedirtecek az bilinen gerçekler.',
      'feat.contacts.title': 'Hızlı Arama',
      'feat.contacts.desc': '112, 155, 110 ve daha fazlası. Tek dokunuşla.',
      'feat.messages.title': 'Hazır Mesajlar',
      'feat.messages.desc': 'Trafikte takıldığını tek tuşla iletebilirsin.',
      'feat.cat.title': 'Sinyal — AI Asistanın',
      'feat.cat.desc': 'Grok AI ile güçlendirilmiş trafik odaklı asistan.',
      // CTA
      'cta.title': 'Bir Sonraki Kırmızı Işıkta Hazır Ol',
      'cta.desc': 'Ücretsiz. Uygulama indirmene gerek yok.',
      'cta.btn': 'Hemen Başla',
      // Footer
      'footer.copy': '© 2026 Sinyalizasyon. Tüm hakları saklıdır.',
      'footer.login': 'Giriş',
      'footer.register': 'Kayıt',
      // Auth
      'auth.tab.login': 'Giriş Yap',
      'auth.tab.register': 'Kayıt Ol',
      'login.title': 'Tekrar Hoş Geldin 👋',
      'login.sub': 'Hesabınla giriş yap, kaldığın yerden devam et.',
      'register.title': 'Hesap Oluştur 🚦',
      'register.sub': 'Ücretsiz, iki dakikada tamamlanır.',
      'label.email': 'E-posta',
      'label.password': 'Şifre',
      'label.username': 'Kullanıcı Adı',
      'btn.login': 'Giriş Yap',
      'btn.register': 'Kayıt Ol',
      'btn.logout': 'Çıkış',
      'placeholder.email': 'ornek@email.com',
      'placeholder.password': '••••••',
      'placeholder.newpassword': 'En az 6 karakter',
      'placeholder.username': 'sinyal_user',
      // GPS
      'gps.title': 'Konum İzni Gerekli',
      'gps.desc': 'Trafik ışığında durduğunu anlayabilmek ve en yakın ışığı bulabilmek için konumuna ihtiyacımız var. Veriler hiçbir zaman paylaşılmaz.',
      'gps.allow': 'Konuma İzin Ver',
      'gps.skip': 'Şimdi değil, sonra ayarla',
      // App
      'status.init': 'GPS başlatılıyor...',
      'status.error': 'GPS Hatası / İzin Verilmedi',
      'status.tracking': 'Konum izleniyor',
      'status.searching': 'Trafik ışığı aranıyor...',
      'status.stopped': 'Durdu — Eşleştiriliyor',
      'status.matched': 'Trafik ışığı bulundu',
      'idle.title': 'Trafik Işığında Bekliyor musun?',
      'idle.desc': 'Durduğunda otomatik algılanacaksın. GPS aktif ve izleniyor.',
      'phase.red': 'Kırmızı Işık',
      'phase.green': 'Yeşil Işık',
      'phase.yellow': 'Sarı Işık',
      'cd.to.green': 'yeşile kalan süre',
      'cd.green.label': 'yeşil — geçebilirsiniz',
      'cd.yellow.label': 'sarı — yavaşlayın',
      'light.unknown': 'Bilinmeyen Kavşak',
      'turn.left': 'Sol',
      'turn.straight': 'Düz',
      'turn.right': 'Sağ',
      // Menu
      'menu.games': 'Oyunlar',
      'menu.games.sub': '3 mini oyun',
      'menu.cards': 'Bilgi Kartları',
      'menu.cards.sub': 'Vay be!',
      'menu.contacts': 'Hızlı Arama',
      'menu.contacts.sub': '112, 155 ve diğerleri',
      'menu.messages': 'Mesajlar',
      'menu.messages.sub': 'Hazır şablonlar',
      // Games
      'game.memory': 'Eşleştirme',
      'game.reflex': 'Refleks',
      'game.word': 'Kelime',
      'game.moves': 'hamle',
      'game.restart': 'Yeniden Başlat',
      'game.leaderboard': '🏆 Skor Tablosu',
      'game.best': 'En İyi:',
      'reflex.wait': 'Hazır olunca ekrana dokunun...',
      'reflex.ready': '🟢 DOKUN!',
      'reflex.early': 'Çok erken! Tekrar deneyin.',
      'word.attempts': 'hakkınız var',
      // Messages
      'msg.to': 'Alıcı Numara',
      // Chatbot
      'chat.name': 'Sinyal',
      'chat.status': 'Çevrimiçi',
      'chat.placeholder': 'Bir şey sor...',
      'cat.hello': 'Merhaba! Sana yardımcı olabilirim.',
    },
    en: {
      'brand': 'Signalization',
      'loading': 'Loading...',
      'nav.login': 'Sign In',
      // Hero
      'hero.eyebrow': "Turkey's First Smart Waiting App",
      'hero.title.1': 'At Traffic Lights,',
      'hero.title.2': "Don't Waste Time",
      'hero.desc': 'We detect when you stop via GPS, show a countdown to green, and help you make the most of your waiting time with games, info cards, and more.',
      'hero.cta.primary': 'Get Started',
      'hero.cta.secondary': 'How It Works',
      'hero.float.games': 'Games',
      'hero.float.cards': 'Info Cards',
      // Steps
      'steps.tag': 'How It Works',
      'steps.title': 'Start in 3 Steps',
      'steps.subtitle': 'No download needed. Grant GPS, stop at a light, have fun.',
      'step1.title': 'Share Your Location',
      'step1.desc': 'Grant GPS permission once on launch. Your location stays private.',
      'step2.title': 'Stop, Get Detected',
      'step2.desc': 'When your speed hits zero, our smart algorithm detects the stop and finds the correct traffic light based on your heading.',
      'step3.title': 'Make the Most of It',
      'step3.desc': 'A countdown to green appears top-right. Play games or read info cards from the menu.',
      // Features
      'features.tag': 'Features',
      'features.title': 'Everything Here',
      'feat.games.title': 'Mini Games',
      'feat.games.desc': 'Memory matching, reflex test, and word puzzle.',
      'feat.cards.title': 'Info Cards',
      'feat.cards.desc': 'Surprising facts that will make you say "wow!"',
      'feat.contacts.title': 'Quick Call',
      'feat.contacts.desc': '112, 155, 110 and more. One tap to call.',
      'feat.messages.title': 'Quick Messages',
      'feat.messages.desc': "Let people know you're stuck in traffic in one tap.",
      'feat.cat.title': 'Signal — Your AI Assistant',
      'feat.cat.desc': 'Powered by Grok AI, focused on traffic and driving.',
      // CTA
      'cta.title': 'Be Ready for the Next Red Light',
      'cta.desc': 'Free. No app download required.',
      'cta.btn': 'Get Started',
      // Footer
      'footer.copy': '© 2026 Signalization. All rights reserved.',
      'footer.login': 'Sign In',
      'footer.register': 'Sign Up',
      // Auth
      'auth.tab.login': 'Sign In',
      'auth.tab.register': 'Sign Up',
      'login.title': 'Welcome Back 👋',
      'login.sub': 'Sign in to pick up where you left off.',
      'register.title': 'Create Account 🚦',
      'register.sub': 'Free, done in two minutes.',
      'label.email': 'Email',
      'label.password': 'Password',
      'label.username': 'Username',
      'btn.login': 'Sign In',
      'btn.register': 'Sign Up',
      'btn.logout': 'Log Out',
      'placeholder.email': 'example@email.com',
      'placeholder.password': '••••••',
      'placeholder.newpassword': 'At least 6 characters',
      'placeholder.username': 'signal_user',
      // GPS
      'gps.title': 'Location Permission Required',
      'gps.desc': "We need your location to detect stops at traffic lights and find the nearest signal. Your data is never shared.",
      'gps.allow': 'Allow Location',
      'gps.skip': 'Not now, set up later',
      // App
      'status.init': 'Initializing GPS...',
      'status.error': 'GPS Error / Denied',
      'status.tracking': 'Location tracking',
      'status.searching': 'Looking for traffic light...',
      'status.stopped': 'Stopped — Matching...',
      'status.matched': 'Traffic light found',
      'idle.title': 'Stopped at a Traffic Light?',
      'idle.desc': "You'll be auto-detected when you stop. GPS is active.",
      'phase.red': 'Red Light',
      'phase.green': 'Green Light',
      'phase.yellow': 'Yellow Light',
      'cd.to.green': 'until green',
      'cd.green.label': 'green — you may go',
      'cd.yellow.label': 'yellow — slow down',
      'light.unknown': 'Unknown Intersection',
      'turn.left': 'Left',
      'turn.straight': 'Straight',
      'turn.right': 'Right',
      // Menu
      'menu.games': 'Games',
      'menu.games.sub': '3 mini games',
      'menu.cards': 'Info Cards',
      'menu.cards.sub': 'Wow facts!',
      'menu.contacts': 'Quick Call',
      'menu.contacts.sub': '112, 155 and more',
      'menu.messages': 'Messages',
      'menu.messages.sub': 'Ready templates',
      // Games
      'game.memory': 'Memory',
      'game.reflex': 'Reflex',
      'game.word': 'Word',
      'game.moves': 'moves',
      'game.restart': 'Restart',
      'game.leaderboard': '🏆 Leaderboard',
      'game.best': 'Best:',
      'reflex.wait': 'Tap the screen when ready...',
      'reflex.ready': '🟢 TAP NOW!',
      'reflex.early': 'Too early! Try again.',
      'word.attempts': 'attempts left',
      // Messages
      'msg.to': 'Recipient Number',
      // Chatbot
      'chat.name': 'Signal',
      'chat.status': 'Online',
      'chat.placeholder': 'Ask something...',
      'cat.hello': 'Hello! I can help you.',
    }
  };

  function getLang() {
    return localStorage.getItem(STORAGE_KEY) || 'tr';
  }

  function setLang(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
    applyAll(lang);
    updateToggleUI(lang);
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  function t(key) {
    const lang = getLang();
    return translations[lang]?.[key] || translations['tr'][key] || key;
  }

  function applyAll(lang) {
    const dict = translations[lang] || translations['tr'];

    // data-i18n text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) el.textContent = dict[key];
    });

    // data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key] !== undefined) el.placeholder = dict[key];
    });

    // data-i18n-title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key] !== undefined) el.title = dict[key];
    });
  }

  function updateToggleUI(lang) {
    const flag = document.getElementById('langFlag');
    const label = document.getElementById('langLabel');
    if (flag) flag.textContent = lang === 'tr' ? '🇹🇷' : '🇬🇧';
    if (label) label.textContent = lang === 'tr' ? 'TR' : 'EN';
  }

  // Toggle on click
  document.addEventListener('click', (e) => {
    if (e.target.closest('#langToggle')) {
      setLang(getLang() === 'tr' ? 'en' : 'tr');
    }
  });

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const lang = getLang();
    document.documentElement.setAttribute('lang', lang);
    applyAll(lang);
    updateToggleUI(lang);
  });

  // Expose globally
  window.i18n = { t, setLang, getLang, applyAll };
})();
