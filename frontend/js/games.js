/**
 * games.js — 3 Mini Oyun
 * 1. Memory (Hafıza Eşleştirme)
 * 2. Reflex (Refleks Testi)
 * 3. Word (Wordle tarzı Kelime)
 */
(function () {
  // ── UTILS ───────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  function saveScore(gameType, score) {
    const API = window.SINYAL_API || 'http://localhost:3002/api';
    const token = window.Auth?.getToken();
    if (!token) return;
    fetch(`${API}/games/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ game_type: gameType, score }),
    }).catch(() => {});
  }

  async function loadLeaderboard(gameType, containerId) {
    const API = window.SINYAL_API || 'http://localhost:3002/api';
    const el = $(containerId);
    if (!el) return;
    try {
      const res = await fetch(`${API}/games/scores?game_type=${gameType}`);
      const rows = await res.json();
      if (!rows.length) { el.innerHTML = '<div style="color:var(--text-3);font-size:13px;padding:8px 0">Henüz skor yok.</div>'; return; }
      const medals = ['🥇','🥈','🥉'];
      el.innerHTML = rows.slice(0,5).map((r, i) => `
        <div class="lb-row">
          <span class="lb-rank ${i<3?['gold','silver','bronze'][i]:''}">${medals[i]||i+1}</span>
          <span class="lb-name">${r.username}</span>
          <span class="lb-score">${r.score}</span>
        </div>`).join('');
    } catch (_) {}
  }

  // ── GAME TAB SWITCHING ────────────────────────────────────────
  document.querySelectorAll('.game-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const game = btn.dataset.game;
      document.querySelectorAll('.game-tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.game === game);
        b.setAttribute('aria-selected', b.dataset.game === game);
      });
      document.querySelectorAll('.game-panel').forEach(p => {
        p.classList.toggle('active', p.id === `game${game.charAt(0).toUpperCase()+game.slice(1)}`);
      });
      if (game === 'word' && !wordInitialized) initWord();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // 1. MEMORY GAME
  // ══════════════════════════════════════════════════════════════
  const EMOJIS = ['🚦','🚗','🛑','🏎️','🚕','🚙','🛺','🚌'];
  let memCards = [], memFlipped = [], memMatched = 0;
  let memMoves = 0, memScore = 0, memTimerVal = 0, memTimerIntvl = null;
  let memLocked = false;

  function initMemory() {
    memCards = []; memFlipped = []; memMatched = 0;
    memMoves = 0; memScore = 0; memTimerVal = 0; memLocked = false;
    clearInterval(memTimerIntvl);
    $('memMoves').textContent = '0';
    $('memScore').textContent = '0';
    $('memTimer').textContent = '0:00';

    const pairs = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);
    const grid = $('memoryGrid');
    grid.innerHTML = '';

    pairs.forEach((emoji, idx) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.emoji = emoji;
      card.dataset.idx = idx;
      card.setAttribute('role', 'gridcell');
      card.setAttribute('aria-label', 'Kart');
      card.innerHTML = `
        <div class="memory-card-inner">
          <div class="memory-card-front">🚦</div>
          <div class="memory-card-back">${emoji}</div>
        </div>`;
      card.addEventListener('click', () => flipCard(card));
      grid.appendChild(card);
      memCards.push(card);
    });

    // Timer start
    memTimerIntvl = setInterval(() => {
      memTimerVal++;
      const m = Math.floor(memTimerVal / 60), s = memTimerVal % 60;
      $('memTimer').textContent = `${m}:${String(s).padStart(2,'0')}`;
    }, 1000);

    loadLeaderboard('memory', 'memLeaderboard');
  }

  function flipCard(card) {
    if (memLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    card.classList.add('flipped');
    memFlipped.push(card);

    if (memFlipped.length === 2) {
      memMoves++;
      $('memMoves').textContent = memMoves;
      memLocked = true;
      setTimeout(checkMemMatch, 700);
    }
  }

  function checkMemMatch() {
    const [a, b] = memFlipped;
    if (a.dataset.emoji === b.dataset.emoji) {
      a.classList.add('matched'); b.classList.add('matched');
      memMatched += 2;
      const bonus = Math.max(0, 200 - memMoves * 5);
      memScore += 100 + bonus;
      $('memScore').textContent = memScore;
      if (memMatched === memCards.length) memWin();
    } else {
      a.classList.remove('flipped'); b.classList.remove('flipped');
    }
    memFlipped = [];
    memLocked = false;
  }

  function memWin() {
    clearInterval(memTimerIntvl);
    saveScore('memory', memScore);
    if (window.showToast) window.showToast(`🎉 Tebrikler! ${memScore} puan!`, 'success');
    setTimeout(() => loadLeaderboard('memory', 'memLeaderboard'), 1000);
  }

  $('memRestart')?.addEventListener('click', initMemory);

  // ══════════════════════════════════════════════════════════════
  // 2. REFLEX GAME
  // ══════════════════════════════════════════════════════════════
  let reflexState = 'idle'; // idle | wait | ready | done
  let reflexStart = 0, reflexTimeout = null;
  let reflexBestMs = parseInt(localStorage.getItem('sinyal_reflex_best') || '99999');

  function updateReflexBest() {
    $('reflexBest').textContent = reflexBestMs < 99999 ? `${reflexBestMs}ms` : '—';
  }
  updateReflexBest();

  function reflexReset() {
    clearTimeout(reflexTimeout);
    reflexState = 'idle';
    const area = $('reflexArea');
    area.className = 'reflex-area';
    $('reflexEmoji').textContent = '🔴';
    $('reflexLabel').textContent = 'Başlamak için ekrana dokun.';
  }

  $('reflexArea')?.addEventListener('click', () => {
    if (reflexState === 'idle') {
      reflexState = 'wait';
      $('reflexArea').className = 'reflex-area wait';
      $('reflexEmoji').textContent = '🔴';
      $('reflexLabel').textContent = 'Yeşil ışığı bekle...';
      const delay = 2000 + Math.random() * 4000;
      reflexTimeout = setTimeout(() => {
        reflexState = 'ready';
        reflexStart = Date.now();
        $('reflexArea').className = 'reflex-area ready';
        $('reflexEmoji').textContent = '🟢';
        $('reflexLabel').textContent = window.i18n ? window.i18n.t('reflex.ready') : '🟢 DOKUN!';
      }, delay);
    } else if (reflexState === 'wait') {
      clearTimeout(reflexTimeout);
      $('reflexArea').className = 'reflex-area';
      $('reflexEmoji').textContent = '⚡';
      $('reflexLabel').textContent = window.i18n ? window.i18n.t('reflex.early') : 'Çok erken!';
      setTimeout(reflexReset, 1200);
    } else if (reflexState === 'ready') {
      const ms = Date.now() - reflexStart;
      reflexState = 'done';
      $('reflexArea').className = 'reflex-area done';
      $('reflexEmoji').innerHTML = `<span class="reflex-result">${ms}ms</span>`;
      if (ms < reflexBestMs) {
        reflexBestMs = ms;
        localStorage.setItem('sinyal_reflex_best', ms);
        updateReflexBest();
        saveScore('reflex', Math.round(10000 / ms * 100));
        if (window.showToast) window.showToast(`⚡ Yeni Rekor: ${ms}ms!`, 'success');
      } else {
        $('reflexLabel').textContent = `En iyi: ${reflexBestMs}ms`;
      }
      setTimeout(() => loadLeaderboard('reflex', 'reflexLeaderboard'), 500);
      setTimeout(reflexReset, 2500);
    }
  });

  loadLeaderboard('reflex', 'reflexLeaderboard');

  // ══════════════════════════════════════════════════════════════
  // 3. WORD GAME (Wordle tarzı, trafik terimleri)
  // ══════════════════════════════════════════════════════════════
  const WORDS = ['IŞIK','ŞERIT','KAVŞAK','SINYAL','ARAÇ','HIZLI','KIRMIZI','YEŞİL','SARILI','DURAK'];
  const WORD5 = ['ARAÇ', 'ŞERIT', 'IŞIK']; // 4-6 harf kelimeler

  // Kelime listesi — trafik temaları (5 harf)
  const WORD_LIST_5 = ['KIRMZ','SINYG','ARAÇK','YOLCU','TRAFK','DURMA','KAVŞK','PLAKA',
    'FRENK','VIRAJ','PARK ','SINRL','MAKAS','GEÇIŞ','ŞERIT'];
  // Gerçek kelimeler
  const ACTUAL_WORDS = ['KAPAK','POSTA','GELEN','SINIR','BULUT','ŞEHIR','CADDE','RAMPA'];

  let wordTarget = '', wordAttempt = '', wordRow = 0, wordMaxRows = 6, wordInitialized = false;

  function initWord() {
    wordInitialized = true;
    const allWords = ['KAVŞAK','TRAFIK','KIRMIZ','SINYAG','ARAÇLA']; // 6-harf
    // Use simple 5-char traffic words
    const pool = ['SINIG','KAVŞK','TRAFK','YOLCU','DURAK','IŞIKS','ARAÇA','ŞERIT','FRENI','KAÇIŞ'];
    wordTarget = (['KIRMZ','SINYG','ARAÇK','YOLCU','KAVŞK','TRAFK','DURMA','FRENH','ŞERIT','VIRAJ'])[Math.floor(Math.random()*10)];
    // Actually use real 5-letter words
    const realWords = ['KAVAK','YOLCU','DURAK','SIREN','RAMPA','VIRAJ','FRENI','KÖPRÜ','MEYDA','CADDE'];
    wordTarget = realWords[Math.floor(Math.random() * realWords.length)];

    wordAttempt = ''; wordRow = 0;
    buildWordGrid();
    buildKeyboard();
    $('wordMsg').textContent = '';
    $('wordAttemptChip').innerHTML = `${wordMaxRows} <span>${window.i18n?.t('word.attempts') || 'hakkınız var'}</span>`;
  }

  function buildWordGrid() {
    const grid = $('wordGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let r = 0; r < wordMaxRows; r++) {
      const row = document.createElement('div');
      row.className = 'word-row';
      row.id = `wrow-${r}`;
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'word-cell';
        cell.id = `wcell-${r}-${c}`;
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }
  }

  const KB_ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','⌫'],
  ];

  function buildKeyboard() {
    const kb = $('wordKeyboard');
    if (!kb) return;
    kb.innerHTML = '';
    KB_ROWS.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'word-kb-row';
      row.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'word-kb-key' + (key.length > 1 ? ' wide' : '');
        btn.textContent = key;
        btn.dataset.key = key;
        btn.addEventListener('click', () => handleWordKey(key));
        rowEl.appendChild(btn);
      });
      kb.appendChild(rowEl);
    });
  }

  function handleWordKey(key) {
    if (wordRow >= wordMaxRows) return;
    if (key === '⌫') {
      wordAttempt = wordAttempt.slice(0, -1);
    } else if (key === 'ENTER') {
      if (wordAttempt.length < 5) { $('wordMsg').textContent = '5 harf giriniz!'; return; }
      submitWord();
      return;
    } else if (wordAttempt.length < 5) {
      wordAttempt += key;
    }
    updateWordRow();
  }

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('gameWord')?.classList.contains('active')) return;
    const key = e.key.toUpperCase();
    if (key === 'BACKSPACE') handleWordKey('⌫');
    else if (key === 'ENTER') handleWordKey('ENTER');
    else if (/^[A-ZÇĞİÖŞÜ]$/.test(key)) handleWordKey(key);
  });

  function updateWordRow() {
    for (let c = 0; c < 5; c++) {
      const cell = $(`wcell-${wordRow}-${c}`);
      if (cell) {
        cell.textContent = wordAttempt[c] || '';
        cell.className = 'word-cell' + (c === wordAttempt.length - 1 ? ' active' : '');
      }
    }
  }

  function submitWord() {
    const guess = wordAttempt.padEnd(5,' ').toUpperCase();
    const target = wordTarget.toUpperCase();
    const result = Array(5).fill('absent');
    const targetArr = target.split('');
    const guessArr  = guess.split('');

    // First pass: correct positions
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] === targetArr[i]) {
        result[i] = 'correct';
        targetArr[i] = null;
        guessArr[i]  = null;
      }
    }
    // Second pass: present
    for (let i = 0; i < 5; i++) {
      if (guessArr[i] && targetArr.includes(guessArr[i])) {
        result[i] = 'present';
        targetArr[targetArr.indexOf(guessArr[i])] = null;
      }
    }

    // Animate cells
    guess.split('').forEach((letter, c) => {
      setTimeout(() => {
        const cell = $(`wcell-${wordRow}-${c}`);
        if (cell) { cell.textContent = letter === ' ' ? '' : letter; cell.className = `word-cell ${result[c]}`; }
        // Update keyboard
        const kbKey = document.querySelector(`.word-kb-key[data-key="${letter}"]`);
        if (kbKey) {
          if (result[c] === 'correct') kbKey.className = 'word-kb-key correct';
          else if (result[c] === 'present' && !kbKey.classList.contains('correct')) kbKey.className = 'word-kb-key present';
          else if (!kbKey.classList.contains('correct') && !kbKey.classList.contains('present')) kbKey.className = 'word-kb-key absent';
        }
      }, c * 100);
    });

    wordRow++;
    wordAttempt = '';
    $('wordAttemptChip').innerHTML = `${wordMaxRows - wordRow} <span>${window.i18n?.t('word.attempts') || 'hakkınız var'}</span>`;

    setTimeout(() => {
      if (guess.replace(/ /g,'') === target) {
        $('wordMsg').textContent = '🎉 Harika! Kelimeyi buldunuz!';
        const scoreVal = (wordMaxRows - wordRow + 1) * 100;
        saveScore('word', scoreVal);
        if (window.showToast) window.showToast(`✅ Kelime: ${target} — ${scoreVal} puan!`, 'success');
      } else if (wordRow >= wordMaxRows) {
        $('wordMsg').textContent = `❌ Kelime: ${target}`;
        if (window.showToast) window.showToast(`Kelime: ${target}`, 'error');
      }
    }, 600);
  }

  $('wordRestart')?.addEventListener('click', initWord);

  // ── INIT ─────────────────────────────────────────────────────
  initMemory();
  // Word game lazily initialized on first tab click
})();
