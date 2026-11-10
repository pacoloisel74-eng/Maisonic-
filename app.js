(() => {
'use strict';

/* =====================================================================
   Maisonic — application mobile (PWA). Aucune dépendance.
   Points de branchement du paiement : window.Maisonic (voir README).
   ===================================================================== */

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');
const LS = 'maisonic.v1';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Questions ---------- */
const QS = [
  { k: 'lieu', t: "Où t'entraînes-tu ?", o: ['Salon', 'Chambre', 'Extérieur'] },
  { k: 'niveau', t: 'Ton niveau aujourd\'hui ?', o: ['Je débute', "Je m'y remets", "Je m'entraîne déjà"] },
  { k: 'pompes', t: 'Combien de pompes d\'affilée ?', o: ['Moins de 5', '5 à 15', 'Plus de 15'] },
  { k: 'temps', t: 'Combien de temps par jour ?', o: ['10 min', '20 min', '30 min'] },
  { k: 'frein', t: "Qu'est-ce qui te fait arrêter ?", o: ["Je n'ai pas de motivation", 'Je ne sais pas quoi faire', 'Je manque de temps', "Je m'ennuie"] },
  { k: 'objectif', t: 'Ton objectif principal ?', o: ['Me muscler', 'Perdre du gras', 'Être plus en forme', 'Reprendre une routine'] },
  { k: 'seances', t: 'Combien de séances par semaine ?', o: ['3', '4', '5', '6'], row: true }
];
const FLOW = ['q0', 'q1', 'q2', 'q3', 'q4', 'analysis', 'email', 'q5', 'q6', 'projection', 'building', 'blur'];
const PROGRESS_STEPS = ['q0', 'q1', 'q2', 'q3', 'q4', 'analysis', 'email', 'q5', 'q6'];
const ETATS = ['En forme', 'Moyen', 'Fatigué'];

/* ---------- Icônes ---------- */
const ic = (p, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
const ICON = {
  back: ic('<path d="M15 5l-7 7 7 7"/>'),
  close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  err: ic('<circle cx="12" cy="12" r="9.5"/><path d="M12 7v6M12 16.5v.5"/>'),
  dumb: ic('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  chart: ic('<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>'),
  user: ic('<circle cx="12" cy="8" r="4"/><path d="M4.5 20c1.2-4 4-5.5 7.5-5.5s6.3 1.5 7.5 5.5"/>'),
  google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.4V7H2.2a11 11 0 0 0 0 10l3.6-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7l3.6 2.8C6.7 7.300 9.100 5.400 12 5.400z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.500 2-3.700 2.100-3.800-1.200-1.700-3-1.900-3.600-2-1.500-.2-3 .9-3.800.9-.8 0-2-.9-3.300-.9-1.700 0-3.300 1-4.200 2.500-1.800 3.100-.5 7.700 1.300 10.200.9 1.200 1.900 2.600 3.200 2.500 1.300-.1 1.800-.8 3.300-.8s2 .8 3.300.8c1.400 0 2.300-1.200 3.100-2.500 1-1.400 1.400-2.800 1.400-2.900-.1 0-2.800-1-2.800-4zM14 5.300c.7-.9 1.200-2 1-3.300-1 0-2.300.7-3 1.600-.7.800-1.200 2-1.100 3.200 1.100.1 2.300-.6 3.100-1.500z"/></svg>'
};

const SIL = `<svg class="sil" viewBox="0 0 300 400" fill="none" stroke="#7A6B5F" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="24" y="262" width="252" height="28" rx="14"/>
  <circle cx="70" cy="188" r="17"/>
  <path d="M86 205l112 20 56 20"/>
  <path d="M104 208v54M210 227v35"/>
  <path d="M254 245v17"/>
</svg>`;

const WELCOME_ART = `<svg viewBox="0 0 300 220" fill="none" stroke="#E4572E" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Un tapis et des haltères">
  <rect x="30" y="150" width="240" height="34" rx="16"/>
  <circle cx="64" cy="167" r="9"/>
  <path d="M30 168h12"/>
  <path d="M96 60v50M104 52v66M204 60v50M196 52v66M104 85h92"/>
  <path d="M88 68v34M212 68v34"/>
</svg>`;

/* ---------- État ---------- */
const defaults = {
  seen: false, step: 'welcome', answers: {}, email: '', token: '', user: null, trial: null, trialKey: '',
  planStart: null, history: [], materiel: 'aucun', premium: false, today: null
};
let S;
try { S = Object.assign({}, defaults, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) { S = Object.assign({}, defaults); }
if (typeof S.answers !== 'object' || !S.answers) S.answers = {};
if (!Array.isArray(S.history)) S.history = [];

let tab = 'seance';
let Z = { state: 'idle', etat: 'En forme', douleur: false, session: null, kind: '' };
let aerr = null;           // erreur de la première analyse
let authFrom = 'blur';
let A = { loading: '', err: '' };
let plan = 'annual';
let R = null;              // minuteur
let timers = [];

const SYNC_KEYS = ['answers', 'email', 'trial', 'trialKey', 'planStart', 'history', 'materiel', 'today'];
function save() { try { localStorage.setItem(LS, JSON.stringify(S)); } catch (e) { /* stockage plein ou bloqué */ } scheduleSync(); }
let syncT;
function scheduleSync() { if (!S.token) return; clearTimeout(syncT); syncT = setTimeout(pushData, 800); }
async function pushData() {
  if (!S.token) return;
  const data = {}; SYNC_KEYS.forEach((k) => { data[k] = S[k]; });
  try { await api('/api/me', { method: 'PUT', body: { data } }); } catch (e) { /* réessai à la prochaine sauvegarde */ }
}
async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch(path, {
    method,
    headers: Object.assign({ 'content-type': 'application/json' }, S.token ? { authorization: 'Bearer ' + S.token } : {}),
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, json };
}

/* ---------- Outils ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayKey = () => new Date().toLocaleDateString('sv');
const dayName = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
function toast(msg) {
  $toast.textContent = msg; $toast.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { $toast.hidden = true; }, 3500);
}
function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }
function clearTimers() { timers.forEach(clearTimeout); timers = []; }
function level() {
  const a = S.answers;
  const n = Math.max(0, QS[1].o.indexOf(a.niveau)), p = Math.max(0, QS[2].o.indexOf(a.pompes));
  const sc = n + p; return sc <= 1 ? 1 : sc <= 3 ? 2 : 3;
}
function weekNo() {
  if (!S.planStart) return 1;
  return Math.min(52, Math.max(1, Math.floor((Date.now() - S.planStart) / (7 * 86400000)) + 1));
}
const goalSessions = () => parseInt(S.answers.seances, 10) || 3;
function params(extra) {
  const a = S.answers;
  return Object.assign({
    niveau: a.niveau, pompes: a.pompes, lieu: a.lieu, frein: a.frein,
    objectif: a.objectif || 'Être plus en forme', temps: parseInt(a.temps, 10) || 20,
    materiel: S.materiel, etat: 'En forme', semaine: weekNo(), niveauNum: level(), douleur: false
  }, extra || {});
}
function answersKey() { const a = S.answers; return [a.lieu, a.niveau, a.pompes, a.temps, a.frein].join('|'); }

/* ---------- Validation de la réponse du modèle ---------- */
const okStr = (v, a, b) => typeof v === 'string' && v.trim().length >= a && v.trim().length <= b;
const okInt = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
function validate(o) {
  try {
    if (!o || !okInt(o.duree_minutes, 5, 60) || !okStr(o.verdict, 5, 160) || !okStr(o.progression, 5, 120)) return null;
    if (!Array.isArray(o.exercices) || o.exercices.length < 3 || o.exercices.length > 8) return null;
    for (const e of o.exercices) {
      if (!e || !okStr(e.nom, 2, 70) || !okStr(e.conseil, 5, 160) || !okInt(e.series, 1, 8) || !okInt(e.repos_secondes, 10, 180)) return null;
      if (e.type === 'reps') { if (!okInt(e.repetitions, 1, 80)) return null; }
      else if (e.type === 'duree') { if (!okInt(e.duree_secondes, 10, 240)) return null; }
      else return null;
    }
    return o;
  } catch (e) { return null; }
}
async function callSession(p) {
  try {
    const r = await api('/api/session', { method: 'POST', body: p });
    if (r.json && r.json.alerte === 'douleur') return { ok: false, kind: 'injury' };
    if (r.ok && r.json && validate(r.json.session)) return { ok: true, session: r.json.session };
    return { ok: false, kind: 'invalid' };
  } catch (e) { return { ok: false, kind: 'network' }; }
}

/* ---------- Animation d'analyse (3,5 s) ---------- */
const SCAN_MSGS = ['Lecture de ton niveau…', 'Choix des exercices…', "Réglage de l'intensité de la semaine…"];
function scanHTML(extraClass = '') {
  return `<div class="screen scanwrap ${extraClass}" role="status" aria-live="polite">
    <div class="scan-stage">${SIL}<div class="scan-line"></div></div>
    <p class="scan-msg" id="scanmsg">${SCAN_MSGS[0]}</p></div>`;
}
function startScanMessages() {
  [1, 2].forEach((n) => later(() => {
    const e = document.getElementById('scanmsg'); if (!e) return;
    e.classList.add('out');
    later(() => { const e2 = document.getElementById('scanmsg'); if (e2) { e2.textContent = SCAN_MSGS[n]; e2.classList.remove('out'); } }, 300);
  }, 1100 * n));
}
async function analyze(p) {
  startScanMessages();
  const [r] = await Promise.all([callSession(p), new Promise((res) => setTimeout(res, 3500))]);
  return r;
}

/* ---------- Navigation ---------- */
function go(step) { S.step = step; save(); render(); }
function prevStep(step) {
  if (step === 'q0') return 'welcome';
  const i = FLOW.indexOf(step); if (i <= 0) return 'welcome';
  let p = FLOW[i - 1]; if (p === 'analysis') p = 'q4'; return p;
}
function topbar(step) {
  const i = PROGRESS_STEPS.indexOf(step);
  const pct = Math.round(((i + 1) / PROGRESS_STEPS.length) * 100);
  return `<div class="topbar"><button class="iconbtn" data-act="back" aria-label="Retour">${ICON.back}</button>
    <div class="bar" role="progressbar" aria-label="Progression" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div></div>`;
}

/* ---------- Vues : bienvenue et onboarding ---------- */
function vWelcome() {
  return `<div class="screen welcome">
    <h1 class="logo">Maisonic</h1>
    <p class="tag">Chaque jour, ta séance sans salle, un peu plus dure chaque semaine.</p>
    ${WELCOME_ART}
    <div class="cta" style="width:100%">
      <button class="btn primary" data-act="start">Commencer</button>
      <button class="btn ghost" data-act="haveaccount">J'ai déjà un compte</button>
    </div></div>`;
}
function vQ(i) {
  const q = QS[i], sel = S.answers[q.k];
  return `<div class="screen q">${topbar('q' + i)}<h1>${esc(q.t)}</h1>
    <div class="choices ${q.row ? 'row' : ''}" role="radiogroup" aria-label="${esc(q.t)}">
    ${q.o.map((o) => `<button class="choice ${sel === o ? 'on' : ''}" role="radio" aria-checked="${sel === o}" data-act="pick" data-i="${i}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}
    </div></div>`;
}
function vAnalysis() {
  if (!aerr) return scanHTML();
  return `<div class="screen">${`<div class="topbar"><button class="iconbtn" data-act="back" aria-label="Retour">${ICON.back}</button></div>`}
    <div class="empty"><div class="errline" role="alert">${ICON.err}<span>On n'a pas pu préparer ta séance. Vérifie tes réponses et réessaie.</span></div></div>
    <div class="cta"><button class="btn primary" data-act="retryOnb">Réessayer</button></div></div>`;
}
const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
function vEmail() {
  return `<div class="screen q">${topbar('email')}<h1>Entre ton e-mail pour sauvegarder ta séance</h1>
    <label class="muted" for="emailin" style="margin-bottom:8px">Ton adresse e-mail</label>
    <input id="emailin" class="field" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(S.email)}" placeholder="prenom@exemple.fr">
    <div class="hint" id="emailhint" aria-live="polite"></div>
    <div class="cta"><button class="btn primary" id="emailbtn" data-act="saveEmail" ${validEmail(S.email) ? '' : 'disabled'}>Sauvegarder</button></div></div>`;
}

/* ---------- Résultat ---------- */
const fmtSets = (e) => e.type === 'reps' ? `${e.series} × ${e.repetitions}` : `${e.series} × ${e.duree_secondes} s`;
function exCards(list) {
  return `<div class="cards">${list.map((e) => `<div class="card"><div class="row"><h3>${esc(e.nom)}</h3><span class="sets">${fmtSets(e)}</span></div>
    <p class="rest">Repos : ${e.repos_secondes} s</p><p class="tip">${esc(e.conseil)}</p></div>`).join('')}</div>`;
}
function resultHead(s, title) {
  return `<div class="rhead"><span class="brand">Maisonic</span><span class="muted">${title}</span></div>
    <div class="big"><span class="num">${s.duree_minutes}</span><span class="unit">min</span></div>
    <p class="verdict">${esc(s.verdict)}</p>`;
}
function vResult(s) {
  return `${resultHead(s, 'Séance du ' + dayName())}${exCards(s.exercices)}<p class="prog">${esc(s.progression)}</p>
    <div class="cta"><button class="btn primary" data-act="run">Commencer la séance</button>
    <button class="btn secondary" id="sharebtn" data-act="share"><span class="spin"></span>Partager</button></div>`;
}
const DAYS_BY = { 3: ['Lundi', 'Mercredi', 'Vendredi'], 4: ['Lundi', 'Mardi', 'Jeudi', 'Samedi'], 5: ['Lundi', 'Mardi', 'Mercredi', 'Vendredi', 'Samedi'], 6: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] };
function blurBody(s) {
  const mins = parseInt(S.answers.temps, 10) || 20;
  const days = DAYS_BY[goalSessions()] || DAYS_BY[3];
  return `${resultHead(s, 'Séance 1 · semaine 1')}
    <div class="blurred" aria-hidden="true">${exCards(s.exercices)}
    <p class="prog">Ton plan de la semaine</p><div class="cards">${days.map((d, i) => `<div class="weekrow"><span>${d}</span><span>Séance ${i + 1} · ${mins} min</span></div>`).join('')}</div></div>`;
}
function vBlur() {
  const s = S.trial; if (!s) return '<div class="screen"></div>';
  return `<div class="screen" style="padding-bottom:0">${blurBody(s)}
    <div class="cta"><button class="btn primary" data-act="unlock">Débloquer mon plan</button></div></div>`;
}

/* ---------- Projection, construction ---------- */
function baseReps() {
  const l = (S.trial && S.trial.exercices || []).filter((e) => e.type === 'reps').map((e) => e.repetitions);
  return l.length ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : 8;
}
function vProjection() {
  const r0 = baseReps(), pts = [0, 1, 2, 3].map((w) => r0 + 2 * w);
  const W = 320, H = 210, L = 36, Rr = 20, T = 28, B = 40;
  const min = r0 - 2, max = r0 + 8;
  const X = (w) => L + (w * (W - L - Rr)) / 3, Y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const d = pts.map((v, w) => (w ? 'L' : 'M') + X(w).toFixed(1) + ' ' + Y(v).toFixed(1)).join(' ');
  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de progression : ${pts.join(', ')} répétitions par série sur 4 semaines">
    <line x1="${L}" y1="${H - B}" x2="${W - Rr}" y2="${H - B}" stroke="#EADFCF" stroke-width="2"/>
    <path d="${d}" fill="none" stroke="#E4572E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    ${pts.map((v, w) => `<circle cx="${X(w)}" cy="${Y(v)}" r="7" fill="#E4572E"/><text class="val" x="${X(w)}" y="${Y(v) - 14}" text-anchor="middle">${v}</text><text x="${X(w)}" y="${H - 14}" text-anchor="middle">Sem. ${w + 1}</text>`).join('')}</svg>`;
  return `<div class="screen q"><div class="topbar"><button class="iconbtn" data-act="back" aria-label="Retour">${ICON.back}</button></div>
    <h1>Voilà comment ta séance évolue sur 4 semaines.</h1>
    <div class="chart">${svg}</div>
    <p class="muted">Répétitions par série, calculées à partir de ton plan : +2 chaque semaine. C'est le programme prévu, pas une promesse de résultat.</p>
    <div class="cta"><button class="btn primary" data-act="toBuild">Continuer</button></div></div>`;
}
function vBuilding() {
  const items = ['Exercices choisis', 'Progression réglée', 'Plan sur 4 semaines prêt'];
  return `<div class="screen" role="status" aria-live="polite"><h1 class="big-title">Maisonic construit ton plan</h1>
    <div class="steps">${items.map((t, i) => `<div class="step" id="st${i}"><span class="dot">${ICON.check}</span><span>${t}</span></div>`).join('')}</div></div>`;
}

/* ---------- Connexion ---------- */
function vAuth() {
  const busy = !!A.loading;
  const title = authFrom === 'welcome' ? 'Connecte-toi pour retrouver ton plan' : 'Crée ton compte pour garder ton plan';
  return `<div class="screen auth"><div class="topbar"><button class="iconbtn" data-act="authback" aria-label="Retour">${ICON.back}</button></div>
    <h1>${title}</h1>
    <p class="muted">Tes réponses et ta séance sont enregistrées sur ton compte. Tu les retrouves à chaque connexion.</p>
    <div class="btns">
      <button class="btn google ${A.loading === 'google' ? 'loading' : ''}" data-act="login" data-p="google" ${busy ? 'disabled' : ''}>${ICON.google}<span class="spin"></span>Continuer avec Google</button>
      <button class="btn apple ${A.loading === 'apple' ? 'loading' : ''}" data-act="login" data-p="apple" ${busy ? 'disabled' : ''}>${ICON.apple}<span class="spin"></span>Continuer avec Apple</button>
    </div>
    ${busy ? '<button class="btn ghost" data-act="cancelLogin">Annuler</button>' : ''}
    ${A.err ? `<div class="errline" role="alert">${ICON.err}<span>${esc(A.err)}</span></div>` : ''}
    <div class="grow"></div>
    <p class="small" style="text-align:center;padding:16px 0 calc(16px + env(safe-area-inset-bottom))">En continuant, tu acceptes les <a href="/conditions">conditions d'utilisation</a> et la <a href="/confidentialite">politique de confidentialité</a>.</p></div>`;
}
let cfg = null;
async function getConfig() { if (!cfg) { const r = await fetch('/api/config'); cfg = await r.json(); } return cfg; }
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector('script[src="' + src + '"]')) return res();
    const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error('script'));
    document.head.appendChild(s);
  });
}
function googleToken(clientId) {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId, scope: 'openid email profile',
      callback: (r) => (r && r.access_token ? resolve(r.access_token) : reject(new Error('cancel'))),
      error_callback: () => reject(new Error('cancel'))
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}
async function appleToken(clientId) {
  AppleID.auth.init({ clientId, scope: 'name email', redirectURI: window.location.origin, usePopup: true });
  const r = await AppleID.auth.signIn();
  return r.authorization.id_token;
}
async function doLogin(provider) {
  A = { loading: provider, err: '' }; render();
  const mine = provider + Date.now(); doLogin.cur = mine;
  try {
    const c = await getConfig();
    let body;
    if (provider === 'google') {
      if (!c.googleClientId) throw new Error('config');
      await loadScript('https://accounts.google.com/gsi/client');
      body = { provider, access_token: await googleToken(c.googleClientId) };
    } else {
      if (!c.appleClientId) throw new Error('config');
      await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/fr_FR/appleid.auth.js');
      body = { provider, id_token: await appleToken(c.appleClientId) };
    }
    if (doLogin.cur !== mine) return;           // annulé entre-temps
    const r = await api('/api/auth', { method: 'POST', body });
    if (doLogin.cur !== mine) return;
    if (!r.ok) throw new Error('auth');
    A = { loading: '', err: '' };
    await afterLogin(r.json);
  } catch (e) {
    if (doLogin.cur !== mine) return;
    const cancelled = e && (e.message === 'cancel' || (e.error && /popup_closed|user_cancelled/.test(e.error)));
    A = { loading: '', err: cancelled ? '' : 'Connexion impossible, réessaie.' };
    if (S.step === 'auth') render();
  }
}
async function afterLogin(r) {
  S.token = r.token; S.user = r.user; S.premium = !!r.premium; S.seen = true;
  const d = r.data || {};
  if (d.answers && d.answers.niveau) {
    S.answers = d.answers; S.trial = d.trial || S.trial; S.trialKey = d.trialKey || '';
    S.planStart = d.planStart || S.planStart; S.history = d.history || []; S.materiel = d.materiel || S.materiel;
    S.today = d.today || null; S.email = d.email || S.email;
  } else { setTimeout(pushData, 0); }
  if (!S.email && r.user && r.user.email) S.email = r.user.email;
  restoreToday();
  save();
  const done = S.answers.seances && S.trial;
  if (S.premium) { tab = 'seance'; go('app'); }
  else if (done) go('paywall');
  else go('q0');
}
function logout() {
  S.token = ''; S.user = null; S.premium = false; save(); toast('Tu es déconnecté.'); render();
}

/* ---------- Paiement (à relier) ---------- */
window.Maisonic = window.Maisonic || { prices: {}, onPurchase: null, onRestore: null };
function priceSlot(k) { const p = window.Maisonic.prices && window.Maisonic.prices[k]; return p ? esc(p) : ''; }
function fillPrices() { document.querySelectorAll('[data-price]').forEach((e) => { e.textContent = priceSlot(e.dataset.price); }); }
function vPaywall() {
  const items = ['Ta séance du jour, générée chaque matin', 'Un plan qui monte d\'un cran chaque semaine', 'Le minuteur guidé exercice par exercice', 'Les images à partager de tes séances', 'Ta progression sauvegardée sur ton compte'];
  const off = (k, label, tag) => `<button class="offer" role="radio" aria-checked="${plan === k}" data-act="offer" data-k="${k}">${tag ? `<span class="tagb">${tag}</span>` : ''}<span>${label}</span><span class="price" data-price="${k}"></span></button>`;
  return `<div class="pay"><div class="pay-bg blurred" aria-hidden="true">${S.trial ? blurBody(S.trial) : ''}</div>
    <button class="close" data-act="closePay" aria-label="Fermer">${ICON.close}</button>
    <div class="pay-scroll"><div class="sheet"><h1>Débloque ton plan Maisonic</h1>
      <ul class="unlock">${items.map((t) => `<li>${ICON.check}<span>${t}</span></li>`).join('')}</ul>
      <div class="offers" role="radiogroup" aria-label="Choisis ton offre">${off('annual', 'Annuel', 'Meilleure offre')}${off('monthly', 'Mensuel', '')}</div>
      <button class="btn primary" id="paybtn" data-act="pay"><span class="spin"></span>Continuer</button>
      <p class="small" style="margin-top:12px">L'abonnement se renouvelle automatiquement à la fin de chaque période jusqu'à son annulation. Tu peux l'annuler à tout moment dans les réglages de ton compte.</p>
      <div class="links"><a class="link" href="/conditions">Conditions d'utilisation</a><a class="link" href="/confidentialite">Politique de confidentialité</a><button class="link" data-act="restore">Restaurer mes achats</button></div>
    </div></div></div>`;
}
function vDiscount() {
  return `<div class="screen" style="padding-bottom:0"><h1 class="big-title">Attends, voici une offre réduite pour commencer ta routine.</h1>
    <p style="font-size:21px;font-weight:700;color:var(--accent)">Tarif réduit sur ton premier abonnement</p>
    <p class="muted" style="margin-top:10px">Ta séance du jour, ton plan qui monte d'un cran chaque semaine et ta progression sauvegardée t'attendent.</p>
    <div class="grow"></div>
    <div class="cta"><button class="btn primary" id="discbtn" data-act="discount"><span class="spin"></span>Profiter de l'offre</button>
    <button class="btn ghost" data-act="nothanks">Non merci</button></div></div>`;
}
async function purchase(btnId, discount) {
  const btn = document.getElementById(btnId);
  const fn = window.Maisonic.onPurchase;
  if (typeof fn !== 'function') { toast('Le paiement sera bientôt disponible.'); return; }
  btn.classList.add('loading');
  try {
    const ok = await fn({ plan, discount: !!discount });
    if (ok) { S.premium = true; tab = 'seance'; save(); go('app'); return; }
    btn.classList.remove('loading');
  } catch (e) { btn.classList.remove('loading'); toast('Paiement impossible, réessaie.'); }
}

/* ---------- Application (onglets) ---------- */
function restoreToday() {
  if (S.today && S.today.date === todayKey() && validate(S.today.session)) { Z.state = 'result'; Z.session = S.today.session; }
  else if (Z.state === 'result') { Z.state = 'idle'; Z.session = null; }
}
function tabBtn(k, label, icon) { return `<button class="tab" role="tab" aria-selected="${tab === k}" data-act="tab" data-k="${k}">${icon}<span>${label}</span></button>`; }
function vApp() {
  let c;
  if (tab === 'seance') c = vSeance(); else if (tab === 'progres') c = vProgres(); else c = vCompte();
  return `<div class="shell"><main class="tabcontent" id="tc">${c}</main>
    <nav class="tabbar" role="tablist" aria-label="Navigation">${tabBtn('seance', 'Séance', ICON.dumb)}${tabBtn('progres', 'Progrès', ICON.chart)}${tabBtn('compte', 'Compte', ICON.user)}</nav></div>`;
}
function vSeance() {
  if (!S.premium) {
    const s = S.trial;
    return `<div class="rhead"><span class="brand">Maisonic</span></div>
      <h1 class="h1" style="margin-top:14px">Ta séance du jour t'attend</h1>
      <p class="muted" style="margin-top:8px">Débloque ton plan Maisonic pour générer ta séance chaque matin.</p>
      ${s ? `<div class="blurred" aria-hidden="true" style="margin-top:16px"><div class="big"><span class="num">${s.duree_minutes}</span><span class="unit">min</span></div>${exCards(s.exercices.slice(0, 3))}</div>` : ''}
      <div class="cta"><button class="btn primary" data-act="unlock">Débloquer Maisonic</button></div>`;
  }
  if (Z.state === 'analysis') return scanHTML().replace('class="screen scanwrap ', 'class="scanwrap ').replace('role="status"', 'style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center" role="status"');
  if (Z.state === 'result' && Z.session) return vResult(Z.session);
  if (Z.state === 'injury') {
    return `<div class="rhead"><span class="brand">Maisonic</span></div>
      <div class="notice" role="alert" style="margin-top:20px">${ICON.err}<p>Tu signales une douleur ou une blessure. Par prudence, on ne te propose pas de séance aujourd'hui. Prends le temps d'adapter ton effort et, si la douleur persiste, consulte un professionnel de santé.</p></div>
      <div class="cta"><button class="btn primary" data-act="ack">Compris</button></div>`;
  }
  if (Z.state === 'error') {
    return `<div class="rhead"><span class="brand">Maisonic</span></div>
      <div class="empty"><div class="errline" role="alert">${ICON.err}<span>On n'a pas pu préparer ta séance. Vérifie tes réponses et réessaie.</span></div></div>
      <div class="cta"><button class="btn primary" data-act="generate">Réessayer</button><button class="btn ghost" data-act="ack">Retour</button></div>`;
  }
  return `<div class="rhead"><span class="brand">Maisonic</span><span class="muted">Séance du ${dayName()}</span></div>
    <h1 class="h1" style="margin-top:14px">Comment tu te sens aujourd'hui ?</h1>
    <div class="chips" role="radiogroup" aria-label="État du jour">${ETATS.map((e) => `<button class="chip" role="radio" aria-checked="${Z.etat === e}" data-act="etat" data-v="${e}">${e}</button>`).join('')}</div>
    <button class="check" role="checkbox" aria-checked="${Z.douleur}" data-act="douleur"><span class="box">${ICON.check}</span><span>J'ai une douleur ou une blessure</span></button>
    <div class="grow"></div>
    <div class="cta"><button class="btn primary" data-act="generate">Générer ma séance du jour</button></div>`;
}
async function generate() {
  Z.state = 'analysis'; render();
  const r = await analyze(params({ etat: Z.etat, douleur: Z.douleur, semaine: weekNo() }));
  if (Z.state !== 'analysis') return;
  if (r.ok) {
    Z.session = r.session; Z.state = 'result';
    S.today = { date: todayKey(), session: r.session }; save();
  } else Z.state = r.kind === 'injury' ? 'injury' : 'error';
  if (S.step === 'app' && tab === 'seance') render();
}
function mondayOf(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function vProgres() {
  const wk = weekNo(), lv = level();
  const mon = mondayOf(new Date());
  const done = [0, 1, 2, 3, 4, 5, 6].map((i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); const k = d.toLocaleDateString('sv'); return S.history.some((h) => h.date === k); });
  const count = done.filter(Boolean).length, goal = goalSessions();
  const lab = ['L', 'M', 'M', 'J', 'V', 'S', 'D'], full = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  return `<div class="rhead"><span class="brand">Maisonic</span></div><h1 class="h1" style="margin-top:14px">Ta progression</h1>
    <div class="statline"><div class="stat"><div class="v">${wk}</div><p class="muted">Semaine en cours</p></div><div class="stat"><div class="v">${lv}</div><p class="muted">Niveau</p></div></div>
    <div class="card"><h3>Cette semaine</h3><p class="muted" style="margin-top:2px">${count} séance${count > 1 ? 's' : ''} sur ${goal}</p>
      <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${goal}" aria-valuenow="${Math.min(count, goal)}"><i style="width:${Math.min(100, (count / goal) * 100)}%"></i></div>
      <div class="days">${done.map((d, i) => `<div class="day ${d ? 'done' : ''}"><i aria-hidden="true"></i><span aria-label="${full[i]}${d ? ', séance faite' : ''}">${lab[i]}</span></div>`).join('')}</div></div>
    <p class="prog">Prochaine semaine : +2 répétitions par série</p>
    <p class="muted">${S.history.length ? `${S.history.length} séance${S.history.length > 1 ? 's' : ''} terminée${S.history.length > 1 ? 's' : ''} depuis le début.` : 'Ta première séance terminée apparaîtra ici.'}</p>`;
}
function vCompte() {
  const mail = S.email || (S.user && S.user.email) || '';
  return `<div class="rhead"><span class="brand">Maisonic</span></div><h1 class="h1" style="margin-top:14px">Compte</h1>
    <div class="card" style="margin-top:16px"><p class="muted">E-mail</p><p><strong>${mail ? esc(mail) : 'Non renseigné'}</strong></p>
      <p class="muted" style="margin-top:10px">Connexion</p><p><strong>${S.token ? (S.user && S.user.provider === 'apple' ? 'Apple' : 'Google') : 'Pas encore connecté'}</strong></p></div>
    <div class="sect"><h2>Matériel</h2><p class="muted">Utilisé pour générer tes séances.</p>
      <div class="seg" role="radiogroup" aria-label="Matériel"><button role="radio" aria-checked="${S.materiel === 'aucun'}" data-act="mat" data-v="aucun">Aucun</button><button role="radio" aria-checked="${S.materiel === 'petit matériel'}" data-act="mat" data-v="petit matériel">Petit matériel</button></div></div>
    <div class="sect list">${S.token ? '<button class="btn secondary" data-act="logout">Se déconnecter</button>' : '<button class="btn primary" data-act="signin">Se connecter</button>'}</div>
    <div class="links" style="margin-top:14px"><a class="link" href="/conditions">Conditions d'utilisation</a><a class="link" href="/confidentialite">Politique de confidentialité</a></div>`;
}

/* ---------- Minuteur guidé ---------- */
function runStart() {
  const s = Z.session; if (!s) return;
  R = { i: 0, s: 1, phase: 'work', left: 0, iv: null, done: false };
  setWork(); renderRunner();
}
function curEx() { return Z.session.exercices[R.i]; }
function setWork() {
  clearInterval(R.iv); R.phase = 'work'; const e = curEx();
  if (e.type === 'duree') { R.left = e.duree_secondes; R.iv = setInterval(() => tick(true), 1000); } else R.left = 0;
}
function setRest() { clearInterval(R.iv); R.phase = 'rest'; R.left = curEx().repos_secondes; R.iv = setInterval(() => tick(false), 1000); }
function tick(work) {
  R.left -= 1; const el = document.getElementById('rcount'); if (el) el.textContent = R.left;
  if (R.left <= 0) { work ? workDone() : restDone(); }
}
function workDone() {
  const e = curEx();
  const lastSet = R.s >= e.series, lastEx = R.i >= Z.session.exercices.length - 1;
  if (lastSet && lastEx) return finishRun();
  setRest(); renderRunner();
}
function restDone() {
  const e = curEx();
  if (R.s >= e.series) { R.i += 1; R.s = 1; } else R.s += 1;
  setWork(); renderRunner();
}
function finishRun() {
  clearInterval(R.iv); R.done = true;
  S.history.push({ date: todayKey(), duree: Z.session.duree_minutes, verdict: Z.session.verdict }); save();
  renderRunner();
}
function closeRunner() { if (R) clearInterval(R.iv); R = null; const o = document.getElementById('runner'); if (o) o.remove(); if (S.step === 'app') render(); }
function renderRunner() {
  let o = document.getElementById('runner');
  if (!o) { o = document.createElement('div'); o.id = 'runner'; o.className = 'runner'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); $app.appendChild(o); }
  const exs = Z.session.exercices;
  if (R.done) {
    o.innerHTML = `<div class="top"><span class="brand">Maisonic</span></div><div class="mid"><div class="target">Bravo !</div><p class="name" style="font-size:26px">Séance terminée. À demain pour la suite.</p></div>
      <button class="btn primary" data-act="runclose">Fermer</button>`;
    return;
  }
  const e = curEx(), step = `Exercice ${R.i + 1} sur ${exs.length}`;
  if (R.phase === 'work') {
    const target = e.type === 'reps' ? `${e.repetitions} répétitions` : '';
    o.innerHTML = `<div class="top"><span class="brand">${step}</span><button class="iconbtn" data-act="runclose" aria-label="Arrêter la séance">${ICON.close}</button></div>
      <div class="mid"><p class="muted">Série ${R.s} sur ${e.series}</p><h2 class="name">${esc(e.nom)}</h2>
      ${e.type === 'reps' ? `<div class="target">${target}</div>` : `<div class="count" id="rcount" aria-live="off">${R.left}</div><p class="muted">secondes</p>`}
      <p>${esc(e.conseil)}</p></div>
      <button class="btn primary" data-act="rundone">Terminé</button>`;
  } else {
    o.innerHTML = `<div class="top"><span class="brand">${step}</span><button class="iconbtn" data-act="runclose" aria-label="Arrêter la séance">${ICON.close}</button></div>
      <div class="mid"><p class="muted">Repos</p><div class="count" id="rcount">${R.left}</div><p class="muted">secondes</p>
      <p>Ensuite : ${R.s >= e.series ? esc(exs[R.i + 1].nom) : esc(e.nom) + ', série ' + (R.s + 1)}</p></div>
      <button class="btn secondary" data-act="runskip">Passer le repos</button>`;
  }
}

/* ---------- Partage : image 1080x1920 ---------- */
function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}
async function makeImage(s) {
  try { await document.fonts.load('700 100px "Space Grotesk"'); await document.fonts.load('500 40px "Space Grotesk"'); } catch (e) { /* police de repli */ }
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; const x = c.getContext('2d');
  const F = '"Space Grotesk",system-ui,sans-serif';
  x.fillStyle = '#FAF5EC'; x.fillRect(0, 0, 1080, 1920);
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.fillStyle = '#2A211B'; x.font = '700 52px ' + F; x.fillText('Maisonic', 540, 150);
  x.fillStyle = '#7A6B5F'; x.font = '500 44px ' + F; x.fillText('Séance du ' + dayName(), 540, 215);
  x.fillStyle = '#E4572E'; x.font = '700 520px ' + F; x.fillText(String(s.duree_minutes), 540, 760);
  x.font = '700 90px ' + F; x.fillText('min', 540, 880);
  x.fillStyle = '#2A211B'; x.font = '700 54px ' + F; const yv = wrap(x, s.verdict, 540, 1010, 880, 66);
  let y = Math.max(yv + 40, 1140);
  x.textAlign = 'left';
  s.exercices.slice(0, 5).forEach((e) => {
    x.fillStyle = '#FFFFFF'; rr(x, 80, y - 62, 920, 100, 16); x.fill();
    x.fillStyle = '#2A211B'; x.font = '700 40px ' + F; x.fillText(e.nom.length > 24 ? e.nom.slice(0, 23) + '…' : e.nom, 112, y);
    x.textAlign = 'right'; x.fillStyle = '#E4572E'; x.fillText(fmtSets(e), 968, y); x.textAlign = 'left';
    y += 120;
  });
  x.textAlign = 'center'; x.fillStyle = '#2A211B'; x.font = '700 120px ' + F; x.fillText('Maisonic', 540, 1810);
  x.fillStyle = '#7A6B5F'; x.font = '500 38px ' + F; x.fillText('Ta séance sans salle', 540, 1868);
  return new Promise((res) => c.toBlob(res, 'image/png'));
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
async function share() {
  const btn = document.getElementById('sharebtn'); if (!btn || !Z.session) return;
  btn.classList.add('loading');
  try {
    const blob = await makeImage(Z.session);
    if (!blob) throw new Error('blob');
    const file = new File([blob], 'maisonic-seance.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Maisonic', text: 'Ma séance du jour avec Maisonic' });
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'maisonic-seance.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Image téléchargée.');
    }
  } catch (e) {
    if (!e || e.name !== 'AbortError') toast("L'image n'a pas pu être créée. Réessaie.");
  }
  btn.classList.remove('loading');
}

/* ---------- Rendu ---------- */
function render() {
  clearTimers();
  const st = S.step; let html = '';
  if (st === 'welcome') html = vWelcome();
  else if (/^q\d$/.test(st)) html = vQ(+st[1]);
  else if (st === 'analysis') html = vAnalysis();
  else if (st === 'email') html = vEmail();
  else if (st === 'projection') html = vProjection();
  else if (st === 'building') html = vBuilding();
  else if (st === 'blur') html = vBlur();
  else if (st === 'auth') html = vAuth();
  else if (st === 'paywall') html = vPaywall();
  else if (st === 'discount') html = vDiscount();
  else if (st === 'app') html = vApp();
  else { S.step = 'welcome'; html = vWelcome(); }
  $app.innerHTML = html;
  const sc = $app.querySelector('.screen, .tabcontent'); if (sc) sc.scrollTop = 0;
  if (st === 'analysis' && !aerr) runOnboardingAnalysis();
  if (st === 'building') runBuilding();
  if (st === 'paywall') fillPrices();
  if (st === 'email') { const i = document.getElementById('emailin'); if (i && !S.email) setTimeout(() => i.focus(), 50); }
  if (R && !R.done) renderRunner();
}
async function runOnboardingAnalysis() {
  const r = await analyze(params());
  if (S.step !== 'analysis') return;
  if (r.ok) { S.trial = r.session; S.trialKey = answersKey(); aerr = null; go('email'); }
  else { aerr = r.kind; render(); }
}
function runBuilding() {
  [100, 1400, 2700].forEach((ms, i) => later(() => { const e = document.getElementById('st' + i); if (e) e.classList.add('on'); }, ms));
  later(() => { if (!S.planStart) S.planStart = Date.now(); go('blur'); }, 4000);
}

/* ---------- Actions ---------- */
const ACT = {
  start() { S.seen = true; go('q0'); },
  haveaccount() { authFrom = 'welcome'; A = { loading: '', err: '' }; go('auth'); },
  back() { go(prevStep(S.step)); },
  pick(t) {
    const i = +t.dataset.i, q = QS[i];
    S.answers[q.k] = t.dataset.v; save();
    $app.querySelectorAll('.choice').forEach((b) => { const on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    setTimeout(() => {
      if (S.step !== 'q' + i) return;
      if (i < 4) go('q' + (i + 1));
      else if (i === 4) { if (S.trial && S.trialKey === answersKey()) go('email'); else { aerr = null; go('analysis'); } }
      else if (i === 5) go('q6');
      else go('projection');
    }, 180);
  },
  retryOnb() { aerr = null; render(); },
  saveEmail() {
    const v = document.getElementById('emailin').value.trim(); if (!validEmail(v)) return;
    S.email = v; save(); go('q5');
  },
  toBuild() { go('building'); },
  unlock() { if (S.token) go('paywall'); else { authFrom = S.step === 'app' ? 'app' : 'blur'; A = { loading: '', err: '' }; go('auth'); } },
  authback() { doLogin.cur = null; A = { loading: '', err: '' }; if (authFrom === 'app') { tab = 'seance'; go('app'); } else go(authFrom === 'welcome' ? 'welcome' : 'blur'); },
  login(t) { doLogin(t.dataset.p); },
  cancelLogin() { doLogin.cur = null; A = { loading: '', err: '' }; render(); },
  offer(t) { plan = t.dataset.k; $app.querySelectorAll('.offer').forEach((b) => b.setAttribute('aria-checked', b === t)); },
  pay() { purchase('paybtn', false); },
  discount() { purchase('discbtn', true); },
  async restore() {
    const fn = window.Maisonic.onRestore;
    if (typeof fn !== 'function') { toast('La restauration des achats sera bientôt disponible.'); return; }
    try { const ok = await fn(); if (ok) { S.premium = true; save(); go('app'); } else toast('Aucun achat à restaurer.'); } catch (e) { toast('Restauration impossible, réessaie.'); }
  },
  closePay() { go('discount'); },
  nothanks() { tab = 'seance'; go('app'); },
  tab(t) { tab = t.dataset.k; render(); },
  etat(t) { Z.etat = t.dataset.v; $app.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-checked', b === t)); },
  douleur(t) { Z.douleur = !Z.douleur; t.setAttribute('aria-checked', Z.douleur); },
  generate() { generate(); },
  ack() { Z.state = 'idle'; render(); },
  run() { runStart(); },
  rundone() { if (!R) return; if (R.phase === 'work') workDone(); },
  runskip() { if (R && R.phase === 'rest') restDone(); },
  runclose() { closeRunner(); },
  share() { share(); },
  mat(t) { S.materiel = t.dataset.v; save(); render(); },
  signin() { authFrom = 'app'; A = { loading: '', err: '' }; go('auth'); },
  logout() { logout(); }
};
$app.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
  const f = ACT[t.dataset.act]; if (f) f(t, e);
});
$app.addEventListener('input', (e) => {
  if (e.target.id !== 'emailin') return;
  const v = e.target.value, ok = validEmail(v);
  document.getElementById('emailbtn').disabled = !ok;
  const h = document.getElementById('emailhint');
  h.innerHTML = v && !ok ? `${ICON.err}<span>Vérifie ton adresse e-mail.</span>` : '';
});
$app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'emailin') { const b = document.getElementById('emailbtn'); if (b && !b.disabled) b.click(); }
});

/* ---------- Démarrage ---------- */
async function refreshMe() {
  if (!S.token) return;
  try {
    const r = await api('/api/me');
    if (r.status === 401) { S.token = ''; S.user = null; save(); return; }
    if (r.ok) {
      const was = S.premium; S.user = r.json.user; S.premium = !!r.json.premium; save();
      if (S.premium !== was && S.step === 'app') render();
    }
  } catch (e) { /* hors ligne */ }
}
if (!S.seen) S.step = 'welcome';
if (S.premium && !['app'].includes(S.step) && S.seen) S.step = 'app';
if (S.step === 'analysis' || S.step === 'building') S.step = S.trial ? 'email' : 'q4';
restoreToday();
render();
refreshMe();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
}
})();
