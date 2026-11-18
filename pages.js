/* =========================================================
   Sport2Share — logique des pages intérieures
   Chargé AVANT script.js : on génère d'abord le contenu (cartes, listes…),
   puis script.js anime toute la page. Pour un contenu régénéré plus tard
   (filtres), on appelle window.S2S.prepare(zone).
   Tout est en démo : aucune donnée n'est envoyée.
   ========================================================= */
(() => {
  'use strict';

  const D = window.S2S_DATA;
  // base partagée entre tous les comptes (db.js) : données de démo reliées + annonces des nouveaux coachs
  const DB = window.S2SDB;
  DB.seed(D);
  DB.publishedCoaches(D).forEach(c => D.COACHS.push(c));
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const params = new URLSearchParams(location.search);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
  const api = () => window.S2S;
  const toast = m => { if (api()) api().toast(m); };
  const go = h => { if (api()) api().go(h); else location.href = h; };
  const onReady = fn => { if (api()) fn(); else document.addEventListener('s2s:api', fn, { once: true }); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalize = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const note = n => n.toFixed(1).replace('.', ',');
  const note5 = n => (n ? `${note(n)}/5` : 'Nouveau'); // notes moyennes toujours affichées « sur 5 »
  const deptLabel = code => { const d = D && D.DEPT_BY_CODE && D.DEPT_BY_CODE[code]; return d ? `${d.name} (${d.code})` : ''; };
  const euros = n => `${Math.round(n).toLocaleString('fr-FR')} €`;
  // paliers de commission coach, selon les heures de coaching du mois (max exclu)
  const COM_TIERS = [
    { max: 10, c: 0, label: 'moins de 10 h' },
    { max: 30, c: 0.05, label: '10 à 30 h' },
    { max: 40, c: 0.07, label: '30 à 40 h' },
    { max: Infinity, c: 0.10, label: 'plus de 40 h' },
  ];
  const tierOf = h => (h < 10 ? 0 : h < 30 ? 1 : h <= 40 ? 2 : 3);
  const icon = (id, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#${id}"/></svg>`;
  const hash = s => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const readUser = () => DB.me();

  // remplit une jauge <input type="range"> en lavande jusqu'au curseur
  const paintRange = r => r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`);

  // champ en erreur : secousse + bordure
  function flag(fields) {
    fields.forEach(f => {
      const box = f.closest('.field, .select, .check, .upload, .lfield') || f;
      box.classList.remove('is-error');
      void box.offsetWidth;
      box.classList.add('is-error');
      const clear = () => { if (f.checkValidity()) box.classList.remove('is-error'); };
      f.addEventListener('input', clear);
      f.addEventListener('change', clear);
    });
  }
  // bouton : chargement puis coche
  function fakeLoad(btn, done, delay = 1200) {
    btn.classList.add('is-loading');
    btn.disabled = true;
    setTimeout(() => {
      btn.classList.remove('is-loading');
      btn.classList.add('is-done');
      done();
      setTimeout(() => { btn.classList.remove('is-done'); btn.disabled = false; }, 1800);
    }, delay);
  }
  // nombre qui glisse vers sa nouvelle valeur
  function tweenNumber(el, to, fmt = euros) {
    const from = parseFloat(el.dataset.v || '0');
    el.dataset.v = String(to);
    if (reduced) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / 600);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1 && el.dataset.v === String(to)) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Photos des coachs, lieux proposés (réglages publiés depuis l'espace pro) ---------- */
  let PHOTOS = {};
  try { PHOTOS = JSON.parse(localStorage.getItem('s2s-photos') || '{}') || {}; } catch (e) { PHOTOS = {}; }
  const photoLayer = id => (PHOTOS[id] ? `<span class="coach-photo" style="background-image:url('${PHOTOS[id]}')"></span>` : '');
  const proSettingsFor = c => DB.pro(c.id);
  const coachFormats = c => { const s = proSettingsFor(c); return s && s.formats && s.formats.length ? s.formats : c.formats; };

  /* ---------- Carte coach (même rendu que sur l'accueil) ---------- */
  const BADGE = { top: ['badge-amber', 'Top coach'], dispo: ['badge-mint', 'Dispo cette semaine'], new: ['badge-mint', 'Nouveau sur Sport2Share'] };
  function coachCard(c, i, reveal) {
    const b = BADGE[c.badge];
    const rev = reveal ? ` data-reveal style="--rd:${((i % 3) * 0.07).toFixed(2)}s"` : '';
    return `<a class="coach" href="coach.html?id=${c.id}" data-cat="${c.family}" data-tilt${rev} data-cursor="Profil">
      <div class="coach-inner">
        <div class="coach-visual v-${c.visual}">
          <span class="coach-initials">${c.initials}</span>${icon(c.icon, 'coach-icon')}${photoLayer(c.id)}
          <span class="badge ${b[0]} coach-badge">${b[1]}</span><span class="coach-glare"></span>
        </div>
        <div class="coach-body">
          <div class="coach-row"><h3 class="coach-name">${c.first} ${c.last}</h3><span class="rating">${icon('i-star')}${note5(c.rating)}${c.reviews ? ` <small>(${c.reviews})</small>` : ''}</span></div>
          <p class="coach-meta">${c.sport} · ${deptLabel(c.dept)}</p>
          <div class="coach-tags">${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
          <div class="coach-foot"><span class="coach-price"><b>${c.price}€</b> / heure</span><span class="coach-cta">${icon('i-arrow')}</span></div>
        </div>
      </div>
    </a>`;
  }
  function animateIn(cards) {
    if (reduced) return;
    cards.forEach((el, i) => el.animate(
      [{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }],
      { duration: 650, delay: i * 45, easing: EASE_OUT, fill: 'backwards' }
    ));
  }

  /* ---------- Données : base partagée entre tous les comptes (db.js) ----------
     Les préférences personnelles (favoris, recherches, département…) sont rangées sous le compte connecté. */
  const PRIVATE = ['s2s-favs', 's2s-recent', 's2s-dept', 's2s-searches', 's2s-geo', 's2s-home', 's2s-pro-notes'];
  const nsKey = k => { const id = DB.sessionId(); return id && PRIVATE.includes(k) ? `s2s-u-${id}-${k.slice(4)}` : k; };
  const store = {
    get(k, d) {
      if (k === 's2s-user') return DB.me() || d;
      try { const v = JSON.parse(localStorage.getItem(nsKey(k)) || 'null'); return v === null ? d : v; } catch (e) { return d; }
    },
    set(k, v) {
      if (k === 's2s-user') { DB.saveMe(v); return; }
      try { localStorage.setItem(nsKey(k), JSON.stringify(v)); } catch (e) { /* navigation privée */ }
    }
  };
  const meId = () => DB.sessionId();
  const demoUser = () => readUser() || { name: '', role: 'eleve', anon: true };
  const hhmm = d => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const shortWhen = iso => {
    const d = new Date(iso);
    return d.toDateString() === new Date().toDateString() ? hhmm(d) : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '');
  };
  const longWhen = d => `${new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à ${hhmm(new Date(d))}`;

  // séances de l'élève connecté (réservations partagées avec ses coachs)
  function myBookings() {
    const id = meId();
    if (!id) return [];
    return DB.bookings().filter(b => b.student === id).map(b => ({ bid: b.id, id: b.coach, when: b.when, format: b.format, place: b.place, price: b.price, formule: b.formule, status: b.status, cert: b.cert, movedFrom: b.movedFrom }));
  }
  // séances déjà réalisées : c'est la seule condition pour pouvoir noter un coach
  function pastSessions() {
    const now = new Date();
    return myBookings().filter(b => b.status === 'done' || (b.status === 'confirmed' && new Date(b.when) < now)).map(b => ({ id: b.id, when: b.when, bid: b.bid }));
  }
  const hasDoneSession = id => pastSessions().some(s => s.id === id);
  // avis : partagés (le coach et tous les visiteurs les voient)
  const myReviews = () => { const id = meId(); const out = {}; DB.reviews().filter(r => r.student === id).forEach(r => { out[r.coach] = r; }); return out; };
  function saveMyReview(coachId, review) {
    const u = DB.me();
    if (!u) return;
    if (!review) { DB.removeReview(coachId, u.id); return; }
    DB.saveReview(Object.assign({}, review, { coach: coachId, student: u.id }));
    const ca = DB.accountByCoach(coachId);
    if (ca) DB.notify(ca.id, `${u.name} t'a laissé un avis : ${review.rating}/5.`, `coach.html?id=${coachId}#avis`, 'review');
  }

  // une personne côté élève : élève de démo ou vrai compte
  const VIS = ['plum', 'teal', 'esp', 'black'];
  function personOf(id) {
    const s = D.STUDENTS.find(x => x.id === id);
    if (s) return s;
    const a = DB.account(id);
    const first = (a && a.name) || 'Élève';
    const last = (a && a.last) || '';
    return { id, first, last, initials: (first.charAt(0) + (last.charAt(0) || '')).toUpperCase(), sport: 'Élève Sport2Share', city: '', visual: VIS[hash(id) % 4], photo: a && a.photo, account: !!a };
  }
  // interlocuteurs : les coachs pour un élève ; pour un coach, les élèves qui ont réservé ou écrit
  function partnersFor(role) {
    if (role === 'coach') {
      const u = DB.me();
      const cid = u && u.coachId;
      const ids = [];
      DB.bookings().forEach(b => { if (b.coach === cid && !ids.includes(b.student)) ids.push(b.student); });
      Object.values(DB.threads()).forEach(t => { if (t.coach === cid && !ids.includes(t.student)) ids.push(t.student); });
      return ids.map(personOf).map(s => ({ id: s.id, first: s.first, last: s.last, initials: s.initials, sub: `${s.sport}${s.city ? ` · ${s.city}` : ''}`, visual: s.visual, link: null, real: !!DB.account(s.id) }));
    }
    return D.COACHS.map(c => ({ id: c.id, first: c.first, last: c.last, initials: c.initials, sub: `Coach ${c.sport} · ${deptLabel(c.dept)}`, visual: c.visual, link: `coach.html?id=${c.id}`, real: !!DB.accountByCoach(c.id) }));
  }
  // conversations du compte connecté, vues de son côté : { idInterlocuteur: { unread, msgs: [{ me, text, t }] } }
  function loadChats(role) {
    const u = DB.me();
    const out = {};
    if (!u) return out;
    const side = role === 'coach' ? 'coach' : 'eleve';
    const th = DB.threads();
    Object.keys(th).forEach(k => {
      const t = th[k];
      if (role === 'coach' ? t.coach !== u.coachId : t.student !== u.id) return;
      out[role === 'coach' ? t.student : t.coach] = { unread: (t.unread || {})[side] || 0, msgs: t.msgs.map(m => ({ me: m.from === side, text: m.text, t: m.t })) };
    });
    return out;
  }
  const unreadTotal = chats => Object.values(chats).reduce((a, c) => a + (c.unread || 0), 0);
  // écrire à quelqu'un (le message apparaît aussi chez l'autre compte)
  function sendMsg(role, partnerId, text) {
    const u = DB.me();
    if (!u || !text) return null;
    const coach = role === 'coach' ? u.coachId : partnerId;
    const student = role === 'coach' ? partnerId : u.id;
    return DB.sendMessage(coach, student, role === 'coach' ? 'coach' : 'eleve', text);
  }
  // prévenir un compte (cloche + petit message en direct dans ses onglets ouverts)
  const notifyAccount = (accountId, text, href, kind) => { if (accountId && DB.account(accountId)) DB.notify(accountId, text, href, kind); };
  const coachAccountId = coachId => { const a = DB.accountByCoach(coachId); return a ? a.id : ''; };

  /* ---------- Lieux de rendez-vous (adresse par format, modifiable par le coach) ---------- */
  const STREETS = ['rue de la République', 'avenue Jean-Jaurès', 'boulevard Victor-Hugo', 'rue Pasteur', 'allée des Sports', 'rue du Stade', 'quai des Berges', 'avenue de la Liberté', 'rue Gambetta', 'chemin des Écoliers'];
  const postcode = (dept, h) => {
    const d = /^2[AB]$/i.test(dept) ? '20' : String(dept || '75');
    return d + String(1 + (h % 9)).padStart(5 - d.length, '0');
  };
  function defaultPlace(c, format) {
    const h = hash(c.id + format);
    const addr = `${2 + (h % 140)} ${STREETS[h % STREETS.length]}, ${postcode(c.dept, h)} ${c.city}`;
    switch (format) {
      case 'Salle': return { name: `${['Salle', 'Studio', 'Espace'][h % 3]} ${['Atlas', 'Pulse', 'Factory', 'Arena', 'Move'][h % 5]}`, address: addr };
      case 'Club': return { name: `${c.sport} Club ${c.city}`, address: addr };
      case 'Extérieur': return { name: `${['Parc municipal', 'Stade municipal', 'Base de loisirs', 'Bord de l\'eau'][h % 4]} · ${c.city}`, address: `Entrée principale, ${addr}` };
      case 'Domicile': return { name: 'À ton domicile', address: '', home: true };
      case 'Visio': return { name: 'En visio', address: 'Lien envoyé dans ta messagerie 1 h avant la séance', remote: true };
      default: return { name: format, address: addr };
    }
  }
  // adresses personnalisées par le coach dans son espace pro : { coachId: { format: { name, address } } }
  function placeFor(c, format) {
    const base = defaultPlace(c, format);
    const own = (store.get('s2s-places', {})[c.id] || {})[format];
    return own && !base.home && !base.remote ? Object.assign({}, base, own) : base;
  }
  const placeLine = p => p ? (p.address ? `${p.name} · ${p.address}` : p.name) : '';

  /* ---------- Formules créées par les coachs (réductions sur plusieurs séances) ---------- */
  function defaultFormules(c) {
    const h = hash(`${c.id}-formules`);
    if (h % 3 === 0) return [];
    const list = [{ id: 'f1', name: 'Carnet 5 séances', sessions: 5, discount: 5 + (h % 4) * 2, note: 'À utiliser dans les 3 mois' }];
    if (h % 2) list.push({ id: 'f2', name: 'Programme 10 séances', sessions: 10, discount: 12 + (h % 3) * 3, note: 'Un bilan offert à mi-parcours' });
    return list;
  }
  // formules modifiées par le coach : { coachId: [ { id, name, sessions, discount, note } ] }
  function formulesFor(c) {
    const own = store.get('s2s-formules', {})[c.id];
    return Array.isArray(own) ? own : defaultFormules(c);
  }
  const formuleTotal = (price, f) => Math.round(price * f.sessions * (1 - f.discount / 100));

  /* ---------- Annonce rédigée par le coach : description + séance type ----------
     s2s-annonces : { coachId: { bio, seance: [ { title, text } ] } } (rien n'est inventé par le site) */
  const annonceOf = id => store.get('s2s-annonces', {})[id] || {};
  const seanceOf = id => (annonceOf(id).seance || []).filter(s => s.title);
  const bioOf = c => annonceOf(c.id).bio || c.bio;
  function saveAnnonce(id, patch) {
    const all = store.get('s2s-annonces', {});
    all[id] = Object.assign({}, all[id] || {}, patch);
    store.set('s2s-annonces', all);
  }

  /* ---------- Géolocalisation : préfecture la plus proche -> département ---------- */
  const DEPT_GEO = {
    '01': [46.21, 5.23], '02': [49.56, 3.62], '03': [46.57, 3.33], '04': [44.09, 6.24], '05': [44.56, 6.08], '06': [43.70, 7.27], '07': [44.74, 4.60], '08': [49.77, 4.72],
    '09': [42.97, 1.61], '10': [48.30, 4.08], '11': [43.21, 2.35], '12': [44.35, 2.57], '13': [43.30, 5.37], '14': [49.18, -0.37], '15': [44.93, 2.44], '16': [45.65, 0.16],
    '17': [46.16, -1.15], '18': [47.08, 2.40], '19': [45.27, 1.77], '2A': [41.93, 8.74], '2B': [42.70, 9.45], '21': [47.32, 5.04], '22': [48.51, -2.76], '23': [46.17, 1.87],
    '24': [45.18, 0.72], '25': [47.24, 6.02], '26': [44.93, 4.89], '27': [49.03, 1.15], '28': [48.44, 1.49], '29': [48.00, -4.10], '30': [43.84, 4.36], '31': [43.60, 1.44],
    '32': [43.65, 0.59], '33': [44.84, -0.58], '34': [43.61, 3.88], '35': [48.11, -1.68], '36': [46.81, 1.69], '37': [47.39, 0.69], '38': [45.19, 5.72], '39': [46.67, 5.55],
    '40': [43.89, -0.50], '41': [47.59, 1.33], '42': [45.44, 4.39], '43': [45.04, 3.88], '44': [47.22, -1.55], '45': [47.90, 1.90], '46': [44.45, 1.44], '47': [44.20, 0.62],
    '48': [44.52, 3.50], '49': [47.47, -0.55], '50': [49.12, -1.09], '51': [48.96, 4.36], '52': [48.11, 5.14], '53': [48.07, -0.77], '54': [48.69, 6.18], '55': [48.77, 5.16],
    '56': [47.66, -2.76], '57': [49.12, 6.18], '58': [46.99, 3.16], '59': [50.63, 3.06], '60': [49.43, 2.08], '61': [48.43, 0.09], '62': [50.29, 2.78], '63': [45.78, 3.08],
    '64': [43.30, -0.37], '65': [43.23, 0.08], '66': [42.70, 2.90], '67': [48.57, 7.75], '68': [48.08, 7.36], '69': [45.76, 4.84], '70': [47.62, 6.15], '71': [46.31, 4.83],
    '72': [48.00, 0.20], '73': [45.56, 5.92], '74': [45.90, 6.13], '75': [48.86, 2.35], '76': [49.44, 1.10], '77': [48.54, 2.66], '78': [48.80, 2.13], '79': [46.32, -0.46],
    '80': [49.89, 2.30], '81': [43.93, 2.15], '82': [44.02, 1.35], '83': [43.12, 5.93], '84': [43.95, 4.81], '85': [46.67, -1.43], '86': [46.58, 0.34], '87': [45.83, 1.26],
    '88': [48.17, 6.45], '89': [47.80, 3.57], '90': [47.64, 6.86], '91': [48.63, 2.44], '92': [48.89, 2.21], '93': [48.91, 2.44], '94': [48.79, 2.46], '95': [49.04, 2.08],
    '971': [16.00, -61.73], '972': [14.60, -61.07], '973': [4.92, -52.33], '974': [-20.88, 55.45], '976': [-12.78, 45.23]
  };
  function distKm(a, b) {
    if (!a || !b) return Infinity;
    const r = Math.PI / 180;
    const h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  }
  function nearestDept(lat, lon) {
    let best = '';
    let d0 = Infinity;
    Object.keys(DEPT_GEO).forEach(code => { const d = distKm([lat, lon], DEPT_GEO[code]); if (d < d0) { d0 = d; best = code; } });
    return best;
  }

  /* ---------- Recherches : historique + autocomplétion (liste déroulante dès les premiers caractères) ---------- */
  function rememberSearch(term) {
    const t = String(term || '').trim();
    if (t.length < 2) return;
    const list = store.get('s2s-searches', []).filter(x => normalize(x) !== normalize(t));
    list.unshift(t);
    store.set('s2s-searches', list.slice(0, 8));
  }
  // classe les résultats : commence par la saisie > un mot commence par la saisie > contient la saisie
  function rankBy(list, q, label) {
    const nq = normalize(q);
    if (!nq) return [];
    const all = list.map(x => {
      const l = normalize(label(x));
      const r = l.startsWith(nq) ? 0 : l.split(/[\s'’()-]+/).some(w => w.startsWith(nq)) ? 1 : l.includes(nq) ? 2 : -1;
      return { x, r, n: l.length };
    }).filter(o => o.r >= 0);
    // dès qu'un résultat commence par les lettres tapées, on n'affiche que ceux-là
    const starts = all.filter(o => o.r <= 1);
    return (starts.length ? starts : all).sort((a, b) => a.r - b.r || a.n - b.n).map(o => o.x);
  }
  const markPrefix = (text, q) => {
    const i = normalize(text).indexOf(normalize(q));
    return q && i >= 0 ? `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}` : esc(text);
  };
  const coachCount = name => D.COACHS.filter(c => c.sports.some(s => normalize(s) === normalize(name))).length;
  // groupes : 'sports', 'coachs', 'depts'
  function suggestItems(q, groups) {
    const out = [];
    if (groups.includes('sports')) rankBy(D.SPORTS, q, s => s.name).slice(0, 5).forEach(s => out.push({ g: 'Sports', type: 'sport', value: s.name, label: s.name, ico: D.FAMILIES[s.family].icon, sub: `${coachCount(s.name) || 'Voir les'} coach${coachCount(s.name) > 1 || !coachCount(s.name) ? 's' : ''}` }));
    if (groups.includes('depts')) rankBy(D.DEPTS, q, d => `${d.name} ${d.code}`).slice(0, 3).forEach(d => { const n = D.COACHS.filter(c => c.dept === d.code).length; out.push({ g: 'Départements', type: 'dept', value: d.code, label: `${d.name} (${d.code})`, ico: 'i-pin', sub: n ? `${n} coach${n > 1 ? 's' : ''}` : 'visio possible' }); });
    if (groups.includes('coachs')) rankBy(D.COACHS, q, c => `${c.first} ${c.last}`).slice(0, 3).forEach(c => out.push({ g: 'Coachs', type: 'coach', value: c.id, label: `${c.first} ${c.last}`, ico: 'i-user', sub: `${c.sport} · ${deptLabel(c.dept)}` }));
    return out;
  }
  function attachAutocomplete(input, opts) {
    if (!input || input.dataset.ac) return;
    input.dataset.ac = '1';
    const host = input.closest(opts.host || '.field, .search') || input.parentElement;
    host.classList.add('ac-host');
    const box = document.createElement('div');
    box.className = `ac${opts.up ? ' ac-up' : ''}`;
    box.id = `ac-${Math.random().toString(36).slice(2, 8)}`;
    box.setAttribute('role', 'listbox');
    box.hidden = true;
    host.appendChild(box);
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', box.id);
    input.setAttribute('aria-expanded', 'false');
    let items = [];
    let idx = -1;
    const hide = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); idx = -1; };
    function render() {
      const q = input.value.trim();
      if (!q) {
        const recent = opts.recent ? store.get('s2s-searches', []).slice(0, 4) : [];
        items = recent.map(t => ({ g: 'Recherches récentes', type: 'recent', value: t, label: t, ico: 'i-clock' }));
      } else {
        items = suggestItems(q, opts.groups);
      }
      if (!items.length) { if (q) { box.innerHTML = `<p class="ac-empty">Aucune suggestion pour « ${esc(q)} »</p>`; box.hidden = false; input.setAttribute('aria-expanded', 'true'); } else hide(); return; }
      let g = '';
      box.innerHTML = items.map((it, i) => {
        const head = it.g !== g ? `<p class="ac-g">${it.g}</p>` : '';
        g = it.g;
        return `${head}<button type="button" class="ac-it" role="option" id="${box.id}-${i}" data-ac-i="${i}" tabindex="-1">${icon(it.ico)}<span>${markPrefix(it.label, q)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</button>`;
      }).join('');
      idx = -1;
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function pick(i) {
      const it = items[i];
      if (!it) return;
      hide();
      if (it.type !== 'coach' && it.type !== 'dept') rememberSearch(it.value);
      opts.onPick(it);
    }
    let t;
    input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 60); });
    input.addEventListener('focus', () => { if (opts.recent || input.value.trim()) render(); });
    input.addEventListener('blur', () => setTimeout(hide, 150));
    input.addEventListener('keydown', e => {
      const btns = $$('.ac-it', box);
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !box.hidden && btns.length) {
        e.preventDefault();
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length;
        btns.forEach((b, k) => b.classList.toggle('is-focus', k === idx));
        input.setAttribute('aria-activedescendant', btns[idx].id);
      } else if (e.key === 'Escape') hide();
      else if (e.key === 'Enter' && idx >= 0 && !box.hidden) { e.preventDefault(); pick(+btns[idx].dataset.acI); }
      else if (e.key === 'Enter') { rememberSearch(input.value); hide(); }
    });
    box.addEventListener('mousedown', e => e.preventDefault());
    box.addEventListener('click', e => { const b = e.target.closest('[data-ac-i]'); if (b) pick(+b.dataset.acI); });
  }

  // recherche de l'accueil : sports, coachs et départements
  const homeQ = $('[data-search-input]');
  if (homeQ) attachAutocomplete(homeQ, {
    // l'en-tête de l'accueil coupe ce qui dépasse en bas : la liste s'ouvre vers le haut
    groups: ['sports', 'coachs', 'depts'], recent: true, host: '.search', up: true,
    onPick: it => {
      if (it.type === 'coach') { go(`coach.html?id=${it.value}`); return; }
      if (it.type === 'dept') { go(`coachs.html?dept=${it.value}`); return; }
      homeQ.value = it.value;
      const f = homeQ.closest('form');
      if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  });
  if (homeQ) homeQ.closest('form').addEventListener('submit', () => rememberSearch(homeQ.value));

  /* ---------- Séances à venir de l'élève (en attente du coach ou confirmées) ---------- */
  function eleveUpcoming() {
    const now = new Date();
    return myBookings()
      .filter(b => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.when) > now)
      .map(b => {
        const c = D.COACHS.find(x => x.id === b.id);
        return c && { bid: b.bid, key: b.bid, coach: c, when: new Date(b.when), format: b.format, place: b.place || placeFor(c, b.format), price: b.formule ? Math.round(b.formule.total / b.formule.sessions) : (b.price || c.price), status: b.status, moved: !!b.movedFrom, cert: !!b.cert, real: true };
      })
      .filter(Boolean)
      .sort((a, b) => a.when - b.when);
  }
  const HOURS_FREE = 48; // annulation gratuite jusqu'à 48 h avant le début
  const LATE_REFUND = 0.5; // de 48 h à 1 h avant : annulation remboursée à 50 % (report gratuit seulement avec justificatif médical)
  const HOURS_NONE = 1; // moins d'1 h avant : séance due en totalité, aucun remboursement
  const HOURS_CERT = 5; // justificatif médical : report gratuit possible jusqu'à 5 h avant le début, plus après
  // part remboursée selon le temps restant (une séance déjà reportée avec justificatif n'est plus remboursée en totalité)
  const refundRate = (h, cert) => (h >= HOURS_FREE && !cert ? 1 : h >= HOURS_NONE ? LATE_REFUND : 0);
  const hoursLeft = when => (new Date(when) - new Date()) / 36e5;
  const reschedHref = s => `annuler.html?b=${encodeURIComponent(s.bid)}`;
  const STATUS_TXT = { pending: 'En attente du coach', confirmed: 'Confirmée', declined: 'Refusée par le coach', cancelled: 'Annulée', done: 'Terminée' };

  /* ---------- Réservations d'un coach (base partagée) ---------- */
  const coachBookings = coachId => DB.bookings().filter(b => b.coach === coachId);

  // déconnexion de cet onglet : les données du compte restent (on les retrouve en se reconnectant)
  function logoutAll() {
    DB.logout();
    toast('À bientôt sur le terrain !');
    setTimeout(() => go('index.html'), 700);
  }

  /* ---------- Écran d'accès : page qui demande un compte (élève, coach, ou l'un des deux) ---------- */
  function gate(box, want) {
    if (!box) return;
    const u = readUser();
    const wrong = !!(u && want && (want === 'coach') !== (u.role === 'coach'));
    const demos = want === 'coach' ? [['ines-morel', 'coach · Inès']] : want === 'eleve' ? [['camille-roche', 'élève · Camille']] : [['camille-roche', 'élève · Camille'], ['ines-morel', 'coach · Inès']];
    box.innerHTML = `<section class="gate">
      <span class="gate-ico">${icon('i-lock')}</span>
      <h1 class="gate-title">${wrong ? (want === 'coach' ? 'Espace réservé aux coachs' : 'Espace réservé aux élèves') : 'Connecte-toi pour continuer'}</h1>
      <p class="gate-lead">${wrong ? `Cet onglet est connecté avec le compte de ${esc(u.name)} (${u.role === 'coach' ? 'coach' : 'élève'}).` : 'Tes séances, tes messages et ton profil sont liés à ton compte.'}</p>
      <div class="gate-actions">${wrong
        ? `<a class="btn btn-dark" href="${u.role === 'coach' ? 'pro.html' : 'espace.html'}">Aller à mon espace</a>`
        : '<a class="btn btn-dark" href="connexion.html#connexion">Me connecter</a><a class="btn btn-line" href="connexion.html#inscription">Créer un compte</a>'}</div>
      <div class="gate-demo">
        <p><b>Pour la démo</b>Ouvre un compte dans cet onglet. Astuce : un onglet coach et un onglet élève côte à côte se répondent en direct (réservations, messages, avis).</p>
        <div class="gate-actions">${demos.map(([id, l]) => `<button type="button" class="btn btn-line" data-gate-demo="${id}">Compte de démo ${l}</button>`).join('')}</div>
      </div>
    </section>`;
    box.hidden = false;
    box.classList.add('has-gate');
    const shell = box.closest('.dash');
    if (shell) shell.classList.add('is-gated');
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-gate-demo]');
      if (!b) return;
      DB.login(b.dataset.gateDemo);
      location.reload();
    });
  }

  /* ---------- Notifications du compte connecté ---------- */
  const timeAgo = iso => {
    const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 6e4));
    return m < 1 ? 'à l\'instant' : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  const NOTIF_ICON = { booking: 'i-calendar', review: 'i-star', message: 'i-chat', info: 'i-spark' };
  function refreshNavDot() {
    const u = readUser();
    const n = u ? DB.unreadFor(u).total : 0;
    $$('[data-nav-dot]').forEach(el => { el.hidden = !n; el.textContent = n > 9 ? '9+' : n; });
  }
  function renderNotifs(box) {
    if (!box) return;
    const u = readUser();
    if (!u) { box.hidden = true; return; }
    const list = DB.notifsFor(u.id).slice(0, 6);
    const unread = DB.notifsFor(u.id).filter(n => !n.read).length;
    box.innerHTML = `<h2>Notifications${unread ? ` <span class="tab-count">${unread}</span>` : ''}${unread ? '<button type="button" class="notif-read" data-notifs-read>Tout marquer comme lu</button>' : ''}</h2>
      ${list.length ? `<ul class="notif-list">${list.map(n => `<li class="notif${n.read ? '' : ' is-new'}"><a href="${esc(n.href || '#')}"><span class="notif-ico">${icon(NOTIF_ICON[n.kind] || 'i-spark')}</span><span><b>${esc(n.text)}</b><small>${timeAgo(n.t)}</small></span></a></li>`).join('')}</ul>`
        : `<p class="pro-empty">Rien de neuf pour l'instant. ${u.role === 'coach' ? 'Les demandes de réservation, annulations et avis de tes élèves arriveront ici.' : 'Les réponses de tes coachs (séance acceptée, refusée, annulée) arriveront ici.'}</p>`}`;
    if (!box.dataset.bound) {
      box.dataset.bound = '1';
      box.addEventListener('click', e => {
        if (e.target.closest('[data-notifs-read]')) { DB.markNotifsRead(u.id); renderNotifs(box); refreshNavDot(); }
      });
    }
  }
  // en direct, sur toutes les pages : une notification ou un message arrive d'un autre compte (autre onglet)
  (() => {
    const u = readUser();
    if (!u) return;
    const seen = new Set(DB.notifsFor(u.id).map(n => n.id));
    const side = u.role === 'coach' ? 'coach' : 'eleve';
    const lastIncoming = () => {
      let best = null;
      Object.values(DB.threads()).forEach(t => {
        if (u.role === 'coach' ? t.coach !== u.coachId : t.student !== u.id) return;
        t.msgs.forEach(m => { if (m.from !== side && (!best || m.t > best.m.t)) best = { m, t }; });
      });
      return best;
    };
    let last = lastIncoming();
    DB.onChange((what, external) => {
      if (what === 'notifs' || what === 'threads' || what === 'bookings') refreshNavDot();
      if (!external) return;
      if (what === 'notifs') {
        const fresh = DB.notifsFor(u.id).filter(n => !seen.has(n.id));
        fresh.forEach(n => seen.add(n.id));
        if (fresh.length) toast(fresh[0].text);
      }
      if (what === 'threads') {
        const now = lastIncoming();
        if (now && (!last || now.m.t > last.m.t)) {
          const who = u.role === 'coach' ? personOf(now.t.student).first : ((D.COACHS.find(c => c.id === now.t.coach) || {}).first || 'Ton coach');
          if (document.body.dataset.page !== 'messages') toast(`Nouveau message de ${who} : ${now.m.text.slice(0, 70)}`);
        }
        last = now;
      }
    });
  })();

  /* ---------- Photo de profil (recadrée en carré 192 px, gardée dans le navigateur) ---------- */
  function readPhoto(file, cb) {
    if (!file || !/^image\//.test(file.type)) { cb(null); return; }
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const s = 192;
        const cv = document.createElement('canvas');
        cv.width = cv.height = s;
        const k = Math.max(s / img.width, s / img.height);
        cv.getContext('2d').drawImage(img, (s - img.width * k) / 2, (s - img.height * k) / 2, img.width * k, img.height * k);
        cb(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => cb(null);
      img.src = r.result;
    };
    r.onerror = () => cb(null);
    r.readAsDataURL(file);
  }
  function paintAvatar(el, photo, letter) {
    if (!el) return;
    el.classList.toggle('has-photo', !!photo);
    el.style.backgroundImage = photo ? `url("${photo}")` : '';
    el.textContent = photo ? '' : letter;
  }
  function saveMyPhoto(user, photo) {
    if (photo) user.photo = photo; else delete user.photo;
    store.set('s2s-user', user);
    // photo d'un coach : affichée aussi sur son annonce publique { coachId: image }
    if (user.role === 'coach' && user.coachId) {
      const all = store.get('s2s-photos', {});
      if (photo) all[user.coachId] = photo; else delete all[user.coachId];
      store.set('s2s-photos', all);
      PHOTOS = all;
    }
  }
  // inscription : aperçu de la photo choisie (script.js la récupère dans input._photo)
  $$('[data-photo-input]').forEach(inp => inp.addEventListener('change', () => {
    const box = inp.closest('[data-photo-up]');
    const prev = $('[data-photo-preview]', box);
    readPhoto(inp.files[0], url => {
      inp._photo = url;
      paintAvatar(prev, url, '');
      if (!url) prev.innerHTML = icon('i-user');
      $('[data-photo-name]', box).textContent = url ? 'Photo ajoutée · clique pour la changer' : 'Choisis une image (JPG, PNG…)';
      box.classList.toggle('is-filled', !!url);
    });
  }));

  /* ---------- Pièce d'identité : obligatoire pour réserver (élève) ou publier son annonce (coach) ---------- */
  const ID_TYPES = ['Carte nationale d\'identité', 'Passeport', 'Titre de séjour'];
  const plainName = s => normalize(s).replace(/[^a-z]/g, '');
  const idOk = u => !!(u && u.identity && u.identity.status === 'valid');
  const cardOk = u => !!(u && u.card && u.card.status === 'valid');
  function renderIdentity(box, user, onChange) {
    if (!box || !user) return;
    const id = user.identity || { status: 'missing' };
    const ok = id.status === 'valid';
    const first = user.name || '';
    const isCoach = user.role === 'coach';
    const rerender = () => { renderIdentity(box, user, onChange); if (onChange) onChange(user); };
    box.innerHTML = `
      <div class="idc-photo">
        <label class="avatar-up avatar-up-lg${user.photo ? ' is-filled' : ''}">
          <input type="file" accept="image/*" data-my-photo aria-label="Choisir ma photo de profil">
          <span class="avatar-up-img" data-my-photo-img></span>
          <span class="avatar-up-txt"><b>Photo de profil</b><span>${user.photo ? 'Clique pour la changer' : isCoach ? 'Elle s\'affiche sur ton annonce' : 'Ton coach la verra avant la séance'}</span></span>
          <span class="avatar-up-btn" aria-hidden="true">${icon('i-upload')}</span>
        </label>
        ${user.photo ? '<button type="button" class="auth-link" data-my-photo-del>Retirer la photo</button>' : ''}
      </div>
      <div class="idc-main">
        <div class="idc-head"><h2>Pièce d'identité</h2><span class="status ${ok ? 'status-ok' : 'status-todo'}"><i></i>${ok ? 'Vérifiée' : 'À compléter'}</span></div>
        ${ok ? `<p class="idc-ok">${icon('i-check')}<span><b>${esc(id.type || 'Pièce d\'identité')} · ${esc(first)} ${esc(user.last || '')}</b>Prénom et nom identiques à ton compte. ${isCoach ? 'Ta pièce ne bloque plus la publication de ton annonce.' : 'Tu peux réserver tes séances.'}</span></p>`
        : `<p class="idc-lead">${isCoach ? 'Ton annonce reste masquée' : 'La réservation est désactivée'} tant que ta pièce d'identité n'est pas ajoutée. On vérifie que le prénom et le nom sont les mêmes que sur ton compte.</p>
        <form class="idc-form" data-id-form novalidate>
          <div class="form-grid">
            ${user.last ? '' : '<div class="field full"><input id="idc-acc-last" name="accLast" type="text" placeholder=" " required autocomplete="family-name"><label for="idc-acc-last">Ton nom de famille (compte)</label></div>'}
            <div class="select full"><select id="idc-type" name="idType" required><option value="">Choisir…</option>${ID_TYPES.map(t => `<option>${t}</option>`).join('')}</select><label for="idc-type">Type de pièce</label></div>
            <label class="upload full"><input type="file" name="idFile" accept="image/*,.pdf" required data-id-file><span class="upload-box">${icon('i-upload')}<span data-id-file-name>Ajoute une photo ou un scan de ta pièce</span></span></label>
            <div class="field"><input id="idc-first" name="idFirst" type="text" placeholder=" " required autocomplete="off"><label for="idc-first">Prénom sur la pièce</label></div>
            <div class="field"><input id="idc-last" name="idLast" type="text" placeholder=" " required autocomplete="off"><label for="idc-last">Nom sur la pièce</label></div>
          </div>
          <p class="id-match" data-idc-match aria-live="polite"></p>
          <button type="submit" class="btn btn-primary"><span class="btn-label">Vérifier et enregistrer</span>${icon('i-arrow', 'ico')}<span class="btn-load" aria-hidden="true"><i></i><i></i><i></i></span><span class="btn-done" aria-hidden="true">${icon('i-check')}</span></button>
        </form>`}
      </div>`;
    paintAvatar($('[data-my-photo-img]', box), user.photo, (first.charAt(0) || '?').toUpperCase());
    const form = $('[data-id-form]', box);
    const accLast = () => user.last || (form && form.elements.accLast ? form.elements.accLast.value : '');
    const matches = () => form && plainName(form.elements.idFirst.value) === plainName(first) && plainName(form.elements.idLast.value) === plainName(accLast());
    box.onchange = e => {
      if (e.target.matches('[data-my-photo]')) {
        readPhoto(e.target.files[0], url => {
          if (!url) { toast('Choisis une image (JPG, PNG…).'); return; }
          saveMyPhoto(user, url);
          toast('Photo de profil mise à jour.');
          rerender();
        });
      }
      if (e.target.matches('[data-id-file]')) {
        const f = e.target.files[0];
        $('[data-id-file-name]', box).textContent = f ? f.name : 'Ajoute une photo ou un scan de ta pièce';
        e.target.closest('.upload').classList.toggle('is-filled', !!f);
      }
    };
    box.onclick = e => {
      if (!e.target.closest('[data-my-photo-del]')) return;
      saveMyPhoto(user, '');
      toast('Photo retirée.');
      rerender();
    };
    box.oninput = () => {
      const out = $('[data-idc-match]', box);
      if (!out || !form) return;
      const typed = form.elements.idFirst.value.trim() || form.elements.idLast.value.trim();
      if (!typed) { out.textContent = ''; out.className = 'id-match'; return; }
      const good = matches();
      out.className = `id-match ${good ? 'is-ok' : 'is-bad'}`;
      out.textContent = good ? 'Prénom et nom identiques à ton compte' : `Différent du compte (${first} ${accLast() || '…'})`;
    };
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = $$('input, select', form).filter(i => !i.checkValidity());
      if (bad.length) { flag(bad); toast('Complète les champs signalés.'); return; }
      if (!matches()) { flag([form.elements.idFirst, form.elements.idLast]); toast('Le prénom ou le nom de ta pièce ne correspond pas à ton compte.'); return; }
      fakeLoad($('button[type="submit"]', form), () => {
        if (!user.last) user.last = accLast().trim();
        user.identity = { status: 'valid', type: form.elements.idType.value, file: form.elements.idFile.files[0].name, sent: new Date().toISOString() };
        store.set('s2s-user', user);
        toast(isCoach ? 'Identité vérifiée. Il ne manque plus que ta carte pro validée pour publier ton annonce.' : 'Identité vérifiée : tu peux réserver tes séances.');
        rerender();
      }, 1100);
    });
  }

  /* ---------- Succès du profil (achievements) : ce qu'il reste à compléter ----------
     where : 'pro' (onglets de l'espace pro) ou 'espace' (espace élève) */
  function profileChecks(user, where) {
    if (!user) return [];
    const isCoach = user.role === 'coach';
    const inPro = where === 'pro';
    const go = anchor => (inPro ? { goto: 'profil', anchor } : { href: anchor.includes('.html') ? anchor : `#${anchor}` });
    const photo = !!(user.photo || (isCoach && user.coachId && PHOTOS[user.coachId]));
    const contact = [
      Object.assign({ k: 'email', ico: 'i-mail', label: 'E-mail renseigné', hint: isCoach ? 'Pour recevoir tes demandes de réservation' : 'Pour recevoir tes confirmations de séance', done: !!user.email, inline: 'email' }),
    ];
    if (!isCoach) {
      return contact.concat([
        Object.assign({ k: 'photo', ico: 'i-user', label: 'Photo de profil', hint: 'Ton coach te reconnaît au premier rendez-vous', done: photo }, go('identite')),
        Object.assign({ k: 'id', ico: 'i-card', label: 'Pièce d\'identité vérifiée', hint: 'Obligatoire pour réserver une séance', done: idOk(user) }, go('identite')),
        Object.assign({ k: 'dept', ico: 'i-pin', label: 'Département choisi', hint: 'Pour voir les coachs près de chez toi', done: !!store.get('s2s-dept', '') }, go('decouvrir.html')),
        Object.assign({ k: 'book', ico: 'i-calendar', label: 'Première séance réservée', hint: 'Choisis ton coach et réserve un créneau', done: myBookings().length > 0 }, go('coachs.html')),
        Object.assign({ k: 'review', ico: 'i-star', label: 'Premier avis laissé', hint: 'Note ton coach après une séance réalisée', done: Object.keys(myReviews()).length > 0 }, go('historique')),
      ]);
    }
    const cid = user.coachId || 'moi';
    const cd = D.COACHS.find(x => x.id === user.coachId);
    const ann = annonceOf(cid);
    const formules = cd ? formulesFor(cd) : (store.get('s2s-formules', {})[cid] || []);
    const pro = DB.pro(cid);
    const avail = pro && Array.isArray(pro.avail) ? pro.avail.length : (cd && !cd.account ? 6 : 0);
    return contact.concat([
      { k: 'phone', ico: 'i-phone', label: 'Téléphone vérifié', hint: 'Pour être joint le jour de la séance', done: !!user.phone, inline: 'phone' },
      Object.assign({ k: 'photo', ico: 'i-user', label: 'Photo de profil', hint: 'Les annonces avec photo sont plus consultées', done: photo }, go('identite')),
      Object.assign({ k: 'id', ico: 'i-card', label: 'Pièce d\'identité vérifiée', hint: 'Obligatoire pour publier ton annonce', done: idOk(user) }, go('identite')),
      Object.assign({ k: 'card', ico: 'i-shield', label: 'Carte professionnelle validée', hint: 'Obligatoire pour encadrer contre rémunération', done: cardOk(user) }, go('carte-pro')),
      Object.assign({ k: 'bio', ico: 'i-pen', label: 'Description rédigée', hint: 'Ton parcours et ta pédagogie, en quelques lignes', done: !!(ann.bio || (cd && cd.bio)) }, go('description')),
      Object.assign({ k: 'seance', ico: 'i-target', label: 'Séance type décrite', hint: 'Le déroulé d\'une séance avec toi', done: seanceOf(cid).length > 0 }, go('seance')),
      Object.assign({ k: 'formule', ico: 'i-euro', label: 'Première formule créée', hint: 'Une réduction sur plusieurs séances', done: formules.length > 0 }, go('formules')),
      Object.assign({ k: 'avail', ico: 'i-calendar', label: 'Disponibilités ouvertes', hint: 'Au moins 3 créneaux dans la semaine', done: avail >= 3 }, go('dispos')),
    ]);
  }
  function renderAchievements(box, user, where) {
    if (!box || !user) return;
    const list = profileChecks(user, where);
    const done = list.filter(x => x.done).length;
    const pct = Math.round((done / list.length) * 100);
    const isCoach = user.role === 'coach';
    const level = pct === 100 ? 'Profil complet' : pct >= 70 ? 'Presque complet' : pct >= 40 ? 'Bien parti' : 'Profil à compléter';
    const next = list.find(x => !x.done);
    const action = x => {
      if (x.done) return '<span class="ach-badge">Débloqué</span>';
      if (x.inline) return `<button type="button" class="ach-go" data-ach-edit="${x.inline}">Ajouter</button>`;
      if (x.goto) return `<button type="button" class="ach-go" data-goto="${x.goto}" data-goto-anchor="${x.anchor}">Compléter</button>`;
      return `<a class="ach-go" href="${x.href}">Compléter</a>`;
    };
    box.innerHTML = `
      <div class="ach-head">
        <div class="ach-ring" style="--p:${pct}" role="img" aria-label="Profil complété à ${pct} %"><b>${pct}<small>%</small></b></div>
        <div class="ach-txt">
          <p class="ach-kicker">${icon('i-trophy')}Succès du profil · ${done}/${list.length} débloqués</p>
          <h2>${level}</h2>
          <p>${next ? `Prochain succès : <b>${esc(next.label)}</b>. ${esc(next.hint)}.` : isCoach ? 'Ton annonce est complète : elle inspire confiance aux élèves.' : 'Ton profil est complet, bravo !'}</p>
        </div>
      </div>
      <ul class="ach-list">${list.map(x => `
        <li class="ach${x.done ? ' is-done' : ''}" data-ach="${x.k}">
          <span class="ach-ico">${icon(x.done ? 'i-check' : x.ico)}</span>
          <span class="ach-lbl"><b>${esc(x.label)}</b><span>${esc(x.hint)}</span></span>
          ${action(x)}
        </li>`).join('')}
      </ul>`;
    // e-mail / téléphone : saisis directement dans la carte
    box.onclick = e => {
      const ed = e.target.closest('[data-ach-edit]');
      if (!ed) return;
      const kind = ed.dataset.achEdit;
      const li = ed.closest('.ach');
      ed.outerHTML = `<form class="ach-form" data-ach-form="${kind}" novalidate><input type="${kind === 'email' ? 'email' : 'tel'}" ${kind === 'email' ? 'autocomplete="email" placeholder="toi@exemple.fr"' : 'autocomplete="tel" placeholder="06 12 34 56 78" pattern="(\\+33 ?|0)[1-9]( ?[0-9]{2}){4}"'} required aria-label="${kind === 'email' ? 'Ton e-mail' : 'Ton numéro de téléphone'}"><button type="submit" class="ach-go">OK</button></form>`;
      $('input', li).focus();
    };
    box.onsubmit = e => {
      const f = e.target.closest('[data-ach-form]');
      if (!f) return;
      e.preventDefault();
      const inp = $('input', f);
      if (!inp.value.trim() || !inp.checkValidity()) { inp.classList.remove('is-bad'); void inp.offsetWidth; inp.classList.add('is-bad'); toast(f.dataset.achForm === 'email' ? 'Cet e-mail n\'est pas valide.' : 'Numéro attendu : 06 12 34 56 78.'); return; }
      user[f.dataset.achForm] = inp.value.trim();
      store.set('s2s-user', user);
      toast(`Succès débloqué : ${f.dataset.achForm === 'email' ? 'e-mail renseigné' : 'téléphone vérifié'} !`);
      renderAchievements(box, user, where);
    };
  }

  // barre latérale de l'espace : prénom, rôle, badge des messages, déconnexion
  function fillAccount(user) {
    const name = (user.name || 'Camille').slice(0, 18);
    const role = user.role === 'coach' ? 'coach' : 'eleve';
    $$('.dash').forEach(d => { d.dataset.role = role; });
    $$('[data-dash-name]').forEach(el => { el.textContent = name; });
    $$('[data-dash-initial]').forEach(el => paintAvatar(el, user.photo, name.charAt(0).toUpperCase()));
    $$('[data-dash-role]').forEach(el => { el.textContent = role === 'coach' ? 'Compte coach' : 'Compte élève'; });
    $$('[data-role-text]').forEach(el => { const t = el.dataset[role]; if (t) el.textContent = t; });
    const n = unreadTotal(loadChats(role, name));
    $$('[data-unread-total]').forEach(b => { b.hidden = !n; b.textContent = n; });
    $$('[data-logout]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); logoutAll(); }));
    return { name, role };
  }

  /* =========================================================
     Accueil connecté : Connexion / Inscription laisse la place
     à un espace perso (prochaines séances, raccourcis…)
     ========================================================= */
  const meBox = $('[data-me]');
  const meUser = readUser();
  if (meBox && meUser) {
    const isCoach = meUser.role === 'coach';
    const first = (meUser.name || (isCoach ? 'Coach' : 'Camille')).slice(0, 18);
    const authBox = $('[data-auth]');
    // sans [data-auth], script.js ne branche pas le formulaire : les liens "Rejoindre" deviennent de vrais liens
    if (authBox) { authBox.hidden = true; authBox.removeAttribute('data-auth'); }
    $$('[data-auth-open]').forEach(a => {
      a.removeAttribute('data-auth-open');
      a.href = a.dataset.role === 'coach' ? (isCoach ? 'pro.html' : 'devenir-coach.html') : (isCoach ? 'coachs.html' : 'decouvrir.html');
    });

    const dateChip = d => `<span class="me-date"><b>${d.getDate()}</b>${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>`;
    const dayWord = d => {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const x = new Date(d); x.setHours(0, 0, 0, 0);
      const n = Math.round((x - t) / 864e5);
      return n === 0 ? 'Aujourd\'hui' : n === 1 ? 'Demain' : d.toLocaleDateString('fr-FR', { weekday: 'long' }).replace(/^./, m => m.toUpperCase());
    };
    const stat = (n, label) => `<div class="me-stat"><b data-count="${n}">0</b><span>${label}</span></div>`;
    let next = null;
    let body = '';

    if (!isCoach) {
      const list = eleveUpcoming();
      next = list[0] || null;
      const unread = unreadTotal(loadChats('eleve'));
      const c = next && next.coach;
      body = next ? `
        <a class="me-next" href="espace.html#seances" data-cursor="Séances">
          ${dateChip(next.when)}
          <span class="me-next-txt"><small><span class="live-dot"></span>${next.status === 'pending' ? 'En attente du coach' : 'Prochaine séance'} · <span data-me-cd></span></small><b>${esc(c.sport)} avec ${esc(c.first)}</b><span>${dayWord(next.when)} · ${hhmm(next.when)} · ${esc(next.format)}</span><span class="me-place">${icon('i-pin')}${esc(placeLine(next.place))}</span></span>
          <span class="me-go">${icon('i-arrow')}</span>
        </a>` : '<p class="me-empty">Aucune séance prévue pour l\'instant. Choisis ton coach et réserve ton premier créneau.</p>';
      body += `
        <p class="me-label">Bientôt</p>
        <div class="me-list">${list.slice(1, 3).map(s => `
          <a class="me-row" href="espace.html#seances"><time>${s.when.getDate()} ${s.when.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</time><span><b>${esc(s.coach.sport)} avec ${esc(s.coach.first)}${s.status === 'pending' ? ' <em>en attente</em>' : ''}</b><span>${hhmm(s.when)} · ${esc((s.place && s.place.name) || s.format)}</span></span>${icon('i-chevron')}</a>`).join('') || '<p class="me-empty">Rien d\'autre pour le moment.</p>'}
        </div>
        <div class="me-stats">${stat(pastSessions().length, 'séances faites')}${stat(unread, `message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}`)}${stat(store.get('s2s-favs', []).length, 'coachs favoris')}</div>
        <div class="me-actions">
          <a class="btn btn-primary btn-block" href="decouvrir.html"><span class="btn-label">Trouver un coach</span>${icon('i-arrow', 'ico')}</a>
          <a class="btn btn-ghost" href="espace.html">Mon espace</a>
          <a class="btn btn-ghost" href="messages.html">Messages${unread ? `<span class="me-badge">${unread}</span>` : ''}</a>
        </div>`;
    } else {
      const coachData = D.COACHS.find(c => c.id === meUser.coachId);
      const bookings = coachBookings(meUser.coachId);
      const now = new Date();
      const sameDay = d => new Date(d).toDateString() === now.toDateString();
      const upcoming = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && new Date(b.when) > now).sort((a, b) => new Date(a.when) - new Date(b.when));
      const pending = bookings.filter(b => b.status === 'pending' && new Date(b.when) > now).length;
      const today = bookings.filter(b => (b.status === 'confirmed' || b.status === 'done') && sameDay(b.when)).length;
      const unread = unreadTotal(loadChats('coach'));
      const who = personOf;
      const nb = upcoming.find(b => b.status === 'confirmed');
      if (nb) {
        const s = who(nb.student);
        next = { when: new Date(nb.when) };
        const pl = coachData ? placeFor(coachData, nb.format) : { name: nb.format };
        body = `
        <a class="me-next" href="pro.html#agenda">
          ${dateChip(next.when)}
          <span class="me-next-txt"><small><span class="live-dot"></span>Prochaine séance · <span data-me-cd></span></small><b>${esc(s.first)} ${esc(s.last)}</b><span>${dayWord(next.when)} · ${hhmm(next.when)} · ${esc(s.sport)}</span><span class="me-place">${icon('i-pin')}${esc(pl.home ? `Chez ${s.first} · ${s.city}` : placeLine(pl))}</span></span>
          <span class="me-go">${icon('i-arrow')}</span>
        </a>`;
      } else {
        body = '<p class="me-empty">Aucune séance prévue. Ouvre des créneaux dans ton espace pro.</p>';
      }
      body += `
        <p class="me-label">Bientôt</p>
        <div class="me-list">${upcoming.filter(b => b !== nb).slice(0, 2).map(b => { const s = who(b.student); const d = new Date(b.when); return `
          <a class="me-row" href="pro.html#agenda"><time>${d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</time><span><b>${esc(s.first)} ${esc(s.last)}${b.status === 'pending' ? ' <em>à valider</em>' : ''}</b><span>${hhmm(d)} · ${esc(b.format)}</span></span>${icon('i-chevron')}</a>`; }).join('')}
        </div>
        <div class="me-stats">${stat(today, 'séances aujourd\'hui')}${stat(pending, `demande${pending > 1 ? 's' : ''} à valider`)}${stat(unread, `message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}`)}</div>
        <div class="me-actions">
          <a class="btn btn-primary btn-block" href="pro.html"><span class="btn-label">Ouvrir mon espace pro</span>${icon('i-arrow', 'ico')}</a>
          <a class="btn btn-ghost" href="pro.html#agenda">Réservations${pending ? `<span class="me-badge">${pending}</span>` : ''}</a>
          <a class="btn btn-ghost" href="pro.html#messages">Messages${unread ? `<span class="me-badge">${unread}</span>` : ''}</a>
        </div>`;
    }

    meBox.innerHTML = `
      <div class="me-head">
        <span class="me-av">${esc(first.charAt(0).toUpperCase())}</span>
        <div><p class="auth-title">${isCoach ? 'Bonjour' : 'Salut'} ${esc(first)}</p><p class="auth-sub">${isCoach ? 'Ton espace coach' : 'Ton espace élève'} · ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
        <button type="button" class="me-out" data-me-out aria-label="Se déconnecter" title="Se déconnecter">${icon('i-logout')}</button>
      </div>${body}`;
    paintAvatar($('.me-av', meBox), meUser.photo, first.charAt(0).toUpperCase());
    $$(':scope > *', meBox).forEach((el, i) => el.style.setProperty('--i', i));
    meBox.hidden = false;
    $('[data-me-out]', meBox).addEventListener('click', logoutAll);

    // compte à rebours de la prochaine séance
    const cd = $('[data-me-cd]', meBox);
    if (cd && next) {
      const tick = () => {
        const m = Math.max(0, Math.round((next.when - new Date()) / 6e4));
        const d = Math.floor(m / 1440);
        const h = Math.floor((m % 1440) / 60);
        cd.textContent = m <= 0 ? 'c\'est maintenant' : d ? `dans ${d} j ${h} h` : h ? `dans ${h} h ${String(m % 60).padStart(2, '0')}` : `dans ${m} min`;
      };
      tick();
      setInterval(tick, 30000);
    }
    onReady(() => $$('[data-count]', meBox).forEach(el => api().countUp(el)));
  }

  /* =========================================================
     Coachs : catalogue filtrable
     ========================================================= */
  const cat = $('[data-catalogue]');
  if (cat) {
    const grid = $('[data-cat-grid]');
    const countEl = $('[data-cat-count]');
    const empty = $('[data-cat-empty]');
    const notice = $('[data-cat-notice]');
    const noticeText = $('[data-cat-notice-text]');
    const qInput = $('[data-cat-q]');
    const price = $('[data-cat-price]');
    const priceLabel = $('[data-cat-price-label]');
    const dispo = $('[data-cat-dispo]');
    const dept = $('[data-cat-dept]');
    const DEF = { q: '', fam: 'all', price: 150, dispo: false, note: 0, dept: 'all', sort: 'pert' };
    const st = Object.assign({}, DEF);

    // tous les départements, avec le nombre de coachs de la démo
    D.DEPTS.forEach(d => {
      const n = D.COACHS.filter(c => c.dept === d.code).length;
      const o = document.createElement('option');
      o.value = d.code;
      o.textContent = `${d.code} · ${d.name}${n ? ` (${n})` : ''}`;
      dept.appendChild(o);
    });

    const match = c => {
      if (st.fam !== 'all' && c.family !== st.fam) return false;
      if (c.price > st.price) return false;
      if (st.dispo && c.badge !== 'dispo') return false;
      if (c.rating < st.note) return false;
      if (st.dept !== 'all' && c.dept !== st.dept) return false;
      if (st.q) {
        const hay = normalize([c.first, c.last, c.sport, deptLabel(c.dept), ...c.sports, ...c.tags].join(' '));
        if (!normalize(st.q).split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    };
    const SORTS = {
      pert: (a, b) => (b.badge === 'top') - (a.badge === 'top') || b.rating * b.reviews - a.rating * a.reviews,
      prix: (a, b) => a.price - b.price,
      note: (a, b) => b.rating - a.rating || b.reviews - a.reviews
    };

    function syncUI() {
      qInput.value = st.q;
      price.value = st.price;
      paintRange(price);
      priceLabel.textContent = `${st.price} €`;
      dispo.checked = st.dispo;
      dept.value = st.dept;
      $$('[data-cat-fam]').forEach(b => b.classList.toggle('is-active', b.dataset.catFam === st.fam));
      $$('[data-cat-note]').forEach(b => b.classList.toggle('is-active', parseFloat(b.dataset.catNote) === st.note));
      $$('[data-cat-sort]').forEach(b => {
        const on = b.dataset.catSort === st.sort;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }

    let firstRender = true;
    function render() {
      const list = D.COACHS.filter(match).sort(SORTS[st.sort]);
      grid.innerHTML = list.map((c, i) => coachCard(c, i, firstRender)).join('');
      countEl.textContent = `${list.length} coach${list.length > 1 ? 's' : ''}`;
      empty.hidden = list.length > 0;
      if (!firstRender && api()) {
        api().prepare(grid);
        animateIn($$('.coach', grid));
      }
      firstRender = false;
    }
    function showNotice(text) {
      notice.hidden = !text;
      noticeText.textContent = text || '';
    }
    function reset() {
      Object.assign(st, DEF);
      showNotice('');
      syncUI();
      render();
    }

    // paramètres d'adresse : ?sport=Tennis, ?famille=combat, ?q=texte
    const sportParam = params.get('sport');
    const famParam = params.get('famille');
    const qParam = params.get('q');
    const deptParam = params.get('dept');
    if (deptParam && D.DEPT_BY_CODE[deptParam]) st.dept = deptParam;
    if (famParam && D.FAMILIES[famParam]) {
      st.fam = famParam;
      showNotice(`Univers ${D.FAMILIES[famParam].label}`);
    }
    if (sportParam) {
      const sp = D.SPORTS.find(s => normalize(s.name) === normalize(sportParam));
      if (sp) {
        const direct = D.COACHS.filter(c => c.sports.some(s => normalize(s) === normalize(sp.name)));
        if (direct.length) { st.q = sp.name; showNotice(`${sp.name} : ${direct.length} coach${direct.length > 1 ? 's' : ''} dans cette démo`); }
        else { st.fam = sp.family; showNotice(`${sp.name} : voici les coachs de l'univers ${D.FAMILIES[sp.family].label}`); }
      }
    }
    if (qParam) {
      st.q = qParam;
      if (!D.COACHS.some(match)) {
        const sp = D.SPORTS.find(s => normalize(s.name).includes(normalize(qParam)) || normalize(qParam).includes(normalize(s.name)));
        st.q = '';
        if (sp) { st.fam = sp.family; showNotice(`« ${qParam} » : voici les coachs de l'univers ${D.FAMILIES[sp.family].label}`); }
        else showNotice(`Aucun coach pour « ${qParam} » : voici tout le club`);
      } else {
        showNotice(`Recherche : « ${qParam} »`);
      }
    }

    syncUI();
    render();

    let qTimer;
    qInput.addEventListener('input', () => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { st.q = qInput.value.trim(); render(); }, 160);
    });
    price.addEventListener('input', () => { st.price = +price.value; paintRange(price); priceLabel.textContent = `${st.price} €`; render(); });
    dispo.addEventListener('change', () => { st.dispo = dispo.checked; render(); });
    dept.addEventListener('change', () => { st.dept = dept.value; render(); });
    $$('[data-cat-fam]').forEach(b => b.addEventListener('click', () => { st.fam = b.dataset.catFam; syncUI(); render(); }));
    $$('[data-cat-note]').forEach(b => b.addEventListener('click', () => { st.note = parseFloat(b.dataset.catNote); syncUI(); render(); }));
    $$('[data-cat-sort]').forEach(b => b.addEventListener('click', () => { st.sort = b.dataset.catSort; syncUI(); render(); }));
    $$('[data-cat-reset]').forEach(b => b.addEventListener('click', reset));
    // liste déroulante sous la recherche : sport, département ou coach
    attachAutocomplete(qInput, {
      groups: ['sports', 'depts', 'coachs'], recent: true,
      onPick: it => {
        if (it.type === 'coach') { go(`coach.html?id=${it.value}`); return; }
        if (it.type === 'dept') { st.dept = it.value; dept.value = it.value; qInput.value = ''; st.q = ''; showNotice(''); render(); return; }
        qInput.value = it.value;
        st.q = it.value;
        showNotice('');
        render();
      }
    });
    const toggle = $('[data-cat-toggle]');
    if (toggle) toggle.addEventListener('click', () => {
      const panel = $('.cat-filters');
      const open = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* =========================================================
     Profil coach + réservation
     ========================================================= */
  const prof = $('[data-profile]');
  if (prof) {
    const base = D.COACHS.find(x => x.id === params.get('id')) || D.COACHS[0];
    // tarif modifié par le coach dans son espace pro
    const ps = proSettingsFor(base);
    const c = ps && ps.price ? Object.assign({}, base, { price: ps.price }) : base;
    const fam = D.FAMILIES[c.family];
    const seed = hash(c.id);
    document.title = `${c.first} ${c.last} — Coach ${c.sport} | Sport2Share`;
    const set = (k, v) => $$(`[data-p="${k}"]`).forEach(el => { el.textContent = v; });
    set('first', c.first);
    set('fullname', `${c.first} ${c.last}`);
    set('sport', c.sport);
    set('city', `${c.city} · ${deptLabel(c.dept)}`);
    // "vus récemment" pour la page Découvrir
    const recent = store.get('s2s-recent', []).filter(id => id !== c.id);
    recent.unshift(c.id);
    store.set('s2s-recent', recent.slice(0, 12));
    set('rating', note5(c.rating));
    set('reviews', c.reviews);
    set('price', c.price);
    set('years', c.years);
    set('students', c.students);
    set('bio', bioOf(c));
    set('family', fam.label);
    // séance type : uniquement si le coach l'a rédigée dans son espace pro
    const seWrap = $('[data-p-seance-wrap]');
    if (seWrap) {
      const steps = seanceOf(c.id);
      const meUser = store.get('s2s-user', null);
      const own = meUser && meUser.role === 'coach' && meUser.coachId === c.id;
      if (steps.length) {
        $('[data-p-seance]').innerHTML = steps.map((s, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><strong>${esc(s.title)}</strong><span>${esc(s.text)}</span></li>`).join('');
        seWrap.hidden = false;
      } else if (own) {
        $('[data-p-seance]').outerHTML = `<p class="seance-empty">${icon('i-pen')}Tu n'as pas encore décrit ta séance type. Les élèves ne voient pas cette rubrique tant qu'elle est vide. <a href="pro.html#seance">La rédiger</a></p>`;
        seWrap.hidden = false;
      }
    }
    set('formats', c.formats.join(' · '));
    const famLink = $('[data-p-famlink]');
    if (famLink) famLink.href = `coachs.html?famille=${c.family}`;

    const nameEl = $('[data-p-name]');
    nameEl.innerHTML = `<span class="line">${c.first}</span><span class="line">${c.last}</span>`;
    const vis = $('[data-p-visual]');
    vis.className = `coach-visual v-${c.visual}`;
    vis.innerHTML = `<span class="coach-initials">${c.initials}</span>${icon(c.icon, 'coach-icon')}${photoLayer(c.id)}<span class="badge ${BADGE[c.badge][0]} coach-badge">${BADGE[c.badge][1]}</span><span class="coach-glare"></span>`;

    // lieux proposés : ceux choisis par le coach dans son espace pro (sinon ceux de sa fiche)
    const formats = coachFormats(c);
    set('formats', formats.join(' · '));
    $('[data-p-tags]').innerHTML =
      c.sports.map(s => `<span class="tag">${s}</span>`).join('') +
      c.tags.map(t => `<span class="tag">${t}</span>`).join('') +
      c.levels.map(l => `<span class="tag tag-mint">${l}</span>`).join('') +
      formats.map(f => `<span class="tag tag-amber">${f === 'Domicile' ? 'À domicile' : f}</span>`).join('');
    $('[data-p-diplomas]').innerHTML = c.diplomas.concat([`${c.years} ans d'expérience, ${c.students} élèves accompagnés`, 'Identité et diplômes vérifiés par Sport2Share'])
      .map(d => `<li>${icon('i-check')}<span>${d}</span></li>`).join('');

    /* ----- la vraie valeur du coach + avis vérifiés ----- */
    const CRIT = [['pedagogie', 'Pédagogie'], ['ponctualite', 'Ponctualité'], ['ecoute', 'Écoute'], ['motivation', 'Motivation'], ['progression', 'Progression ressentie']];
    const WORDS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];
    const baseCrit = i => Math.min(5, Math.max(4.2, c.rating + ((((seed >> (i * 3)) % 7) - 3) * 0.06)));
    // note = avis de la fiche (coachs de démo) + vrais avis laissés par les élèves inscrits
    const stats = () => {
      const real = DB.reviews().filter(r => r.coach === c.id);
      const mine = real.find(r => r.student === meId()) || null;
      const baseN = c.account ? 0 : c.reviews;
      const count = baseN + real.length;
      const avg = count ? (c.rating * baseN + real.reduce((s, r) => s + r.rating, 0)) / count : 0;
      const crit = CRIT.map(([k, label], i) => {
        const sum = real.reduce((s, r) => s + ((r.crit && r.crit[k]) || r.rating), 0);
        const v = count ? ((baseN ? baseCrit(i) * baseN : 0) + sum) / count : 0;
        return { k, label, v };
      });
      return { mine, real, count, avg, crit };
    };
    const starsHtml = n => `<div class="stars" aria-label="${n} étoile${n > 1 ? 's' : ''} sur 5">${icon('i-star').repeat(n)}${`<span style="color:#ddd;display:contents">${icon('i-star').repeat(5 - n)}</span>`}</div>`;
    const ago = k => ['il y a 1 semaine', 'il y a 3 semaines', 'il y a 1 mois', 'il y a 2 mois'][k] || 'il y a quelques mois';

    // indicateurs fixes, calculés à partir du profil (démo)
    let loyalty = 78 + (seed % 18);
    let done = c.students * (5 + (seed % 4));
    let kept = 95 + (seed % 5);
    let reply = ['moins de 1 h', 'moins de 2 h', 'moins de 3 h'][seed % 3].replace('moins de ', '&lt; ');
    // coach inscrit : indicateurs calculés sur ses vraies séances
    if (c.account) {
      const bks = coachBookings(c.id);
      const doneB = bks.filter(b => b.status === 'done');
      const per = {};
      doneB.forEach(b => { per[b.student] = (per[b.student] || 0) + 1; });
      const studs = Object.keys(per);
      done = doneB.length;
      loyalty = studs.length ? Math.round(studs.filter(s => per[s] > 1).length / studs.length * 100) : 0;
      const coachCancel = bks.filter(b => b.status === 'cancelled' && b.cancelledBy === 'coach').length;
      kept = done + coachCancel ? Math.round(done / (done + coachCancel) * 100) : 100;
      reply = 'Nouveau';
    }
    $('[data-p-kpis]').innerHTML = `
      <div class="vk"><b><span data-count="${loyalty}">0</span> %</b><span>des élèves reprennent une 2<sup>e</sup> séance</span></div>
      <div class="vk"><b><span data-count="${done}">0</span></b><span>séances réalisées sur Sport2Share</span></div>
      <div class="vk"><b><span data-count="${kept}">0</span> %</b><span>de séances honorées, sans annulation</span></div>
      <div class="vk"><b>${reply}</b><span>temps de réponse moyen aux messages</span></div>`;
    const ownAcc = DB.accountByCoach(c.id);
    const cardYear = ownAcc && ownAcc.card && ownAcc.card.end ? new Date(ownAcc.card.end).getFullYear() : new Date().getFullYear() + 1 + (seed % 4);
    $('[data-p-trust]').innerHTML = [
      'Identité vérifiée',
      `Diplôme vérifié · ${c.diplomas[0].split(' (')[0]}`,
      `Carte professionnelle valide jusqu'en ${cardYear}`,
      'Avis 100 % vérifiés : séance réalisée obligatoire'
    ].map(t => `<li>${icon('i-shield')}${esc(t)}</li>`).join('');

    function renderStats() {
      const s = stats();
      set('rating', note5(s.avg));
      set('reviews', s.count);
      let p5 = Math.min(0.97, Math.max(0, (s.avg - 4) * 0.95 + 0.05));
      let p4 = (1 - p5) * 0.75;
      let p3 = (1 - p5 - p4) * 0.7;
      let p2 = (1 - p5 - p4 - p3) * 0.6;
      let p1 = Math.max(0, 1 - p5 - p4 - p3 - p2);
      // coach inscrit : la répartition vient uniquement de ses vrais avis
      if (c.account) [p5, p4, p3, p2, p1] = [5, 4, 3, 2, 1].map(n => (s.count ? s.real.filter(r => r.rating === n).length / s.count : 0));
      $('[data-p-bars]').innerHTML = [p5, p4, p3, p2, p1].map((p, i) =>
        `<li style="--i:${i};--w:${p.toFixed(3)}"><span>${5 - i}★</span><i></i><span>${Math.round(p * 100)} %</span></li>`).join('');
      $('[data-p-crit]').innerHTML = s.crit.map((x, i) =>
        `<div class="crit-row" style="--i:${i};--w:${(x.v / 5).toFixed(3)}"><span>${x.label}</span><i></i><b>${note5(x.v)}</b></div>`).join('');
      const base = c.account ? [] : [0, 1, 2, 3].map(k => {
        const r = D.REVIEWS[(seed + k * 3) % D.REVIEWS.length];
        return { name: `${r.name}, ${r.meta}`, text: r.text, rating: k === 2 && c.rating < 4.9 ? 4 : 5, when: ago(k), mine: false };
      });
      // vrais avis (les plus récents d'abord), le tien en premier
      const realList = s.real.slice().sort((a, b) => (b.student === meId()) - (a.student === meId()) || new Date(b.date) - new Date(a.date))
        .map(r => ({ name: r.student === meId() ? `${r.name} (toi)` : r.name, text: r.text, rating: r.rating, when: `le ${new Date(r.date).toLocaleDateString('fr-FR')}`, mine: r.student === meId() }));
      const list = realList.concat(base);
      if (!list.length) { $('[data-p-reviews]').innerHTML = `<p class="formules-empty">Pas encore d'avis : les premiers arriveront après les premières séances avec ${esc(c.first)}.</p>`; return; }
      $('[data-p-reviews]').innerHTML = list.map((r, k) => `
        <article class="review-card${r.mine ? ' is-mine' : ''}"${r.mine ? '' : ` data-reveal style="--rd:${k * 0.06}s"`}>
          <header><div><b>${esc(r.name)}</b><span class="badge badge-mint">${icon('i-check')}Séance vérifiée</span>${r.mine ? '<span class="badge badge-amber">Ton avis</span>' : ''}</div><span>${r.when}</span></header>
          ${starsHtml(r.rating)}
          <p>${esc(r.text)}</p>
        </article>`).join('');
      if (api()) api().prepare($('[data-p-reviews]'));
    }

    // bloc de notation : ouvert seulement aux élèves qui ont réalisé une séance avec ce coach
    const rateBox = $('[data-rate-box]');
    let editing = false;
    function starInput(el, value, onPick) {
      el.innerHTML = [1, 2, 3, 4, 5].map(n =>
        `<button type="button" role="radio" aria-checked="${n === value}" aria-label="${n} étoile${n > 1 ? 's' : ''}" data-v="${n}">${icon('i-star')}</button>`).join('');
      el.dataset.value = String(value || 0);
      const paint = v => $$('button', el).forEach(b => b.classList.toggle('is-on', +b.dataset.v <= v));
      const pick = (v, btn) => {
        el.dataset.value = String(v);
        paint(v);
        $$('button', el).forEach(b => b.setAttribute('aria-checked', String(+b.dataset.v === v)));
        el.classList.remove('is-error');
        if (btn && !reduced) { btn.classList.remove('is-pop'); void btn.offsetWidth; btn.classList.add('is-pop'); }
        if (onPick) onPick(v);
      };
      paint(value || 0);
      el.addEventListener('mouseover', e => { const b = e.target.closest('button'); if (b) paint(+b.dataset.v); });
      el.addEventListener('mouseleave', () => paint(+el.dataset.value));
      el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(+b.dataset.v, b); });
      el.addEventListener('keydown', e => {
        const cur = +el.dataset.value;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); pick(Math.min(5, cur + 1)); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); pick(Math.max(1, cur - 1)); }
      });
    }

    function renderRateBox() {
      const u = readUser();
      const mine = myReviews()[c.id];
      const lock = (title, text, actions) => {
        rateBox.innerHTML = `<div class="rate-locked"><span class="feat-ico">${icon('i-lock')}</span><div><b>${title}</b><p>${text}</p><div class="rate-actions">${actions}</div></div></div>`;
      };
      const bookBtn = '<button type="button" class="btn btn-dark" data-rate-book>Réserver une séance</button>';
      if (!u) {
        lock('Les avis sont réservés aux élèves de ' + c.first,
          `Pour garantir des avis 100 % vérifiés, seuls les élèves qui ont réalisé une séance avec ${c.first} peuvent le noter et laisser un commentaire.`,
          `<a href="connexion.html#connexion" class="btn btn-dark">Me connecter</a>${bookBtn}`);
        return;
      }
      if (u.role === 'coach') {
        lock('Les avis sont réservés aux élèves', 'Un compte coach ne peut pas noter un autre coach.', '');
        return;
      }
      if (!hasDoneSession(c.id)) {
        lock(`Tu pourras noter ${c.first} après ta première séance`,
          `La note et le commentaire se débloquent automatiquement une fois une séance réalisée avec ${c.first}. C'est ce qui rend chaque avis fiable.`,
          `${bookBtn}<button type="button" class="demo-link" style="color:var(--muted-light)" data-rate-demo>(démo) Simuler une séance réalisée</button>`);
        return;
      }
      const session = pastSessions().filter(s => s.id === c.id).sort((a, b) => new Date(b.when) - new Date(a.when))[0];
      const sessionDate = new Date(session.when).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      if (mine && !editing) {
        rateBox.innerHTML = `<div class="rate-mine">
          <div class="rate-head"><p>Ton avis sur ${c.first}</p><span class="badge badge-mint">${icon('i-check')}Séance du ${sessionDate}</span></div>
          <div class="rate-global">${starsHtml(mine.rating)}<span class="rate-word">${WORDS[mine.rating]}</span></div>
          <p>${esc(mine.text)}</p>
          <div class="rate-actions"><button type="button" class="btn btn-dark" data-rate-edit>Modifier mon avis</button></div>
        </div>`;
        return;
      }
      rateBox.innerHTML = `<form class="rate-form" data-rate-form novalidate>
        <div class="rate-head"><p>Note ${c.first}</p><span class="badge badge-mint">${icon('i-check')}Séance réalisée le ${sessionDate}</span></div>
        <div class="rate-global"><div class="star-input star-lg" role="radiogroup" aria-label="Note globale sur 5" data-stars="global"></div><span class="rate-word" data-rate-word>${mine ? WORDS[mine.rating] : 'Choisis une note'}</span></div>
        <div class="rate-crit">${CRIT.map(([k, label]) => `<div class="rate-crit-row"><span>${label}</span><div class="star-input" role="radiogroup" aria-label="${label} sur 5" data-stars="${k}"></div></div>`).join('')}</div>
        <div class="rate-field">
          <label for="rate-text">Ton commentaire</label>
          <textarea id="rate-text" required minlength="20" maxlength="600" placeholder="Raconte ta séance : ce qui t'a plu, ce que tu as appris, ce qui pourrait être mieux…">${mine ? esc(mine.text) : ''}</textarea>
          <span class="rate-count" data-rate-count>0 / 600</span>
        </div>
        <p class="rate-msg" role="alert" data-rate-msg></p>
        <div class="rate-actions">
          <button type="submit" class="btn btn-dark">Publier mon avis<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></button>
          ${mine ? '<button type="button" class="demo-link" style="color:var(--muted-light)" data-rate-cancel>Annuler</button>' : ''}
        </div>
      </form>`;
      const form = $('[data-rate-form]', rateBox);
      const word = $('[data-rate-word]', form);
      starInput($('[data-stars="global"]', form), mine ? mine.rating : 0, v => { word.textContent = WORDS[v]; });
      CRIT.forEach(([k]) => starInput($(`[data-stars="${k}"]`, form), mine && mine.crit ? mine.crit[k] || 0 : 0));
      const ta = $('#rate-text', form);
      const counter = $('[data-rate-count]', form);
      const count = () => { counter.textContent = `${ta.value.length} / 600`; };
      ta.addEventListener('input', () => { count(); ta.closest('.rate-field').classList.remove('is-error'); });
      count();
      if (api()) api().prepare(form);
    }

    rateBox.addEventListener('click', e => {
      if (e.target.closest('[data-rate-book]')) $('[data-p-scroll]').click();
      if (e.target.closest('[data-rate-edit]')) { editing = true; renderRateBox(); }
      if (e.target.closest('[data-rate-cancel]')) { editing = false; renderRateBox(); }
      if (e.target.closest('[data-rate-demo]')) {
        // démo : une séance passée, terminée, apparaît aussi dans l'historique du coach
        const u = readUser();
        DB.addBooking({ coach: c.id, student: u.id, studentName: `${u.name} ${u.last || ''}`.trim(), when: new Date(Date.now() - 2 * 864e5).toISOString(), format: formats[0], place: null, price: c.price, formule: null, status: 'done', demo: true });
        toast(`Démo : séance avec ${c.first} marquée comme réalisée.`);
        renderRateBox();
      }
    });
    rateBox.addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      const msg = $('[data-rate-msg]', form);
      const global = $('[data-stars="global"]', form);
      const rating = +global.dataset.value;
      const ta = $('#rate-text', form);
      if (!rating) {
        global.classList.remove('is-error'); void global.offsetWidth; global.classList.add('is-error');
        msg.textContent = 'Choisis une note de 1 à 5 étoiles.';
        return;
      }
      if (ta.value.trim().length < 20) {
        ta.closest('.rate-field').classList.add('is-error');
        msg.textContent = 'Écris un commentaire d\'au moins 20 caractères pour aider les autres élèves.';
        ta.focus();
        return;
      }
      const crit = {};
      CRIT.forEach(([k]) => { crit[k] = +$(`[data-stars="${k}"]`, form).dataset.value || rating; });
      const u = readUser();
      saveMyReview(c.id, { rating, crit, text: ta.value.trim(), name: u ? `${u.name}${u.last ? ` ${u.last.charAt(0)}.` : ''}` : 'Élève', date: new Date().toISOString() });
      editing = false;
      renderStats();
      renderRateBox();
      toast('Merci ! Ton avis est publié sur le profil.');
    });

    renderStats();
    renderRateBox();
    if (location.hash === '#noter') {
      setTimeout(() => {
        rateBox.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        rateBox.classList.remove('is-flash'); void rateBox.offsetWidth; rateBox.classList.add('is-flash');
      }, 900);
    }
    const msgLink = $('[data-p-msg]');
    if (msgLink) msgLink.href = `messages.html?with=${c.id}`;

    // coachs similaires
    const similar = D.COACHS.filter(x => x.family === c.family && x.id !== c.id)
      .concat(D.COACHS.filter(x => x.family !== c.family && x.id !== c.id))
      .slice(0, 4);
    $('[data-similar]').innerHTML = similar.map((x, i) => coachCard(x, i, true)).join('');

    /* ----- réservation ----- */
    const book = $('[data-book]');
    const daysEl = $('[data-book-days]');
    const slotsEl = $('[data-book-slots]');
    const msg = $('[data-book-msg]');
    const totalEl = $('[data-book-total]');
    const ALL = ['08:00', '09:30', '11:00', '12:30', '17:00', '18:30', '20:00'];
    // coach inscrit : ses créneaux viennent de ses disponibilités (espace pro : matin / midi / soir, du lundi au dimanche)
    const BY_PART = { m: ['08:00', '09:30', '11:00'], a: ['12:30'], s: ['17:00', '18:30', '20:00'] };
    const coachAcc = DB.accountByCoach(c.id);
    const availGrid = coachAcc && ps && Array.isArray(ps.avail) ? ps.avail : null;
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      let slots;
      if (availGrid) {
        const wd = (d.getDay() + 6) % 7; // 0 = lundi
        slots = ALL.filter(t => Object.keys(BY_PART).some(p => availGrid.includes(`${wd}-${p}`) && BY_PART[p].includes(t)));
      } else {
        const s = hash(c.id + i);
        slots = s % 6 === 0 ? [] : ALL.filter((_, k) => (s >> k) & 1);
        if (!slots.length && s % 6) slots = [ALL[s % ALL.length]];
        slots = slots.slice(0, 6);
      }
      days.push({ d, full: !slots.length, slots });
    }
    const formules = formulesFor(c);
    const bk = { day: Math.max(0, days.findIndex(x => !x.full)), slot: null, format: formats[0], formule: null };
    const fmtDay = d => d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
    const fmtMonth = d => d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    const slotDate = (d, t) => { const [hh, mm] = t.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm); };
    const sameMinute = (a, b) => Math.abs(new Date(a) - new Date(b)) < 6e4;
    // réservations déjà faites : avec ce coach (coche) ou avec un autre coach à la même heure (créneau pris)
    const booked = () => myBookings().filter(b => (b.status === 'pending' || b.status === 'confirmed') && new Date(b.when) > new Date());
    const withCoach = () => booked().filter(b => b.id === c.id).sort((a, b) => new Date(a.when) - new Date(b.when));
    // créneaux déjà pris chez ce coach par d'autres élèves
    const takenByOthers = () => coachBookings(c.id).filter(b => b.student !== meId() && (b.status === 'pending' || b.status === 'confirmed'));

    daysEl.innerHTML = days.map((x, i) =>
      `<button type="button" class="day${x.full ? ' is-full' : ''}" data-day="${i}" aria-pressed="false"${x.full ? ' disabled aria-label="Complet"' : ''}><span>${fmtDay(x.d)}</span><b>${x.d.getDate()}</b><span>${fmtMonth(x.d)}</span><i class="day-tick" aria-hidden="true">${icon('i-check')}</i></button>`).join('');

    // lieux : "Chez vous" si le coach se déplace, sinon le lieu précis avec son adresse
    const PLACE_KIND = { Salle: 'En salle', Club: 'Au club', 'Extérieur': 'En extérieur', Domicile: 'À domicile', Visio: 'À distance' };
    const placesEl = $('[data-book-places]');
    const homeBox = $('[data-book-home]');
    const homeInput = $('#book-home');
    placesEl.innerHTML = formats.map(f => {
      const p = placeFor(c, f);
      const title = p.home ? 'Chez vous' : p.remote ? 'En visio' : p.name;
      const sub = p.home ? `${c.first} vient à ton domicile : indique ton adresse` : p.address;
      return `<button type="button" class="place" role="radio" aria-checked="false" data-format="${esc(f)}">
        <span class="place-ico">${icon(p.home ? 'i-home' : p.remote ? 'i-chat' : 'i-pin')}</span>
        <span class="place-txt"><small>${PLACE_KIND[f] || f}</small><b>${esc(title)}</b><span>${esc(sub)}</span></span>
        <span class="place-check">${icon('i-check')}</span>
      </button>`;
    }).join('');
    try { homeInput.value = store.get('s2s-home', ''); } catch (e) { /* rien */ }

    function renderSlots() {
      const day = days[bk.day];
      const mine = booked();
      const others = takenByOthers();
      slotsEl.innerHTML = day.slots.length
        ? day.slots.map((t, i) => {
          const at = slotDate(day.d, t);
          const hit = mine.find(b => sameMinute(b.when, at));
          if (hit && hit.id === c.id) return `<button type="button" class="slot is-booked" style="--i:${i}" disabled aria-label="${t} : déjà réservé par toi">${icon('i-check')}${t}</button>`;
          if (hit) return `<button type="button" class="slot is-taken" style="--i:${i}" disabled title="Tu as déjà une séance à cette heure" aria-label="${t} : tu as déjà une séance à cette heure">${t}</button>`;
          if (others.some(b => sameMinute(b.when, at))) return `<button type="button" class="slot is-taken" style="--i:${i}" disabled title="Déjà réservé par un autre élève" aria-label="${t} : déjà réservé">${t}</button>`;
          return `<button type="button" class="slot${bk.slot === t ? ' is-active' : ''}" style="--i:${i}" data-slot="${t}" aria-pressed="${bk.slot === t}">${t}</button>`;
        }).join('')
        : '<p class="slots-empty">Complet ce jour-là.</p>';
      $$('.day', daysEl).forEach(b => {
        const i = +b.dataset.day;
        const on = i === bk.day;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('has-booked', mine.some(x => x.id === c.id && new Date(x.when).toDateString() === days[i].d.toDateString()));
      });
    }
    function renderPlaces() {
      $$('.place', placesEl).forEach(b => {
        const on = b.dataset.format === bk.format;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-checked', String(on));
      });
      homeBox.hidden = bk.format !== 'Domicile';
    }
    function renderSum() {
      const f = bk.formule;
      const box = $('[data-book-formule]');
      box.hidden = !f;
      if (f) box.innerHTML = `<span>${icon('i-spark')}<span><b>${esc(f.name)}</b>${f.sessions} séances · −${f.discount} %</span></span><button type="button" class="auth-link" data-formule-clear>Retirer</button>`;
      const base = f ? c.price * f.sessions : c.price;
      const total = f ? formuleTotal(c.price, f) : c.price;
      $('[data-book-line]').textContent = f ? `${c.price} € × ${f.sessions} séances` : `${c.price} € × 1 séance`;
      $('[data-book-base]').textContent = euros(base);
      $('[data-book-disc-row]').hidden = !f;
      $('[data-book-disc]').textContent = f ? `− ${euros(base - total)}` : '—';
      tweenNumber(totalEl, total);
      $$('[data-pick-formule]').forEach(b => {
        const on = (b.dataset.pickFormule || '') === (f ? f.id : '');
        b.closest('.formule').classList.toggle('is-picked', on);
        b.textContent = on ? 'Formule choisie ✓' : b.dataset.label;
      });
    }

    // réserver demande un compte élève dont l'identité est vérifiée
    const viewer = readUser();
    const lock = !viewer ? 'login' : viewer.role === 'coach' ? 'coach' : !idOk(viewer) ? 'id' : '';
    const bookBtn = $('[data-book-go]');
    const lockBox = $('[data-book-lock]');
    if (lock) {
      bookBtn.hidden = true;
      lockBox.hidden = false;
      lockBox.innerHTML = {
        login: `${icon('i-lock')}<p><b>Connecte-toi pour réserver</b>Un compte élève avec une pièce d'identité vérifiée est nécessaire.</p><a class="btn btn-primary btn-block" href="connexion.html">Se connecter</a>`,
        coach: `${icon('i-lock')}<p><b>Réservation réservée aux élèves</b>Tu es connecté·e avec un compte coach.</p>`,
        id: `${icon('i-lock')}<p><b>Réservation désactivée</b>Ajoute ta pièce d'identité dans ton espace : on vérifie que ton prénom et ton nom correspondent à ton compte.</p><a class="btn btn-primary btn-block" href="espace.html#identite">Ajouter ma pièce d'identité</a>`
      }[lock];
    }

    function showDone(list) {
      const next = list[0];
      if (!next) return;
      const d = new Date(next.when);
      $('[data-book-form]').hidden = true;
      $('[data-book-done]').hidden = false;
      $('[data-done-day]').textContent = d.getDate();
      $('[data-done-month]').textContent = fmtMonth(d);
      $('[data-done-time]').textContent = hhmm(d);
      $('[data-done-what]').textContent = `${c.sport} avec ${c.first}${next.formule ? ` · ${next.formule.name}` : ''}`;
      // demande en attente : le coach doit l'accepter depuis son espace pro
      const waiting = next.status === 'pending';
      $('[data-done-title]').textContent = waiting ? 'Demande envoyée !' : 'Séance réservée !';
      $('[data-done-badge]').textContent = waiting ? `En attente de ${c.first}` : 'Confirmée ✓';
      $('[data-done-badge]').className = `badge ${waiting ? 'badge-amber' : 'badge-mint'}`;
      const pl = next.place || placeFor(c, next.format);
      $('[data-done-place]').innerHTML = `${icon(pl.home ? 'i-home' : pl.remote ? 'i-chat' : 'i-pin')}<span>${esc(pl.home ? `Chez vous · ${pl.address}` : placeLine(pl))}</span>`;
      $('[data-done-more]').innerHTML = list.slice(1, 4).map(b => {
        const x = new Date(b.when);
        return `<li>${icon('i-check')}<span>Aussi réservé : ${x.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')} · ${hhmm(x)}${b.status === 'pending' ? ' (en attente)' : ''}</span></li>`;
      }).join('');
    }

    // la bande de réservation défile avec la page (avis compris) puis se cale sans jamais couper son bas
    const fitSticky = () => { book.style.top = `${Math.min(96, window.innerHeight - book.offsetHeight - 16)}px`; };
    window.addEventListener('resize', fitSticky);
    if ('ResizeObserver' in window) new ResizeObserver(fitSticky).observe(book);

    renderSlots();
    renderPlaces();
    renderSum();
    fitSticky();
    // déjà une séance réservée avec ce coach : on garde la coche visible (pas de double réservation par erreur)
    if (withCoach().length) showDone(withCoach());

    daysEl.addEventListener('click', e => {
      const b = e.target.closest('.day');
      if (!b || b.disabled) return;
      bk.day = +b.dataset.day;
      bk.slot = null;
      renderSlots();
    });
    slotsEl.addEventListener('click', e => {
      const b = e.target.closest('.slot[data-slot]');
      if (!b) return;
      bk.slot = b.dataset.slot;
      msg.textContent = '';
      $$('.slot[data-slot]', slotsEl).forEach(s => {
        const on = s === b;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-pressed', String(on));
      });
    });
    placesEl.addEventListener('click', e => {
      const b = e.target.closest('.place');
      if (!b) return;
      bk.format = b.dataset.format;
      renderPlaces();
      if (bk.format === 'Domicile') setTimeout(() => homeInput.focus(), 50);
    });

    // formules du coach (onglet "Mes formules")
    const fBox = $('[data-p-formules]');
    $('[data-p-fcount]').textContent = formules.length || '';
    fBox.innerHTML = `
      <article class="formule formule-solo">
        <div class="formule-top"><span class="formule-n">1 séance</span></div>
        <h3>À l'unité</h3>
        <p>Sans engagement, tu paies séance par séance.</p>
        <p class="formule-price"><b>${c.price} €</b><span>la séance</span></p>
        <button type="button" class="btn btn-line" data-pick-formule="" data-label="Réserver à l'unité">Réserver à l'unité</button>
      </article>` + formules.map(f => `
      <article class="formule">
        <div class="formule-top"><span class="formule-off">−${f.discount} %</span><span class="formule-n">${f.sessions} séances</span></div>
        <h3>${esc(f.name)}</h3>
        <p>${esc(f.note || 'Formule proposée par le coach')}</p>
        <p class="formule-price"><b>${formuleTotal(c.price, f)} €</b><s>${c.price * f.sessions} €</s><span>soit ${Math.round(formuleTotal(c.price, f) / f.sessions)} € la séance</span></p>
        <button type="button" class="btn btn-dark" data-pick-formule="${esc(f.id)}" data-label="Choisir cette formule">Choisir cette formule</button>
      </article>`).join('') + (formules.length ? '' : `<p class="formules-empty">${esc(c.first)} n'a pas encore créé de formule : les séances se réservent à l'unité.</p>`);
    renderSum();
    fBox.addEventListener('click', e => {
      const b = e.target.closest('[data-pick-formule]');
      if (!b) return;
      bk.formule = formules.find(f => f.id === b.dataset.pickFormule) || null;
      renderSum();
      if ($('[data-book-done]').hidden === false) { $('[data-book-done]').hidden = true; $('[data-book-form]').hidden = false; }
      book.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      book.classList.remove('is-flash'); void book.offsetWidth; book.classList.add('is-flash');
      toast(bk.formule ? `Formule « ${bk.formule.name} » appliquée à ta réservation.` : 'Réservation à l\'unité.');
    });
    book.addEventListener('click', e => { if (e.target.closest('[data-formule-clear]')) { bk.formule = null; renderSum(); } });

    // onglets À propos / Mes formules
    const ptabs = $$('[data-ptab]');
    const pInd = $('[data-ptabs-ind]');
    const placePInd = () => { const a = ptabs.find(t => t.classList.contains('is-active')); if (a && pInd) { pInd.style.width = `${a.offsetWidth}px`; pInd.style.transform = `translateX(${a.offsetLeft}px)`; } };
    function showPTab(key, scroll) {
      ptabs.forEach(t => { const on = t.dataset.ptab === key; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      $$('[data-ppanel]').forEach(p => {
        const on = p.dataset.ppanel === key;
        const was = !p.hidden;
        p.hidden = !on;
        if (on && !was && !reduced) p.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: EASE_OUT });
      });
      placePInd();
      if (scroll) $('#presentation').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    }
    ptabs.forEach(t => t.addEventListener('click', () => showPTab(t.dataset.ptab)));
    window.addEventListener('resize', placePInd);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placePInd);
    placePInd();
    if (location.hash === '#formules') showPTab('formules', true);

    bookBtn.addEventListener('click', () => {
      if (lock) return;
      if (!bk.slot) {
        msg.textContent = 'Choisis un jour et un créneau pour réserver.';
        slotsEl.classList.remove('is-error');
        void slotsEl.offsetWidth;
        slotsEl.classList.add('is-error');
        return;
      }
      const home = bk.format === 'Domicile' ? homeInput.value.trim() : '';
      if (bk.format === 'Domicile' && home.length < 8) {
        msg.textContent = 'Indique ton adresse : le coach vient chez toi.';
        flag([homeInput]);
        homeInput.focus();
        return;
      }
      const when = slotDate(days[bk.day].d, bk.slot);
      // sécurité anti-double réservation (même créneau déjà pris par toi)
      if (booked().some(b => sameMinute(b.when, when))) {
        msg.textContent = 'Tu as déjà une séance réservée à cette heure-là.';
        renderSlots();
        return;
      }
      msg.textContent = '';
      fakeLoad(bookBtn, () => {
        const p = placeFor(c, bk.format);
        const place = p.home ? { name: 'Chez vous', address: home, home: true } : { name: p.name, address: p.address, remote: !!p.remote };
        const f = bk.formule;
        // coach inscrit : la demande attend sa validation ; coach de démo sans compte : confirmée tout de suite
        const real = !!coachAcc;
        const rec = DB.addBooking({
          coach: c.id, student: viewer.id, studentName: `${viewer.name} ${viewer.last || ''}`.trim(),
          when: when.toISOString(), format: bk.format, place, price: c.price,
          formule: f ? { name: f.name, sessions: f.sessions, discount: f.discount, total: formuleTotal(c.price, f) } : null,
          status: real ? 'pending' : 'confirmed'
        });
        if (real) notifyAccount(coachAcc.id, `Nouvelle demande de ${viewer.name} : ${c.sport.toLowerCase()} le ${longWhen(when)}.`, 'pro.html#agenda', 'booking');
        if (home) store.set('s2s-home', home);
        bk.slot = null;
        // la demande qu'on vient d'envoyer s'affiche en premier
        const wl = withCoach();
        const fresh = wl.find(b => b.bid === rec.id);
        showDone(fresh ? [fresh].concat(wl.filter(b => b !== fresh)) : wl);
        renderSlots();
        toast(real ? `Demande envoyée à ${c.first} : tu seras prévenu·e dès qu'elle l'accepte.` : `Séance confirmée avec ${c.first} !`);
      }, 1100);
    });
    $('[data-book-again]').addEventListener('click', () => {
      $('[data-book-done]').hidden = true;
      $('[data-book-form]').hidden = false;
      bk.slot = null;
      renderSlots();
    });
    $('[data-p-scroll]').addEventListener('click', () => {
      book.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      book.classList.remove('is-flash');
      void book.offsetWidth;
      book.classList.add('is-flash');
    });
    // en direct : le coach accepte ou refuse dans un autre onglet, un autre élève prend un créneau, un avis arrive
    DB.onChange((what, external) => {
      if (!external) return;
      if (what === 'bookings') {
        renderSlots();
        if (withCoach().length) showDone(withCoach());
        else if (!$('[data-book-done]').hidden) { $('[data-book-done]').hidden = true; $('[data-book-form]').hidden = false; }
      }
      if (what === 'reviews') renderStats();
    });
  }

  /* =========================================================
     Page Sports
     ========================================================= */
  const sportsPage = $('[data-sports-page]');
  if (sportsPage) {
    const list = $('[data-uni-list]');
    list.innerHTML = Object.entries(D.FAMILIES).map(([key, f]) => {
      const sports = D.SPORTS.filter(s => s.family === key);
      const total = sports.reduce((a, s) => a + s.coaches, 0);
      return `<section class="uni-block" id="${key}" data-uni="${key}">
        <div class="uni-head" data-reveal>
          <span class="uni-icon">${icon(f.icon)}</span>
          <div><h2>${f.label}</h2><p>${f.desc}</p></div>
          <p class="uni-count"><b>${total}</b><strong>coachs</strong> · ${sports.length} sports</p>
        </div>
        <div class="sport-grid" data-stagger>
          ${sports.map(s => `<a class="sport-card" href="coachs.html?sport=${encodeURIComponent(s.name)}" data-name="${normalize(s.name)}">
            <h3>${s.name}</h3>
            <span class="sc-meta"><span><b>${s.coaches} coachs</b><br>dès ${s.from} €/h</span><span class="sc-arrow">${icon('i-arrow')}</span></span>
          </a>`).join('')}
        </div>
      </section>`;
    }).join('');

    // remplissage qui part du point d'entrée de la souris
    list.addEventListener('mouseover', e => {
      const card = e.target.closest('.sport-card');
      if (!card || card.contains(e.relatedTarget)) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--cx', `${e.clientX - r.left}px`);
      card.style.setProperty('--cy', `${e.clientY - r.top}px`);
    });

    // onglets d'univers + repérage pendant le scroll
    const tabs = $$('[data-uni-tab]');
    const setTab = key => tabs.forEach(t => {
      const on = t.dataset.uniTab === key;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-pressed', String(on));
    });
    tabs.forEach(t => t.addEventListener('click', () => {
      const key = t.dataset.uniTab;
      const target = key === 'all' ? list : document.getElementById(key);
      if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      setTab(key);
    }));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) setTab(en.target.dataset.uni); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    $$('.uni-block', list).forEach(b => spy.observe(b));

    // recherche instantanée
    const q = $('[data-sport-q]');
    const emptyEl = $('[data-sports-empty]');
    const countEl = $('[data-sport-count]');
    q.addEventListener('input', () => {
      const v = normalize(q.value);
      let total = 0;
      $$('.uni-block', list).forEach(block => {
        let n = 0;
        $$('.sport-card', block).forEach(card => {
          const show = !v || card.dataset.name.includes(v);
          card.hidden = !show;
          if (show) n++;
        });
        block.hidden = n === 0;
        total += n;
      });
      emptyEl.hidden = total > 0;
      countEl.textContent = v ? `${total} sport${total > 1 ? 's' : ''} trouvé${total > 1 ? 's' : ''}` : `${D.SPORTS.length} sports`;
      if (api()) api().queueMeasure();
    });
    // liste déroulante : choisir un sport mène directement à ses coachs
    attachAutocomplete(q, { groups: ['sports'], recent: false, onPick: it => go(`coachs.html?sport=${encodeURIComponent(it.value)}`) });
    $('[data-sport-form]').addEventListener('submit', e => {
      e.preventDefault();
      const first = $('.sport-card:not([hidden])', list);
      if (first) go(first.getAttribute('href'));
    });
  }

  /* =========================================================
     Devenir coach : simulateur de revenus + candidature
     ========================================================= */
  const sim = $('[data-sim]');
  if (sim) {
    const rate = $('[data-sim-rate]');
    const hours = $('[data-sim-hours]');
    const out = $('[data-sim-net]');
    const update = () => {
      paintRange(rate);
      paintRange(hours);
      const month = +hours.value * 4.33;
      const tierIdx = tierOf(month);
      const com = COM_TIERS[tierIdx].c;
      const gross = +rate.value * month;
      $('[data-sim-rate-label]').textContent = `${rate.value} €/h`;
      $('[data-sim-hours-label]').textContent = `${hours.value} h/sem.`;
      $('[data-sim-gross]').textContent = euros(gross);
      $('[data-sim-com]').textContent = `− ${euros(gross * com)} (${Math.round(com * 100)} %)`;
      $('[data-sim-month]').textContent = `${Math.round(month)} h`;
      tweenNumber(out, gross * (1 - com), v => Math.round(v).toLocaleString('fr-FR'));
      $$('[data-tier]').forEach((t, i) => t.classList.toggle('is-on', i === tierIdx));
    };
    rate.addEventListener('input', update);
    hours.addEventListener('input', update);
    update();
  }

  /* =========================================================
     Inscription coach : page dédiée en 5 étapes
     (coordonnées vérifiées par code, identité + selfie, carte pro, diplôme, SIRET, RC Pro)
     ========================================================= */
  const cs = $('[data-coach-signup]');
  if (cs) {
    const el = cs.elements;
    const panes = $$('[data-cs-pane]', cs);
    const steps = $$('[data-cs-step]');
    const bar = $('[data-cs-bar]');
    const prev = $('[data-cs-prev]');
    const next = $('[data-cs-next]');
    const skip = $('[data-cs-skip]');
    const send = $('[data-cs-send]');
    const msg = $('[data-cs-msg]');
    const skipped = new Set();
    const verified = { email: '', phone: '' }; // valeur vérifiée (si elle change, il faut revérifier)
    const codes = {};
    let idx = 0;

    // listes : sports par univers, départements
    const sportSel = $('[data-sport-options]', cs);
    sportSel.insertAdjacentHTML('beforeend', Object.entries(D.FAMILIES).map(([k, f]) =>
      `<optgroup label="${f.label}">${D.SPORTS.filter(s => s.family === k).map(s => `<option>${s.name}</option>`).join('')}</optgroup>`).join(''));
    $('[data-dept-options]', cs).insertAdjacentHTML('beforeend', D.DEPTS.map(d => `<option value="${d.code}">${d.code} · ${esc(d.name)}</option>`).join(''));

    const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
    const ageOf = v => { const b = new Date(v); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; };
    // SIRET : 14 chiffres + clé de Luhn
    const siretOk = v => {
      const s = String(v).replace(/\s/g, '');
      if (!/^\d{14}$/.test(s)) return false;
      let sum = 0;
      for (let i = 0; i < 14; i++) { let n = +s[13 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }
      return sum % 10 === 0;
    };
    const idNameOk = () => plainName(el.idFirst.value) === plainName(el.firstname.value) && plainName(el.idLast.value) === plainName(el.lastname.value);
    const filled = pane => $$('input, select', pane).some(f => (f.type === 'checkbox' ? f.checked : f.type === 'file' ? f.files.length : f.value.trim()));

    function show(i) {
      idx = i;
      panes.forEach((p, k) => {
        p.hidden = k !== i;
        if (k === i && !reduced) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
      });
      steps.forEach((s, k) => {
        s.classList.toggle('is-current', k === i);
        s.classList.toggle('is-done', k < i && !skipped.has(k));
        s.classList.toggle('is-skipped', k < i && skipped.has(k));
      });
      bar.style.transform = `scaleX(${(i + 1) / panes.length})`;
      prev.hidden = i === 0;
      next.hidden = i === panes.length - 1;
      send.hidden = i !== panes.length - 1;
      skip.hidden = !panes[i].hasAttribute('data-optional');
      msg.textContent = '';
      if (i === panes.length - 1) renderSummary();
      if (i > 0) window.scrollTo({ top: Math.max(0, cs.closest('.cs-panel').getBoundingClientRect().top + window.scrollY - 100), behavior: reduced ? 'auto' : 'smooth' });
    }
    steps.forEach((s, k) => {
      s.tabIndex = 0;
      const go2 = () => { if (k < idx || (k > idx && k <= maxReached)) show(k); };
      s.addEventListener('click', go2);
      s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go2(); } });
    });
    let maxReached = 0;

    // ----- e-mail et téléphone : code de vérification (démo : le code s'affiche à l'écran) -----
    $$('[data-send-code]', cs).forEach(b => b.addEventListener('click', () => {
      const kind = b.dataset.sendCode;
      const inp = kind === 'email' ? el.email : el.phone;
      if (!inp.value.trim() || !inp.checkValidity()) { flag([inp]); msg.textContent = kind === 'email' ? 'Saisis un e-mail valide pour recevoir le code.' : 'Saisis un numéro de portable valide (06 12 34 56 78).'; inp.focus(); return; }
      if (kind === 'email' && DB.byEmail(inp.value)) { flag([inp]); msg.innerHTML = 'Un compte existe déjà avec cet e-mail. <a href="connexion.html#connexion">Connecte-toi</a>.'; inp.focus(); return; }
      codes[kind] = String(100000 + Math.floor(Math.random() * 900000));
      const box = b.closest('[data-verify]');
      $('[data-code-box]', box).hidden = false;
      $('[data-code-input]', box).value = '';
      $('[data-code-input]', box).focus();
      b.textContent = 'Renvoyer';
      msg.textContent = '';
      toast(`Démo : ton code ${kind === 'email' ? 'e-mail' : 'SMS'} est ${codes[kind]}`);
    }));
    $$('[data-check-code]', cs).forEach(b => b.addEventListener('click', () => checkCode(b.dataset.checkCode)));
    $$('[data-code-input]', cs).forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkCode(inp.closest('[data-verify]').dataset.verify); } }));
    function checkCode(kind) {
      const box = $(`[data-verify="${kind}"]`, cs);
      const inp = $('[data-code-input]', box);
      if (!codes[kind] || inp.value.replace(/\D/g, '') !== codes[kind]) { flag([inp]); msg.textContent = 'Code incorrect : vérifie les 6 chiffres reçus.'; return; }
      verified[kind] = (kind === 'email' ? el.email : el.phone).value.trim();
      $('[data-code-box]', box).hidden = true;
      $('[data-verified]', box).hidden = false;
      box.classList.add('is-verified');
      msg.textContent = '';
      toast(kind === 'email' ? 'E-mail vérifié.' : 'Téléphone vérifié.');
    }
    // une adresse modifiée après vérification doit être revérifiée
    ['email', 'phone'].forEach(kind => (kind === 'email' ? el.email : el.phone).addEventListener('input', e => {
      const box = $(`[data-verify="${kind}"]`, cs);
      const ok = verified[kind] && e.target.value.trim() === verified[kind];
      $('[data-verified]', box).hidden = !ok;
      box.classList.toggle('is-verified', !!ok);
    }));

    // ----- mot de passe -----
    el.password.addEventListener('input', () => {
      const v = el.password.value;
      const score = v.length < 8 ? (v ? 1 : 0) : 1 + [/[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(v)).length;
      const st = $('[data-cs-strength]');
      st.dataset.score = Math.min(4, score);
      $('[data-cs-strength-label]').textContent = !v ? '8 caractères minimum' : v.length < 8 ? 'Trop court' : ['Faible', 'Correct', 'Solide', 'Excellent'][Math.min(3, score - 1)];
    });
    $$('[data-eye]', cs).forEach(b => b.addEventListener('click', () => {
      const inp = $('input', b.closest('.field'));
      const show2 = inp.type === 'password';
      inp.type = show2 ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(show2));
      b.setAttribute('aria-label', show2 ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
    }));

    // ----- identité : verso inutile pour un passeport, concordance des noms en direct -----
    const syncBack = () => {
      const pass = el.idType.value === 'Passeport';
      const back = $('[data-id-back]', cs);
      back.hidden = pass;
      el.idBack.required = !pass;
    };
    el.idType.addEventListener('change', syncBack);
    const idOut = $('[data-cs-idmatch]', cs);
    const syncIdMatch = () => {
      if (!el.idFirst.value.trim() && !el.idLast.value.trim()) { idOut.textContent = ''; idOut.className = 'id-match full'; return; }
      const good = idNameOk();
      idOut.className = `id-match full ${good ? 'is-ok' : 'is-bad'}`;
      idOut.textContent = good ? 'Prénom et nom identiques à ton compte' : `Différent du compte (${el.firstname.value.trim()} ${el.lastname.value.trim()})`;
    };
    [el.idFirst, el.idLast, el.firstname, el.lastname].forEach(i => i.addEventListener('input', syncIdMatch));

    // ----- statut : SIRET obligatoire sauf pour un salarié -----
    const syncSiret = () => {
      const need = el.status.value && el.status.value !== 'salarie';
      $('[data-siret-box]', cs).hidden = !need;
      el.siret.required = !!need;
    };
    el.status.addEventListener('change', syncSiret);
    el.siret.addEventListener('input', () => {
      const d = el.siret.value.replace(/\D/g, '').slice(0, 14);
      el.siret.value = d.replace(/^(\d{3})(\d{0,3})(\d{0,3})(\d{0,5}).*/, (m, a, b2, c, e2) => [a, b2, c, e2].filter(Boolean).join(' '));
    });
    syncBack();
    syncSiret();

    // ----- validation d'une étape -----
    function check(i) {
      const pane = panes[i];
      $$('[data-future], [data-adult], [data-siret]', pane).forEach(f => f.setCustomValidity(''));
      if (el.birth.value && ageOf(el.birth.value) < 18) el.birth.setCustomValidity('mineur');
      if (el.cardEnd.value && new Date(el.cardEnd.value) <= today0()) el.cardEnd.setCustomValidity('expirée');
      if (el.siret.required && el.siret.value && !siretOk(el.siret.value)) el.siret.setCustomValidity('siret');
      const bad = $$('input, select', pane).filter(f => !f.disabled && !f.closest('[hidden]') && !f.checkValidity());
      if (bad.length) {
        flag(bad);
        const b0 = bad[0];
        msg.textContent = b0 === el.birth && el.birth.value ? 'Il faut avoir 18 ans pour s\'inscrire comme coach.'
          : b0 === el.cardEnd && el.cardEnd.value ? 'Ta carte professionnelle est expirée : renouvelle-la avant de t\'inscrire, ou complète cette étape plus tard.'
          : b0 === el.siret && el.siret.value ? 'Ce numéro SIRET n\'est pas valide (14 chiffres, clé de contrôle).'
          : b0 === el.password ? 'Choisis un mot de passe d\'au moins 8 caractères.'
          : bad.every(f => f.type === 'checkbox') ? 'Coche les engagements signalés pour continuer.'
          : 'Complète les champs signalés pour continuer.';
        b0.focus();
        return false;
      }
      if (i === 0) {
        const miss = ['email', 'phone'].filter(k => verified[k] !== (k === 'email' ? el.email : el.phone).value.trim());
        if (miss.length) {
          flag(miss.map(k => (k === 'email' ? el.email : el.phone)));
          msg.textContent = `Vérifie ${miss.map(k => (k === 'email' ? 'ton e-mail' : 'ton téléphone')).join(' et ')} avec le code reçu avant de continuer.`;
          return false;
        }
      }
      if (i === 1 && !idNameOk()) {
        flag([el.idFirst, el.idLast]);
        msg.textContent = 'Le prénom ou le nom de ta pièce ne correspond pas à celui de ton compte (étape 1). Ils doivent être identiques.';
        return false;
      }
      return true;
    }
    next.addEventListener('click', () => {
      if (!check(idx)) return;
      skipped.delete(idx);
      maxReached = Math.max(maxReached, idx + 1);
      show(idx + 1);
    });
    prev.addEventListener('click', () => show(idx - 1));
    skip.addEventListener('click', () => {
      skipped.add(idx);
      maxReached = Math.max(maxReached, idx + 1);
      show(idx + 1);
      toast('Étape passée : tu pourras la compléter depuis ton espace pro.');
    });

    // ----- récapitulatif -----
    const fname = f => (f && f.files && f.files[0] ? f.files[0].name : '');
    function stateOf(i) {
      if (skipped.has(i) || (!filled(panes[i]) && i > 0)) return 'todo';
      return 'ok';
    }
    function renderSummary() {
      const rows = [
        [0, 'i-user', 'Compte', `${el.firstname.value.trim()} ${el.lastname.value.trim()} · ${el.email.value.trim()} · ${el.phone.value.trim()}`, 'E-mail et téléphone vérifiés'],
        [1, 'i-card', 'Pièce d\'identité', el.idType.value ? `${el.idType.value} · ${fname(el.idFront)}${el.selfie.files.length ? ' · selfie' : ''}` : '', 'Vérifiée : nom identique au compte'],
        [2, 'i-shield', 'Carte professionnelle', el.card.value ? `N° ${el.card.value.trim().toUpperCase()} · ${el.diploma.value} · ${el.sport.value}` : '', 'Envoyée : vérification sous 72h'],
        [3, 'i-wallet', 'Activité & assurance', el.status.value ? `${el.status.selectedOptions[0].textContent}${el.siret.value ? ` · SIRET ${el.siret.value}` : ''} · RC Pro ${el.insurer.value.trim()}` : '', 'Envoyée : vérification sous 72h']
      ];
      $('[data-cs-summary]').innerHTML = rows.map(([i, ico, label, detail, okTxt]) => {
        const ok = stateOf(i) === 'ok';
        return `<li class="cs-sum-row${ok ? ' is-ok' : ''}">
          <span class="cs-sum-ico">${icon(ok ? 'i-check' : ico)}</span>
          <span class="cs-sum-txt"><b>${label}</b><span>${ok ? esc(detail) : 'À compléter : ton annonce restera masquée en attendant'}</span></span>
          <span class="cs-sum-st">${ok ? okTxt : `<button type="button" class="cs-sum-go" data-cs-goto="${i}">Compléter</button>`}</span>
        </li>`;
      }).join('');
      const missing = [1, 2].filter(i => stateOf(i) !== 'ok');
      $('[data-cs-publish]').innerHTML = missing.length
        ? `${icon('i-lock')}<span>Tu peux créer ton compte maintenant, mais ton annonce ne sera pas publiée tant que ${missing.map(i => (i === 1 ? 'ta pièce d\'identité' : 'ta carte professionnelle')).join(' et ')} ${missing.length > 1 ? 'ne sont pas ajoutées' : 'n\'est pas ajoutée'}.</span>`
        : `${icon('i-shield')}<span>Tout est prêt. Ta carte pro et ton assurance partent en vérification (sous 72h) ; ton annonce est publiée dès leur validation.</span>`;
    }
    $('[data-cs-summary]').addEventListener('click', e => {
      const g = e.target.closest('[data-cs-goto]');
      if (g) { skipped.delete(+g.dataset.csGoto); show(+g.dataset.csGoto); }
    });

    // ----- création du compte -----
    cs.addEventListener('submit', e => {
      e.preventDefault();
      if (idx !== panes.length - 1) { next.click(); return; }
      if (!check(idx)) return;
      const hasId = stateOf(1) === 'ok';
      const hasCard = stateOf(2) === 'ok';
      const hasAct = stateOf(3) === 'ok';
      const now = new Date().toISOString();
      const photo = $('[data-photo-input]', cs);
      const user = {
        name: el.firstname.value.trim(),
        last: el.lastname.value.trim(),
        role: 'coach',
        email: verified.email,
        phone: verified.phone,
        birth: el.birth.value,
        identity: hasId
          ? { status: 'valid', type: el.idType.value, file: fname(el.idFront), back: fname(el.idBack), selfie: fname(el.selfie), sent: now }
          : { status: 'missing' },
        card: hasCard
          ? { number: el.card.value.trim().toUpperCase(), end: el.cardEnd.value, diploma: el.diploma.value, sport: el.sport.value, file: fname(el.cardFront), back: fname(el.cardBack), diplomaFile: fname(el.diplomaFile), status: 'verification', sent: now }
          : null,
        activity: hasAct
          ? { status: el.status.value, siret: el.siret.value.replace(/\s/g, ''), dept: el.dept.value, years: el.years.value, insurer: el.insurer.value.trim(), policy: el.policy.value.trim(), insuranceFile: fname(el.insuranceFile), firstAid: fname(el.firstAid), sent: now }
          : null
      };
      if (photo && photo._photo) user.photo = photo._photo;
      fakeLoad(send, () => {
        // vrai compte coach dans la base partagée, connecté dans cet onglet
        const acc = DB.createAccount(user, el.password.value);
        DB.login(acc.id);
        if (hasAct && el.dept.value) store.set('s2s-dept', el.dept.value);
        // premiers réglages publics de l'annonce : tarif par défaut, un lieu, quelques créneaux
        DB.savePro(acc.coachId, { price: 35, formats: ['Salle'], avail: ['0-s', '2-s', '4-s', '5-m'] });
        $('[data-cs-name]').textContent = user.name;
        $('[data-cs-done-txt]').textContent = hasId && hasCard
          ? 'Ton compte coach est créé. Ta carte professionnelle part en vérification (sous 72h) : ton annonce sera publiée dès sa validation. (Démo : rien n\'a été envoyé.)'
          : 'Ton compte coach est créé. Complète les étapes manquantes depuis ton espace pro : ton annonce sera publiée une fois ton identité et ta carte pro validées.';
        cs.hidden = true;
        $('.cs-progress').hidden = true;
        $('[data-cs-done]').hidden = false;
        steps.forEach(s => { s.classList.remove('is-current'); });
        toast(`Bienvenue ${user.name} ! Direction ton espace pro…`);
        setTimeout(() => go('pro.html'), 2600);
      }, 1300);
    });

    show(0);
  }

  /* =========================================================
     Espace élève : annuler (jusqu'à 48 h avant) ou reporter une séance
     (moins de 48 h avant : annulation remboursée à 50 %, puis 0 % à moins d'1 h ;
      report gratuit avec justificatif médical jusqu'à 5 h avant le début)
     ========================================================= */
  const rs = $('[data-resched]');
  if (rs) {
    const user = readUser();
    if (!user || user.role === 'coach') {
      rs.innerHTML = `<div class="rs-panel rs-empty">${icon('i-lock')}<p><b>${user ? 'Page réservée aux élèves' : 'Connecte-toi pour gérer tes séances'}</b>${user ? 'Les coachs gèrent leurs séances depuis l\'onglet Réservations de leur espace pro.' : 'Retrouve tes séances à venir, puis annule-les ou reporte-les.'}</p><a class="btn btn-primary" href="${user ? 'pro.html#agenda' : 'connexion.html#connexion'}">${user ? 'Mon espace pro' : 'Me connecter'}</a></div>`;
    } else {
      const SL = ['09:00', '10:30', '12:30', '17:00', '18:30', '20:00'];
      const longDate = d => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const whenTxt = d => `${longDate(d)} à ${hhmm(d)}`;
      const leftTxt = d => {
        const h = Math.max(0, hoursLeft(d));
        const days = Math.floor(h / 24);
        const hrs = Math.floor(h % 24);
        return h < 1 ? 'moins d\'une heure' : days ? `${days} j ${hrs} h` : `${hrs} h`;
      };
      const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
      let list = eleveUpcoming();
      let cur = list.find(s => s.bid === params.get('b')) || null;
      const st = { mode: '', day: null, slot: null };

      // nouveaux créneaux : 14 jours à partir de demain ; pris si le coach a déjà une séance à cette heure
      const days = [...Array(14)].map((_, i) => { const d = today0(); d.setDate(d.getDate() + 1 + i); return d; });
      const slotDate = (d, s) => { const x = new Date(d); const [h, m] = s.split(':'); x.setHours(+h, +m, 0, 0); return x; };
      const taken = (d, s) => {
        const at = slotDate(d, s);
        if (list.some(o => o !== cur && Math.abs(o.when - at) < 6e4)) return 'Tu as déjà une séance';
        if (coachBookings(cur.coach.id).some(b => b.id !== cur.bid && (b.status === 'pending' || b.status === 'confirmed') && Math.abs(new Date(b.when) - at) < 6e4)) return 'Déjà réservé chez ce coach';
        return DB.accountByCoach(cur.coach.id) ? '' : (hash(`${cur.coach.id}-${d.toDateString()}-${s}`) % 4 === 0 ? 'Déjà pris' : '');
      };
      const picker = () => `
        <div class="rs-pick">
          <span class="ctl-label">Nouveau jour</span>
          <div class="days rs-days">${days.map((d, i) => `<button type="button" class="day${st.day === i ? ' is-active' : ''}" data-rs-day="${i}" aria-pressed="${st.day === i}">${d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}<b>${d.getDate()}</b></button>`).join('')}</div>
          <span class="ctl-label">Nouveau créneau</span>
          <div class="slots" data-rs-slots>${st.day === null ? '<p class="slots-empty">Choisis d\'abord un jour.</p>' : SL.map((s, i) => { const why = taken(days[st.day], s); return `<button type="button" class="slot${st.slot === s ? ' is-active' : ''}${why ? ' is-taken' : ''}" style="--i:${i}" data-rs-slot="${s}"${why ? ` disabled title="${why}"` : ''}>${s}</button>`; }).join('')}</div>
        </div>`;

      function card(s) {
        const h = hoursLeft(s.when);
        // demande pas encore acceptée : retirable à tout moment ; sinon gratuite à plus de 48 h, remboursée à 50 % après (ou après un report médical)
        const rate = s.status === 'pending' ? 1 : refundRate(h, s.cert);
        const free = rate === 1;
        return `<div class="rs-sess">
          <span class="rs-av v-${s.coach.visual}">${s.coach.initials}</span>
          <span class="rs-sess-txt"><b>${esc(s.coach.sport)} avec ${esc(s.coach.first)} ${esc(s.coach.last)}</b>
            <span>${whenTxt(s.when)} · ${esc(placeLine(s.place) || s.format)}${s.status === 'pending' ? ' · en attente du coach' : ''}</span></span>
          <span class="rs-left ${free ? 'is-free' : 'is-late'}">${s.status === 'pending' ? 'Demande en attente' : free ? 'Annulable gratuitement' : rate ? 'Annulation remboursée à 50 %' : 'Aucun remboursement'}<small>début dans ${leftTxt(s.when)}</small></span>
        </div>`;
      }
      function render() {
        if (!cur) {
          rs.innerHTML = `<div class="rs-panel">
            <h2 class="rs-h">Quelle séance ?</h2>
            ${list.length ? `<div class="rs-list">${list.map((s, i) => `<button type="button" class="rs-choose" data-rs-pick="${i}">${card(s)}${icon('i-arrow')}</button>`).join('')}</div>`
            : '<p class="rs-note">Aucune séance à venir. <a href="coachs.html">Réserver une séance →</a></p>'}
          </div>`;
          return;
        }
        const h = hoursLeft(cur.when);
        const pendingReq = cur.status === 'pending';
        const rate = pendingReq ? 1 : refundRate(h, cur.cert);
        const free = rate === 1;
        const refund = Math.round(cur.price * rate);
        const certOk = h >= HOURS_CERT; // report avec justificatif : plus possible à moins de 5 h
        if (st.mode === 'medical' && !certOk) st.mode = '';
        const started = h <= 0;
        const opt = (mode, ico, title, sub, disabled) => `<label class="rs-opt${st.mode === mode ? ' is-on' : ''}${disabled ? ' is-off' : ''}">
          <input type="radio" name="rsMode" value="${mode}"${st.mode === mode ? ' checked' : ''}${disabled ? ' disabled' : ''}>
          <span class="rs-opt-ico">${icon(disabled ? 'i-lock' : ico)}</span><span><b>${title}</b>${sub}</span></label>`;
        let body = '';
        if (st.mode === 'cancel') {
          body = `<div class="rs-step">
            <p class="rs-note">${icon('i-check')}${pendingReq ? 'Ta demande n\'a pas encore été acceptée : rien n\'a été débité. Ton coach est prévenu.'
              : free ? `Annulation gratuite : tu es remboursé intégralement, soit <b>${euros(cur.price)}</b>. Un message est envoyé à ton coach.`
              : rate ? `Annulation tardive : tu es remboursé de <b>50 %</b>, soit <b>${euros(refund)}</b> sur ${euros(cur.price)}. L'autre moitié revient à ton coach. Un message lui est envoyé.`
              : `Annulation à moins d'1 h : <b>aucun remboursement</b>. La séance (${euros(cur.price)}) reste due et revient entièrement à ton coach. Un message lui est envoyé.`}</p>
            <div class="select"><select name="reason" id="rs-reason"><option value="">Facultatif…</option><option>Empêchement personnel</option><option>Blessure ou maladie</option><option>Changement de planning</option><option>Autre</option></select><label for="rs-reason">Motif (facultatif)</label></div>
            <button type="submit" class="btn btn-primary"><span class="btn-label">Confirmer l'annulation</span>${icon('i-arrow', 'ico')}<span class="btn-load" aria-hidden="true"><i></i><i></i><i></i></span><span class="btn-done" aria-hidden="true">${icon('i-check')}</span></button>
          </div>`;
        } else if (st.mode === 'move' || st.mode === 'medical') {
          const med = st.mode === 'medical';
          body = `<div class="rs-step">
            ${med ? `<div class="pro-card rs-med">
              <p class="pro-card-head">${icon('i-card')}<span><b>Ton justificatif médical</b>Certificat ou arrêt délivré par un professionnel de santé, à ton nom. Il permet le report gratuit, pas l'annulation.</span></p>
              <label class="upload"><input type="file" name="cert" accept="image/*,.pdf" required data-rs-cert><span class="upload-box">${icon('i-upload')}<span data-rs-cert-name>Ajoute une photo ou un scan du justificatif</span></span></label>
              <div class="field"><input id="rs-cert-date" name="certDate" type="date" required max="${new Date().toISOString().slice(0, 10)}"><label for="rs-cert-date">Date du justificatif</label></div>
              <label class="check"><input type="checkbox" name="certOk" required><span class="check-box">${icon('i-check')}</span><span>J'atteste que ce justificatif est authentique et me concerne</span></label>
            </div>` : ''}
            ${picker()}
            <div class="field"><textarea id="rs-msg" name="note" placeholder=" " maxlength="300"></textarea><label for="rs-msg">Un mot pour ${esc(cur.coach.first)} (facultatif)</label></div>
            <button type="submit" class="btn btn-primary"><span class="btn-label">${med ? 'Envoyer le justificatif et reporter' : 'Confirmer le report'}</span>${icon('i-arrow', 'ico')}<span class="btn-load" aria-hidden="true"><i></i><i></i><i></i></span><span class="btn-done" aria-hidden="true">${icon('i-check')}</span></button>
          </div>`;
        }
        rs.innerHTML = `<form class="rs-panel" data-rs-form novalidate>
          ${list.length > 1 ? '<button type="button" class="rs-back" data-rs-back>← Choisir une autre séance</button>' : ''}
          ${card(cur)}
          ${started ? '<p class="rs-alert">Cette séance a déjà commencé : elle ne peut plus être annulée ni reportée.</p>' : `
          <p class="rs-alert ${free ? 'is-ok' : ''}">${icon(free ? 'i-check' : 'i-clock')}<span>${free
            ? (pendingReq ? `${esc(cur.coach.first)} n'a pas encore accepté ta demande : tu peux la <b>retirer</b> à tout moment, sans frais.` : `Tu es à plus de 48 h du début : tu peux <b>annuler gratuitement</b> ou <b>reporter</b> ta séance.`)
            : !rate ? `Moins d'1 h avant le début : tu peux encore annuler, mais la séance est <b>due en totalité</b>, sans aucun remboursement. Le report avec justificatif médical n'est plus possible à moins de 5 h.`
            : cur.cert ? `Cette séance a déjà été reportée avec un justificatif médical : une annulation n'est plus remboursée qu'à <b>50 %</b> (${euros(refund)}). ${certOk ? 'Un nouveau report reste possible avec un justificatif, jusqu\'à 5 h avant le début.' : 'Un nouveau report n\'est plus possible à moins de 5 h du début.'}`
            : `Moins de 48 h avant le début : tu peux encore annuler, mais seuls <b>50 % de la séance</b> sont remboursés (${euros(refund)}). À moins d'1 h, plus rien n'est remboursé. ${certOk ? 'Avec un justificatif médical, tu peux plutôt <b>reporter gratuitement</b>, jusqu\'à 5 h avant le début.' : 'Le report avec justificatif médical n\'est plus possible à moins de 5 h du début.'}`}</span></p>
          <fieldset class="rs-opts"><legend class="sr-only">Que veux-tu faire ?</legend>
            ${opt('cancel', 'i-x', pendingReq ? 'Retirer ma demande' : 'Annuler la séance', pendingReq ? 'Rien n\'est débité' : free ? `Remboursement intégral : ${euros(cur.price)}` : rate ? `Remboursement de 50 % : ${euros(refund)}` : 'Aucun remboursement : séance due en totalité', false)}
            ${free ? opt('move', 'i-calendar', 'Reporter la séance', 'Gratuit, choisis un autre créneau') : opt('medical', 'i-card', 'Reporter avec un justificatif médical', certOk ? 'Gratuit, jusqu\'à 5 h avant le début' : 'Impossible à moins de 5 h du début', !certOk)}
          </fieldset>
          ${body}`}
          <p class="auth-msg" role="alert" data-rs-msg></p>
        </form>`;
      }

      rs.addEventListener('click', e => {
        const p = e.target.closest('[data-rs-pick]');
        if (p) {
          cur = list[+p.dataset.rsPick];
          Object.assign(st, { mode: '', day: null, slot: null });
          history.replaceState(null, '', reschedHref(cur));
          render();
          return;
        }
        if (e.target.closest('[data-rs-back]')) { cur = null; history.replaceState(null, '', 'annuler.html'); render(); return; }
        const d = e.target.closest('[data-rs-day]');
        if (d) { st.day = +d.dataset.rsDay; st.slot = null; keepRender(); return; }
        const s = e.target.closest('[data-rs-slot]');
        if (s && !s.disabled) { st.slot = s.dataset.rsSlot; keepRender(); }
      });
      // re-rendu sans perdre ce qui est déjà saisi (justificatif, date, message)
      function keepRender() {
        const f = $('[data-rs-form]', rs);
        const keep = f ? { file: f.elements.cert && f.elements.cert.files, date: f.elements.certDate && f.elements.certDate.value, ok: f.elements.certOk && f.elements.certOk.checked, note: f.elements.note && f.elements.note.value } : {};
        const y = window.scrollY;
        render();
        const g = $('[data-rs-form]', rs);
        if (g.elements.cert && keep.file && keep.file.length) { g.elements.cert.files = keep.file; syncCert(g.elements.cert); }
        if (g.elements.certDate && keep.date) g.elements.certDate.value = keep.date;
        if (g.elements.certOk) g.elements.certOk.checked = !!keep.ok;
        if (g.elements.note && keep.note) g.elements.note.value = keep.note;
        window.scrollTo(0, y);
      }
      const syncCert = inp => {
        const f = inp.files[0];
        $('[data-rs-cert-name]', rs).textContent = f ? f.name : 'Ajoute une photo ou un scan du justificatif';
        inp.closest('.upload').classList.toggle('is-filled', !!f);
      };
      rs.addEventListener('change', e => {
        if (e.target.name === 'rsMode') { st.mode = e.target.value; st.day = null; st.slot = null; render(); return; }
        if (e.target.matches('[data-rs-cert]')) syncCert(e.target);
      });

      // le coach reçoit un message dans la conversation + une notification
      const tellCoach = (text, notif) => {
        sendMsg('eleve', cur.coach.id, text);
        notifyAccount(coachAccountId(cur.coach.id), notif, 'pro.html#agenda', 'booking');
      };      const done = (title, lines) => {
        rs.innerHTML = `<div class="rs-panel rs-done"><span class="success-ico">${icon('i-check')}</span><h2 class="rs-h">${title}</h2>${lines.map(l => `<p>${l}</p>`).join('')}
          <div class="rs-done-actions"><a class="btn btn-primary" href="espace.html#seances">Mes séances${icon('i-arrow', 'ico')}</a><a class="btn btn-ghost" href="messages.html?with=${cur.coach.id}">Écrire à ${esc(cur.coach.first)}</a></div></div>`;
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      };

      rs.addEventListener('submit', e => {
        e.preventDefault();
        const f = e.target;
        const msg = $('[data-rs-msg]', f);
        const btn = $('button[type="submit"]', f);
        const h = hoursLeft(cur.when);
        if (st.mode === 'cancel') {
          // plus de 48 h : 100 % remboursé · de 48 h à 1 h (ou après un report médical) : 50 % · moins d'1 h : rien
          const rateNow = cur.status === 'pending' ? 1 : refundRate(h, cur.cert);
          const late = rateNow < 1;
          const refundNow = Math.round(cur.price * rateNow);
          fakeLoad(btn, () => {
            const wasPending = cur.status === 'pending';
            DB.updateBooking(cur.bid, { status: 'cancelled', cancelledBy: 'eleve', reason: f.elements.reason.value, late, refund: wasPending ? 0 : refundNow, fee: late ? cur.price - refundNow : 0 });
            const why = f.elements.reason.value ? ` (${f.elements.reason.value.toLowerCase()})` : '';
            if (wasPending) {
              tellCoach(`Bonjour ${cur.coach.first}, je retire ma demande pour le ${whenTxt(cur.when)}${why}. Merci et à bientôt !`, `${user.name} a retiré sa demande du ${whenTxt(cur.when)}.`);
              toast('Demande retirée.');
              done('Demande retirée', [`${esc(cur.coach.sport)} avec ${esc(cur.coach.first)}, ${whenTxt(cur.when)}.`, `Rien n'a été débité. Un message a été envoyé à ${esc(cur.coach.first)}.`]);
            } else if (late && !refundNow) {
              tellCoach(`Bonjour ${cur.coach.first}, je dois annuler notre séance du ${whenTxt(cur.when)}${why}. Désolé·e de prévenir si tard !`, `${user.name} a annulé la séance du ${whenTxt(cur.when)} moins d'1 h avant : la séance te revient en totalité (${euros(cur.price)}).`);
              toast('Séance annulée : aucun remboursement (moins d\'1 h avant).');
              done('Séance annulée', [`${esc(cur.coach.sport)} avec ${esc(cur.coach.first)}, ${whenTxt(cur.when)}.`, `Annulation à moins d'1 h du début : la séance est due en totalité (${euros(cur.price)}), aucun remboursement n'est possible. Un message a été envoyé à ${esc(cur.coach.first)}. (Démo : aucun paiement réel.)`]);
            } else if (late) {
              tellCoach(`Bonjour ${cur.coach.first}, je dois annuler notre séance du ${whenTxt(cur.when)}${why}. Désolé·e de prévenir tard !`, `${user.name} a annulé la séance du ${whenTxt(cur.when)} moins de 48 h avant : 50 % de la séance te reviennent (${euros(cur.price - refundNow)}).`);
              toast(`Séance annulée : ${euros(refundNow)} remboursés (50 %).`);
              done('Séance annulée', [`${esc(cur.coach.sport)} avec ${esc(cur.coach.first)}, ${whenTxt(cur.when)}.`, `Annulation à moins de 48 h : tu es remboursé de <b>${euros(refundNow)}</b> (50 % de ${euros(cur.price)}). L'autre moitié revient à ${esc(cur.coach.first)}. (Démo : aucun paiement réel.)`]);
            } else {
              tellCoach(`Bonjour ${cur.coach.first}, j'annule notre séance du ${whenTxt(cur.when)}${why}. Désolé·e et à bientôt !`, `${user.name} a annulé la séance du ${whenTxt(cur.when)}.`);
              toast('Séance annulée : remboursement intégral.');
              done('Séance annulée', [`${esc(cur.coach.sport)} avec ${esc(cur.coach.first)}, ${whenTxt(cur.when)}.`, `Tu es remboursé intégralement : <b>${euros(cur.price)}</b>. Un message a été envoyé à ${esc(cur.coach.first)}. (Démo : aucun paiement réel.)`]);
            }
          }, 1000);
          return;
        }
        if (st.mode !== 'move' && st.mode !== 'medical') { msg.textContent = 'Choisis d\'abord ce que tu veux faire.'; return; }
        if (st.mode === 'move' && cur.status !== 'pending' && (h < HOURS_FREE || cur.cert)) { msg.textContent = 'À moins de 48 h du début, le report demande un justificatif médical.'; return; }
        const med = st.mode === 'medical';
        if (med && h < HOURS_CERT) { msg.textContent = 'Le report avec justificatif médical n\'est plus possible à moins de 5 h du début.'; render(); return; }
        if (med) {
          const bad = [f.elements.cert, f.elements.certDate, f.elements.certOk].filter(i => !i.checkValidity());
          if (f.elements.certDate.value && new Date(f.elements.certDate.value) > new Date()) bad.push(f.elements.certDate);
          if (bad.length) { flag(bad); msg.textContent = 'Ajoute ton justificatif médical, sa date et coche l\'attestation.'; return; }
        }
        if (st.day === null || !st.slot) { flag([$('[data-rs-slots]', f)].filter(Boolean)); msg.textContent = 'Choisis le nouveau jour et le nouveau créneau.'; return; }
        const to = slotDate(days[st.day], st.slot);
        fakeLoad(btn, () => {
          DB.updateBooking(cur.bid, { when: to.toISOString(), movedFrom: cur.when.toISOString(), cert: med ? { file: f.elements.cert.files[0].name, date: f.elements.certDate.value } : (cur.cert ? true : null) });
          const note = f.elements.note.value.trim();
          tellCoach(`Bonjour ${cur.coach.first}, je dois reporter notre séance du ${whenTxt(cur.when)} au ${whenTxt(to)}.${med ? ' J\'ai déposé un justificatif médical.' : ''}${note ? ` ${note}` : ''}`, `${user.name} a reporté sa séance au ${whenTxt(to)}${med ? ' (justificatif médical)' : ''}.`);
          toast(`Séance reportée au ${whenTxt(to)}.`);
          done('Séance reportée', [`${esc(cur.coach.sport)} avec ${esc(cur.coach.first)} : <b>${whenTxt(to)}</b> au lieu du ${whenTxt(cur.when)}.`, med ? 'Justificatif médical reçu : le report est gratuit. Il est conservé uniquement pour valider ce report. (Démo : rien n\'a été envoyé.)' : 'Report gratuit, à plus de 48 h du début.', `Un message a été envoyé à ${esc(cur.coach.first)}.`]);
        }, 1100);
      });
      // en direct : le coach accepte, refuse ou annule pendant que la page est ouverte
      DB.onChange((what, external) => {
        if (!external || what !== 'bookings' || $('.rs-done', rs)) return;
        list = eleveUpcoming();
        if (cur) cur = list.find(s => s.bid === cur.bid) || null;
        if (!st.mode) render();
      });

      render();
    }
  }

  /* =========================================================
     Tarifs : bascule Élève / Coach (via le bouton du haut)
     ========================================================= */
  const pricing = $('[data-pricing]');
  if (pricing) {
    const showPanel = m => $$('[data-price-panel]').forEach(p => {
      const on = p.dataset.pricePanel === m;
      p.hidden = !on;
      if (on && !reduced) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
    });
    document.addEventListener('s2s:mode', e => showPanel(e.detail));
    if (params.get('pour') === 'coach') onReady(() => api().setMode('coach'));
  }

  /* =========================================================
     Contact
     ========================================================= */
  const contact = $('[data-contact]');
  if (contact) {
    const subj = $('[name="sujet"]', contact);
    $$('[data-subject]', contact).forEach(b => b.addEventListener('click', () => {
      subj.value = b.dataset.subject;
      $$('[data-subject]', contact).forEach(x => {
        const on = x === b;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-pressed', String(on));
      });
    }));
    const pre = params.get('sujet');
    const preBtn = pre && $(`[data-subject="${CSS.escape(pre)}"]`, contact);
    if (preBtn) preBtn.click();
    contact.addEventListener('submit', e => {
      e.preventDefault();
      const bad = $$('input:not([type="hidden"]), textarea', contact).filter(f => !f.checkValidity());
      if (bad.length) { flag(bad); bad[0].focus(); return; }
      fakeLoad($('button[type="submit"]', contact), () => {
        $('[data-contact-name]').textContent = $('[name="prenom"]', contact).value.trim();
        contact.hidden = true;
        $('[data-contact-done]').hidden = false;
        toast('Message envoyé ! (démo)');
      });
    });
    const again = $('[data-contact-again]');
    if (again) again.addEventListener('click', () => {
      contact.reset();
      contact.hidden = false;
      $('[data-contact-done]').hidden = true;
    });
  }

  /* =========================================================
     Connexion : le grand titre suit l'onglet choisi
     ========================================================= */
  const authTitle = $('[data-auth-title]');
  if (authTitle) {
    const TITLES = {
      login: { lines: ['Content', 'de te', 'revoir'], lead: 'Retrouve tes séances, tes messages et ta progression. Ton coach t\'attend.' },
      signup: { lines: ['Bienvenue', 'au', 'club'], lead: 'Crée ton compte en une minute, puis choisis ton coach parmi 1 850 profils vérifiés.' }
    };
    const lead = $('[data-auth-lead]');
    let shown = location.hash === '#inscription' ? 'signup' : 'login';
    // texte de départ posé avant l'animation d'entrée
    authTitle.innerHTML = TITLES[shown].lines.map(l => `<span class="line">${l}</span>`).join('');
    lead.textContent = TITLES[shown].lead;
    document.addEventListener('s2s:auth', e => {
      if (e.detail === shown) return;
      shown = e.detail;
      api().swapLines(authTitle, TITLES[shown].lines);
      lead.animate([{ opacity: 1 }, { opacity: 0 }, { opacity: 1 }], { duration: 700 });
      setTimeout(() => { lead.textContent = TITLES[shown].lead; }, 350);
    });
  }

  /* =========================================================
     Espace membre
     ========================================================= */
  const dash = $('[data-dashboard]');
  if (dash && !readUser()) gate($('.dash-main', dash) || dash, 'eleve');
  else if (dash) {
    const user = readUser();
    const { name, role } = fillAccount(user);
    const isCoach = role === 'coach';
    const hello = $('[data-dash-hello]');
    hello.textContent = '';
    ['Salut', name].forEach(t => {
      const l = document.createElement('span');
      l.className = 'line';
      l.textContent = t;
      hello.appendChild(l);
    });
    const now = new Date();
    $('[data-dash-date]').textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const partners = partnersFor(role);
    const dayLabel = d => {
      const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
      if (diff === 0) return 'Aujourd\'hui';
      if (diff === 1) return 'Demain';
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' });
    };

    // prochaine séance (élève : ses réservations ; coach : son agenda) — tout vient de la base partagée
    let when = null;
    let partner = null;
    let what = 'Aucune séance prévue';
    let where = isCoach ? 'Ouvre des créneaux dans ton espace pro' : 'Choisis ton coach et réserve ton premier créneau';
    const coachNext = () => coachBookings(user.coachId).filter(b => (b.status === 'confirmed' || b.status === 'pending') && new Date(b.when) > now).sort((a, b) => new Date(a.when) - new Date(b.when));
    if (isCoach) {
      const nb = coachNext()[0];
      if (nb) {
        const s = personOf(nb.student);
        when = new Date(nb.when);
        partner = { id: s.id, first: s.first };
        what = `Séance avec ${s.first} ${s.last}${nb.status === 'pending' ? ' · à valider' : ''}`;
        where = `${nb.format}${s.city ? ` · ${s.city}` : ''}`;
        $('[data-next-coach]').textContent = 'Voir la conversation →';
        $('[data-next-coach]').href = `messages.html?with=${s.id}`;
      }
    } else {
      const nx = eleveUpcoming()[0];
      if (nx) {
        const coach = nx.coach;
        when = nx.when;
        partner = { id: coach.id, first: coach.first };
        what = `${coach.sport} avec ${coach.first} ${coach.last}${nx.status === 'pending' ? ' · en attente du coach' : nx.moved ? ' · séance reportée' : ''}`;
        where = placeLine(nx.place || placeFor(coach, nx.format));
        $('[data-next-coach]').href = `coach.html?id=${coach.id}`;
        const resched = $('[data-next-resched]');
        if (resched) { resched.href = reschedHref(nx); resched.hidden = false; }
      }
    }
    $('[data-next-when]').textContent = when ? `${dayLabel(when)} · ${hhmm(when)}` : '—';
    $('[data-next-what]').textContent = what;
    $('[data-next-where]').textContent = where;
    $('[data-next-msg]').href = partner ? `messages.html?with=${partner.id}` : 'messages.html';
    if (!partner) $('[data-next-coach]').hidden = true;

    const cd = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      let left = when ? Math.max(0, when - new Date()) / 1000 : 0;
      const d = Math.floor(left / 86400); left -= d * 86400;
      const h = Math.floor(left / 3600); left -= h * 3600;
      const m = Math.floor(left / 60);
      const s = Math.floor(left - m * 60);
      cd.d.textContent = pad(d);
      cd.h.textContent = pad(h);
      cd.m.textContent = pad(m);
      cd.s.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);

    // séances à venir (avec leur statut : en attente / confirmée)
    function renderSessions() {
      const box = $('[data-sessions]');
      if (isCoach) {
        const list = coachNext().slice(0, 4);
        box.innerHTML = list.length ? list.map(b => {
          const s = personOf(b.student);
          const d = new Date(b.when);
          return `<div class="sess">
            <span class="sess-date"><b>${d.getDate()}</b>${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
            <span class="sess-txt"><b>Séance avec ${esc(s.first)}${b.status === 'pending' ? ' <em class="sess-tag">à valider</em>' : ''}</b><span>${hhmm(d)} · ${esc(b.format)}</span></span>
            <a class="coach-cta" href="messages.html?with=${s.id}" aria-label="Écrire à ${esc(s.first)}">${icon('i-chat')}</a>
          </div>`;
        }).join('') : '<p class="sess-txt"><span>Aucune séance à venir.</span></p>';
        return;
      }
      const list = eleveUpcoming().slice(0, 5);
      box.innerHTML = list.length ? list.map(s => `
        <div class="sess">
          <span class="sess-date"><b>${s.when.getDate()}</b>${s.when.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
          <span class="sess-txt"><b>${esc(s.coach.sport)}${s.status === 'pending' ? ' <em class="sess-tag">en attente du coach</em>' : s.moved ? ' <em class="sess-tag">reportée</em>' : ''}</b><span>${hhmm(s.when)} · avec ${esc(s.coach.first)} · ${esc((s.place && s.place.name) || s.format)}</span></span>
          <a class="sess-act" href="${reschedHref(s)}">${s.status === 'pending' ? 'Retirer ou modifier' : 'Annuler ou reporter'}</a>
        </div>`).join('') : '<p class="sess-txt"><span>Aucune séance à venir. <a href="coachs.html">Trouve ton coach</a> et réserve un créneau : il apparaîtra ici.</span></p>';
    }
    renderSessions();

    // mes coachs (ceux avec qui l'élève a réservé) / mes élèves
    const mine = isCoach ? partners.slice(0, 3)
      : [...new Set(myBookings().filter(b => b.status !== 'declined').map(b => b.id))].map(id => partners.find(p => p.id === id)).filter(Boolean).slice(0, 3);
    const shownPeople = mine.length ? mine : partners.slice(0, 3);
    $('[data-my-coachs]').innerHTML = shownPeople.length ? shownPeople.map(x => {
      const c = D.COACHS.find(k => k.id === x.id);
      return `<a class="my-coach" href="${x.link || `messages.html?with=${x.id}`}">
        <span class="dash-av av-${x.visual}">${x.initials}</span>
        <span><b>${x.first} ${x.last}</b><span>${c ? `${c.sport} · ${note5(c.rating)} ★` : x.sub}</span></span>
        <span class="coach-cta">${icon(isCoach ? 'i-chat' : 'i-arrow')}</span>
      </a>`;
    }).join('') : '<p class="sess-txt"><span>Tes élèves apparaîtront ici après leur première réservation.</span></p>';

    // séances passées : bouton "Noter" (élèves seulement)
    const hist = $('[data-history]');
    if (hist && !isCoach) {
      const done = pastSessions().slice().sort((a, b) => new Date(b.when) - new Date(a.when));
      const reviews = myReviews();
      hist.innerHTML = done.length ? done.map(s => {
        const c = D.COACHS.find(k => k.id === s.id);
        if (!c) return '';
        const d = new Date(s.when);
        const r = reviews[c.id];
        return `<div class="sess">
          <span class="sess-date"><b>${d.getDate()}</b>${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span>
          <span class="sess-txt"><b>${c.sport} avec ${c.first} ${c.last}</b><span>Séance réalisée · ${c.city}</span></span>
          <a class="rate-btn${r ? ' is-done' : ''}" href="coach.html?id=${c.id}#noter">${icon('i-star')}${r ? `${r.rating}/5 · Modifier` : 'Noter'}</a>
        </div>`;
      }).join('') : '<p class="sess-txt"><span>Aucune séance réalisée pour l\'instant. Après ta première séance, tu pourras noter ton coach ici.</span></p>';
    }

    // aperçu des conversations
    function renderConvPreview() {
      const chats = loadChats(role);
      const ids = Object.keys(chats).sort((a, b) => {
        const la = chats[a].msgs.slice(-1)[0];
        const lb = chats[b].msgs.slice(-1)[0];
        return new Date(lb ? lb.t : 0) - new Date(la ? la.t : 0);
      });
      const who = id => partners.find(x => x.id === id) || (isCoach ? personOf(id) : null);
      $('[data-conv-preview]').innerHTML = ids.slice(0, 3).map(id => {
        const p = who(id);
        if (!p) return '';
        const last = chats[id].msgs.slice(-1)[0];
        const unread = chats[id].unread;
        return `<a class="conv-card${unread ? ' is-unread' : ''}" href="messages.html?with=${id}">
          <span class="dash-av av-${p.visual}">${p.initials}${unread ? '<i class="unread-dot"></i>' : ''}</span>
          <span><b>${p.first} ${p.last}<small>${last ? shortWhen(last.t) : ''}</small></b><p>${last ? esc((last.me ? 'Toi : ' : '') + last.text) : 'Nouvelle conversation'}</p></span>
        </a>`;
      }).join('') + `<a class="conv-card" href="messages.html"><span class="dash-av">+</span><span><b>Nouvelle conversation</b><p>${isCoach ? 'Écris à un de tes élèves' : 'Écris à n\'importe quel coach'}</p></span></a>`;
    }
    renderConvPreview();
    renderNotifs($('[data-notifs]'));
    // en direct : réponse d'un coach, demande acceptée, nouveau message…
    DB.onChange((what, external) => {
      if (!external) return;
      if (what === 'bookings') renderSessions();
      if (what === 'threads') renderConvPreview();
      if (what === 'notifs') renderNotifs($('[data-notifs]'));
    });
    // photo de profil + pièce d'identité
    const achBox = $('[data-achievements]');
    renderAchievements(achBox, user, 'espace');
    renderIdentity($('[data-idcard]'), user, u => {
      $$('[data-dash-initial]').forEach(el => paintAvatar(el, u.photo, name.charAt(0).toUpperCase()));
      renderAchievements(achBox, u, 'espace');
    });
    // carte professionnelle (coachs)
    const proBox = $('[data-procard]');
    if (proBox && isCoach) renderProCard(proBox, user);

    // menu latéral : repère la section visible
    const links = $$('.dash-link[href^="#"]');
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(l => { const t = $(l.getAttribute('href')); if (t) spy.observe(t); });
  }

  /* ---------- Carte professionnelle dans l'espace coach ---------- */
  function renderProCard(box, user) {
    const card = user.card || null;
    const status = card ? card.status : 'todo';
    const LABEL = { todo: ['status-todo', 'À compléter'], verification: ['status-wait', 'En vérification'], valid: ['status-ok', 'Validée'] };
    const fmt = iso => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const mask = n => (n.length > 5 ? `${n.slice(0, 3)} ••• ${n.slice(-2)}` : n);
    const warn = t => `<p class="procard-warn">${icon('i-shield')}<span>${t}</span></p>`;
    const step = (label, i, state) => `<li class="${state}" style="--i:${i}"><i></i>${label}</li>`;
    let validity = '';
    if (card) {
      const left = new Date(card.end) - new Date();
      const days = Math.max(0, Math.ceil(left / 864e5));
      const w = Math.max(0, Math.min(1, left / (5 * 365 * 864e5)));
      validity = `<div class="validity" style="--w:${w.toFixed(3)}"><span>Valable jusqu'au <b style="color:var(--white)">${fmt(card.end)}</b> · encore ${days} jours</span><i></i><span>La carte professionnelle se renouvelle tous les 5 ans.</span></div>`;
    }
    const DIPS = ['Diplôme d\'État (DE)', 'BPJEPS', 'DEJEPS / DESJEPS', 'Brevet fédéral', 'Licence ou master STAPS', 'CQP'];
    box.innerHTML = `
      <h2>Carte professionnelle <span class="status ${LABEL[status][0]}"><i></i>${LABEL[status][1]}</span></h2>
      <div class="cardpro">
        <div class="idcard${card ? '' : ' is-empty'}" data-idcard>
          <div class="idcard-top"><span>Carte professionnelle<br>Éducateur sportif</span>${icon('i-shield')}</div>
          <p class="idcard-name">${card ? esc(user.name) : 'Ta carte ici'}</p>
          <div class="idcard-row"><span>N°<b>${card ? esc(mask(card.number)) : '—'}</b></span><span>Fin de validité<b>${card ? new Date(card.end).toLocaleDateString('fr-FR') : '—'}</b></span></div>
        </div>
        <div class="procard-info">
          ${!card ? warn('Ton profil n\'est pas visible par les élèves tant que ta carte professionnelle n\'est pas renseignée et validée.')
            : status === 'verification' ? warn('L\'équipe vérifie ta carte (sous 72h). Ton profil sera visible par les élèves dès sa validation.') : ''}
          <ol class="procard-steps">
            ${step('Carte envoyée', 0, card ? 'is-done' : 'is-current')}
            ${step('Vérification sous 72h', 1, status === 'valid' ? 'is-done' : status === 'verification' ? 'is-current' : '')}
            ${step('Profil visible', 2, status === 'valid' ? 'is-done' : '')}
          </ol>
          ${card ? `<dl class="procard-dl">
            <div><dt>Numéro</dt><dd>${esc(card.number)}</dd></div>
            <div><dt>Diplôme</dt><dd>${esc(card.diploma)}</dd></div>
            <div><dt>Justificatif</dt><dd>${esc(card.file || '—')}</dd></div>
            <div><dt>Envoyée le</dt><dd>${fmt(card.sent)}</dd></div>
          </dl>` : ''}
          ${validity}
          <div class="procard-actions">
            <button type="button" class="btn btn-primary" data-procard-edit>${card ? 'Mettre à jour ma carte' : 'Renseigner ma carte'}<svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></button>
            ${card && status !== 'valid' ? '<button type="button" class="demo-link" data-procard-validate>(démo) Simuler la validation</button>' : ''}
          </div>
        </div>
      </div>
      <form class="pro-card procard-form" data-procard-form${card ? ' hidden' : ''} novalidate>
        <p class="pro-card-head">${icon('i-shield')}<span><b>Informations de ta carte</b>Elles sont vérifiées par l'équipe avant d'apparaître sur ton profil.</span></p>
        <div class="field"><input id="pc-number" name="card" type="text" placeholder=" " autocomplete="off" required minlength="6" maxlength="20" pattern="[A-Za-z0-9 \\-]{6,20}" value="${card ? esc(card.number) : ''}"><label for="pc-number">N° de carte professionnelle</label></div>
        <div class="field"><input id="pc-end" name="cardEnd" type="date" required value="${card ? esc(card.end) : ''}"><label for="pc-end">Fin de validité</label></div>
        <div class="select"><select id="pc-dip" name="cardDiploma" required><option value="">Choisir…</option>${DIPS.map(d => `<option${card && card.diploma === d ? ' selected' : ''}>${esc(d)}</option>`).join('')}</select><label for="pc-dip">Diplôme</label></div>
        <label class="upload"><input type="file" name="cardFile" accept="image/*,.pdf"${card ? '' : ' required'} data-pc-file><span class="upload-box">${icon('i-upload')}<span data-pc-file-name>${card && card.file ? `Actuel : ${esc(card.file)} (clique pour remplacer)` : 'Ajoute une photo ou un scan de ta carte'}</span></span></label>
        <label class="check"><input type="checkbox" name="cardOk" required><span class="check-box">${icon('i-check')}</span><span>Je certifie que cette carte est à mon nom et en cours de validité</span></label>
        <p class="auth-msg" role="alert" data-procard-msg></p>
        <div class="procard-form-actions">
          <button type="submit" class="btn btn-primary">Envoyer pour vérification<svg class="ico" aria-hidden="true"><use href="#i-send"/></svg></button>
          ${card ? '<button type="button" class="btn btn-ghost" data-procard-cancel>Annuler</button>' : ''}
        </div>
      </form>`;
    if (api()) api().prepare(box);

    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    const form = () => $('[data-procard-form]', box);
    const showForm = open => {
      const f = form();
      f.hidden = !open;
      if (open && !reduced) { f.classList.remove('is-entering'); void f.offsetWidth; f.classList.add('is-entering'); }
      if (open) f.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    };
    box.addEventListener('click', e => {
      if (e.target.closest('[data-procard-edit]')) showForm(true);
      if (e.target.closest('[data-procard-cancel]')) showForm(false);
      if (e.target.closest('[data-procard-validate]')) {
        const u = demoUser();
        if (u.card) { u.card.status = 'valid'; store.set('s2s-user', u); }
        renderProCard(box, u);
        toast('Carte professionnelle validée : ton profil est visible.');
      }
    });
    box.addEventListener('change', e => {
      const inp = e.target.closest('[data-pc-file]');
      if (!inp) return;
      const f = inp.files && inp.files[0];
      const lab = inp.closest('.upload');
      if (f) { $('[data-pc-file-name]', lab).textContent = f.name; lab.classList.add('is-filled'); lab.classList.remove('is-error'); }
    });
    const resetTilt = () => $$('[data-idcard]', box).forEach(c => { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
    box.addEventListener('mousemove', e => {
      const idc = e.target.closest('[data-idcard]');
      if (!idc) { resetTilt(); return; }
      const r = idc.getBoundingClientRect();
      idc.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 16}deg`);
      idc.style.setProperty('--rx', `${(0.5 - (e.clientY - r.top) / r.height) * 12}deg`);
    });
    box.addEventListener('mouseleave', resetTilt);
    box.addEventListener('submit', e => {
      e.preventDefault();
      const f = form();
      const end = $('[name="cardEnd"]', f);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      end.setCustomValidity(end.value && new Date(end.value) <= today ? 'Carte expirée' : '');
      end.addEventListener('input', () => end.setCustomValidity(''), { once: true });
      const bad = $$('input, select', f).filter(i => !i.checkValidity());
      const msg = $('[data-procard-msg]', f);
      if (bad.length) {
        flag(bad);
        msg.textContent = bad.includes(end) && end.value
          ? 'Ta carte est expirée : il faut la renouveler auprès de ta préfecture avant de l\'ajouter.'
          : 'Complète tous les champs de ta carte professionnelle.';
        bad[0].focus();
        return;
      }
      const u = demoUser();
      const file = $('[name="cardFile"]', f).files[0];
      u.card = {
        number: $('[name="card"]', f).value.trim().toUpperCase(),
        end: end.value,
        diploma: $('[name="cardDiploma"]', f).value,
        file: file ? file.name : (u.card && u.card.file) || '',
        status: 'verification',
        sent: new Date().toISOString()
      };
      store.set('s2s-user', u);
      renderProCard(box, u);
      toast('Carte envoyée : l\'équipe la vérifie sous 72h.');
      box.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  }

  /* =========================================================
     Messagerie élève ↔ coach
     ========================================================= */
  const msgApp = $('[data-msg-app]');
  const msgUser = readUser();
  if (msgApp && msgApp.dataset.forceRole === 'coach' && (!msgUser || msgUser.role !== 'coach')) {
    // espace pro sans compte coach : l'écran d'accès de l'espace pro s'en charge
  } else if (msgApp && !msgUser) {
    gate(msgApp, '');
  } else if (msgApp) {
    const user = msgUser;
    const { role } = fillAccount(user);
    const isCoach = role === 'coach';
    const side = isCoach ? 'coach' : 'eleve';
    let partners = partnersFor(role);
    let chats = loadChats(role);
    // relit conversations et interlocuteurs (un autre onglet ou une autre partie de la page a pu écrire)
    const reload = () => { chats = loadChats(role); partners = partnersFor(role); };
    const listEl = $('[data-msg-convs]');
    const headEl = $('[data-msg-head]');
    const logEl = $('[data-msg-log]');
    const quickEl = $('[data-msg-quick]');
    const form = $('[data-msg-form]');
    const input = $('input', form);
    const search = $('[data-msg-search]');
    // réponses automatiques : seulement pour les interlocuteurs de démo (sans vrai compte)
    const REPLIES = isCoach
      ? ['Merci coach !', 'Ça marche, à la prochaine séance !', 'Top, je fais ça avant jeudi.', 'Parfait, merci pour les conseils !']
      : ['Bien noté, merci pour ton message !', 'Parfait, on en parle à la prochaine séance.', 'Bonne idée. Je t\'envoie un petit programme ce soir.', 'Super, continue comme ça !'];
    const QUICK = isCoach
      ? ['Comment s\'est passée ta semaine ?', 'Pense à bien t\'échauffer avant la séance.', 'Bravo pour tes progrès !']
      : ['Bonjour ! Je voudrais réserver une séance.', 'Je serai en retard de 5 minutes.', 'Merci pour la séance !'];
    let replyIdx = 0;
    const coachOf = id => (isCoach ? user.coachId : id);
    const studentOfThread = id => (isCoach ? id : user.id);
    const isReal = id => (isCoach ? !!DB.account(id) : !!DB.accountByCoach(id));
    const partnerOf = id => partners.find(p => p.id === id) || (isCoach ? (s => ({ id: s.id, first: s.first, last: s.last, initials: s.initials, sub: s.sport, visual: s.visual, link: null }))(personOf(id)) : null);

    const wanted = params.get('with') || params.get('coach');
    if (wanted && !chats[wanted] && (isCoach ? !!personOf(wanted) && partners.some(p => p.id === wanted) : D.COACHS.some(c => c.id === wanted))) {
      DB.openThread(coachOf(wanted), studentOfThread(wanted));
      reload();
    }
    let current = wanted && chats[wanted] ? wanted : null;

    const order = () => Object.keys(chats).sort((a, b) => {
      const la = chats[a].msgs.slice(-1)[0];
      const lb = chats[b].msgs.slice(-1)[0];
      return new Date(lb ? lb.t : Date.now()) - new Date(la ? la.t : Date.now());
    });
    const updateBadge = () => {
      const n = unreadTotal(chats);
      $$('[data-unread-total]').forEach(b => { b.hidden = !n; b.textContent = n; });
      refreshNavDot();
    };

    function renderList() {
      reload();
      const q = normalize(search.value);
      listEl.innerHTML = order().map(id => {
        const p = partnerOf(id);
        if (!p || (q && !normalize(`${p.first} ${p.last} ${p.sub}`).includes(q))) return '';
        const last = chats[id].msgs.slice(-1)[0];
        const unread = chats[id].unread;
        return `<button type="button" class="msg-conv${id === current ? ' is-active' : ''}${unread ? ' is-unread' : ''}" data-conv="${id}" role="listitem">
          <span class="dash-av av-${p.visual}">${p.initials}</span>
          <span class="msg-conv-txt"><b>${esc(p.first)} ${esc(p.last)}${isReal(id) ? '<i class="msg-real" title="Compte inscrit">●</i>' : ''}</b><p>${last ? esc((last.me ? 'Toi : ' : '') + last.text) : 'Nouvelle conversation'}</p></span>
          <span class="msg-conv-meta"><time>${last ? shortWhen(last.t) : ''}</time>${unread ? `<span class="dash-badge">${unread}</span>` : ''}</span>
        </button>`;
      }).join('') || '<p class="msg-none">Aucune conversation.</p>';
      // démarrer une discussion avec quelqu'un d'autre
      const others = partners.filter(p => !chats[p.id] && (!q || normalize(`${p.first} ${p.last} ${p.sub}`).includes(q))).slice(0, q ? 8 : 4);
      if (others.length) {
        listEl.insertAdjacentHTML('beforeend', `<p class="msg-sep">${isCoach ? 'Tes élèves' : 'Écrire à un coach'}</p>` + others.map(p => `
          <button type="button" class="msg-conv is-new" data-conv="${p.id}" role="listitem">
            <span class="dash-av av-${p.visual}">${p.initials}</span>
            <span class="msg-conv-txt"><b>${esc(p.first)} ${esc(p.last)}</b><p>${esc(p.sub)}</p></span>
            <span class="msg-conv-meta">${icon('i-chat')}</span>
          </button>`).join(''));
      }
      updateBadge();
    }

    function bubble(m) {
      const b = document.createElement('div');
      b.className = `bubble ${m.me ? 'me' : 'them'}`;
      b.textContent = m.text;
      const sm = document.createElement('small');
      sm.textContent = shortWhen(m.t);
      b.appendChild(sm);
      logEl.appendChild(b);
    }
    function drawThread(id) {
      const p = partnerOf(id);
      logEl.innerHTML = '';
      if (!chats[id] || !chats[id].msgs.length) {
        logEl.innerHTML = `<p class="msg-empty">Dis bonjour à ${esc(p.first)} ! ${isCoach ? 'Prends des nouvelles de sa progression.' : 'Présente-toi : ton niveau, ton objectif et tes disponibilités.'}</p>`;
      } else chats[id].msgs.forEach(bubble);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function openConv(id) {
      if (!id) {
        msgApp.classList.remove('is-thread');
        headEl.innerHTML = '';
        logEl.innerHTML = `<p class="msg-empty">${isCoach ? 'Choisis un élève' : 'Choisis un coach'} à gauche pour commencer à discuter.</p>`;
        quickEl.innerHTML = '';
        form.hidden = true;
        return;
      }
      reload();
      if (!chats[id]) { DB.openThread(coachOf(id), studentOfThread(id)); reload(); }
      current = id;
      DB.markRead(coachOf(id), studentOfThread(id), side);
      reload();
      const p = partnerOf(id);
      const real = isReal(id);
      headEl.innerHTML = `
        <button type="button" class="msg-back" data-msg-back aria-label="Retour aux conversations">${icon('i-arrow-left')}</button>
        <span class="dash-av av-${p.visual}">${p.initials}</span>
        <span><b>${esc(p.first)} ${esc(p.last)}</b><span>${esc(p.sub)} · <em class="msg-online">${real ? 'compte inscrit · reçoit tes messages en direct' : 'en ligne'}</em></span></span>
        ${p.link ? `<a class="btn btn-dark msg-profile" href="${p.link}">Voir le profil</a>` : ''}`;
      drawThread(id);
      quickEl.innerHTML = QUICK.map(t => `<button type="button" data-quick>${esc(t)}</button>`).join('');
      form.hidden = false;
      msgApp.classList.add('is-thread');
      renderList();
      if (document.body.dataset.page === 'messages') history.replaceState(null, '', `messages.html?with=${id}`);
    }

    function send(text) {
      const v = text.trim();
      if (!v || !current) return;
      const id = current;
      const empty = $('.msg-empty', logEl);
      if (empty) empty.remove();
      const m = sendMsg(role, id, v);
      bubble({ me: true, text: v, t: m.t });
      logEl.scrollTop = logEl.scrollHeight;
      renderList();
      if (isReal(id)) return; // vrai compte : la réponse arrivera de son côté (autre onglet)
      const typing = document.createElement('div');
      typing.className = 'typing';
      typing.innerHTML = '<i></i><i></i><i></i>';
      setTimeout(() => { if (current === id) { logEl.appendChild(typing); logEl.scrollTop = logEl.scrollHeight; } }, 500);
      setTimeout(() => {
        typing.remove();
        DB.sendMessage(coachOf(id), studentOfThread(id), isCoach ? 'eleve' : 'coach', REPLIES[replyIdx++ % REPLIES.length]);
        if (current === id) { DB.markRead(coachOf(id), studentOfThread(id), side); reload(); drawThread(id); }
        renderList();
      }, 1900);
    }

    listEl.addEventListener('click', e => { const b = e.target.closest('[data-conv]'); if (b) openConv(b.dataset.conv); });
    headEl.addEventListener('click', e => { if (e.target.closest('[data-msg-back]')) { msgApp.classList.remove('is-thread'); } });
    quickEl.addEventListener('click', e => { const b = e.target.closest('[data-quick]'); if (b) send(b.textContent); });
    form.addEventListener('submit', e => { e.preventDefault(); send(input.value); input.value = ''; input.focus(); });
    search.addEventListener('input', renderList);
    // ouverture d'une conversation depuis une autre partie de la page (espace pro)
    document.addEventListener('s2s:open-conv', e => { reload(); if (partnerOf(e.detail)) openConv(e.detail); });
    // onglet Messages de l'espace pro : ouvre la plus récente seulement quand on l'affiche
    document.addEventListener('s2s:open-first', () => {
      renderList();
      if (!current && window.innerWidth > 720) { const f = order()[0]; if (f) openConv(f); }
    });
    // en direct : un message arrive depuis l'autre compte (autre onglet)
    DB.onChange((what, external) => {
      if (!external || what !== 'threads') return;
      reload();
      if (current && msgApp.offsetParent) { DB.markRead(coachOf(current), studentOfThread(current), side); reload(); drawThread(current); }
      renderList();
    });

    const first = current || order()[0] || null;
    renderList();
    const visible = !!msgApp.offsetParent;
    if (first && (current || (visible && window.innerWidth > 720))) openConv(first);
    else openConv(null);
  }
  /* =========================================================
     Découvrir : accueil des élèves connectés (façon place de marché)
     ========================================================= */
  const vx = $('[data-discover]');
  if (vx) {
    const user = demoUser();
    const name = (user.name || 'à toi').slice(0, 18);
    const hello = $('[data-vx-hello]');
    hello.textContent = '';
    ['Salut', name].forEach(t => {
      const l = document.createElement('span');
      l.className = 'line';
      l.textContent = t;
      hello.appendChild(l);
    });

    const FORMAT_CAT = { Salle: 'salle', Club: 'salle', Studio: 'salle', Gymnase: 'salle', Dojo: 'salle', Piscine: 'salle', Terrain: 'exterieur', 'Extérieur': 'exterieur', Plage: 'exterieur', Falaise: 'exterieur', Parcours: 'exterieur', Practice: 'exterieur', Playground: 'exterieur', Domicile: 'domicile', Visio: 'visio' };
    const FORMATS = [['salle', 'En salle'], ['exterieur', 'En extérieur'], ['domicile', 'À domicile'], ['visio', 'En visio']];
    const LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Compétition'];
    const PRICES = [['all', 'Tous les prix'], ['p1', 'Jusqu\'à 25 €'], ['p2', '25 à 35 €'], ['p3', '35 à 45 €'], ['p4', 'Plus de 45 €']];
    const NOTES = [[0, 'Toutes les notes'], [4.7, '4,7 et plus'], [4.8, '4,8 et plus'], [4.9, '4,9 et plus']];
    const SORTS = {
      pert: ['Pertinence', (a, b) => (b.badge === 'top') - (a.badge === 'top') || b.rating * b.reviews - a.rating * a.reviews],
      'prix-asc': ['Prix croissant', (a, b) => a.price - b.price],
      'prix-desc': ['Prix décroissant', (a, b) => b.price - a.price],
      note: ['Mieux notés', (a, b) => b.rating - a.rating || b.reviews - a.reviews],
      avis: ['Plus d\'avis', (a, b) => b.reviews - a.reviews]
    };
    const priceOk = (p, b) => b === 'all' || (b === 'p1' && p <= 25) || (b === 'p2' && p > 25 && p <= 35) || (b === 'p3' && p > 35 && p <= 45) || (b === 'p4' && p > 45);

    const fam0 = params.get('famille');
    const st = {
      q: params.get('q') || '',
      dept: params.get('dept') || store.get('s2s-dept', ''),
      fam: fam0 && D.FAMILIES[fam0] ? fam0 : 'all',
      price: 'all', levels: [], formats: [], note: 0, dispo: false, sort: 'pert'
    };
    if (st.dept && !D.DEPT_BY_CODE[st.dept]) st.dept = '';
    let shown = 20;
    const favs = new Set(store.get('s2s-favs', []));
    const likes = c => 3 + (hash(c.id) % 42) + (favs.has(c.id) ? 1 : 0);
    const byId = id => D.COACHS.find(c => c.id === id);
    const qInput = $('[data-vx-q]');
    qInput.value = st.q;

    function card(c, i = 0) {
      const fav = favs.has(c.id);
      const b = BADGE[c.badge];
      return `<article class="vcard" style="--i:${i % 10}">
        <a class="vcard-link" href="coach.html?id=${c.id}">
          <div class="vcard-img coach-visual v-${c.visual}">
            <span class="coach-initials">${c.initials}</span>${icon(c.icon, 'coach-icon')}
            <span class="badge ${b[0]} coach-badge">${b[1]}</span>
          </div>
          <div class="vcard-body">
            <p class="vcard-price">${c.price} € <small>/ heure</small></p>
            <p class="vcard-name">${c.first} ${c.last.charAt(0)}. · ${c.sport}</p>
            <p class="vcard-meta">${icon('i-pin')}${deptLabel(c.dept)}</p>
            <p class="vcard-rating">${icon('i-star')}${note5(c.rating)} <span>(${c.reviews} avis)</span></p>
          </div>
        </a>
        <button type="button" class="vcard-fav${fav ? ' is-on' : ''}" data-fav="${c.id}" aria-pressed="${fav}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'} : ${c.first} ${c.last}">${icon('i-heart')}<span>${likes(c)}</span></button>
      </article>`;
    }

    /* ----- univers (onglets) ----- */
    const cats = $('[data-vx-cats]');
    cats.innerHTML = `<button type="button" class="vx-cat" data-cat="all">${icon('i-grid')}Tous</button>` +
      Object.entries(D.FAMILIES).map(([k, f]) => `<button type="button" class="vx-cat" data-cat="${k}">${icon(f.icon)}${f.label}</button>`).join('');
    const syncCats = () => $$('.vx-cat', cats).forEach(b => {
      const on = b.dataset.cat === st.fam;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });

    /* ----- bannière : visages qui flottent ----- */
    $('[data-vx-faces]').innerHTML = D.COACHS.filter(c => c.badge === 'dispo').slice(0, 5).map((c, i) =>
      `<span class="vx-face coach-visual v-${c.visual}" style="--i:${i};left:${[0, 90, 170, 40, 140][i]}px;top:${[10, 0, 30, 92, 96][i]}px">${c.initials}</span>`).join('');

    /* ----- département ----- */
    const deptBtn = $('[data-vx-dept-open]');
    const deptLabelEl = $('[data-vx-dept-label]');
    const modal = $('[data-vx-modal]');
    const deptQ = $('[data-vx-dept-q]');
    const deptList = $('[data-vx-dept-list]');
    const countIn = code => D.COACHS.filter(c => c.dept === code).length;
    function syncDept() {
      deptLabelEl.textContent = st.dept ? deptLabel(st.dept) : 'Toute la France';
      deptBtn.classList.toggle('is-set', !!st.dept);
    }
    function renderDeptList() {
      const q = normalize(deptQ.value);
      const items = D.DEPTS.filter(d => !q || normalize(`${d.code} ${d.name}`).includes(q));
      deptList.innerHTML = (q ? '' : `<button type="button" class="vx-dept${!st.dept ? ' is-on' : ''}" data-dept=""><b>FR</b><span>Toute la France</span><small>${D.COACHS.length} coachs</small></button>`) +
        items.map(d => {
          const n = countIn(d.code);
          return `<button type="button" class="vx-dept${st.dept === d.code ? ' is-on' : ''}${n ? '' : ' is-empty'}" data-dept="${d.code}"><b>${d.code}</b><span>${d.name}</span><small>${n ? `${n} coach${n > 1 ? 's' : ''}` : 'bientôt'}</small></button>`;
        }).join('') || '<p class="vx-sug-title">Aucun département trouvé</p>';
    }
    function openModal() {
      modal.hidden = false;
      deptQ.value = '';
      renderDeptList();
      setTimeout(() => deptQ.focus(), 50);
      document.addEventListener('keydown', escModal);
    }
    function closeModal() {
      modal.hidden = true;
      document.removeEventListener('keydown', escModal);
      deptBtn.focus();
    }
    function escModal(e) { if (e.key === 'Escape') closeModal(); }
    function setDept(code) {
      st.dept = code;
      store.set('s2s-dept', code);
      syncDept();
      shown = 20;
      renderRows();
      renderResults(true);
    }
    deptBtn.addEventListener('click', openModal);
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-vx-close]')) { closeModal(); return; }
      const b = e.target.closest('[data-dept]');
      if (b) {
        setDept(b.dataset.dept);
        closeModal();
        toast(b.dataset.dept ? `Département : ${deptLabel(b.dataset.dept)}` : 'Recherche dans toute la France');
      }
    });
    deptQ.addEventListener('input', renderDeptList);
    deptQ.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const first = $('[data-dept]:not([data-dept=""])', deptList); if (first) first.click(); }
    });

    /* ----- suggestions de recherche ----- */
    const sug = $('[data-vx-suggest]');
    let sugItems = [];
    let sugIdx = -1;
    const hl = (text, q) => {
      const i = normalize(text).indexOf(normalize(q));
      return q && i >= 0 ? `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}` : esc(text);
    };
    function renderSuggest() {
      const q = qInput.value.trim();
      const nq = normalize(q);
      let html = '';
      sugItems = [];
      if (!nq) {
        const recentQ = store.get('s2s-searches', []);
        if (recentQ.length) {
          html += '<p class="vx-sug-title">Recherches récentes</p>';
          recentQ.slice(0, 5).forEach(t => { sugItems.push({ type: 'q', value: t }); html += `<button type="button" class="vx-sug" data-sug="${sugItems.length - 1}">${icon('i-clock')}${esc(t)}</button>`; });
        }
        html += '<p class="vx-sug-title">Sports populaires</p>';
        ['Tennis', 'Running', 'Yoga', 'Boxe anglaise', 'Natation'].forEach(t => { sugItems.push({ type: 'q', value: t }); html += `<button type="button" class="vx-sug" data-sug="${sugItems.length - 1}">${icon('i-trend')}${t}</button>`; });
      } else {
        // ce qui commence par les premiers caractères tapés passe en premier
        const sports = rankBy(D.SPORTS, q, s => s.name).slice(0, 4);
        const coaches = rankBy(D.COACHS, q, c => `${c.first} ${c.last}`).slice(0, 3);
        const depts = rankBy(D.DEPTS, q, d => `${d.name} ${d.code}`).slice(0, 3);
        if (sports.length) {
          html += '<p class="vx-sug-title">Sports</p>';
          sports.forEach(s => {
            const n = D.COACHS.filter(c => c.sports.includes(s.name)).length;
            sugItems.push({ type: 'q', value: s.name });
            html += `<button type="button" class="vx-sug" data-sug="${sugItems.length - 1}">${icon(D.FAMILIES[s.family].icon)}${hl(s.name, q)}<small>${n} coach${n > 1 ? 's' : ''}</small></button>`;
          });
        }
        if (depts.length) {
          html += '<p class="vx-sug-title">Départements</p>';
          depts.forEach(d => {
            sugItems.push({ type: 'dept', value: d.code });
            html += `<button type="button" class="vx-sug" data-sug="${sugItems.length - 1}">${icon('i-pin')}${hl(`${d.name} (${d.code})`, q)}<small>${countIn(d.code)} coachs</small></button>`;
          });
        }
        if (coaches.length) {
          html += '<p class="vx-sug-title">Coachs</p>';
          coaches.forEach(c => {
            sugItems.push({ type: 'coach', value: c.id });
            html += `<button type="button" class="vx-sug" data-sug="${sugItems.length - 1}">${icon('i-user')}${hl(`${c.first} ${c.last}`, q)}<small>${c.sport} · ${deptLabel(c.dept)}</small></button>`;
          });
        }
        if (!sugItems.length) html = `<p class="vx-sug-title">Appuie sur Entrée pour chercher « ${esc(q)} »</p>`;
      }
      sug.innerHTML = html;
      sugIdx = -1;
      sug.hidden = false;
      qInput.setAttribute('aria-expanded', 'true');
    }
    const hideSuggest = () => { sug.hidden = true; qInput.setAttribute('aria-expanded', 'false'); };
    function runSearch(q) {
      st.q = q.trim();
      qInput.value = st.q;
      if (st.q) {
        const recentQ = store.get('s2s-searches', []).filter(t => normalize(t) !== normalize(st.q));
        recentQ.unshift(st.q);
        store.set('s2s-searches', recentQ.slice(0, 6));
      }
      hideSuggest();
      shown = 20;
      renderResults(true);
      $('#tous').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
    function pickSuggest(i) {
      const it = sugItems[i];
      if (!it) return;
      if (it.type === 'coach') { go(`coach.html?id=${it.value}`); return; }
      if (it.type === 'dept') { qInput.value = ''; st.q = ''; setDept(it.value); hideSuggest(); $('#tous').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return; }
      runSearch(it.value);
    }
    let sugTimer;
    qInput.addEventListener('focus', renderSuggest);
    qInput.addEventListener('input', () => { clearTimeout(sugTimer); sugTimer = setTimeout(renderSuggest, 90); });
    qInput.addEventListener('keydown', e => {
      const btns = $$('.vx-sug', sug);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!btns.length) return;
        sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length;
        btns.forEach((b, k) => b.classList.toggle('is-focus', k === sugIdx));
      } else if (e.key === 'Escape') {
        hideSuggest();
      } else if (e.key === 'Enter' && sugIdx >= 0) {
        e.preventDefault();
        pickSuggest(+btns[sugIdx].dataset.sug);
      }
    });
    sug.addEventListener('mousedown', e => e.preventDefault());
    sug.addEventListener('click', e => { const b = e.target.closest('[data-sug]'); if (b) pickSuggest(+b.dataset.sug); });
    qInput.addEventListener('blur', () => setTimeout(hideSuggest, 120));
    $('[data-vx-form]').addEventListener('submit', e => { e.preventDefault(); runSearch(qInput.value); });

    /* ----- rangées ----- */
    const rowsEl = $('[data-vx-rows]');
    const row = (key, title, sub, list, extra = '') => `
      <section class="vx-row" data-reveal>
        <div class="vx-row-head">
          <h2 class="vx-h2">${title}${sub ? `<small>${sub}</small>` : ''}</h2>
          ${list.length > 4 ? `<div class="vx-arrows"><button type="button" data-scroll="${key}" data-dir="-1" aria-label="Précédents">${icon('i-arrow-left')}</button><button type="button" data-scroll="${key}" data-dir="1" aria-label="Suivants">${icon('i-arrow')}</button></div>` : ''}
        </div>
        ${extra}
        ${list.length ? `<div class="vx-track" data-track="${key}">${list.map((c, i) => card(c, i)).join('')}</div>` : ''}
      </section>`;
    /* « Pour toi » : coachs classés selon la position de l'élève (géolocalisation, sinon département choisi)
       et ce qu'il a cherché, consulté ou déjà pratiqué. Tout est calculé dans le navigateur. */
    function forYou() {
      const geo = store.get('s2s-geo', null);
      const here = (geo && geo.dept) || st.dept || '';
      const herePos = DEPT_GEO[here];
      const searches = store.get('s2s-searches', []);
      const sportW = {};
      const famW = {};
      const seen = [];
      searches.forEach((t, i) => {
        const nt = normalize(t);
        const w = 1 / (1 + i * 0.35); // les recherches les plus récentes pèsent plus
        D.SPORTS.forEach(s => {
          const ns = normalize(s.name);
          if (ns === nt || (nt.length >= 3 && (ns.startsWith(nt) || ns.split(' ').some(x => x.startsWith(nt))))) {
            sportW[ns] = (sportW[ns] || 0) + w;
            famW[s.family] = (famW[s.family] || 0) + w * 0.6;
            if (!seen.includes(s.name)) seen.push(s.name);
          }
        });
        Object.keys(D.FAMILIES).forEach(f => { if (nt.length >= 3 && normalize(D.FAMILIES[f].label).startsWith(nt)) famW[f] = (famW[f] || 0) + w; });
      });
      store.get('s2s-recent', []).slice(0, 6).forEach(id => { const c = byId(id); if (c) famW[c.family] = (famW[c.family] || 0) + 0.4; });
      pastSessions().forEach(s => { const c = byId(s.id); if (c) famW[c.family] = (famW[c.family] || 0) + 0.5; });
      const doneIds = new Set(pastSessions().map(s => s.id));
      const list = D.COACHS.filter(c => !doneIds.has(c.id)).map(c => {
        let sc = (c.rating - 4.5) * 2;
        if (here) {
          if (c.dept === here) sc += 4;
          else sc += Math.max(0, 2.5 - distKm(herePos, DEPT_GEO[c.dept]) / 120);
        }
        sc += Math.min(3, c.sports.reduce((a, x) => a + (sportW[normalize(x)] || 0), 0) * 2);
        sc += Math.min(2, famW[c.family] || 0);
        return { c, sc };
      }).sort((a, b) => b.sc - a.sc || b.c.reviews - a.c.reviews).slice(0, 12).map(o => o.c);
      const bits = [];
      if (here) bits.push(`près de toi : ${deptLabel(here)}`);
      if (seen.length) bits.push(`d'après tes recherches : ${seen.slice(0, 3).join(', ').toLowerCase()}`);
      else if (Object.keys(famW).length) bits.push('d\'après les coachs que tu as consultés');
      const why = bits.length ? bits.join(' · ').replace(/^./, m => m.toUpperCase()) : 'Les mieux notés en attendant de mieux te connaître';
      const bar = `<div class="vx-geo">${icon('i-pin')}<span>${geo && geo.dept ? `Position détectée : <b>${esc(deptLabel(geo.dept))}</b>` : here ? `Basé sur ton département : <b>${esc(deptLabel(here))}</b>` : 'Active ta position pour voir d\'abord les coachs autour de toi.'}</span><button type="button" class="vx-geo-btn" data-vx-geo>${geo && geo.dept ? 'Actualiser' : 'Me localiser'}</button></div>`;
      return { list, why, bar };
    }
    function locate(silent) {
      if (!navigator.geolocation) { if (!silent) toast('La géolocalisation n\'est pas disponible sur ce navigateur.'); return; }
      const btn = $('[data-vx-geo]');
      if (btn && !silent) { btn.disabled = true; btn.textContent = 'Localisation…'; }
      navigator.geolocation.getCurrentPosition(pos => {
        const code = nearestDept(pos.coords.latitude, pos.coords.longitude);
        store.set('s2s-geo', { dept: code, at: Date.now() });
        if (!st.dept) { setDept(code); } else renderRows();
        if (!silent) toast(`Position détectée : ${deptLabel(code)}. « Pour toi » est mis à jour.`);
      }, () => {
        if (!silent) toast('Position non autorisée : choisis ton département pour des coachs près de chez toi.');
        renderRows();
      }, { timeout: 9000, maximumAge: 30 * 60 * 1000 });
    }
    // position déjà autorisée par le navigateur : on l'utilise sans redemander
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(p => { if (p.state === 'granted') locate(true); }).catch(() => {});
    }

    function renderRows() {
      const pert = SORTS.pert[1];
      let html = '';
      if (st.dept) {
        const near = D.COACHS.filter(c => c.dept === st.dept).sort(pert).slice(0, 12);
        html += row('near', `Près de chez toi`, `${deptLabel(st.dept)} · ${near.length} coach${near.length > 1 ? 's' : ''}`, near,
          near.length ? '' : `<div class="vx-prompt"><span>Pas encore de coach dans ce département. Essaie la visio ou un département voisin.</span><button type="button" class="btn btn-dark" data-vx-dept-open-2>Changer de département</button></div>`);
      } else {
        html += row('near', 'Près de chez toi', 'Choisis ton département pour voir les coachs autour de toi', [],
          `<div class="vx-prompt"><span>${icon('i-pin')} Indique ton département : on affichera d'abord les coachs près de chez toi.</span><button type="button" class="btn btn-dark" data-vx-dept-open-2>Choisir mon département</button></div>`);
      }
      const fy = forYou();
      html += row('foryou', 'Pour toi', fy.why, fy.list, fy.bar);
      const favList = [...favs].map(byId).filter(Boolean);
      if (favList.length) html += row('favs', 'Tes favoris', `${favList.length} coach${favList.length > 1 ? 's' : ''} enregistré${favList.length > 1 ? 's' : ''}`, favList);
      const recent = store.get('s2s-recent', []).map(byId).filter(Boolean);
      if (recent.length) html += row('recent', 'Vus récemment', '', recent);
      rowsEl.innerHTML = html;
      if (api()) api().prepare(rowsEl);
    }
    rowsEl.addEventListener('click', e => {
      const s = e.target.closest('[data-scroll]');
      if (s) {
        const track = $(`[data-track="${s.dataset.scroll}"]`, rowsEl);
        if (track) track.scrollBy({ left: +s.dataset.dir * track.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
      }
      if (e.target.closest('[data-vx-dept-open-2]')) openModal();
      if (e.target.closest('[data-vx-geo]')) locate(false);
    });

    /* ----- filtres façon pastilles ----- */
    const filtersEl = $('[data-vx-filters]');
    const POPS = {
      price: { label: () => st.price === 'all' ? 'Prix' : PRICES.find(p => p[0] === st.price)[1], set: () => st.price !== 'all', radio: true, opts: () => PRICES.map(([v, l]) => [v, l, st.price === v]), pick: v => { st.price = v; } },
      level: { label: () => st.levels.length ? `Niveau · ${st.levels.length}` : 'Niveau', set: () => st.levels.length > 0, opts: () => LEVELS.map(l => [l, l, st.levels.includes(l)]), pick: v => { st.levels = st.levels.includes(v) ? st.levels.filter(x => x !== v) : st.levels.concat(v); } },
      format: { label: () => st.formats.length ? `Format · ${st.formats.length}` : 'Format', set: () => st.formats.length > 0, opts: () => FORMATS.map(([v, l]) => [v, l, st.formats.includes(v)]), pick: v => { st.formats = st.formats.includes(v) ? st.formats.filter(x => x !== v) : st.formats.concat(v); } },
      note: { label: () => st.note ? `${note(st.note)} et +` : 'Note', set: () => st.note > 0, radio: true, opts: () => NOTES.map(([v, l]) => [String(v), l, st.note === v]), pick: v => { st.note = parseFloat(v); } },
      sort: { label: () => `Trier : ${SORTS[st.sort][0]}`, set: () => false, radio: true, opts: () => Object.entries(SORTS).map(([v, s]) => [v, s[0], st.sort === v]), pick: v => { st.sort = v; } }
    };
    let openPop = null;
    function renderFilters() {
      filtersEl.innerHTML = Object.entries(POPS).map(([k, p]) => `
        <div class="vx-pill-wrap">
          <button type="button" class="vx-pill${p.set() ? ' is-set' : ''}" data-pop="${k}" aria-expanded="${openPop === k}" aria-haspopup="true">${p.label()}${icon('i-chevron')}</button>
          <div class="vx-pop" data-pop-panel="${k}"${openPop === k ? '' : ' hidden'}>
            ${p.opts().map(([v, l, on]) => `<button type="button" class="vx-opt${p.radio ? ' is-radio' : ''}${on ? ' is-on' : ''}" data-opt="${k}" data-v="${esc(v)}">${l}<i></i></button>`).join('')}
          </div>
        </div>`).join('') +
        `<button type="button" class="vx-pill${st.dispo ? ' is-set' : ''}" data-dispo-pill aria-pressed="${st.dispo}">Dispo cette semaine</button>`;
    }
    filtersEl.addEventListener('click', e => {
      const pill = e.target.closest('[data-pop]');
      if (pill) { openPop = openPop === pill.dataset.pop ? null : pill.dataset.pop; renderFilters(); return; }
      const opt = e.target.closest('[data-opt]');
      if (opt) {
        const p = POPS[opt.dataset.opt];
        p.pick(opt.dataset.v);
        if (p.radio) openPop = null;
        shown = 20;
        renderFilters();
        renderResults(true);
        return;
      }
      if (e.target.closest('[data-dispo-pill]')) { st.dispo = !st.dispo; shown = 20; renderFilters(); renderResults(true); }
    });
    document.addEventListener('click', e => {
      if (openPop && !e.target.closest('.vx-pill-wrap')) { openPop = null; renderFilters(); }
    });

    /* ----- résultats ----- */
    const grid = $('[data-vx-grid]');
    const countEl = $('[data-vx-count]');
    const activeEl = $('[data-vx-active]');
    const emptyEl = $('[data-vx-empty]');
    const moreBtn = $('[data-vx-more]');
    const match = c => {
      if (st.fam !== 'all' && c.family !== st.fam) return false;
      if (st.dept && c.dept !== st.dept) return false;
      if (!priceOk(c.price, st.price)) return false;
      if (st.levels.length && !st.levels.some(l => c.levels.includes(l))) return false;
      if (st.formats.length && !st.formats.some(f => c.formats.some(x => FORMAT_CAT[x] === f))) return false;
      if (c.rating < st.note) return false;
      if (st.dispo && c.badge !== 'dispo') return false;
      if (st.q) {
        const hay = normalize([c.first, c.last, c.sport, ...c.sports, ...c.tags, deptLabel(c.dept), D.FAMILIES[c.family].label].join(' '));
        if (!normalize(st.q).split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    };
    function renderActive() {
      const chips = [];
      if (st.q) chips.push(['q', `« ${st.q} »`]);
      if (st.dept) chips.push(['dept', deptLabel(st.dept)]);
      if (st.fam !== 'all') chips.push(['fam', D.FAMILIES[st.fam].label]);
      if (st.price !== 'all') chips.push(['price', PRICES.find(p => p[0] === st.price)[1]]);
      st.levels.forEach(l => chips.push([`level:${l}`, l]));
      st.formats.forEach(f => chips.push([`format:${f}`, FORMATS.find(x => x[0] === f)[1]]));
      if (st.note) chips.push(['note', `${note(st.note)} et +`]);
      if (st.dispo) chips.push(['dispo', 'Dispo cette semaine']);
      activeEl.innerHTML = chips.map(([k, l]) => `<span class="vx-chip">${esc(l)}<button type="button" data-unset="${esc(k)}" aria-label="Retirer le filtre ${esc(l)}">${icon('i-x')}</button></span>`).join('') +
        (chips.length > 1 ? '<button type="button" class="vx-clear" data-unset="all">Tout effacer</button>' : '');
    }
    activeEl.addEventListener('click', e => {
      const b = e.target.closest('[data-unset]');
      if (!b) return;
      const k = b.dataset.unset;
      if (k === 'all') { Object.assign(st, { q: '', fam: 'all', price: 'all', levels: [], formats: [], note: 0, dispo: false }); setDept(''); qInput.value = ''; }
      else if (k === 'q') { st.q = ''; qInput.value = ''; }
      else if (k === 'dept') { setDept(''); }
      else if (k === 'fam') st.fam = 'all';
      else if (k === 'price') st.price = 'all';
      else if (k === 'note') st.note = 0;
      else if (k === 'dispo') st.dispo = false;
      else if (k.startsWith('level:')) st.levels = st.levels.filter(x => x !== k.slice(6));
      else if (k.startsWith('format:')) st.formats = st.formats.filter(x => x !== k.slice(7));
      shown = 20;
      syncCats();
      renderFilters();
      renderResults(true);
    });

    function renderResults(animate) {
      const list = D.COACHS.filter(match).sort(SORTS[st.sort][1]);
      countEl.innerHTML = `${list.length} coach${list.length > 1 ? 's' : ''}<small>${st.dept ? `dans le département ${esc(deptLabel(st.dept))}` : 'dans toute la France'}${st.fam !== 'all' ? ` · ${D.FAMILIES[st.fam].label}` : ''}</small>`;
      grid.innerHTML = list.slice(0, shown).map((c, i) => card(c, i)).join('');
      moreBtn.hidden = list.length <= shown;
      moreBtn.textContent = `Afficher plus de coachs (${list.length - shown} restants)`;
      emptyEl.hidden = list.length > 0;
      if (!list.length) {
        emptyEl.innerHTML = `<b>Aucun coach trouvé</b><p>${st.dept ? `Pas de coach correspondant dans le département ${esc(deptLabel(st.dept))} pour l'instant.` : 'Aucun coach ne correspond à tous ces critères.'} Élargis ta recherche :</p>
          <div>${st.dept ? '<button type="button" class="btn btn-dark" data-unset-dept>Toute la France</button>' : ''}<button type="button" class="btn btn-dark" data-unset-visio>Voir les coachs en visio</button></div>`;
      }
      renderActive();
      syncCats();
      if (api()) api().prepare(grid);
      if (!animate) return;
    }
    emptyEl.addEventListener('click', e => {
      if (e.target.closest('[data-unset-dept]')) setDept('');
      if (e.target.closest('[data-unset-visio]')) { setDept(''); st.formats = ['visio']; st.q = ''; qInput.value = ''; renderFilters(); renderResults(true); }
    });
    moreBtn.addEventListener('click', () => { shown += 20; renderResults(true); });

    cats.addEventListener('click', e => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      st.fam = b.dataset.cat;
      shown = 20;
      renderResults(true);
      $('#tous').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
    $('[data-vx-dispo]').addEventListener('click', () => {
      st.dispo = true;
      shown = 20;
      renderFilters();
      renderResults(true);
      $('#tous').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });

    /* ----- favoris (cœur) ----- */
    vx.addEventListener('click', e => {
      const b = e.target.closest('[data-fav]');
      if (!b) return;
      e.preventDefault();
      const id = b.dataset.fav;
      const on = !favs.has(id);
      if (on) favs.add(id); else favs.delete(id);
      store.set('s2s-favs', [...favs]);
      const c = byId(id);
      $$(`[data-fav="${id}"]`).forEach(x => {
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
        $('span', x).textContent = likes(c);
        x.classList.remove('is-pop'); void x.offsetWidth; x.classList.add('is-pop');
      });
      toast(on ? `${c.first} ajouté·e à tes favoris` : `${c.first} retiré·e de tes favoris`);
      clearTimeout(vx._rowsT);
      vx._rowsT = setTimeout(renderRows, 600);
    });

    syncDept();
    renderRows();
    renderFilters();
    renderResults(false);
  }

  /* =========================================================
     Espace pro du coach (CRM) : onglets en bas
     ========================================================= */
  const pro = $('[data-pro]');
  const proUser = readUser();
  if (pro && (!proUser || proUser.role !== 'coach')) {
    // espace pro : réservé aux comptes coach (écran d'accès + compte de démo)
    $$('.tabbar, [data-pro-demo]').forEach(el => { el.hidden = true; el.style.display = 'none'; });
    gate(pro, 'coach');
  } else if (pro) {
    const me = proUser;
    $('[data-pro-demo]').hidden = true;
    let coachData = D.COACHS.find(c => c.id === me.coachId) || null;
    const name = (me.name || 'Coach').slice(0, 18);
    const now = new Date();
    const day0 = new Date(); day0.setHours(0, 0, 0, 0);
    const ST = { pending: 'En attente', confirmed: 'Confirmée', done: 'Terminée', cancelled: 'Annulée', declined: 'Refusée' };
    const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const SLOTS = [['m', 'Matin'], ['a', 'Midi'], ['s', 'Soir']];
    const ALL_FORMATS = ['Salle', 'Club', 'Extérieur', 'Domicile', 'Visio'];
    // réglages publics de ce coach (tarif, lieux, créneaux) : son annonce et les élèves les lisent
    const myId = me.coachId;
    const settings = DB.pro(myId) || {
      price: coachData ? coachData.price : 35,
      formats: coachData ? coachData.formats.slice() : ['Salle'],
      avail: ['0-s', '1-m', '1-s', '2-s', '3-s', '4-m', '4-s', '5-m', '5-a']
    };
    const saveSettings = () => DB.savePro(myId, settings);
    const studentOf = personOf;
    const dayKey = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
    const dayName = d => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    // titre + date
    const hello = $('[data-pro-hello]');
    hello.textContent = '';
    ['Bonjour', name].forEach(t => { const l = document.createElement('span'); l.className = 'line'; l.textContent = t; hello.appendChild(l); });
    $('[data-pro-date]').textContent = `${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Espace pro`;
    const pub = $('[data-pro-public]');
    if (coachData) pub.href = `coach.html?id=${coachData.id}`; else pub.hidden = true;

    // réservations de ce coach : base partagée avec les élèves
    let bookings = coachBookings(myId);
    const reloadB = () => { bookings = coachBookings(myId); };
    const live = b => b.status !== 'cancelled' && b.status !== 'declined';
    const inNext7 = b => { const t = dayKey(b.when); return t >= day0.getTime() && t < day0.getTime() + 7 * 864e5; };
    const sortT = (a, b) => new Date(a.when) - new Date(b.when);

    // message dans la conversation de l'élève (+ notification s'il a un compte)
    function notify(studentId, text, notifText) {
      sendMsg('coach', studentId, text);
      notifyAccount(studentId, notifText || `${name} : ${text}`, 'espace.html#seances', 'booking');
    }
    // lieu du rendez-vous : chez l'élève si à domicile, sinon le lieu (et l'adresse) choisis par le coach
    const ownPlaces = () => store.get('s2s-places', {})[myId] || {};
    function bkPlace(b, s) {
      if (b.format === 'Domicile') return `Chez ${s.first} · ${2 + (hash(s.id) % 80)} ${STREETS[hash(s.id) % STREETS.length]}, ${s.city}`;
      if (b.format === 'Visio') return 'En visio · lien envoyé 1 h avant';
      const p = Object.assign(defaultPlace(placeRef, b.format), ownPlaces()[b.format] || {});
      return placeLine(p);
    }
    function bkRow(b, mode) {
      const s = studentOf(b.student);
      const d = new Date(b.when);
      const end = new Date(d.getTime() + 3600e3);
      const status = `<span class="st st-${b.status}"><i></i>${ST[b.status]}${b.status === 'cancelled' && b.fee ? ` · ${b.fee} € pour toi` : ''}</span>`;
      const msgBtn = `<button type="button" class="bk-btn bk-ico" data-bk="msg" data-id="${b.id}" aria-label="Écrire à ${s.first}">${icon('i-chat')}</button>`;
      let actions = '';
      if (b.status === 'pending') actions = `<button type="button" class="bk-btn is-ok" data-bk="accept" data-id="${b.id}">Accepter</button><button type="button" class="bk-btn" data-bk="refuse" data-id="${b.id}">Refuser</button>`;
      else if (b.status === 'confirmed') actions = `${d < new Date() ? `<button type="button" class="bk-btn is-ok" data-bk="done" data-id="${b.id}">Terminée</button>` : ''}<button type="button" class="bk-btn" data-bk="cancel" data-id="${b.id}">Annuler</button>${msgBtn}`;
      else actions = msgBtn;
      return `<div class="bk" data-row="${b.id}">
        <span class="bk-time">${hhmm(d)}<small>${mode === 'day' ? `à ${hhmm(end)}` : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '')}</small></span>
        <span class="bk-who"><span class="dash-av av-${s.visual}">${s.initials}</span><span><b>${s.first} ${s.last}</b><span>${s.sport} · ${b.price} €</span><span class="bk-place">${icon(b.format === 'Domicile' ? 'i-home' : b.format === 'Visio' ? 'i-chat' : 'i-pin')}${esc(bkPlace(b, s))}</span></span></span>
        ${mode === 'agenda' ? status : ''}
        <span class="bk-actions">${mode === 'agenda' || mode === 'pending' ? '' : status}${actions}</span>
      </div>`;
    }

    /* ----- Accueil ----- */
    function renderHome() {
      // séances du mois + moitié conservée sur les annulations tardives (moins de 48 h avant)
      const monthB = bookings.filter(b => (b.status === 'done' || b.status === 'confirmed' || (b.status === 'cancelled' && b.fee)) && new Date(b.when).getMonth() === now.getMonth());
      const earned = b => (b.status === 'cancelled' ? b.fee || 0 : b.price);
      const ca = (me.demo ? 640 : 0) + monthB.reduce((a, b) => a + earned(b), 0);
      const week = bookings.filter(b => live(b) && inNext7(b)).length;
      const fill = Math.min(100, Math.round(week / Math.max(1, settings.avail.length * 2) * 100));
      const rating = coachData ? coachData.rating : 4.9;
      $('[data-pro-kpis]').innerHTML = `
        <div class="pkpi"><span class="feat-ico">${icon('i-wallet')}</span><b><span data-count="${ca}">0</span> €</b><span>chiffre d'affaires ce mois-ci</span></div>
        <div class="pkpi"><span class="feat-ico">${icon('i-calendar')}</span><b><span data-count="${week}">0</span></b><span>séances sur les 7 prochains jours</span></div>
        <div class="pkpi"><span class="feat-ico">${icon('i-trend')}</span><b><span data-count="${fill}">0</span> %</b><span>de tes créneaux remplis</span></div>
        <div class="pkpi"><span class="feat-ico">${icon('i-star')}</span><b>${note5(rating)}</b><span>note moyenne · ${coachData ? coachData.reviews : 0} avis vérifiés</span></div>`;
      onReady(() => $$('[data-count]', $('[data-pro-kpis]')).forEach(el => api().countUp(el)));
      const today = bookings.filter(b => live(b) && dayKey(b.when) === day0.getTime()).sort(sortT);
      $('[data-pro-today]').innerHTML = today.length ? today.map(b => bkRow(b, 'day')).join('') : '<p class="pro-empty">Pas de séance aujourd\'hui. Profites-en pour souffler !</p>';
      const pending = bookings.filter(b => b.status === 'pending' && new Date(b.when) > now).sort(sortT);
      $('[data-pro-pending-count]').textContent = pending.length || '';
      $('[data-pro-pending]').innerHTML = pending.length ? pending.map(b => bkRow(b, 'pending')).join('') : '<p class="pro-empty">Aucune demande en attente. Tout est à jour.</p>';
      const unread = unreadTotal(loadChats('coach'));
      const toRelaunch = clientStats().filter(c => c.relaunch).length;
      renderNotifs($('[data-notifs]'));
      const card = me.card;
      const checks = profileChecks(me, 'pro');
      const nDone = checks.filter(x => x.done).length;
      const nextCheck = checks.find(x => !x.done);
      $('[data-pro-todo]').innerHTML = `
        <button type="button" class="todo" data-goto="profil" data-goto-anchor="succes"><span class="feat-ico">${icon('i-trophy')}</span><span><b>Profil complété à ${Math.round((nDone / checks.length) * 100)} %</b><span>${nextCheck ? `Prochain succès : ${esc(nextCheck.label.toLowerCase())}` : 'Tous les succès sont débloqués'}</span></span></button>
        <button type="button" class="todo" data-goto="messages"><span class="feat-ico">${icon('i-chat')}</span><span><b>${unread ? `${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : 'Messagerie à jour'}</b><span>Réponds vite : c'est un critère de ta note.</span></span></button>
        <button type="button" class="todo" data-goto="profil"><span class="feat-ico">${icon('i-card')}</span><span><b>${card ? (card.status === 'valid' ? 'Carte pro valide' : 'Carte pro en vérification') : 'Carte pro à renseigner'}</b><span>${card ? `Jusqu'au ${new Date(card.end).toLocaleDateString('fr-FR')}` : 'Ton profil reste masqué en attendant'}</span></span></button>
        <button type="button" class="todo" data-goto="clients"><span class="feat-ico">${icon('i-users')}</span><span><b>${toRelaunch ? `${toRelaunch} élève${toRelaunch > 1 ? 's' : ''} à relancer` : 'Tous tes élèves sont suivis'}</b><span>Sans séance depuis plus de 2 semaines</span></span></button>`;
    }

    /* ----- Réservations ----- */
    const ag = { day: day0.getTime(), status: 'all', week: false };
    function renderAgenda() {
      const days = [...Array(7)].map((_, i) => { const d = new Date(day0); d.setDate(d.getDate() + i); return d; });
      $('[data-pro-week]').innerHTML = `<button type="button" class="wday${ag.week ? ' is-active' : ''}" data-wday="week"><span>Semaine</span><b>7j</b><em>${bookings.filter(b => live(b) && inNext7(b)).length} séances</em></button>` +
        days.slice(0, 6).map(d => {
          const list = bookings.filter(b => dayKey(b.when) === d.getTime());
          const n = list.filter(live).length;
          const pend = list.some(b => b.status === 'pending');
          return `<button type="button" class="wday${!ag.week && ag.day === d.getTime() ? ' is-active' : ''}" data-wday="${d.getTime()}">${pend ? '<i class="wday-dot" title="Demande en attente"></i>' : ''}<span>${DAYS[(d.getDay() + 6) % 7]}</span><b>${d.getDate()}</b><em>${n} séance${n > 1 ? 's' : ''}</em></button>`;
        }).join('');
      const counts = s => bookings.filter(b => (ag.week ? inNext7(b) : dayKey(b.when) === ag.day) && (s === 'all' || b.status === s)).length;
      $('[data-pro-status]').innerHTML = [['all', 'Toutes'], ['pending', 'En attente'], ['confirmed', 'Confirmées'], ['done', 'Terminées'], ['cancelled', 'Annulées']]
        .map(([k, l]) => `<button type="button" class="filter${ag.status === k ? ' is-active' : ''}" data-st="${k}" aria-pressed="${ag.status === k}">${l} · ${counts(k)}</button>`).join('');
      const list = bookings.filter(b => (ag.week ? inNext7(b) : dayKey(b.when) === ag.day) && (ag.status === 'all' || b.status === ag.status)).sort(sortT);
      $('[data-pro-agenda]').innerHTML = list.length ? list.map(b => bkRow(b, 'agenda')).join('')
        : `<p class="pro-empty">Aucune séance ${ag.week ? 'cette semaine' : `le ${dayName(new Date(ag.day))}`} pour ce filtre.</p>`;
    }
    const addForm = $('[data-pro-addform]');
    function openAdd(studentId) {
      const days = [...Array(14)].map((_, i) => { const d = new Date(day0); d.setDate(d.getDate() + i); return d; });
      const mine = partnersFor('coach');
      if (!mine.length) { toast('Tu pourras ajouter une séance dès qu\'un élève t\'aura réservé ou écrit.'); return; }
      addForm.innerHTML = `
        <label>Élève<select name="student">${mine.map(s => `<option value="${s.id}"${s.id === studentId ? ' selected' : ''}>${esc(s.first)} ${esc(s.last)}</option>`).join('')}</select></label>
        <label>Jour<select name="day">${days.map(d => `<option value="${d.getTime()}"${!ag.week && d.getTime() === ag.day ? ' selected' : ''}>${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</option>`).join('')}</select></label>
        <label>Heure<select name="hour">${[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(h => `<option value="${h}"${h === 18 ? ' selected' : ''}>${h}h00</option>`).join('')}</select></label>
        <label>Lieu<select name="format">${settings.formats.map(f => `<option>${f}</option>`).join('')}</select></label>
        <button type="submit" class="btn btn-dark">Ajouter</button>`;
      addForm.hidden = false;
      addForm.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    }
    $('[data-pro-add]').addEventListener('click', () => { if (addForm.hidden) openAdd(); else addForm.hidden = true; });
    addForm.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(addForm);
      const d = new Date(+f.get('day'));
      d.setHours(+f.get('hour'), 0, 0, 0);
      const st0 = studentOf(f.get('student'));
      const b = DB.addBooking({ coach: myId, student: st0.id, studentName: `${st0.first} ${st0.last}`.trim(), when: d.toISOString(), status: 'confirmed', format: f.get('format'), place: null, price: settings.price, formule: null, by: 'coach' });
      reloadB();
      notify(b.student, `Séance ajoutée : ${dayName(d)} à ${hhmm(d)} (${b.format}). À bientôt !`, `${name} a ajouté une séance le ${dayName(d)} à ${hhmm(d)}.`);
      addForm.hidden = true;
      ag.week = false;
      ag.day = dayKey(d);
      renderAll();
      toast(`Séance ajoutée avec ${studentOf(b.student).first}.`);
    });
    $('[data-pro-week]').addEventListener('click', e => {
      const b = e.target.closest('[data-wday]');
      if (!b) return;
      if (b.dataset.wday === 'week') ag.week = true; else { ag.week = false; ag.day = +b.dataset.wday; }
      renderAgenda();
    });
    $('[data-pro-status]').addEventListener('click', e => { const b = e.target.closest('[data-st]'); if (b) { ag.status = b.dataset.st; renderAgenda(); } });

    // actions sur une réservation (accueil + agenda)
    pro.addEventListener('click', e => {
      const btn = e.target.closest('[data-bk]');
      if (!btn) return;
      const b = bookings.find(x => x.id === btn.dataset.id);
      if (!b) return;
      const s = studentOf(b.student);
      const d = new Date(b.when);
      const act = btn.dataset.bk;
      if (act === 'msg') { showTab('messages'); setTimeout(() => document.dispatchEvent(new CustomEvent('s2s:open-conv', { detail: s.id })), 60); return; }
      if (act === 'cancel' && !btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.textContent = 'Confirmer ?';
        btn.classList.add('is-ok');
        setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = 'Annuler'; btn.classList.remove('is-ok'); } }, 3000);
        return;
      }
      const row = btn.closest('.bk');
      // chaque décision met à jour la réservation partagée : l'élève la voit tout de suite
      const apply = () => {
        if (act === 'accept') { DB.updateBooking(b.id, { status: 'confirmed' }); notify(s.id, `C'est confirmé pour ${dayName(d)} à ${hhmm(d)} ! À bientôt.`, `${name} a accepté ta séance du ${dayName(d)} à ${hhmm(d)}.`); toast(`Séance confirmée : ${s.first} est prévenu·e.`); }
        if (act === 'refuse') { DB.updateBooking(b.id, { status: 'declined' }); notify(s.id, `Désolé, je ne suis pas disponible ${dayName(d)} à ${hhmm(d)}. On trouve un autre créneau ?`, `${name} ne peut pas assurer la séance du ${dayName(d)} à ${hhmm(d)} : rien n'est débité.`); toast(`Demande de ${s.first} refusée.`); }
        if (act === 'cancel') { DB.updateBooking(b.id, { status: 'cancelled', cancelledBy: 'coach', refund: b.price }); notify(s.id, `Je dois annuler notre séance du ${dayName(d)}. Tu es remboursé·e intégralement.`, `${name} a annulé la séance du ${dayName(d)} : remboursement intégral.`); toast(`Séance avec ${s.first} annulée.`); }
        if (act === 'done') { DB.updateBooking(b.id, { status: 'done' }); notifyAccount(s.id, `Séance avec ${name} terminée : tu peux maintenant la noter.`, `coach.html?id=${myId}#noter`, 'review'); toast(`Séance avec ${s.first} marquée comme terminée.`); }
        reloadB();
        renderAll();
      };
      if (row && (act === 'refuse' || act === 'accept') && !reduced) { row.classList.add('is-leaving'); setTimeout(apply, 350); } else apply();
    });

    /* ----- Élèves ----- */
    function clientStats() {
      return partnersFor('coach').map(p => studentOf(p.id)).map(s => {
        const h = hash(s.id);
        const mine = bookings.filter(b => b.student === s.id);
        const done = mine.filter(b => b.status === 'done');
        // compte de démo (Inès) : ses élèves fictifs ont un historique avant ces réservations ; sinon, uniquement les vraies séances
        const fakeHist = me.demo && !s.account;
        const base = fakeHist ? 1 + (h % 12) : 0;
        const lastDone = done.map(b => new Date(b.when)).sort((a, b) => b - a)[0] || (fakeHist ? new Date(day0.getTime() - (8 + (h % 20)) * 864e5) : now);
        const next = mine.filter(b => live(b) && new Date(b.when) >= now).sort(sortT)[0];
        const sessions = base + done.length;
        const relaunch = !next && (now - lastDone) > 14 * 864e5;
        return { s, sessions, spent: sessions * settings.price, lastDone, next, relaunch, tag: relaunch ? ['À relancer', 'st-cancelled'] : sessions >= 8 ? ['Fidèle', 'st-confirmed'] : sessions <= 3 ? ['Nouveau', 'st-pending'] : ['Régulier', 'st-done'] };
      });
    }
    const clientsEl = $('[data-pro-clients]');
    const clientQ = $('[data-pro-client-q]');
    function renderClients() {
      const q = normalize(clientQ.value);
      const list = clientStats().filter(c => !q || normalize(`${c.s.first} ${c.s.last} ${c.s.sport}`).includes(q));
      clientsEl.innerHTML = list.map(c => `
        <button type="button" class="client" data-client="${c.s.id}">
          <span class="client-top"><span class="dash-av av-${c.s.visual}">${c.s.initials}</span><span><b>${c.s.first} ${c.s.last}</b><span>${c.s.sport}</span></span></span>
          <span class="client-stats">
            <span><b>${c.sessions}</b><span>séances</span></span>
            <span><b>${c.spent} €</b><span>au total</span></span>
            <span><b>${c.next ? new Date(c.next.when).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '') : '—'}</b><span>prochaine</span></span>
          </span>
          <span class="st ${c.tag[1]} client-tag"><i></i>${c.tag[0]}</span>
        </button>`).join('') || '<p class="pro-empty">Aucun élève trouvé.</p>';
    }
    clientQ.addEventListener('input', renderClients);
    const drawer = $('[data-pro-drawer]');
    const drawerBox = $('[data-pro-drawer-box]');
    function openClient(id) {
      const c = clientStats().find(x => x.s.id === id);
      if (!c) return;
      const notes = store.get('s2s-pro-notes', {});
      const h = hash(id);
      const goals = ['Gagner en régularité', 'Préparer un tournoi', 'Reprendre en douceur', 'Améliorer la technique'];
      const prog = 35 + (h % 55);
      const hist = bookings.filter(b => b.student === id).sort((a, b) => new Date(b.when) - new Date(a.when));
      drawerBox.innerHTML = `
        <div class="drawer-head"><span class="dash-av av-${c.s.visual}">${c.s.initials}</span><span><b>${c.s.first} ${c.s.last}</b><span>${c.s.sport} · ${c.s.city}</span></span><button type="button" class="vx-close" data-drawer-close aria-label="Fermer">${icon('i-x')}</button></div>
        <div class="client-stats"><span><b>${c.sessions}</b><span>séances</span></span><span><b>${c.spent} €</b><span>au total</span></span><span><b>${c.lastDone.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')}</b><span>dernière</span></span></div>
        <div><h3>Objectif</h3><p style="margin:6px 0 0;color:var(--black);font-weight:500">${goals[h % goals.length]}</p><div class="tier-track"><i style="--w:${prog / 100}"></i></div><div class="tier-scale"><span>Progression</span><span>${prog} %</span></div></div>
        <div><h3>Notes privées</h3><textarea data-client-notes placeholder="Points travaillés, blessures, préférences… (visible par toi seul·e)">${esc(notes[id] || '')}</textarea></div>
        <div><h3>Historique</h3><div class="pro-list" style="margin-top:8px">${hist.length ? hist.map(b => bkRow(b, 'list')).join('') : '<p class="pro-empty">Pas encore de séance cette semaine.</p>'}</div></div>
        <div class="drawer-actions"><button type="button" class="btn btn-dark" data-client-msg="${id}">Écrire à ${c.s.first}</button><button type="button" class="btn btn-ghost" style="--fg:var(--black);border-color:#d6d6d6" data-client-book="${id}">Planifier une séance</button></div>`;
      drawer.hidden = false;
      setTimeout(() => $('[data-drawer-close]', drawerBox).focus(), 50);
      const ta = $('[data-client-notes]', drawerBox);
      let t;
      ta.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { const n = store.get('s2s-pro-notes', {}); n[id] = ta.value; store.set('s2s-pro-notes', n); toast('Note enregistrée.'); }, 700);
      });
    }
    const closeDrawer = () => { drawer.hidden = true; };
    clientsEl.addEventListener('click', e => { const b = e.target.closest('[data-client]'); if (b) openClient(b.dataset.client); });
    drawer.addEventListener('click', e => {
      if (e.target === drawer || e.target.closest('[data-drawer-close]')) closeDrawer();
      const m = e.target.closest('[data-client-msg]');
      if (m) { closeDrawer(); showTab('messages'); setTimeout(() => document.dispatchEvent(new CustomEvent('s2s:open-conv', { detail: m.dataset.clientMsg })), 60); }
      const bk = e.target.closest('[data-client-book]');
      if (bk) { closeDrawer(); showTab('agenda'); setTimeout(() => openAdd(bk.dataset.clientBook), 80); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

    /* ----- Revenus ----- */
    function renderRevenus() {
      // séances du mois + moitié conservée sur les annulations tardives (moins de 48 h avant)
      const monthB = bookings.filter(b => (b.status === 'done' || b.status === 'confirmed' || (b.status === 'cancelled' && b.fee)) && new Date(b.when).getMonth() === now.getMonth());
      const earned = b => (b.status === 'cancelled' ? b.fee || 0 : b.price);
      const gross = (me.demo ? 640 : 0) + monthB.reduce((a, b) => a + earned(b), 0);
      const hours = (me.demo ? 16 : 0) + monthB.filter(b => b.status !== 'cancelled').length;
      const ti = tierOf(hours);
      const rate = COM_TIERS[ti].c;
      const net = Math.round(gross * (1 - rate));
      const next = COM_TIERS[ti + 1] || null;
      const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return d; });
      // historique : chiffres de démo pour Inès, vraies séances terminées pour un nouveau coach
      const monthSum = m => bookings.filter(b => b.status === 'done' && new Date(b.when).getMonth() === m.getMonth() && new Date(b.when).getFullYear() === m.getFullYear()).reduce((a, b) => a + b.price, 0);
      const vals = me.demo ? [980, 1120, 1340, 1260, 1480, gross] : months.map((m, i) => (i === 5 ? gross : monthSum(m)));
      const max = Math.max(1, ...vals);
      const pay = me.demo
        ? [...Array(4)].map((_, i) => { const d = new Date(day0); d.setDate(d.getDate() - i * 7 - 2); return { d, v: [312, 286, 354, 298][i], ok: i > 0 }; })
        : bookings.filter(b => b.status === 'done').sort((a, b) => new Date(b.when) - new Date(a.when)).slice(0, 4).map(b => ({ d: new Date(new Date(b.when).getTime() + 2 * 864e5), v: Math.round(b.price * (1 - rate)), ok: new Date(b.when).getTime() + 2 * 864e5 < Date.now() }));
      $('[data-pro-revenus]').innerHTML = `
        <div class="rev-top">
          <article class="pcard pcard-dark" style="grid-column:auto">
            <h2>Net estimé ce mois-ci</h2>
            <p class="rev-big"><span data-count="${net}">0</span><small>€</small></p>
            <div class="rev-lines">
              <div><span>Chiffre d'affaires</span><b>${euros(gross)}</b></div>
              <div><span>Commission Sport2Share (${Math.round(rate * 100)} %)</span><b>− ${euros(gross * rate)}</b></div>
              <div><span>Heures de coaching</span><b>${hours} h</b></div>
            </div>
          </article>
          <article class="pcard" style="grid-column:auto">
            <h2>Palier de commission</h2>
            <p style="font-size:15px;color:var(--slate)">${rate === 0 ? `Aucun frais ce mois-ci : tu es sous les ${COM_TIERS[0].max} h de coaching.` : `Ce mois-ci : <b>${Math.round(rate * 100)} %</b> de commission (${COM_TIERS[ti].label}).`}${next ? ` Le palier suivant (${Math.round(next.c * 100)} %) commence à ${COM_TIERS[ti].max} h.` : ''}</p>
            <div class="tier-track"><i style="--w:${Math.min(1, hours / 50).toFixed(3)}"></i></div>
            <div class="tier-scale"><span>0 h · 0 %</span><span>10 h · 5 %</span><span>30 h · 7 %</span><span>40 h + · 10 %</span></div>
            <h2 style="margin-top:22px">Virements</h2>
            <div class="payouts">${pay.map(p => `<div class="payout"><span class="feat-ico">${icon('i-euro')}</span><span>Virement hebdomadaire<span>${p.d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span></span><span><b>${p.v} €</b> <span class="st ${p.ok ? 'st-confirmed' : 'st-pending'}"><i></i>${p.ok ? 'Reçu' : 'En cours'}</span></span></div>`).join('')}</div>
          </article>
        </div>
        <article class="pcard" style="margin-top:12px">
          <h2>Chiffre d'affaires · 6 derniers mois</h2>
          <div class="bars">${vals.map((v, i) => `<div class="bar${i === 5 ? ' is-now' : ''}" style="--i:${i};--h:${Math.round(v / max * 100)}%"><b>${v} €</b><i></i><span>${months[i].toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span></div>`).join('')}</div>
        </article>`;
      onReady(() => $$('[data-count]', $('[data-pro-revenus]')).forEach(el => api().countUp(el)));
    }

    /* ----- Profil : identité, carte pro, disponibilités, tarif, lieux, formules ----- */
    const PL_LABEL = { Salle: ['En salle', 'Une salle de sport où tu donnes rendez-vous'], Club: ['Au club', 'Ton club ou ton terrain habituel'], 'Extérieur': ['En extérieur', 'Parc, stade, piste : précise le point de rendez-vous'], Domicile: ['À domicile', 'Tu te déplaces : l\'élève verra « Chez vous » et indiquera son adresse'], Visio: ['En visio', 'Le lien est envoyé dans la messagerie 1 h avant'] };
    const placeRef = coachData || { id: myId, city: 'ta ville', dept: '75', sport: 'Sport' };
    function renderPlaces() {
      const own = store.get('s2s-places', {})[myId] || {};
      $('[data-pro-places]').innerHTML = `<div class="pl-list">${ALL_FORMATS.map(f => {
        const on = settings.formats.includes(f);
        const p = Object.assign(defaultPlace(placeRef, f), own[f] || {});
        const editable = !p.home && !p.remote;
        return `<div class="pl-row${on ? ' is-on' : ''}" data-pl="${f}">
          <button type="button" class="switch" role="switch" aria-checked="${on}" aria-label="${PL_LABEL[f][0]}" data-pl-toggle="${f}"><i></i></button>
          <div class="pl-txt"><b>${PL_LABEL[f][0]}</b><span>${PL_LABEL[f][1]}</span></div>
          ${editable ? `<div class="pl-fields">
            <label class="lfield"><span>Nom du lieu</span><input type="text" value="${esc(p.name)}" maxlength="60" data-pl-name></label>
            <label class="lfield"><span>Adresse du rendez-vous</span><input type="text" value="${esc(p.address)}" maxlength="140" data-pl-addr></label>
          </div>` : ''}
        </div>`;
      }).join('')}</div>
      <button type="button" class="btn btn-dark" data-pl-save>Enregistrer les lieux</button>`;
    }
    // formules : celles du coach (ou de démo pour Inès), publiées sur son annonce
    let myFormules = coachData ? formulesFor(coachData).slice() : (store.get('s2s-formules', {})[myId] || []);
    const saveFormules = () => { const all = store.get('s2s-formules', {}); all[myId] = myFormules; store.set('s2s-formules', all); };
    function renderFormules() {
      const p = settings.price;
      const link = $('[data-pro-formules-link]');
      if (coachData) link.href = `coach.html?id=${coachData.id}#formules`; else link.hidden = true;
      $('[data-pro-formules]').innerHTML = `
        <div class="fm-list">${myFormules.length ? myFormules.map(f => `
          <div class="fm-row">
            <span class="formule-off">−${f.discount} %</span>
            <span class="fm-txt"><b>${esc(f.name)}</b><span>${f.sessions} séances · ${formuleTotal(p, f)} € au lieu de ${p * f.sessions} €${f.note ? ` · ${esc(f.note)}` : ''}</span></span>
            <button type="button" class="bk-btn bk-ico" data-fm-del="${esc(f.id)}" aria-label="Supprimer la formule ${esc(f.name)}">${icon('i-x')}</button>
          </div>`).join('') : '<p class="pro-empty">Aucune formule pour l\'instant : tes élèves réservent à l\'unité.</p>'}
        </div>
        <form class="fm-form" data-fm-form novalidate>
          <p class="fm-title">Créer une formule</p>
          <label class="lfield fm-name"><span>Nom de la formule</span><input type="text" name="name" maxlength="40" placeholder="Ex. Carnet 5 séances" required></label>
          <label class="lfield"><span>Nombre de séances</span><input type="number" name="sessions" min="2" max="50" value="5" required></label>
          <label class="lfield"><span>Réduction (%)</span><input type="number" name="discount" min="1" max="50" value="10" required></label>
          <label class="lfield fm-note"><span>Petite description (facultatif)</span><input type="text" name="note" maxlength="80" placeholder="Ex. À utiliser dans les 3 mois"></label>
          <p class="fm-preview" data-fm-preview></p>
          <button type="submit" class="btn btn-dark">Publier la formule ${icon('i-plus', 'ico')}</button>
        </form>`;
      previewFormule();
    }
    function previewFormule() {
      const form = $('[data-fm-form]');
      const out = $('[data-fm-preview]');
      if (!form || !out) return;
      const n = Math.max(0, Math.round(+form.elements.sessions.value || 0));
      const d = Math.max(0, Math.min(50, +form.elements.discount.value || 0));
      const total = formuleTotal(settings.price, { sessions: n, discount: d });
      out.innerHTML = n >= 2 && d >= 1 ? `Aperçu : <b>${total} €</b> au lieu de ${settings.price * n} € · soit ${Math.round(total / n)} € la séance` : 'Au moins 2 séances et 1 % de réduction.';
    }
    // description et séance type : rédigées par le coach, publiées sur son profil
    const myBio = () => annonceOf(myId).bio || (coachData ? coachData.bio : '');
    function renderBio() {
      const v = myBio();
      $('[data-pro-bio]').innerHTML = `
        <form class="bio-form" data-bio-form novalidate>
          <label class="lfield"><span>Présente-toi : ton parcours, ta pédagogie, à qui s'adressent tes séances</span>
            <textarea name="bio" rows="5" maxlength="600" minlength="60" placeholder="Ex. Ancienne joueuse classée, je coache depuis 8 ans…" data-bio-input>${esc(v)}</textarea></label>
          <div class="bio-foot"><span class="bio-count" data-bio-count>${v.length}/600 · 60 caractères minimum</span><button type="submit" class="btn btn-dark">Enregistrer ma description</button></div>
        </form>`;
    }
    const SEANCE_MAX = 5;
    let mySeance = seanceOf(myId).slice();
    const readSeance = () => $$('[data-se-row]').map(r => ({ title: $('[data-se-title]', r).value.trim(), text: $('[data-se-text]', r).value.trim() }));
    function renderSeance(focusLast) {
      const rows = mySeance.length ? mySeance : [{ title: '', text: '' }];
      $('[data-pro-seance]').innerHTML = `
        <form class="se-form" data-se-form novalidate>
          ${seanceOf(myId).length ? '' : '<p class="pro-empty">Rien n\'est affiché sur ton profil tant que tu n\'as pas décrit ta séance type.</p>'}
          <ol class="se-list">${rows.map((s, i) => `
            <li class="se-row" data-se-row>
              <span class="se-n">${String(i + 1).padStart(2, '0')}</span>
              <label class="lfield"><span>Étape</span><input type="text" maxlength="40" value="${esc(s.title)}" placeholder="Ex. Échauffement" data-se-title></label>
              <label class="lfield"><span>Ce qu'on y fait</span><input type="text" maxlength="160" value="${esc(s.text)}" placeholder="Ex. 10 minutes de mobilité et de footing léger" data-se-text></label>
              <button type="button" class="bk-btn bk-ico" data-se-del="${i}" aria-label="Supprimer l'étape ${i + 1}">${icon('i-x')}</button>
            </li>`).join('')}
          </ol>
          <div class="se-foot">
            <button type="button" class="btn btn-line" data-se-add${rows.length >= SEANCE_MAX ? ' disabled' : ''}>${icon('i-plus', 'ico')}Ajouter une étape</button>
            <button type="submit" class="btn btn-dark">Publier ma séance type</button>
          </div>
        </form>`;
      if (focusLast) { const t = $$('[data-se-title]').pop(); if (t) t.focus(); }
    }

    // annonce publiée seulement si l'identité est vérifiée et la carte pro validée
    function syncPublish() {
      const missing = [!idOk(me) && 'ta pièce d\'identité', !cardOk(me) && (me.card ? 'la validation de ta carte pro' : 'ta carte professionnelle')].filter(Boolean);
      const live = !missing.length;
      const vis = $('[data-pro-visibility]');
      vis.className = `status ${live ? 'status-ok' : 'status-wait'}`;
      vis.innerHTML = `<i></i>${live ? 'Annonce publiée' : 'Annonce non publiée'}`;
      vis.style.cssText = live ? '' : 'background:#fff1dc;color:#a35a00';
      const pubBtn = $('[data-pro-public]');
      if (coachData && pubBtn) { pubBtn.hidden = !live; }
      $$('[data-pro-publish]').forEach(b => {
        b.innerHTML = live ? '' : `<div class="pro-alert">${icon('i-lock')}<p><b>Ton annonce n'est pas publiée</b>Il manque ${missing.join(' et ')}. Tant que ce n'est pas complet, les élèves ne voient pas ton profil, tes formules ni tes créneaux.</p>${b.closest('[data-panel="profil"]') ? '' : '<button type="button" class="btn btn-dark" data-goto="profil">Compléter mon profil</button>'}</div>`;
      });
    }
    syncPublish();

    function refreshDone() { renderAchievements($('[data-achievements]'), me, 'pro'); }
    function renderProfil() {
      refreshDone();
      renderIdentity($('[data-idcard]'), me, () => { syncPublish(); refreshDone(); });
      const box = $('[data-procard]');
      renderProCard(box, me);
      renderPlaces();
      renderFormules();
      renderBio();
      renderSeance();
      $('[data-pro-avail]').innerHTML = '<span></span>' + DAYS.map(d => `<span>${d}</span>`).join('') +
        SLOTS.map(([k, l]) => `<span>${l}</span>` + DAYS.map((_, di) => {
          const key = `${di}-${k}`;
          const on = settings.avail.includes(key);
          return `<button type="button" class="slot-t${on ? ' is-on' : ''}" data-slot-k="${key}" aria-pressed="${on}" aria-label="${DAYS[di]} ${l} : ${on ? 'ouvert' : 'fermé'}"></button>`;
        }).join('')).join('');
      $('[data-pro-rate]').innerHTML = `
        <div class="rate-pro">
          <div class="range">
            <div class="range-head"><span>Tarif horaire</span><b data-rate-label>${settings.price} €/h</b></div>
            <input type="range" min="10" max="150" step="1" value="${settings.price}" data-rate-range aria-label="Tarif horaire">
            <div class="range-scale"><span>10 €</span><span>150 €</span></div>
          </div>
          <p class="pcard-hint">C'est toi seul qui fixes ton prix : il s'affiche tel quel sur ton annonce. Tes formules sont calculées à partir de ce tarif.</p>
          <button type="button" class="btn btn-dark" data-rate-save>Enregistrer</button>
        </div>`;
      paintRange($('[data-rate-range]'));
    }
    const profil = $('[data-panel="profil"]');
    profil.addEventListener('click', e => {
      const s = e.target.closest('[data-slot-k]');
      if (s) {
        const k = s.dataset.slotK;
        settings.avail = settings.avail.includes(k) ? settings.avail.filter(x => x !== k) : settings.avail.concat(k);
        s.classList.toggle('is-on');
        s.setAttribute('aria-pressed', String(s.classList.contains('is-on')));
        saveSettings();
        refreshDone();
      }
      // lieux proposés : interrupteurs (au moins un lieu doit rester ouvert)
      const t = e.target.closest('[data-pl-toggle]');
      if (t) {
        const row = t.closest('.pl-row');
        const on = !row.classList.contains('is-on');
        if (!on && $$('.pl-row.is-on', profil).length === 1) { toast('Garde au moins un lieu de séance.'); return; }
        row.classList.toggle('is-on', on);
        t.setAttribute('aria-checked', String(on));
      }
      if (e.target.closest('[data-pl-save]')) {
        const rows = $$('.pl-row', profil);
        settings.formats = rows.filter(r => r.classList.contains('is-on')).map(r => r.dataset.pl);
        const all = store.get('s2s-places', {});
        all[myId] = {};
        rows.forEach(r => {
          const n = $('[data-pl-name]', r);
          const a = $('[data-pl-addr]', r);
          if (n && a) all[myId][r.dataset.pl] = { name: n.value.trim() || PL_LABEL[r.dataset.pl][0], address: a.value.trim() };
        });
        store.set('s2s-places', all);
        saveSettings();
        const home = settings.formats.includes('Domicile');
        toast(`Lieux enregistrés : ${settings.formats.map(f => PL_LABEL[f][0].toLowerCase()).join(', ')}.${home ? ' Tes élèves verront « Chez vous ».' : ''}`);
      }
      const del = e.target.closest('[data-fm-del]');
      if (del) {
        myFormules = myFormules.filter(f => f.id !== del.dataset.fmDel);
        saveFormules();
        renderFormules();
        refreshDone();
        toast('Formule supprimée de ton annonce.');
      }
      if (e.target.closest('[data-rate-save]')) { saveSettings(); renderFormules(); toast(`Tarif mis à jour : ${settings.price} €/h.`); renderHome(); }
      // séance type : ajout / suppression d'étapes (on garde ce qui est déjà tapé)
      if (e.target.closest('[data-se-add]')) {
        mySeance = readSeance();
        if (!mySeance.length) mySeance.push({ title: '', text: '' });
        if (mySeance.length >= SEANCE_MAX) { toast(`${SEANCE_MAX} étapes maximum.`); return; }
        mySeance.push({ title: '', text: '' });
        renderSeance(true);
      }
      const sd = e.target.closest('[data-se-del]');
      if (sd) {
        mySeance = readSeance();
        mySeance.splice(+sd.dataset.seDel, 1);
        renderSeance();
      }
    });
    profil.addEventListener('input', e => {
      if (e.target.closest('[data-fm-form]')) previewFormule();
      const bi = e.target.closest('[data-bio-input]');
      if (bi) $('[data-bio-count]').textContent = `${bi.value.length}/600 · 60 caractères minimum`;
      const r = e.target.closest('[data-rate-range]');
      if (!r) return;
      settings.price = +r.value;
      paintRange(r);
      $('[data-rate-label]').textContent = `${settings.price} €/h`;
    });
    profil.addEventListener('submit', e => {
      const bioForm = e.target.closest('[data-bio-form]');
      if (bioForm) {
        e.preventDefault();
        const inp = bioForm.elements.bio;
        const v = inp.value.trim();
        if (v.length < 60) { flag([inp]); toast('Écris au moins 60 caractères pour te présenter.'); return; }
        saveAnnonce(myId, { bio: v });
        toast('Description enregistrée : elle s\'affiche dans « À propos » sur ton profil.');
        refreshDone();
        return;
      }
      const seForm = e.target.closest('[data-se-form]');
      if (seForm) {
        e.preventDefault();
        const steps = readSeance();
        const bad = $$('[data-se-row]').filter((r, i) => (steps[i].title || steps[i].text) && !(steps[i].title && steps[i].text));
        if (bad.length) { flag(bad.map(r => (steps[$$('[data-se-row]').indexOf(r)].title ? $('[data-se-text]', r) : $('[data-se-title]', r)))); toast('Chaque étape a besoin d\'un titre et d\'une description.'); return; }
        mySeance = steps.filter(s => s.title && s.text);
        if (!mySeance.length) { flag([$('[data-se-title]')]); toast('Décris au moins une étape de ta séance.'); return; }
        saveAnnonce(myId, { seance: mySeance });
        renderSeance();
        toast('Séance type publiée sur ton profil.');
        refreshDone();
        return;
      }
      const form = e.target.closest('[data-fm-form]');
      if (!form) return;
      e.preventDefault();
      const el = form.elements;
      const bad = [el.name, el.sessions, el.discount].filter(i => !i.checkValidity() || !i.value.trim());
      if (bad.length) { flag(bad); toast('Donne un nom, au moins 2 séances et une réduction entre 1 et 50 %.'); return; }
      myFormules.push({ id: `f${Date.now().toString(36)}`, name: el.name.value.trim(), sessions: Math.round(+el.sessions.value), discount: Math.round(+el.discount.value), note: el.note.value.trim() });
      saveFormules();
      renderFormules();
      refreshDone();
      const live = idOk(me) && cardOk(me);
      toast(live ? 'Formule publiée : elle apparaît dans l\'onglet « Mes formules » de ton profil.' : 'Formule enregistrée : elle apparaîtra quand ton annonce sera publiée.');
    });

    /* ----- barre d'onglets ----- */
    const tabs = $$('[data-tab]');
    const panels = $$('[data-panel]');
    const ind = $('[data-tabbar-ind]');
    const RENDER = { home: renderHome, agenda: renderAgenda, clients: renderClients, revenus: renderRevenus, profil: renderProfil, messages: () => document.dispatchEvent(new CustomEvent('s2s:open-first')) };
    function placeInd() {
      const a = tabs.find(t => t.classList.contains('is-active'));
      if (!a) return;
      ind.style.width = `${a.offsetWidth}px`;
      ind.style.transform = `translateX(${a.offsetLeft}px)`;
    }
    function badges() {
      const pend = bookings.filter(b => b.status === 'pending' && new Date(b.when) > new Date()).length;
      const unread = unreadTotal(loadChats('coach'));
      const bA = $('[data-badge="agenda"]');
      const bM = $('[data-badge="messages"]');
      bA.hidden = !pend; bA.textContent = pend;
      bM.hidden = !unread; bM.textContent = unread;
    }
    function renderAll() {
      reloadB();
      renderHome();
      renderAgenda();
      if (!$('[data-panel="clients"]').hidden) renderClients();
      if (!$('[data-panel="revenus"]').hidden) renderRevenus();
      badges();
    }
    function showTab(key, opts = {}) {
      if (!RENDER[key]) key = 'home';
      tabs.forEach(t => {
        const on = t.dataset.tab === key;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(p => {
        const on = p.dataset.panel === key;
        const was = !p.hidden;
        p.hidden = !on;
        if (on && !was && !reduced) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
      });
      RENDER[key]();
      badges();
      placeInd();
      if (!opts.silent) {
        history.replaceState(null, '', `#${key}`);
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      }
      if (api()) api().queueMeasure();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => showTab(t.dataset.tab));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        n.focus();
        showTab(n.dataset.tab);
      });
    });
    // aller à une rubrique précise d'un onglet (ex. succès du profil -> « Ma séance type »)
    const goAnchor = id => setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: reduced ? 'auto' : 'smooth' });
      el.classList.remove('is-pinged'); void el.offsetWidth; el.classList.add('is-pinged');
    }, 120);
    pro.addEventListener('click', e => {
      const g = e.target.closest('[data-goto]');
      if (!g) return;
      showTab(g.dataset.goto, { silent: !!g.dataset.gotoAnchor });
      if (g.dataset.gotoAnchor) goAnchor(g.dataset.gotoAnchor);
    });
    window.addEventListener('resize', placeInd);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeInd);
    setInterval(badges, 2500);
    // en direct : une demande, une annulation, un report ou un message d'élève arrive (autre onglet)
    DB.onChange((what, external) => {
      if (what === 'accounts') {
        // validation de la carte pro, nouvelle photo… : l'annonce se publie
        Object.assign(me, DB.me() || {});
        // annonce tout juste publiée : le lien « Voir mon profil public » apparaît
        if (!coachData && DB.isPublished(me)) {
          coachData = DB.publishedCoaches(D).find(c => c.id === myId) || null;
          if (coachData) { D.COACHS.push(coachData); pub.href = `coach.html?id=${myId}`; pub.hidden = false; }
        }
        syncPublish();
        refreshDone();
      }
      if (!external) return;
      if (what === 'bookings') renderAll();
      if (what === 'threads') badges();
      if (what === 'notifs') renderNotifs($('[data-notifs]'));
    });

    renderHome();
    renderAgenda();
    // pro.html#seance, #formules… : ouvre l'onglet Profil sur la bonne rubrique
    const h0 = location.hash.slice(1);
    const inProfil = h0 && !RENDER[h0] && document.getElementById(h0) && document.getElementById(h0).closest('[data-panel="profil"]');
    showTab(inProfil ? 'profil' : (h0 || 'home'), { silent: true });
    if (inProfil) goAnchor(h0);
  }

  /* =========================================================
     Mentions légales : repère la section lue
     ========================================================= */
  const legal = $('[data-legal]');
  if (legal) {
    const links = $$('.legal-nav a');
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === `#${en.target.id}`));
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    $$('section[id]', legal).forEach(s => spy.observe(s));
  }
})();
