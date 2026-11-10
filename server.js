'use strict';
/*
 * Serveur Maisonic (aucune dépendance, Node 18+).
 *  - sert l'application (dossier public/)
 *  - POST /api/session : appel au modèle de langage (clé côté serveur uniquement)
 *  - POST /api/auth    : connexion Google / Apple (vérification du jeton d'identité)
 *  - GET/PUT /api/me   : sauvegarde et récupération des données du compte
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PUB = __dirname;
const ALLOW = new Set(['index.html','styles.css','app.js','sw.js','manifest.webmanifest','conditions.html','confidentialite.html','icon-192.png','icon-512.png']);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
const DEV_UNLOCK = process.env.DEV_UNLOCK === '1';
let SECRET = process.env.SESSION_SECRET || '';
if (!SECRET) {
  SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[maisonic] SESSION_SECRET absent : les connexions seront perdues au redémarrage.');
}

/* ---------- Valeurs autorisées (identiques à celles de l'application) ---------- */
const ENUM = {
  niveau: ['Je débute', "Je m'y remets", "Je m'entraîne déjà"],
  pompes: ['Moins de 5', '5 à 15', 'Plus de 15'],
  lieu: ['Salon', 'Chambre', 'Extérieur'],
  frein: ['Je n\'ai pas de motivation', 'Je ne sais pas quoi faire', 'Je manque de temps', 'Je m\'ennuie'],
  objectif: ['Me muscler', 'Perdre du gras', 'Être plus en forme', 'Reprendre une routine'],
  materiel: ['aucun', 'petit matériel'],
  etat: ['En forme', 'Moyen', 'Fatigué']
};

/* ---------- Utilitaires ---------- */
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req, limit = 120000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(new Error('bad_json')); }
    });
    req.on('error', reject);
  });
}
const b64u = (buf) => Buffer.from(buf).toString('base64url');

/* ---------- Base de comptes (fichier JSON) ---------- */
let db = { users: {} };
try { fs.mkdirSync(DATA_DIR, { recursive: true }); db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { /* première exécution */ }
if (!db.users) db.users = {};
let saveTimer = null;
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_FILE + '.tmp';
    fs.writeFile(tmp, JSON.stringify(db), (err) => { if (!err) fs.rename(tmp, DB_FILE, () => {}); });
  }, 150);
}

/* ---------- Jeton de session ---------- */
function signToken(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}
function readToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const good = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(good);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p.exp || p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}
function authUser(req) {
  const h = req.headers.authorization || '';
  const p = readToken(h.startsWith('Bearer ') ? h.slice(7) : '');
  return p && db.users[p.uid] ? db.users[p.uid] : null;
}

/* ---------- Vérification des jetons d'identité Google / Apple ---------- */
const jwksCache = {};
async function getJwks(url) {
  const c = jwksCache[url];
  if (c && c.exp > Date.now()) return c.keys;
  const r = await fetch(url);
  if (!r.ok) throw new Error('jwks');
  const j = await r.json();
  jwksCache[url] = { keys: j.keys, exp: Date.now() + 6 * 3600 * 1000 };
  return j.keys;
}
async function verifyIdToken(idToken, { jwksUrl, issuers, audience }) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('format');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (header.alg !== 'RS256') throw new Error('alg');
  const keys = await getJwks(jwksUrl);
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const ok = crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), key, Buffer.from(parts[2], 'base64url'));
  if (!ok) throw new Error('signature');
  if (!issuers.includes(payload.iss)) throw new Error('iss');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audience || !aud.includes(audience)) throw new Error('aud');
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error('exp');
  return payload;
}

/* ---------- Appel au modèle ---------- */
const rate = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (rate.get(ip) || []).filter((t) => now - t < 3600 * 1000);
  if (arr.length >= 30) { rate.set(ip, arr); return true; }
  arr.push(now); rate.set(ip, arr);
  return false;
}

function cleanInput(b) {
  const inEnum = (k, v) => ENUM[k].includes(v);
  if (!b || typeof b !== 'object') return null;
  if (!inEnum('niveau', b.niveau) || !inEnum('pompes', b.pompes)) return null;
  if (!inEnum('objectif', b.objectif) || !inEnum('materiel', b.materiel) || !inEnum('etat', b.etat)) return null;
  if (![10, 20, 30].includes(b.temps)) return null;
  const semaine = Number(b.semaine);
  if (!Number.isInteger(semaine) || semaine < 1 || semaine > 52) return null;
  const niveauNum = [1, 2, 3].includes(b.niveauNum) ? b.niveauNum : 1;
  return {
    niveau: b.niveau, pompes: b.pompes, objectif: b.objectif, materiel: b.materiel, etat: b.etat,
    temps: b.temps, semaine, niveauNum,
    lieu: inEnum('lieu', b.lieu) ? b.lieu : 'Salon',
    frein: inEnum('frein', b.frein) ? b.frein : '',
    douleur: b.douleur === true
  };
}

function buildPrompt(i) {
  const system = [
    'Tu es le coach de Maisonic, une application de séances à la maison sans salle.',
    'Tu composes UNE séance du jour avec des pompes, du gainage et des squats (ou leurs variantes), adaptée au niveau, au temps et à l\'état du jour.',
    'Règles : exercices sans matériel sauf si « petit matériel » est indiqué (alors bandes élastiques, haltères légers ou chaise possibles) ; 4 à 6 exercices ; la séance doit durer environ le temps disponible, repos compris ; plus l\'utilisateur est fatigué, plus tu réduis le volume (Moyen : environ -10 %, Fatigué : environ -20 %) ; chaque semaine ajoute environ 2 répétitions par série (ou 5 secondes de gainage) par rapport à la semaine 1 ; sois prudent avec les débutants.',
    'Ton : tutoiement, simple, motivant, français correct. Pas de conseil médical. Pas de chiffres de résultats promis.',
    'Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans balises de code, avec exactement ce schéma :',
    '{"duree_minutes": entier entre 5 et 60,',
    ' "verdict": "une phrase courte, par exemple : Séance niveau 2, semaine 3 : tu montes d\'un cran.",',
    ' "exercices": [ { "nom": "texte", "type": "reps" ou "duree", "series": entier, "repetitions": entier ou null, "duree_secondes": entier ou null, "repos_secondes": entier, "conseil": "un conseil de posture en une ligne" } ],',
    ' "progression": "une phrase, par exemple : Prochaine semaine : +2 répétitions par série" }',
    'Pour type "reps", renseigne repetitions et mets duree_secondes à null. Pour type "duree" (gainage), renseigne duree_secondes et mets repetitions à null.'
  ].join('\n');
  const user = [
    'Niveau déclaré : ' + i.niveau + ' (niveau ' + i.niveauNum + ' sur 3).',
    'Pompes d\'affilée : ' + i.pompes + '.',
    'Objectif : ' + i.objectif + '.',
    'Temps disponible : ' + i.temps + ' minutes.',
    'Matériel : ' + i.materiel + '.',
    'Lieu : ' + i.lieu + '.',
    'État du jour : ' + i.etat + '.',
    'Semaine en cours : ' + i.semaine + '.',
    i.frein ? 'Ce qui le fait arrêter d\'habitude : ' + i.frein + ' (adapte la variété et la clarté en conséquence).' : ''
  ].filter(Boolean).join('\n');
  return { system, user };
}

const isStr = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
function validateSession(o) {
  if (!o || typeof o !== 'object') return null;
  if (!isInt(o.duree_minutes, 5, 60) || !isStr(o.verdict, 5, 160) || !isStr(o.progression, 5, 120)) return null;
  if (!Array.isArray(o.exercices) || o.exercices.length < 3 || o.exercices.length > 8) return null;
  const ex = [];
  for (const e of o.exercices) {
    if (!e || !isStr(e.nom, 2, 70) || !isStr(e.conseil, 5, 160)) return null;
    if (!isInt(e.series, 1, 8) || !isInt(e.repos_secondes, 10, 180)) return null;
    if (e.type === 'reps') {
      if (!isInt(e.repetitions, 1, 80)) return null;
      ex.push({ nom: e.nom.trim(), type: 'reps', series: e.series, repetitions: e.repetitions, duree_secondes: null, repos_secondes: e.repos_secondes, conseil: e.conseil.trim() });
    } else if (e.type === 'duree') {
      if (!isInt(e.duree_secondes, 10, 240)) return null;
      ex.push({ nom: e.nom.trim(), type: 'duree', series: e.series, repetitions: null, duree_secondes: e.duree_secondes, repos_secondes: e.repos_secondes, conseil: e.conseil.trim() });
    } else return null;
  }
  return { duree_minutes: o.duree_minutes, verdict: o.verdict.trim(), exercices: ex, progression: o.progression.trim() };
}

async function callModel(input) {
  const { system, user } = buildPrompt(input);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1400, system, messages: [{ role: 'user', content: user }] })
  });
  if (!r.ok) throw new Error('model_http_' + r.status);
  const j = await r.json();
  const text = (j.content || []).map((c) => c.text || '').join('');
  const a = text.indexOf('{'), z = text.lastIndexOf('}');
  if (a < 0 || z < a) throw new Error('no_json');
  return JSON.parse(text.slice(a, z + 1));
}

async function handleSession(req, res) {
  let body;
  try { body = await readBody(req, 8000); } catch (e) { return send(res, 400, { error: 'invalid' }); }
  const input = cleanInput(body);
  if (!input) return send(res, 400, { error: 'invalid' });
  if (input.douleur) return send(res, 200, { alerte: 'douleur' });
  if (limited(req.socket.remoteAddress || 'x')) return send(res, 429, { error: 'rate' });
  if (!API_KEY) return send(res, 503, { error: 'unavailable' });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const s = validateSession(await callModel(input));
      if (s) return send(res, 200, { session: s });
    } catch (e) { console.warn('[maisonic] modèle :', e.message); }
  }
  return send(res, 502, { error: 'invalid_response' });
}

/* ---------- Connexion ---------- */
async function handleAuth(req, res) {
  let b;
  try { b = await readBody(req, 20000); } catch (e) { return send(res, 400, { error: 'invalid' }); }
  try {
    let payload, provider;
    if (b.provider === 'google') {
      provider = 'google';
      // Jeton d'accès obtenu par la fenêtre Google : on le fait vérifier par Google
      // et on contrôle qu'il a bien été émis pour CETTE application.
      if (!GOOGLE_CLIENT_ID || typeof b.access_token !== 'string') throw new Error('config');
      const r = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(b.access_token));
      if (!r.ok) throw new Error('tokeninfo');
      const info = await r.json();
      if (info.aud !== GOOGLE_CLIENT_ID && info.azp !== GOOGLE_CLIENT_ID) throw new Error('aud');
      if (!info.sub) throw new Error('sub');
      payload = { sub: info.sub, email: info.email_verified === 'true' || info.email_verified === true ? info.email : '' };
    } else if (b.provider === 'apple') {
      provider = 'apple';
      payload = await verifyIdToken(b.id_token, {
        jwksUrl: 'https://appleid.apple.com/auth/keys',
        issuers: ['https://appleid.apple.com'],
        audience: APPLE_CLIENT_ID
      });
    } else return send(res, 400, { error: 'invalid' });
    const uid = provider + ':' + payload.sub;
    let u = db.users[uid];
    if (!u) { u = db.users[uid] = { id: uid, provider, email: payload.email || '', data: {}, premium: false, created: Date.now() }; }
    else if (payload.email && !u.email) u.email = payload.email;
    saveDb();
    const token = signToken({ uid, exp: Date.now() + 90 * 86400 * 1000 });
    return send(res, 200, { token, user: { email: u.email, provider: u.provider }, data: u.data, premium: !!u.premium || DEV_UNLOCK });
  } catch (e) {
    console.warn('[maisonic] connexion :', e.message);
    return send(res, 401, { error: 'auth' });
  }
}

const KEEP = ['answers', 'email', 'trial', 'trialKey', 'planStart', 'history', 'materiel', 'today'];
async function handleMe(req, res) {
  const u = authUser(req);
  if (!u) return send(res, 401, { error: 'auth' });
  if (req.method === 'GET') return send(res, 200, { user: { email: u.email, provider: u.provider }, data: u.data, premium: !!u.premium || DEV_UNLOCK });
  let b;
  try { b = await readBody(req, 80000); } catch (e) { return send(res, 400, { error: 'invalid' }); }
  const d = {};
  for (const k of KEEP) if (b.data && k in b.data) d[k] = b.data[k];
  u.data = Object.assign({}, u.data, d);
  if (typeof d.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) && !u.email) u.email = d.email;
  saveDb();
  return send(res, 200, { ok: true });
}

/* ---------- Fichiers statiques ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/conditions') p = '/conditions.html';
  if (p === '/confidentialite') p = '/confidentialite.html';
  if (p === '/') p = '/index.html';
  if (!ALLOW.has(p.slice(1))) p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // retombe sur l'application pour toute autre adresse
      return fs.readFile(path.join(PUB, 'index.html'), (e2, b2) => {
        if (e2) { res.writeHead(404); return res.end('Introuvable'); }
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(b2);
      });
    }
    const ext = path.extname(file);
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': file.endsWith('sw.js') || ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    };
    res.writeHead(200, headers);
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/config' && req.method === 'GET') {
      return send(res, 200, { googleClientId: GOOGLE_CLIENT_ID, appleClientId: APPLE_CLIENT_ID });
    }
    if (url.pathname === '/api/session' && req.method === 'POST') return handleSession(req, res);
    if (url.pathname === '/api/auth' && req.method === 'POST') return handleAuth(req, res);
    if (url.pathname === '/api/me' && (req.method === 'GET' || req.method === 'PUT')) return handleMe(req, res);
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not_found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'server' });
  }
});

server.listen(PORT, () => console.log('Maisonic sur http://localhost:' + PORT));
