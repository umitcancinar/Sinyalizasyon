/* chatbot.js — Sinyal AI Asistanı (Grok RAG entegrasyonu) */
(function () {
  const API = window.SINYAL_API || 'https://sinyal-backend-new.vercel.app/api';

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

  // ── SEND & FETCH ─────────────────────────────────────────────
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

    try {
      const lang = window.i18n ? window.i18n.getLang() : 'tr';
      const res = await fetch(`${API}/chatbot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language: lang, history: history.slice(-5) }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      hideTyping();
      addMessage('bot', data.reply);
      trigger.setAttribute('data-state', 'jump');
      setTimeout(() => { if (isOpen) trigger.setAttribute('data-state', 'idle'); }, 1000);

    } catch (err) {
      hideTyping();
      const errTxt = window.i18n?.getLang() === 'en' ? 'Sorry, I cannot connect to the server right now.' : 'Üzgünüm, şu an sunucuya bağlanamıyorum.';
      addMessage('bot', errTxt);
    }
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
