/* =========================================================
   Sport2Share — base de données partagée (dans le navigateur)
   Tous les comptes vivent au même endroit : comptes, réservations,
   messages, avis, notifications et réglages des coachs sont communs.
   Chaque onglet a sa propre session : on peut ouvrir un onglet « coach »
   et un onglet « élève » côte à côte, ils se répondent en direct.
   Démo : rien ne quitte l'ordinateur (localStorage).
   Chargé dans le <head> de chaque page, avant layout.js.
   ========================================================= */
(function () {
  'use strict';

  var VERSION = 3;
  var K = {
    accounts: 's2s-db-accounts',
    bookings: 's2s-db-bookings',
    threads: 's2s-db-threads',
    reviews: 's2s-db-reviews',
    notifs: 's2s-db-notifs',
    pro: 's2s-db-pro',
    version: 's2s-db-version',
    last: 's2s-last-session'
  };
  var SESSION = 's2s-session';
  var DEMO_PASS = 'sport2026';

  function read(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var nowIso = function () { return new Date().toISOString(); };
  var uid = function (p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'membre';
  }
  // empreinte du mot de passe (démo : pas un vrai chiffrement, mais jamais le mot de passe en clair)
  function hashPass(p) {
    var s = 's2s|' + String(p || '');
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  /* ---------- écouteurs : ce qui change ici ou dans un autre onglet ---------- */
  var listeners = [];
  function emit(what, external) { listeners.forEach(function (fn) { try { fn(what, !!external); } catch (e) { /* rien */ } }); }
  window.addEventListener('storage', function (e) {
    if (!e.key) { emit('all', true); return; }
    if (e.key.indexOf('s2s-db-') === 0) emit(e.key.slice(7), true);
  });

  /* ---------- session (une par onglet) ---------- */
  function accounts() { return read(K.accounts, {}); }
  function sessionId() {
    var s = null;
    try { s = sessionStorage.getItem(SESSION); } catch (e) { s = null; }
    if (s === '-') return '';
    var all = accounts();
    if (s) return all[s] ? s : '';
    // nouvel onglet : on reprend le dernier compte connecté, puis l'onglet garde le sien
    var last = '';
    try { last = localStorage.getItem(K.last) || ''; } catch (e) { last = ''; }
    if (last && all[last]) { try { sessionStorage.setItem(SESSION, last); } catch (e) { /* rien */ } return last; }
    return '';
  }
  function login(id) {
    try { sessionStorage.setItem(SESSION, id); localStorage.setItem(K.last, id); } catch (e) { /* rien */ }
    emit('session');
  }
  function logout() {
    var id = sessionId();
    try {
      sessionStorage.setItem(SESSION, '-');
      if (localStorage.getItem(K.last) === id) localStorage.removeItem(K.last);
    } catch (e) { /* rien */ }
    emit('session');
  }
  function me() { var id = sessionId(); return id ? accounts()[id] || null : null; }
  function saveAccount(acc) {
    var all = accounts();
    all[acc.id] = acc;
    if (!write(K.accounts, all)) { delete acc.photo; all[acc.id] = acc; write(K.accounts, all); }
    emit('accounts');
    return acc;
  }
  function saveMe(u) {
    var id = sessionId();
    if (!id || !u) return null;
    var cur = accounts()[id] || {};
    return saveAccount(Object.assign({}, cur, u, { id: id, pass: cur.pass, email: u.email || cur.email }));
  }

  /* ---------- comptes ---------- */
  function account(id) { return accounts()[id] || null; }
  function accountByCoach(coachId) {
    var all = accounts();
    for (var k in all) if (all[k].role === 'coach' && all[k].coachId === coachId) return all[k];
    return null;
  }
  function byEmail(email) {
    var e = String(email || '').trim().toLowerCase();
    var all = accounts();
    for (var k in all) if ((all[k].email || '').toLowerCase() === e) return all[k];
    return null;
  }
  function createAccount(data, password) {
    var all = accounts();
    var taken = function (id) {
      if (all[id]) return true;
      var D = window.S2S_DATA;
      return !!(D && (D.COACHS.some(function (c) { return c.id === id; }) || D.STUDENTS.some(function (s) { return s.id === id; })));
    };
    var base = slug((data.name || 'membre') + ' ' + (data.last || ''));
    var id = base;
    var n = 2;
    while (taken(id)) id = base + '-' + n++;
    var acc = Object.assign({}, data, { id: id, email: String(data.email || '').trim(), pass: hashPass(password), createdAt: nowIso() });
    if (acc.role === 'coach') acc.coachId = id;
    return saveAccount(acc);
  }
  function checkLogin(email, password) {
    var a = byEmail(email);
    if (!a) return { error: 'unknown' };
    if (a.pass !== hashPass(password)) return { error: 'password', account: a };
    return { account: a };
  }

  /* ---------- réservations (élève <-> coach) ----------
     { id, coach, student, studentName, when, format, place, price, formule, status, createdAt, ... }
     status : pending (en attente du coach) · confirmed · declined · cancelled · done */
  function bookings() { return read(K.bookings, []); }
  function addBooking(b) {
    var all = bookings();
    var rec = Object.assign({ id: uid('bk'), status: 'pending', createdAt: nowIso() }, b);
    all.push(rec);
    write(K.bookings, all);
    emit('bookings');
    return rec;
  }
  function updateBooking(id, patch) {
    var all = bookings();
    var b = null;
    for (var i = 0; i < all.length; i++) if (all[i].id === id) { b = all[i]; break; }
    if (!b) return null;
    Object.assign(b, patch, { updatedAt: nowIso() });
    write(K.bookings, all);
    emit('bookings');
    return b;
  }

  /* ---------- messagerie : une conversation par couple coach / élève ---------- */
  var threadKey = function (coach, student) { return coach + '__' + student; };
  function threads() { return read(K.threads, {}); }
  function sendMessage(coach, student, from, text, extra) {
    var all = threads();
    var key = threadKey(coach, student);
    var t = all[key] || (all[key] = { coach: coach, student: student, msgs: [], unread: { coach: 0, eleve: 0 } });
    var m = Object.assign({ from: from, text: text, t: nowIso() }, extra || {});
    t.msgs.push(m);
    var to = from === 'coach' ? 'eleve' : 'coach';
    t.unread[to] = (t.unread[to] || 0) + 1;
    write(K.threads, all);
    emit('threads');
    return m;
  }
  function openThread(coach, student) {
    var all = threads();
    var key = threadKey(coach, student);
    if (!all[key]) { all[key] = { coach: coach, student: student, msgs: [], unread: { coach: 0, eleve: 0 } }; write(K.threads, all); }
    return all[key];
  }
  function markRead(coach, student, role) {
    var all = threads();
    var t = all[threadKey(coach, student)];
    if (!t || !t.unread[role]) return;
    t.unread[role] = 0;
    write(K.threads, all);
    emit('threads');
  }

  /* ---------- avis (après une séance réalisée) ---------- */
  function reviews() { return read(K.reviews, []); }
  function saveReview(r) {
    var all = reviews().filter(function (x) { return !(x.coach === r.coach && x.student === r.student); });
    all.push(r);
    write(K.reviews, all);
    emit('reviews');
  }
  function removeReview(coach, student) {
    write(K.reviews, reviews().filter(function (x) { return !(x.coach === coach && x.student === student); }));
    emit('reviews');
  }

  /* ---------- notifications ---------- */
  function notify(to, text, href, kind) {
    if (!to) return;
    var all = read(K.notifs, []);
    all.push({ id: uid('n'), to: to, text: text, href: href || '', kind: kind || 'info', t: nowIso(), read: false });
    write(K.notifs, all.slice(-400));
    emit('notifs');
  }
  function notifsFor(id) { return read(K.notifs, []).filter(function (n) { return n.to === id; }).reverse(); }
  function markNotifsRead(id) {
    var all = read(K.notifs, []);
    var changed = false;
    all.forEach(function (n) { if (n.to === id && !n.read) { n.read = true; changed = true; } });
    if (changed) { write(K.notifs, all); emit('notifs'); }
  }

  // non lus d'un compte : notifications + messages
  function unreadFor(u) {
    if (!u) return { notifs: 0, msgs: 0, total: 0 };
    var nn = notifsFor(u.id).filter(function (n) { return !n.read; }).length;
    var mm = 0;
    var th = threads();
    Object.keys(th).forEach(function (k) {
      var t = th[k];
      if (u.role === 'coach' && t.coach === u.coachId) mm += t.unread.coach || 0;
      if (u.role !== 'coach' && t.student === u.id) mm += t.unread.eleve || 0;
    });
    return { notifs: nn, msgs: mm, total: nn + mm };
  }

  /* ---------- réglages publics des coachs (tarif, lieux, créneaux) ---------- */
  function pro(coachId) { return read(K.pro, {})[coachId] || null; }
  function savePro(coachId, s) {
    var all = read(K.pro, {});
    all[coachId] = Object.assign({}, s, { coachId: coachId });
    write(K.pro, all);
    emit('pro');
  }

  /* ---------- annonces des nouveaux coachs : publiées dès que l'identité et la carte pro sont validées ---------- */
  var YEARS = { 'Moins de 2 ans': 1, '2 à 5 ans': 3, '5 à 10 ans': 7, 'Plus de 10 ans': 12 };
  function isPublished(a) {
    return !!(a && a.role === 'coach' && a.identity && a.identity.status === 'valid' && a.card && a.card.status === 'valid');
  }
  function publishedCoaches(D) {
    var all = accounts();
    var list = [];
    var revs = reviews();
    var bks = bookings();
    var ann = read('s2s-annonces', {});
    Object.keys(all).forEach(function (k) {
      var a = all[k];
      if (!isPublished(a) || D.COACHS.some(function (c) { return c.id === a.coachId; })) return;
      var sport = (a.card && a.card.sport) || 'Prépa physique';
      var sp = D.SPORTS.filter(function (s) { return s.name === sport; })[0] || { name: sport, family: 'fitness' };
      var dept = (a.activity && a.activity.dept) || '75';
      var d = D.DEPT_BY_CODE[dept] || { city: '', code: dept };
      var settings = pro(a.coachId) || {};
      var mine = revs.filter(function (r) { return r.coach === a.coachId; });
      var avg = mine.length ? Math.round(mine.reduce(function (s, r) { return s + r.rating; }, 0) / mine.length * 10) / 10 : 0;
      var years = YEARS[a.activity && a.activity.years] || 1;
      var studs = {};
      bks.forEach(function (b) { if (b.coach === a.coachId && (b.status === 'done' || b.status === 'confirmed')) studs[b.student] = 1; });
      var first = a.name || 'Coach';
      var last = a.last || '';
      list.push({
        id: a.coachId, first: first, last: last,
        initials: (first.charAt(0) + (last.charAt(0) || '')).toUpperCase(),
        sport: sp.name, sports: [sp.name], family: sp.family, city: d.city, dept: dept,
        rating: avg, reviews: mine.length, price: settings.price || 35,
        tags: ['Nouveau coach', (a.card && a.card.diploma || '').split(' (')[0]].filter(Boolean).slice(0, 2),
        badge: 'new', visual: ['plum', 'teal', 'esp', 'black'][a.coachId.length % 4], icon: (D.FAMILIES[sp.family] || {}).icon || 'i-target',
        years: years, students: Object.keys(studs).length,
        formats: settings.formats && settings.formats.length ? settings.formats : ['Salle'],
        levels: ['Débutant', 'Intermédiaire'],
        diplomas: [((a.card && a.card.diploma) || 'Diplôme d\'encadrement') + ' · ' + sp.name, (a.activity && a.activity.years) ? a.activity.years + ' d\'expérience' : 'Carte professionnelle vérifiée'],
        bio: (ann[a.coachId] && ann[a.coachId].bio) || (first + ' est coach de ' + sp.name.toLowerCase() + '. Profil vérifié par Sport2Share : identité et carte professionnelle contrôlées.'),
        account: true
      });
    });
    return list;
  }

  /* ---------- données de départ (comptes de démo reliés entre eux) ---------- */
  function seed(D) {
    if (read(K.version, 0) >= VERSION || !D) return;
    // anciennes données de la démo (avant les comptes reliés) : on garde ce qui est encore utile
    var oldUser = read('s2s-user', null);
    var oldPro = read('s2s-pro', null);
    var all = accounts();
    var demoStudent = {
      id: 'camille-roche', name: 'Camille', last: 'Roche', role: 'eleve', demo: true, email: 'eleve@sport2share.fr', pass: hashPass(DEMO_PASS),
      identity: { status: 'valid', type: 'Carte nationale d\'identité', file: 'cni-camille-roche.jpg', sent: '2026-09-02T10:00:00.000Z' }, createdAt: '2026-09-02T10:00:00.000Z'
    };
    var demoCoach = {
      id: 'ines-morel', coachId: 'ines-morel', name: 'Inès', last: 'Morel', role: 'coach', demo: true, email: 'coach@sport2share.fr', pass: hashPass(DEMO_PASS), phone: '06 41 22 87 15',
      identity: { status: 'valid', type: 'Carte nationale d\'identité', file: 'cni-ines-morel.jpg', sent: '2026-01-12T10:00:00.000Z' },
      card: { number: 'CP 069 4821 07', end: '2029-03-31', diploma: 'Diplôme d\'État (DE)', sport: 'Tennis', file: 'carte-pro-ines-morel.jpg', status: 'valid', sent: '2026-01-12T10:00:00.000Z' },
      createdAt: '2026-01-12T10:00:00.000Z'
    };
    all[demoStudent.id] = Object.assign({}, all[demoStudent.id] || {}, demoStudent);
    all[demoCoach.id] = Object.assign({}, all[demoCoach.id] || {}, demoCoach);
    write(K.accounts, all);

    var ines = D.COACHS.filter(function (c) { return c.id === 'ines-morel'; })[0];
    var settings = (oldPro && oldPro.coachId === 'ines-morel') ? oldPro : pro('ines-morel') || { price: ines.price, formats: ines.formats.slice(), avail: ['0-s', '1-m', '1-s', '2-s', '3-s', '4-m', '4-s', '5-m', '5-a'] };
    savePro('ines-morel', settings);

    // agenda d'Inès (ses élèves de démo, dont Camille) + séances de Camille avec d'autres coachs
    var day0 = new Date(); day0.setHours(0, 0, 0, 0);
    var at = function (d, h, m) { var x = new Date(day0); x.setDate(x.getDate() + d); x.setHours(h, m || 0, 0, 0); return x.toISOString(); };
    var plan = [[-6, 10, 0, 'done'], [-5, 18, 1, 'done'], [-4, 9, 2, 'done'], [-3, 17, 3, 'done'], [-2, 12, 4, 'cancelled'], [-1, 18, 5, 'done'],
      [0, 9, 6, 'confirmed'], [0, 12, 1, 'confirmed'], [1, 18, 0, 'confirmed'], [1, 17, 7, 'pending'], [2, 19, 2, 'confirmed'],
      [2, 10, 4, 'pending'], [3, 18, 3, 'confirmed'], [4, 9, 5, 'confirmed'], [5, 11, 6, 'pending'], [6, 17, 0, 'confirmed']];
    var list = plan.map(function (p, i) {
      var s = D.STUDENTS[p[2] % D.STUDENTS.length];
      return { id: 'seed-ines-' + i, coach: 'ines-morel', student: s.id, studentName: s.first + ' ' + s.last, when: at(p[0], p[1]), format: settings.formats[i % settings.formats.length], place: null, price: settings.price || ines.price, formule: null, status: p[3], createdAt: at(p[0] - 3, 9) };
    });
    var other = function (id, d, h, m, status) {
      var c = D.COACHS.filter(function (x) { return x.id === id; })[0];
      return c ? { id: 'seed-cam-' + id + '-' + d, coach: id, student: 'camille-roche', studentName: 'Camille Roche', when: at(d, h, m), format: c.formats[0], place: null, price: c.price, formule: null, status: status, createdAt: at(d - 4, 10) } : null;
    };
    [other('malik-diallo', -5, 18, 0, 'done'), other('malik-diallo', 4, 9, 30, 'confirmed'), other('lea-fontaine', 7, 17, 30, 'confirmed')].forEach(function (b) { if (b) list.push(b); });
    write(K.bookings, list);

    // conversations de démo
    var ago = function (min) { return new Date(Date.now() - min * 6e4).toISOString(); };
    var th = {};
    th['ines-morel__camille-roche'] = { coach: 'ines-morel', student: 'camille-roche', unread: { coach: 0, eleve: 0 }, msgs: [
      { from: 'coach', text: 'Salut Camille ! Super séance la semaine dernière. On continue sur le service ?', t: ago(2900) },
      { from: 'eleve', text: 'Oui ! J\'ai fait les exercices que tu m\'as envoyés.', t: ago(2800) },
      { from: 'eleve', text: 'Est-ce qu\'on peut aussi travailler le revers à la prochaine séance ?', t: ago(1500) },
      { from: 'coach', text: 'Bien sûr ! Pense à prendre une raquette de rechange.', t: ago(1460) }
    ] };
    th['ines-morel__nathan-blanc'] = { coach: 'ines-morel', student: 'nathan-blanc', unread: { coach: 1, eleve: 0 }, msgs: [
      { from: 'eleve', text: 'Coach, est-ce qu\'on peut décaler jeudi à 18h30 ?', t: ago(40) }
    ] };
    th['malik-diallo__camille-roche'] = { coach: 'malik-diallo', student: 'camille-roche', unread: { coach: 0, eleve: 1 }, msgs: [
      { from: 'coach', text: 'Bravo pour ta séance, Camille ! Je t\'ai préparé un programme pour la semaine.', t: ago(95) }
    ] };
    write(K.threads, th);
    write(K.reviews, []);
    write(K.notifs, []);

    ['s2s-user', 's2s-pro', 's2s-pro-bookings', 's2s-chats-eleve', 's2s-chats-coach', 's2s-history', 's2s-bookings', 's2s-booking', 's2s-reviews', 's2s-sess-changes'].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) { /* rien */ }
    });
    write(K.version, VERSION);
    // la personne était connectée avec un compte de démo : elle le reste
    if (oldUser && oldUser.demo) login(oldUser.role === 'coach' ? 'ines-morel' : 'camille-roche');
  }

  window.S2SDB = {
    DEMO_PASS: DEMO_PASS,
    hashPass: hashPass,
    slug: slug,
    // session
    sessionId: sessionId, me: me, saveMe: saveMe, login: login, logout: logout,
    // comptes
    accounts: accounts, account: account, accountByCoach: accountByCoach, byEmail: byEmail, createAccount: createAccount, checkLogin: checkLogin, saveAccount: saveAccount,
    // réservations
    bookings: bookings, addBooking: addBooking, updateBooking: updateBooking,
    // messages
    threads: threads, threadKey: threadKey, sendMessage: sendMessage, openThread: openThread, markRead: markRead,
    // avis
    reviews: reviews, saveReview: saveReview, removeReview: removeReview,
    // notifications
    notify: notify, notifsFor: notifsFor, markNotifsRead: markNotifsRead, unreadFor: unreadFor,
    // coachs
    pro: pro, savePro: savePro, isPublished: isPublished, publishedCoaches: publishedCoaches,
    seed: seed,
    onChange: function (fn) { listeners.push(fn); }
  };
})();
