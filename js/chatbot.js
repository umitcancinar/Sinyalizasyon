/* chatbot.js — Sinyal AI Asistanı (Grok RAG entegrasyonu) */
(function () {
  // Backend URL: production'da Vercel, development'ta localhost:3002
  const API = window.SINYAL_API || (
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3002/api'
      : 'https://sinyal-backend-new.vercel.app/api'
  );

  const trigger = document.getElementById('catTrigger');
  const windowEl = document.getElementById('chatWindow');
  const closeBtn = document.getElementById('chatClose');
  const messagesEl = document.getElementById('chatMessages');
  const inputEl = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  const bubble = document.getElementById('catBubble');
  const notif = document.getElementById('catNotif');
  const suggestionsBox = document.getElementById('chatSuggestions');

  let isOpen = false;
  let history = []; // { role: 'user'|'assistant', content: string }
  let bubbleTimeout = null;
  let isTyping = false;

  // ── INIT ─────────────────────────────────────────────────────
  function init() {
    if (!trigger) return;

    trigger.addEventListener('click', toggleChat);
    closeBtn?.addEventListener('click', () => { isOpen = true; toggleChat(); });

    sendBtn?.addEventListener('click', handleSend);
    inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });

    inputEl?.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px';
      sendBtn.disabled = inputEl.value.trim().length === 0;
    });

    // Start with a greeting bubble
    setTimeout(() => showBubble(window.i18n?.t('cat.hello') || 'Merhaba! Sana yardımcı olabilirim.'), 2000);

    // Render suggestions
    renderSuggestions();

    // Listen to language changes to update suggestions
    window.addEventListener('langchange', renderSuggestions);
  }

  // ── UI TOGGLE ────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      windowEl.classList.add('open');
      trigger.setAttribute('data-state', 'idle');
      notif?.classList.remove('visible');
      hideBubble();
      if (history.length === 0) {
        addMessage('bot', window.i18n?.t('cat.hello') || 'Merhaba! Trafik kuralları, uygulama özellikleri veya acil durumlar hakkında bana her şeyi sorabilirsin.');
      }
      setTimeout(() => inputEl?.focus(), 300);
    } else {
      windowEl.classList.remove('open');
      trigger.setAttribute('data-state', 'idle');
    }
  }

  // ── BUBBLE ───────────────────────────────────────────────────
  function showBubble(text, duration = 4000) {
    if (isOpen || !bubble) return;
    bubble.textContent = text;
    bubble.classList.add('visible');
    trigger.setAttribute('data-state', 'wave');

    clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(hideBubble, duration);
  }

  function hideBubble() {
    if (!bubble) return;
    bubble.classList.remove('visible');
    if (!isOpen) trigger.setAttribute('data-state', 'idle');
  }

  // ── MESSAGES ─────────────────────────────────────────────────
  function addMessage(role, text) {
    const isUser = role === 'user';
    const msg = document.createElement('div');
    msg.className = `chat-msg ${role}`;
    const avatarHTML = isUser
      ? '👤'
      : '<div class="ai-cat-avatar small"><div class="ai-cat-ear left"></div><div class="ai-cat-ear right"></div><div class="ai-cat-face"><div class="ai-cat-eye left"></div><div class="ai-cat-eye right"></div></div></div>';

    msg.innerHTML = `
      <div class="chat-msg-avatar">${avatarHTML}</div>
      <div class="chat-msg-bubble">${escapeHTML(text)}</div>
    `;
    messagesEl.appendChild(msg);
    scrollToBottom();

    if (role !== 'system') {
      history.push({ role: isUser ? 'user' : 'assistant', content: text });
    }
  }

  function showTyping() {
    if (isTyping) return;
    isTyping = true;
    const typing = document.createElement('div');
    typing.className = 'chat-msg bot typing-indicator-wrap';
    typing.id = 'typingIndicator';
    typing.innerHTML = `
      <div class="chat-msg-avatar"><div class="ai-cat-avatar small"><div class="ai-cat-ear left"></div><div class="ai-cat-ear right"></div><div class="ai-cat-face"><div class="ai-cat-eye left"></div><div class="ai-cat-eye right"></div></div></div></div>
      <div class="chat-typing"><span></span><span></span><span></span></div>
    `;
    messagesEl.appendChild(typing);
    trigger.setAttribute('data-state', 'think');
    scrollToBottom();
  }

  function hideTyping() {
    isTyping = false;
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
    if (isOpen) trigger.setAttribute('data-state', 'idle');
  }

  function scrollToBottom() {
    setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 50);
  }

  // ── OFFLINE AKILLI YANIT SİSTEMİ ──────────────────────────────
  const OFFLINE_RESPONSES = {
    tr: {
      greetings: [
        'Merhaba! 🚦 Ben Sinyal, trafik asistanın. Trafik kuralları veya uygulama hakkında sorularını yanıtlayabilirim!',
        'Selam! 😊 Trafik ışığında beklerken sana yardımcı olabilirim. Oyunlarımızı denedin mi?'
      ],
      traffic_rules: [
        'Kırmızı ışıkta mutlaka durun! 🔴 Takip mesafesi şehir içinde en az 2 saniye olmalıdır.',
        'Emniyet kemeri takma zorunluluğu hem ön hem arka koltuk için geçerlidir! 🚗',
        'Sarı ışık "hazırlan" değil, "dur" anlamına gelir! 🟡'
      ],
      app_features: [
        'Sinyalizasyon uygulamasında 3 özellik var: 🎮 Oyunlar, 💡 Bilgi Kartları ve 📞 Hızlı Arama. Menüden keşfedebilirsin!'
      ],
      games: [
        'Oyunlar bölümünde 3 farklı oyun seni bekliyor! 🎮 Hafıza, Refleks ve Kelime oyunları ile vakit geçirebilirsin.'
      ],
      emergency: [
        'Acil durumlar için numaralar: 🚑 112 - Acil, 🚔 155 - Polis, 🚒 110 - İtfaiye. Hızlı Arama özelliğini kullanabilirsin!'
      ],
      default: [
        'İlginç bir soru! 🤔 Ben trafik güvenliği, uygulama özellikleri ve acil durumlar konusunda yardımcı olabilirim.',
        'Bu konuda elimde detaylı bilgi yok ama trafik kuralları veya oyunlar hakkında sorular sorabilirsin! 🚦'
      ]
    },
    en: {
      greetings: [
        'Hello! 🚦 I\'m Sinyal, your traffic assistant. I can answer questions about traffic rules or app features!',
        'Hi there! 😊 Have you tried our mini games from the menu?'
      ],
      traffic_rules: [
        'Always stop at red lights! 🔴 Safe following distance should be at least 2 seconds in urban areas.'
      ],
      app_features: [
        'Sinyalizasyon has 3 features: 🎮 Mini Games, 💡 Info Cards, and 📞 Quick Call.'
      ],
      games: [
        '3 games await you! 🎮 Memory Match, Reflex Test, and Word Puzzle.'
      ],
      emergency: [
        'Emergency numbers: 🚑 112 - Emergency, 🚔 155 - Police, 🚒 110 - Fire Dept.'
      ],
      default: [
        'Interesting question! 🤔 I can help with traffic safety, app features, and emergencies.',
        'I don\'t have detailed info on that, but I can answer questions about traffic rules or games! 🚦'
      ]
    }
  };

  const KEYWORD_MAP = {
    greetings: ['merhaba', 'selam', 'hello', 'hi', 'hey', 'naber', 'nasılsın', 'meraba'],
    traffic_rules: ['kural', 'trafik', 'hız', 'kırmızı', 'yeşil', 'sarı', 'ışık', 'kemer', 'ceza', 'rule', 'speed', 'light'],
    app_features: ['uygulama', 'özellik', 'nasıl', 'feature', 'app', 'how'],
    games: ['oyun', 'game', 'hafıza', 'refleks', 'kelime', 'memory', 'reflex', 'word', 'oyna', 'play'],
    emergency: ['acil', 'emergency', '112', '155', '110', 'polis', 'ambulans', 'kaza', 'yardım', 'ara', 'call']
  };

  function getOfflineCategory(message) {
    const lower = message.toLowerCase();
    for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) return category;
      }
    }
    return 'default';
  }

  function getOfflineResponse(message, language) {
    const lang = OFFLINE_RESPONSES[language] ? language : 'tr';
    const category = getOfflineCategory(message);
    const responses = OFFLINE_RESPONSES[lang][category] || OFFLINE_RESPONSES[lang].default;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ── SEND & FETCH (FRONTEND ONLY) ─────────────────────────────────────────────
  async function handleSend(forcedText = null) {
    const text = forcedText || inputEl.value.trim();
    if (!text || isTyping) return;

    if (!forcedText) {
      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;
    }

    addMessage('user', text);
    showTyping();

    const lang = window.i18n ? window.i18n.getLang() : 'tr';
    const reply = getOfflineResponse(text, lang);

    // Yapay bekleme süresi (500ms - 1500ms)
    const delay = Math.floor(Math.random() * 1000) + 500;
    
    setTimeout(() => {
      hideTyping();
      addMessage('bot', reply);
      trigger.setAttribute('data-state', 'jump');
      setTimeout(() => { if (isOpen) trigger.setAttribute('data-state', 'idle'); }, 1000);
    }, delay);
  }

  // ── SUGGESTIONS ──────────────────────────────────────────────
  const suggestions = {
    tr: [
      'Oyunlar nerede?',
      'Takip mesafesi nedir?',
      'Acil durumda kimi aramalıyım?',
      'Bana bir bilgi kartı okur musun?'
    ],
    en: [
      'Where are the games?',
      'What is safe following distance?',
      'Who to call in an emergency?',
      'Tell me a fun fact'
    ]
  };

  function renderSuggestions() {
    if (!suggestionsBox) return;
    const lang = window.i18n?.getLang() || 'tr';
    const list = suggestions[lang] || suggestions['tr'];

    suggestionsBox.innerHTML = list.map(s => `
      <button class="chat-suggestion">${s}</button>
    `).join('');

    suggestionsBox.querySelectorAll('.chat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => {
        handleSend(btn.textContent);
      });
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
  }

  // ── EYE TRACKING & ANIMATIONS ────────────────────────────────
  document.addEventListener('mousemove', (e) => {
    const avatars = document.querySelectorAll('.ai-cat-avatar');
    avatars.forEach(avatar => {
      const rect = avatar.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Limit eye movement distance
      const distance = Math.min(Math.hypot(deltaX, deltaY), 10);
      const angle = Math.atan2(deltaY, deltaX);

      const moveX = Math.cos(angle) * distance * 0.3;
      const moveY = Math.sin(angle) * distance * 0.3;

      const eyes = avatar.querySelectorAll('.ai-cat-eye');
      eyes.forEach(eye => {
        // Keep the CSS animation by setting a custom property or direct transform
        // But since we have a scaleY(0.5) on hover in CSS, we should handle it gracefully
        eye.style.transform = `translate(${moveX}px, ${moveY}px)`;
      });
    });
  });

  window.addEventListener('load', () => {
    const triggerAvatar = document.getElementById('triggerAvatar');
    if (triggerAvatar) {
      triggerAvatar.classList.add('animate-greet');
      setTimeout(() => triggerAvatar.classList.remove('animate-greet'), 1500);
    }
  });

  // Initial call
  init();

  // Public API
  window.Chatbot = { toggleChat, showBubble };
})();
