// ============================================================
// app.js — Expat Language Guide
// All logic and rendering lives here. No raw data, no styles.
// Depends on: data.js (must load before this file)
// Sections:
//   - Google Translate init
//   - Favorites (localStorage)
//   - Voice / Speech
//   - Hamburger Drawer
//   - Search Filter
//   - Build Panel (HTML rendering)
//   - Render All Panels
//   - Switch Language
//   - Switch Section
// ============================================================

// ─────────────────────────────────────────────
// GOOGLE TRANSLATE
// ─────────────────────────────────────────────
function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: 'en',
    includedLanguages: 'th,fr,es,nl,ko,vi,id,ja,pt,zh-CN',
    layout: google.translate.TranslateElement.InlineLayout.SIMPLE
  }, 'google_translate_element');
}

// ─────────────────────────────────────────────
// FAVORITES
// ─────────────────────────────────────────────
let favorites = JSON.parse(localStorage.getItem('expatFavs') || '{}');

function saveFavs() {
  localStorage.setItem('expatFavs', JSON.stringify(favorites));
}

function toggleFav(id, btn) {
  favorites[id] = !favorites[id];
  if (!favorites[id]) delete favorites[id];
  btn.classList.toggle('faved', !!favorites[id]);
  btn.title = favorites[id] ? 'Unfavorite' : 'Favorite';
  saveFavs();
}

// ─────────────────────────────────────────────
// VOICE GENDER STATE
// ─────────────────────────────────────────────
const voicePrefs = {}; // { langCode: 'male'|'female' }

function speak(text, langCode) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  u.rate = 0.85;

  const gender = voicePrefs[langCode]
    || LANGS[Object.keys(LANGS).find(k => LANGS[k].voiceCode === langCode)]?.voiceGender
    || 'female';

  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    const langVoices = voices.filter(v => v.lang.startsWith(langCode.split('-')[0]));
    if (langVoices.length) {
      const preferred = langVoices.find(v => {
        const n = v.name.toLowerCase();
        return gender === 'female'
          ? (n.includes('female') || n.includes('woman') || n.includes('girl') || n.match(/\b(f)\b/))
          : (n.includes('male') || n.includes('man') || n.includes('boy'));
      }) || langVoices[gender === 'female' ? 0 : langVoices.length - 1];
      u.voice = preferred;
    }
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function setVoiceGender(langCode, gender, btn) {
  voicePrefs[langCode] = gender;
  const wrap = btn.closest('.voice-toggle');
  wrap.querySelectorAll('.voice-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ─────────────────────────────────────────────
// HAMBURGER DRAWER
// ─────────────────────────────────────────────
function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  const btn = document.getElementById('hamburgerBtn');
  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    closeDrawer();
  } else {
    drawer.classList.add('open');
    overlay.classList.add('open');
    btn.classList.add('open');
  }
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.getElementById('hamburgerBtn').classList.remove('open');
}

// ─────────────────────────────────────────────
// SEARCH FILTER
// ─────────────────────────────────────────────
function filterWords(langCode, query) {
  const panel = document.getElementById('panel-' + langCode);
  if (!panel) return;
  const cards = panel.querySelectorAll('.word-card');
  const q = query.toLowerCase();
  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = (!q || text.includes(q)) ? '' : 'none';
  });
}

// ─────────────────────────────────────────────
// BUILD PANEL (renders one language panel)
// ─────────────────────────────────────────────
function buildPanel(code) {
  const L = LANGS[code];
  const defaultGender = L.voiceGender || 'female';

  const catHtml = Object.entries(L.categories).map(([catName, catData]) => {

    // Numbers 1–20: special tappable drill grid
    if (catName === '🔢 Numbers 1–20') {
      const numHtml = catData.words.map(w => {
        const romanRow = w.rom ? `<div class="number-rom">${w.rom}</div>` : '';
        return `<div class="number-card" onclick="speak('${w.tr.replace(/'/g,"\\'")}','${L.voiceCode}')">
          <button class="speak-btn" onclick="event.stopPropagation();speak('${w.tr.replace(/'/g,"\\'")}','${L.voiceCode}')">🔊</button>
          <div class="number-digit">${w.en}</div>
          <div class="number-tr">${w.tr}</div>
          ${romanRow}
        </div>`;
      }).join('');
      return `<div class="category-block">
        <div class="category-label ${catData.cls}">${catName}</div>
        <p style="font-size:0.85rem;color:var(--ink-muted);margin-bottom:0.75rem;font-style:italic;">Tap any card to hear it spoken aloud.</p>
        <div class="number-grid">${numHtml}</div>
      </div>`;
    }

    // Standard word cards
    const wordsHtml = catData.words.map((w, i) => {
      const id = `${code}-${catName}-${i}`;
      const isFaved = !!favorites[id];
      const romanRow = w.rom ? `<div class="word-roman">${w.rom}</div>` : '';
      return `<div class="word-card">
        <span class="word-en">${w.en}</span>
        <div class="word-right">
          <div class="word-translated">${w.tr}</div>
          ${romanRow}
        </div>
        <button class="speak-btn" onclick="speak('${w.tr.replace(/'/g,"\\'")}','${L.voiceCode}')" title="Pronounce">🔊</button>
        <button class="fav-btn ${isFaved ? 'faved' : ''}" onclick="toggleFav('${id}',this)" title="${isFaved ? 'Unfavorite' : 'Favorite'}">★</button>
      </div>`;
    }).join('');

    return `<div class="category-block">
      <div class="category-label ${catData.cls}">${catName}</div>
      <div class="word-grid">${wordsHtml}</div>
    </div>`;
  }).join('');

  // Sentences
  const sentHtml = L.sentences.map((s, i) => {
    const romanRow = s.rom ? `<div class="sentence-roman">${s.rom}</div>` : '';
    return `<div class="sentence-card">
      <div class="sentence-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="sentence-body">
        <div class="sentence-en">${s.en}</div>
        <div class="sentence-tr">${s.tr}</div>
        ${romanRow}
      </div>
      <button class="speak-btn" onclick="speak('${s.tr.replace(/'/g,"\\'")}','${L.voiceCode}')" title="Pronounce">🔊</button>
    </div>`;
  }).join('');

  // Emergency phrases
  const emergHtml = L.emergency.map(e => {
    const romanRow = e.rom ? `<div class="emergency-roman">${e.rom}</div>` : '';
    return `<div class="emergency-card">
      <div class="emergency-en">${e.en}</div>
      <div class="emergency-tr">${e.tr}</div>
      ${romanRow}
      <button class="emergency-speak" onclick="speak('${e.tr.replace(/'/g,"\\'")}','${L.voiceCode}')">🔊 Say it</button>
    </div>`;
  }).join('');

  const needsRoman = ['th', 'ko', 'ja', 'zh', 'vi'].includes(code);
  const romanNote = needsRoman
    ? `<p style="color:var(--ink-muted);font-style:italic;font-size:0.9rem;margin-bottom:1rem;">💡 Romanization shown below each word to help with pronunciation.</p>`
    : '';

  return `<div id="panel-${code}" class="lang-panel${code === 'th' ? ' active' : ''}">
    <div class="lang-hero">
      <div class="lang-flag">${L.flag}</div>
      <div class="lang-hero-text">
        <div class="native-name">${L.native}</div>
        <h2>${L.name}</h2>
        <p>${L.tip}</p>
      </div>
    </div>

    <div class="voice-toggle-wrap">
      <span class="voice-toggle-label">🎙 Voice:</span>
      <div class="voice-toggle">
        <button class="voice-btn ${defaultGender === 'female' ? 'active' : ''}" onclick="setVoiceGender('${L.voiceCode}','female',this)">♀ Female</button>
        <button class="voice-btn ${defaultGender === 'male' ? 'active' : ''}" onclick="setVoiceGender('${L.voiceCode}','male',this)">♂ Male</button>
      </div>
    </div>

    <div class="cultural-notes">
      <h3>✦ Cultural Tips</h3>
      <ul>${L.cultural.map(c => `<li>${c}</li>`).join('')}</ul>
    </div>

    <div class="section-tabs">
      <button class="sec-btn active" onclick="switchSection('${code}','words',this)">📖 Words</button>
      <button class="sec-btn" onclick="switchSection('${code}','sentences',this)">💬 50 Sentences</button>
      <button class="sec-btn" onclick="switchSection('${code}','emergency',this)">🚨 Emergency</button>
    </div>

    <div id="sec-${code}-words" class="section-content active">
      ${romanNote}
      <div class="search-bar">
        <input class="search-input" type="text" placeholder="Search words..." oninput="filterWords('${code}',this.value)">
      </div>
      ${catHtml}
    </div>

    <div id="sec-${code}-sentences" class="section-content">
      <div class="sentence-list">${sentHtml}</div>
    </div>

    <div id="sec-${code}-emergency" class="section-content">
      <p style="color:var(--rose);font-weight:700;margin-bottom:1rem;font-size:1.05rem;">⚠️ Save this page offline for emergencies. Tap 🔊 to hear the phrase spoken aloud.</p>
      <div class="emergency-grid">${emergHtml}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// RENDER ALL PANELS
// ─────────────────────────────────────────────
const main = document.getElementById('mainContent');
main.innerHTML = Object.keys(LANGS).map(buildPanel).join('');

// ─────────────────────────────────────────────
// SWITCH LANGUAGE
// ─────────────────────────────────────────────
function switchLang(code) {
  document.querySelectorAll('.lang-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.drawer-lang-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + code).classList.add('active');
  const keys = Object.keys(LANGS);
  const idx = keys.indexOf(code);
  document.querySelectorAll('.lang-btn')[idx]?.classList.add('active');
  document.querySelectorAll('.drawer-lang-btn')[idx]?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─────────────────────────────────────────────
// SWITCH SECTION
// ─────────────────────────────────────────────
function switchSection(code, sec, btn) {
  const panel = document.getElementById('panel-' + code);
  panel.querySelectorAll('.section-content').forEach(s => s.classList.remove('active'));
  panel.querySelectorAll('.sec-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`sec-${code}-${sec}`).classList.add('active');
  btn.classList.add('active');
}
