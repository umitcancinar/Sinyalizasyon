/* contacts.js — Hızlı Arama ve Hazır Mesajlar */
(function () {
  const API = window.SINYAL_API || 'http://localhost:3002/api';

  const ICON_MAP = {
    emergency: '🚨',
    roadside: '🔧',
    government: '🏢',
    police: '👮',
    fire: '🚒',
    ambulance: '🚑'
  };

  async function loadContacts() {
    const list = document.getElementById('contactsList');
    if (!list) return;

    try {
      const res = await fetch(`${API}/content/contacts`);
      if (!res.ok) throw new Error();
      const contacts = await res.json();

      list.innerHTML = contacts.map(c => `
         <a href="tel:${c.phone.replace(/\s+/g, '')}" class="contact-item" data-category="${c.category}">
           <div class="contact-icon">${ICON_MAP[c.category] || '📞'}</div>
           <div class="contact-info">
             <h4 class="contact-name">${c.category === 'emergency' || c.category === 'roadside' || c.category === 'government' ? c.name : c.name}</h4>
             <span class="contact-phone">${c.phone}</span>
           </div>
           <div class="contact-call-icon">📞</div>
         </a>
       `).join('');
    } catch (_) {
      // Fallback
      list.innerHTML = `
        <a href="tel:112" class="contact-item" data-category="emergency">
          <div class="contact-icon">🚑</div>
          <div class="contact-info"><h4 class="contact-name">Acil Çağrı (Tüm)</h4><span class="contact-phone">112</span></div>
          <div class="contact-call-icon">📞</div>
        </a>
        <a href="tel:155" class="contact-item" data-category="police">
          <div class="contact-icon">👮</div>
          <div class="contact-info"><h4 class="contact-name">Polis İmdat</h4><span class="contact-phone">155</span></div>
          <div class="contact-call-icon">📞</div>
        </a>
        <a href="tel:159" class="contact-item" data-category="roadside">
          <div class="contact-icon">🛣️</div>
          <div class="contact-info"><h4 class="contact-name">Karayolları</h4><span class="contact-phone">159</span></div>
          <div class="contact-call-icon">📞</div>
        </a>
      `;
    }
  }

  async function loadTemplates() {
    const list = document.getElementById('templatesList');
    if (!list) return;

    try {
      const res = await fetch(`${API}/content/templates`);
      if (!res.ok) throw new Error();
      const templates = await res.json();

      list.innerHTML = templates.map(t => {
        const textStr = window.i18n?.getLang() === 'en' ? t.content_en : t.content_tr;
        return renderTemplateItem(t.emoji, textStr);
      }).join('');
    } catch (_) {
      // Fallback
      const fallbacks = [
        { emoji: '🚦', text: 'Kırmızı ışıkta bekliyorum, birazdan yola çıkacağım.' },
        { emoji: '🚗', text: 'Trafik biraz yoğun, tahmini 10 dakikaya oradayım.' },
        { emoji: '🛣️', text: 'Yoldayım, yaklaşıyorum.' },
        { emoji: '🅿️', text: 'Vardım, park yeri arıyorum.' }
      ];
      list.innerHTML = fallbacks.map(t => renderTemplateItem(t.emoji, t.text)).join('');
    }

    // Attach events
    list.querySelectorAll('.template-item').forEach(item => {
      item.querySelector('.btn-sms').addEventListener('click', (e) => {
        e.stopPropagation();
        sendMessage('sms', item.dataset.text);
      });
      item.querySelector('.btn-wa').addEventListener('click', (e) => {
        e.stopPropagation();
        sendMessage('wa', item.dataset.text);
      });
      // Click whole row defaults to WA
      item.addEventListener('click', () => sendMessage('wa', item.dataset.text));
    });
  }

  function renderTemplateItem(emoji, text) {
    return `
      <div class="template-item" data-text="${encodeURIComponent(text)}">
        <span class="template-emoji">${emoji}</span>
        <span class="template-text">${text}</span>
        <div class="template-send-icons">
          <button class="template-send-btn btn-sms" title="SMS Gönder">💬</button>
          <button class="template-send-btn btn-wa" title="WhatsApp Gönder">📱</button>
        </div>
      </div>
    `;
  }

  function sendMessage(type, encodedText) {
    const phoneInput = document.getElementById('msgPhone');
    let phone = phoneInput ? phoneInput.value.replace(/[^0-9]/g, '') : '';
    const text = decodeURIComponent(encodedText);

    if (type === 'sms') {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
    } else if (type === 'wa') {
      if (phone && !phone.startsWith('90')) phone = '90' + phone;
      const url = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  }

  window.addEventListener('langchange', loadTemplates);

  loadContacts();
  loadTemplates();

  window.Contacts = { loadContacts, loadTemplates };
})();
