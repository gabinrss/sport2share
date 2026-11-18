/* =========================================================
   Sport2Share — animations communes à toutes les pages
   (vanilla JS, sans dépendance)
   - rideau de transition entre les pages, loader de l'accueil
   - curseur custom, boutons magnétiques, cartes en 3D
   - lettres qui montent au scroll, texte "scrubbé", compteurs
   - bandes défilantes pilotées par la vitesse de scroll
   - accueil : bascule Élève/Coach, scroll horizontal, aperçu disciplines,
     mur des sports, filtres coachs (FLIP)
   - bloc Connexion / Inscription (accueil + page connexion)
   Les pages qui génèrent du contenu (pages.js) appellent window.S2S.prepare().
   ========================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE_IO = 'cubic-bezier(.76,0,.24,1)';
  const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';

  let vw = window.innerWidth;
  let vh = window.innerHeight;
  const mouse = { x: vw / 2, y: vh / 2 };

  if ('scrollRestoration' in history && !location.hash) {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }

  /* ---------------------------------------------------------
     1. Découpage du texte
     --------------------------------------------------------- */
  function splitChars(el, start = 0) {
    const text = el.textContent.replace(/[ \t\n\r]+/g, ' ').trim();
    el.textContent = '';
    let i = start;
    text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span');
      w.className = 'word';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'char';
        c.textContent = ch;
        c.style.setProperty('--ci', i++);
        w.appendChild(c);
      }
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return i;
  }

  // grands titres très serrés : une ligne avec une majuscule accentuée (É, Ê, À…) descend un peu,
  // sinon l'accent monte dans les lettres de la ligne du dessus
  const ACCENT = /[ÀÂÄÉÈÊËÎÏÔÖÙÛÜŸàâäéèêëîïôöùûüÿ]/;
  function markAccents(lines) {
    lines.forEach((l, k) => l.classList.toggle('has-acc', k > 0 && ACCENT.test(l.textContent)));
  }
  $$('.display').forEach(h => markAccents($$('.line', h)));

  function splitBlock(block) {
    if (block.dataset.splitDone) return;
    block.dataset.splitDone = '1';
    let lines = block.matches('.line') ? [block] : $$('.line', block);
    if (!lines.length) lines = [block];
    if (!block.matches('.line')) markAccents(lines);
    // texte lisible pour les lecteurs d'écran
    const heading = block.closest('h1, h2, h3, p') || block;
    if (!heading.hasAttribute('aria-label') && !heading.dataset.srDone) {
      heading.dataset.srDone = '1';
      const all = $$('.line', heading);
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = (all.length ? all : [heading]).map(l => l.textContent.trim()).join(' ');
      heading.prepend(sr);
      lines.forEach(l => { if (l !== heading) l.setAttribute('aria-hidden', 'true'); });
    }
    let i = 0;
    lines.forEach(l => { i = splitChars(l, i); });
  }

  // texte qui roule lettre par lettre au survol
  function rollify(el) {
    if (el.dataset.rollDone) return;
    el.dataset.rollDone = '1';
    const host = el.closest('a, button') || el;
    if (!host.hasAttribute('aria-label')) host.setAttribute('aria-label', host.textContent.replace(/\s+/g, ' ').trim());
    const text = el.textContent.trim();
    el.textContent = '';
    el.classList.add('roll');
    if (el !== host) el.setAttribute('aria-hidden', 'true');
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'rc';
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.setProperty('--ri', i);
      el.appendChild(s);
    });
  }

  // remplace les lignes d'un grand titre avec l'animation sortie / entrée
  function swapLines(block, lines) {
    if (!block) return;
    block.classList.add('is-out');
    setTimeout(() => {
      $$('.line', block).forEach(l => l.remove());
      const sr = $('.sr-only', block);
      if (sr) sr.textContent = lines.join(' ');
      let n = 0;
      lines.forEach(t => {
        const l = document.createElement('span');
        l.className = 'line';
        l.setAttribute('aria-hidden', 'true');
        l.textContent = t;
        block.appendChild(l);
        n = splitChars(l, n);
      });
      markAccents($$('.line', block));
      block.classList.remove('is-in', 'is-out');
      void block.offsetWidth;
      block.classList.add('is-in');
    }, reduced ? 0 : 520);
  }

  // paragraphes dont les mots s'allument au scroll
  const scrubs = $$('[data-scrub]').map(el => {
    const words = [];
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType === 3) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const s = document.createElement('span');
          s.className = 'sw';
          s.textContent = part;
          words.push(s);
          frag.appendChild(s);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1) {
        node.classList.add('sw');
        words.push(node);
      }
    });
    return { el, words, top: 0, h: 0, n: -1 };
  });

  /* ---------------------------------------------------------
     2. Apparitions au scroll + compteurs
     --------------------------------------------------------- */
  function countUp(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    if (reduced) { el.textContent = fmt.format(target); return; }
    const dur = 2200;
    const t0 = performance.now();
    const tick = now => {
      const p = clamp((now - t0) / dur);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmt.format(target * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // filet de sécurité si l'onglet est en arrière-plan (les animations y sont suspendues)
    setTimeout(() => { el.textContent = fmt.format(target); }, dur + 150);
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-in');
      io.unobserve(el);
      // seuls les compteurs à l'intérieur de l'élément apparu sont animés
      $$('[data-count]', el).forEach(countUp);
      if (el.hasAttribute('data-stagger')) {
        // fin de la cascade : on rend la main aux effets de survol
        setTimeout(() => el.removeAttribute('data-stagger'), 1200 + el.children.length * 45);
      }
      if (el.hasAttribute('data-reveal')) {
        // une fois apparu, l'élément retrouve ses propres transitions de survol
        const delay = parseFloat(getComputedStyle(el).getPropertyValue('--rd')) || 0;
        setTimeout(() => el.removeAttribute('data-reveal'), 1400 + delay * 1000);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  /* ---------------------------------------------------------
     3. Toast
     --------------------------------------------------------- */
  const toastEl = $('[data-toast]');
  const toastText = $('[data-toast-text]');
  let toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastText.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3800);
  }

  /* ---------------------------------------------------------
     4. Transitions entre les pages (rideau prune)
     --------------------------------------------------------- */
  const curtain = $('[data-curtain]');
  let leaving = false;
  function go(href) {
    if (leaving) return;
    leaving = true;
    if (!curtain || reduced) { location.href = href; return; }
    root.classList.add('is-leaving');
    const anim = curtain.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 650, easing: EASE_IO, fill: 'forwards' });
    const leave = () => { location.href = href; };
    anim.finished.then(leave, leave);
    setTimeout(leave, 1000);
  }
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.origin !== location.origin) return;
    const norm = p => p.replace(/\/index\.html$/, '/');
    if (norm(url.pathname) === norm(location.pathname) && url.search === location.search) {
      // même page : simple défilement vers l'ancre
      if (url.hash && url.hash.length > 1) {
        const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (target) { e.preventDefault(); setMenu(false); target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); }
      }
      return;
    }
    if (!/(\.html|\/)$/.test(url.pathname)) return;
    e.preventDefault();
    setMenu(false);
    go(url.href);
  });
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    leaving = false;
    root.classList.remove('is-leaving');
    if (curtain) curtain.getAnimations().forEach(a => a.cancel());
  });

  /* ---------------------------------------------------------
     5. Accueil : bascule Élève / Coach
     (setMode sert aussi aux pages Tarifs et Connexion)
     --------------------------------------------------------- */
  const hero = $('.hero');
  const heroTitle = $('[data-hero-title]');
  const heroB = $('[data-hero-b]');
  const heroC = $('[data-hero-c]');
  const toggles = $$('.toggle-pill');
  const toggleInd = $('[data-toggle-ind]');
  const MODES = {
    eleve: { b: 'ton', c: 'Coach', label: 'Trouve ton coach' },
    coach: { b: 'tes', c: 'Élèves', label: 'Trouve tes élèves' }
  };
  const PLACEHOLDERS = {
    eleve: ['Tennis', 'Boxe', 'Running', 'Padel', 'Natation', 'Escalade', 'Yoga', 'Football'],
    coach: ['Ton sport', 'Coach tennis', 'Coach boxe', 'Coach natation']
  };
  let mode = 'eleve';
  let swapping = false;
  let pendingMode = null;

  function placeIndicator() {
    const a = toggles.find(b => b.classList.contains('is-active'));
    if (!a || !toggleInd) return;
    toggleInd.style.width = `${a.offsetWidth}px`;
    toggleInd.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  function setMode(next) {
    if (next !== 'eleve' && next !== 'coach') return;
    // le choix Élève / Coach du formulaire d'inscription suit
    $$('[data-role-input]').forEach(r => { r.checked = r.value === next; });
    syncProCard(next);
    if (swapping) { pendingMode = next; return; }
    if (next === mode) return;
    mode = next;
    resetTypewriter();
    toggles.forEach(b => {
      const on = b.dataset.mode === next;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    placeIndicator();
    if (hero) hero.dataset.mode = next;
    document.dispatchEvent(new CustomEvent('s2s:mode', { detail: next }));
    const swaps = $$('[data-swap]');

    if (!heroC || reduced) {
      swaps.forEach(el => { const t = el.dataset[next]; if (t) el.textContent = t; });
      if (heroC) { heroC.textContent = MODES[next].c; splitChars(heroC); heroB.textContent = MODES[next].b; }
      return;
    }

    swapping = true;
    const m = MODES[next];
    heroTitle.setAttribute('aria-label', m.label);
    heroC.classList.add('is-out');
    heroB.animate([{ transform: 'translateY(-.1em)', opacity: 1 }, { transform: 'translateY(-130%)', opacity: 0 }], { duration: 380, easing: EASE_IO, fill: 'forwards' });
    swaps.forEach(el => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 300, easing: EASE_IO, fill: 'forwards' }));

    setTimeout(() => {
      heroC.classList.remove('is-in', 'is-out');
      heroC.textContent = m.c;
      splitChars(heroC);
      heroB.textContent = m.b;
      swaps.forEach(el => { const t = el.dataset[next]; if (t) el.textContent = t; });
      void heroC.offsetWidth; // force le point de départ (lettres en bas)
      heroC.classList.add('is-in');
      heroB.animate([{ transform: 'translateY(130%)', opacity: 0 }, { transform: 'translateY(-.1em)', opacity: 1 }], { duration: 850, easing: EASE_OUT, fill: 'forwards' });
      swaps.forEach(el => el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: EASE_OUT, fill: 'forwards' }));
      setTimeout(() => {
        swapping = false;
        const p = pendingMode;
        pendingMode = null;
        if (p && p !== mode) setMode(p);
      }, 650);
    }, 560);
  }
  toggles.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // placeholder de recherche qui s'écrit tout seul
  const searchInput = $('[data-search-input]');
  let tw = { wi: 0, ci: 0, del: false };
  function resetTypewriter() { tw = { wi: 0, ci: 0, del: false }; }
  function startTypewriter() {
    if (!searchInput || reduced) return;
    searchInput.placeholder = '';
    const tick = () => {
      const words = PLACEHOLDERS[mode];
      const w = words[tw.wi % words.length];
      if (document.activeElement === searchInput || searchInput.value) {
        searchInput.placeholder = w;
        setTimeout(tick, 500);
        return;
      }
      if (!tw.del) {
        tw.ci++;
        if (tw.ci >= w.length) { tw.ci = w.length; tw.del = true; searchInput.placeholder = w; setTimeout(tick, 1500); return; }
      } else {
        tw.ci--;
        if (tw.ci <= 0) { tw.ci = 0; tw.del = false; tw.wi++; searchInput.placeholder = ''; setTimeout(tick, 260); return; }
      }
      searchInput.placeholder = w.slice(0, tw.ci);
      setTimeout(tick, tw.del ? 45 : 95);
    };
    tick();
  }

  // sport tapé -> univers sportif
  const FAMILY_LABELS = {
    raquettes: 'raquettes', combat: 'sports de combat', endurance: 'endurance', fitness: 'fitness',
    pleinair: 'plein air', collectifs: 'sports collectifs', bienetre: 'bien-être'
  };
  const normalize = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const SPORT_LIST = (window.S2S_DATA ? window.S2S_DATA.SPORTS.map(s => ({ name: s.name, family: s.family }))
    : $$('.sp[data-family]').map(b => ({ name: b.textContent, family: b.dataset.family })))
    .map(s => ({ name: normalize(s.name), family: s.family }));
  const EXTRA = { boxe: 'combat', muscu: 'fitness', foot: 'collectifs', velo: 'endurance', course: 'endurance', piscine: 'endurance', raquette: 'raquettes', meditation: 'bienetre' };
  const guessCat = q => {
    const s = normalize(q);
    if (!s) return 'all';
    const hit = SPORT_LIST.find(sp => sp.name === s) || SPORT_LIST.find(sp => sp.name.includes(s) || s.includes(sp.name));
    if (hit) return hit.family;
    const key = Object.keys(EXTRA).find(k => s.includes(k));
    if (key) return EXTRA[key];
    const fam = Object.keys(FAMILY_LABELS).find(f => s.includes(f) || normalize(FAMILY_LABELS[f]).includes(s));
    return fam || 'all';
  };

  const searchForm = $('[data-search]');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const words = PLACEHOLDERS[mode];
      const q = searchInput.value.trim() || words[tw.wi % words.length];
      if (mode === 'coach') {
        openAuth('signup', { role: 'coach' });
        toast(`Bienvenue coach ! Crée ton compte pour proposer « ${q} ».`);
        return;
      }
      go(`coachs.html?q=${encodeURIComponent(q)}`);
    });
  }

  // CTA final de l'accueil : l'e-mail pré-remplit l'inscription du hero
  const signup = $('[data-signup]');
  if (signup) {
    signup.addEventListener('submit', e => {
      e.preventDefault();
      const email = signup.querySelector('input').value.trim();
      const target = $('#signup-email');
      if (target) target.value = email;
      if (auth) openAuth('signup', { focus: '#signup-name' });
      else go(`connexion.html?email=${encodeURIComponent(email)}#inscription`);
      signup.reset();
    });
  }

  /* ---------------------------------------------------------
     6. Accueil : filtres coachs (animation FLIP) + mur des sports
     --------------------------------------------------------- */
  const coachGrid = $('[data-coach-grid]');
  const coachCards = coachGrid ? $$('.coach', coachGrid) : [];
  const filterBtns = $$('[data-filter-btn]');
  const coachCount = $('[data-coach-count]');

  function applyFilter(cat) {
    if (!coachGrid) return;
    filterBtns.forEach(b => {
      const on = b.dataset.filterBtn === cat;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
    });
    const first = new Map(coachCards.map(c => [c, c.getBoundingClientRect()]));
    const wasHidden = new Map(coachCards.map(c => [c, c.classList.contains('is-hidden')]));
    let n = 0;
    coachCards.forEach(c => {
      const show = cat === 'all' || c.dataset.cat === cat;
      c.classList.toggle('is-hidden', !show);
      if (show) n++;
    });
    if (coachCount) coachCount.textContent = n;
    if (reduced) return;
    coachCards.forEach((c, i) => {
      if (c.classList.contains('is-hidden')) return;
      if (wasHidden.get(c)) {
        c.animate([{ opacity: 0, transform: 'translateY(40px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 750, delay: 60 + i * 30, easing: EASE_OUT, fill: 'backwards' });
      } else {
        const f = first.get(c);
        const l = c.getBoundingClientRect();
        const dx = f.left - l.left;
        const dy = f.top - l.top;
        if (dx || dy) c.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 750, easing: EASE_OUT });
      }
    });
  }
  if (coachGrid) {
    filterBtns.forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filterBtn)));
    $$('a[data-filter]').forEach(a => a.addEventListener('click', () => applyFilter(a.dataset.filter)));
    $$('.sp[data-family]').forEach(b => {
      b.addEventListener('click', () => {
        b.classList.remove('is-picked');
        void b.offsetWidth;
        b.classList.add('is-picked');
        const fam = b.dataset.family;
        applyFilter(fam);
        if (searchInput) searchInput.value = b.textContent.trim();
        toast(`${b.textContent.trim()} : voici nos coachs ${FAMILY_LABELS[fam]}.`);
        setTimeout(() => $('#coachs').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 250);
      });
    });
  }

  /* ---------------------------------------------------------
     7. FAQ (accordéons)
     --------------------------------------------------------- */
  $$('.faq-item').forEach(item => {
    const q = $('.faq-q', item);
    if (!q) return;
    q.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      $$('.faq-item.is-open', item.parentElement).forEach(o => {
        if (o === item) return;
        o.classList.remove('is-open');
        $('.faq-q', o).setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('is-open', open);
      q.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------------------------------------------------------
     8. Menu mobile
     --------------------------------------------------------- */
  const nav = $('[data-nav]');
  const burger = $('[data-burger]');
  const menu = $('[data-menu]');
  let navHidden = false;
  function setMenu(open) {
    if (!burger) return;
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    if (open && nav) { navHidden = false; nav.classList.remove('is-hidden'); }
  }
  if (burger) burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  if (menu) $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------------------------------------------------------
     9. Connexion / Inscription (accueil + page connexion)
     Démo : rien n'est envoyé, on simule la réponse du serveur.
     --------------------------------------------------------- */
  const auth = $('[data-auth]');
  const authTabs = auth ? $$('[data-auth-tab]', auth) : [];
  const authInd = auth ? $('[data-auth-ind]', auth) : null;
  const authWrap = auth ? $('[data-auth-panels]', auth) : null;
  const authPanels = auth ? $$('[data-auth-panel]', auth) : [];
  let authCurrent = 'login';

  function refitAuth() {
    if (!auth) return;
    const tab = authTabs.find(t => t.dataset.authTab === authCurrent);
    if (tab && authInd) {
      authInd.style.width = `${tab.offsetWidth}px`;
      authInd.style.transform = `translateX(${tab.offsetLeft}px)`;
    }
    const panel = authPanels.find(p => p.dataset.authPanel === authCurrent);
    if (panel && authWrap) authWrap.style.height = `${panel.offsetHeight}px`;
  }

  function enterPanel(p) {
    if (reduced || !p) return;
    p.classList.remove('is-entering');
    void p.offsetWidth;
    p.classList.add('is-entering');
    clearTimeout(p._enterT);
    p._enterT = setTimeout(() => p.classList.remove('is-entering'), 1400);
  }

  function setAuth(name) {
    if (!auth) return;
    const changed = name !== authCurrent;
    authCurrent = name;
    authTabs.forEach(t => {
      const on = t.dataset.authTab === name;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    authPanels.forEach(p => {
      const on = p.dataset.authPanel === name;
      p.classList.toggle('is-active', on);
      p.inert = !on;
      if (on && changed) enterPanel(p);
    });
    refitAuth();
    if (changed) document.dispatchEvent(new CustomEvent('s2s:auth', { detail: name }));
  }

  function openAuth(name, opts = {}) {
    if (!auth) return;
    setMenu(false);
    if (opts.role) setMode(opts.role);
    setAuth(name);
    auth.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    auth.classList.remove('is-flash');
    void auth.offsetWidth;
    auth.classList.add('is-flash');
    const sel = opts.focus || (name === 'login' ? '#login-email' : '#signup-name');
    setTimeout(() => { const f = $(sel); if (f) f.focus({ preventScroll: true }); }, reduced ? 0 : 750);
  }

  // comptes : base partagée (db.js). Comptes de démo : eleve@ / coach@sport2share.fr, mot de passe sport2026
  const DB = window.S2SDB;
  const DEMO_PASSWORD = DB ? DB.DEMO_PASS : 'sport2026';

  // pièce d'identité : le prénom et le nom doivent être ceux du compte (sans tenir compte des accents ni des tirets)
  const plain = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  function idMatches(form) {
    const el = form.elements;
    return !!(el.idFirst && el.firstname) && plain(el.idFirst.value) === plain(el.firstname.value) && plain(el.idLast.value) === plain(el.lastname.value);
  }
  function showIdMatch(form) {
    const out = $('[data-id-match]', form);
    if (!out) return;
    const el = form.elements;
    const typed = el.idFirst.value.trim() || el.idLast.value.trim();
    if (!typed) { out.textContent = ''; out.className = 'id-match'; return; }
    const ok = idMatches(form);
    out.className = `id-match ${ok ? 'is-ok' : 'is-bad'}`;
    out.textContent = ok ? 'Prénom et nom identiques à ton compte' : `Différent du compte (${el.firstname.value.trim() || '…'} ${el.lastname.value.trim() || '…'})`;
  }

  // bloc "carte professionnelle" : affiché et obligatoire seulement pour un compte coach
  function syncProCard(m) {
    // coach : le formulaire classique laisse place au lien vers la page d'inscription dédiée
    $$('[data-auth-panel="signup"]').forEach(f => f.classList.toggle('is-coach', m === 'coach'));
    $$('[data-pro-card]').forEach(box => {
      const show = m === 'coach';
      const changed = box.hidden === show;
      box.hidden = !show;
      $$('[data-pro-field]', box).forEach(f => { f.disabled = !show; });
      if (show && changed && !reduced) {
        box.classList.remove('is-entering');
        void box.offsetWidth;
        box.classList.add('is-entering');
      }
    });
    refitAuth();
  }

  // champ fichier : affiche le nom du fichier choisi
  $$('[data-upload]').forEach(inp => {
    const box = inp.closest('.upload');
    const nameEl = box && $('[data-upload-name]', box);
    if (!nameEl) return;
    const empty = nameEl.textContent;
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      nameEl.textContent = f ? f.name : empty;
      box.classList.toggle('is-filled', !!f);
      if (f) box.classList.remove('is-error');
    });
  });

  if (auth) {
    authTabs.forEach(t => {
      t.addEventListener('click', () => setAuth(t.dataset.authTab));
      t.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = authCurrent === 'login' ? 'signup' : 'login';
        setAuth(next);
        authTabs.find(x => x.dataset.authTab === next).focus();
      });
    });

    // liens "Connexion", "Rejoindre", "Devenir coach"… restent sur la page
    $$('[data-auth-open]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      openAuth(a.dataset.authOpen, { role: a.dataset.role });
    }));

    // rôle choisi à l'inscription -> le reste de la page suit
    $$('[data-role-input]', auth).forEach(r => r.addEventListener('change', () => { if (r.checked) setMode(r.value); }));

    // afficher / masquer le mot de passe
    $$('[data-eye]', auth).forEach(b => b.addEventListener('click', () => {
      const input = $('input', b.parentElement);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(show));
      b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      $('use', b).setAttribute('href', show ? '#i-eye-off' : '#i-eye');
      b.classList.remove('is-blink');
      void b.offsetWidth;
      b.classList.add('is-blink');
    }));

    // force du mot de passe
    const pass = $('#signup-pass');
    const strength = $('[data-strength]');
    const strengthLabel = $('[data-strength-label]');
    const rateStrength = () => {
      if (!pass || !strength) return;
      const v = pass.value;
      let s = 0;
      if (v.length >= 8) {
        s = 1;
        if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
        if (/\d/.test(v)) s++;
        if (/[^A-Za-z0-9]/.test(v)) s++;
      }
      strength.dataset.score = String(s);
      const left = 8 - v.length;
      strengthLabel.textContent = !v ? '8 caractères minimum'
        : left > 0 ? `Encore ${left} caractère${left > 1 ? 's' : ''}`
        : ['', 'Faible', 'Moyen', 'Bon', 'Solide'][s];
    };
    if (pass) pass.addEventListener('input', rateStrength);

    // erreurs : secousse du champ, retirée dès qu'on corrige
    const BOX = '.field, .check, .select, .upload';
    const flagErrors = inputs => inputs.forEach(i => {
      const f = i.closest(BOX);
      if (!f) return;
      f.classList.remove('is-error');
      void f.offsetWidth;
      f.classList.add('is-error');
    });
    $$('input, select', auth).forEach(i => ['input', 'change'].forEach(ev => i.addEventListener(ev, () => {
      if (i.hasAttribute('data-future')) i.setCustomValidity('');
      const f = i.closest(BOX);
      if (f && i.checkValidity()) f.classList.remove('is-error');
    })));
    syncProCard(mode);
    // concordance pièce d'identité / compte affichée en direct
    $$('[data-id-field], [data-id-account]', auth).forEach(i => i.addEventListener('input', () => {
      showIdMatch(i.form);
      const m = $('[data-auth-msg]', i.form);
      if (m && idMatches(i.form) && /pièce d'identité ne correspond/.test(m.textContent)) m.textContent = '';
    }));

    // bouton : chargement -> validé
    const fakeSubmit = (btn, done) => {
      btn.classList.add('is-loading');
      btn.disabled = true;
      setTimeout(() => {
        btn.classList.remove('is-loading');
        btn.classList.add('is-done');
        done();
        setTimeout(() => { btn.classList.remove('is-done'); btn.disabled = false; }, 2000);
      }, 1200);
    };

    authPanels.forEach(form => form.addEventListener('submit', e => {
      e.preventDefault();
      const msg = $('[data-auth-msg]', form);
      const isLogin = form.dataset.authPanel === 'login';
      if (!isLogin && mode === 'coach') { go('inscription-coach.html'); return; }
      // pièce d'identité et carte pro : facultatives, mais complètes dès qu'on commence à les remplir
      const started = sel => {
        const fields = $$(sel, form).filter(f => !f.disabled);
        const any = fields.some(f => (f.type === 'checkbox' ? f.checked : f.type === 'file' ? f.files.length > 0 : f.value.trim() !== ''));
        fields.forEach(f => { f.required = any; });
        return any;
      };
      const hasId = !isLogin && started('[data-id-field]');
      const hasCard = !isLogin && mode === 'coach' && started('[data-pro-field]');
      // la carte professionnelle doit être encore valide
      $$('[data-future]', form).forEach(f => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        f.setCustomValidity(f.value && new Date(f.value) <= today ? 'Carte expirée' : '');
      });
      const invalid = $$('input, select', form).filter(i => !i.disabled && !i.checkValidity());
      if (invalid.length) {
        flagErrors(invalid);
        const onlyCgu = invalid.length === 1 && invalid[0].name === 'cgu';
        const cardIssue = invalid.some(i => i.closest('[data-pro-card]'));
        const idIssue = invalid.some(i => i.closest('[data-id-block]'));
        const expired = invalid.some(i => i.hasAttribute('data-future') && i.value);
        msg.textContent = isLogin
          ? 'Vérifie ton e-mail et ton mot de passe (6 caractères minimum).'
          : expired ? 'Ta carte professionnelle est expirée : renouvelle-la ou laisse ce bloc vide pour l\'ajouter plus tard.'
          : idIssue ? 'Complète ta pièce d\'identité (type, fichier, prénom et nom) ou laisse ce bloc vide pour l\'ajouter plus tard.'
          : cardIssue ? 'Complète ta carte professionnelle (numéro, validité, diplôme, justificatif, attestation) ou laisse ce bloc vide pour plus tard.'
          : onlyCgu ? 'Accepte les CGU pour créer ton compte.' : 'Complète les champs signalés pour continuer.';
        invalid[0].focus();
        return;
      }
      // le prénom et le nom de la pièce doivent être ceux du compte
      if (hasId && !idMatches(form)) {
        flagErrors([form.elements.idFirst, form.elements.idLast]);
        msg.textContent = 'Le prénom ou le nom de ta pièce d\'identité ne correspond pas à celui du compte. Ils doivent être identiques (accents et majuscules ne comptent pas).';
        form.elements.idFirst.focus();
        return;
      }
      // connexion : le compte doit exister et le mot de passe correspondre
      let account = null;
      const emailIn = $('[name="email"]', form);
      const passIn = $('[name="password"]', form);
      if (isLogin) {
        const r = DB.checkLogin(emailIn.value, passIn.value);
        if (r.error === 'unknown') {
          flagErrors([emailIn]);
          msg.textContent = 'Aucun compte avec cet e-mail. Crée ton compte dans l\'onglet Inscription, ou utilise un compte de démo.';
          return;
        }
        if (r.error === 'password') {
          flagErrors([passIn]);
          msg.textContent = r.account.demo ? `Mot de passe incorrect. Pour les comptes de démo, c'est « ${DEMO_PASSWORD} ».` : 'Mot de passe incorrect.';
          return;
        }
        account = r.account;
      } else if (DB.byEmail(emailIn.value)) {
        flagErrors([emailIn]);
        msg.textContent = 'Un compte existe déjà avec cet e-mail : connecte-toi depuis l\'onglet Connexion.';
        return;
      }
      msg.textContent = '';
      let role = mode;
      fakeSubmit($('button[type="submit"]', form), () => {
        if (isLogin) {
          role = account.role;
          DB.login(account.id);
          toast(role === 'coach' ? `Bonjour ${account.name} ! Direction ton espace pro…` : `Salut ${account.name} ! On t'emmène découvrir les coachs…`);
        } else {
          const name = $('[name="firstname"]', form).value.trim();
          const last = $('[name="lastname"]', form).value.trim();
          const data = { name, last, role: mode, email: $('[name="email"]', form).value.trim() };
          const photo = $('[data-photo-input]', form);
          if (photo && photo._photo) data.photo = photo._photo;
          const idFile = $('[name="idFile"]', form).files[0];
          // démo : la lecture de la pièce est simulée, la concordance prénom / nom vient d'être vérifiée
          data.identity = hasId
            ? { status: 'valid', type: $('[name="idType"]', form).value, file: idFile ? idFile.name : '', sent: new Date().toISOString() }
            : { status: 'missing' };
          if (mode === 'coach') {
            const file = $('[name="cardFile"]', form).files[0];
            data.card = hasCard ? {
              number: $('[name="card"]', form).value.trim().toUpperCase(),
              end: $('[name="cardEnd"]', form).value,
              diploma: $('[name="cardDiploma"]', form).value,
              file: file ? file.name : '',
              status: 'verification',
              sent: new Date().toISOString()
            } : null;
          }
          // nouveau compte dans la base partagée, connecté dans cet onglet
          const acc = DB.createAccount(data, passIn.value);
          DB.login(acc.id);
          toast(mode === 'coach'
            ? (hasId && hasCard ? `Bienvenue ${name} ! Ta carte professionnelle part en vérification.` : `Bienvenue ${name} ! Ton annonce sera publiée dès que ta pièce d'identité et ta carte pro seront ajoutées.`)
            : (hasId ? `Bienvenue ${name} ! Identité vérifiée : tu peux réserver.` : `Bienvenue ${name} ! Ajoute ta pièce d'identité pour pouvoir réserver.`));
        }
        setTimeout(() => go(role === 'coach' ? 'pro.html' : 'decouvrir.html'), 1300);
      });
    }));

    // boutons "remplir" des comptes de démo
    $$('[data-demo-fill]', auth).forEach(b => b.addEventListener('click', () => {
      setAuth('login');
      $('#login-email').value = b.dataset.demoFill;
      $('#login-pass').value = DEMO_PASSWORD;
      $$('#panel-login .field').forEach(f => f.classList.remove('is-error'));
      $('#panel-login button[type="submit"]').focus();
    }));

    const loginEmail = $('#login-email');
    const loginMsg = $('[data-auth-msg]', $('#panel-login'));
    const needEmail = text => {
      if (loginEmail.value.trim() && loginEmail.checkValidity()) return true;
      flagErrors([loginEmail]);
      loginMsg.textContent = text;
      loginEmail.focus();
      return false;
    };
    const magic = $('[data-magic]', auth);
    if (magic) magic.addEventListener('click', () => {
      if (!needEmail('Indique ton e-mail pour recevoir le lien de connexion.')) return;
      loginMsg.textContent = '';
      fakeSubmit(magic, () => toast(`Lien de connexion envoyé à ${loginEmail.value.trim()} (démo).`));
    });
    const forgot = $('[data-forgot]', auth);
    if (forgot) forgot.addEventListener('click', e => {
      e.preventDefault();
      if (!needEmail('Indique ton e-mail : on t\'envoie un lien pour changer ton mot de passe.')) return;
      loginMsg.textContent = '';
      toast(`Lien de réinitialisation envoyé à ${loginEmail.value.trim()} (démo).`);
    });

    // page connexion : onglet et rôle passés dans l'adresse
    const params = new URLSearchParams(location.search);
    if (location.hash === '#inscription') setAuth('signup');
    if (params.get('role')) setMode(params.get('role'));
    if (params.get('email') && $('#signup-email')) $('#signup-email').value = params.get('email');

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(() => refitAuth());
      authPanels.forEach(p => ro.observe(p));
    }
    refitAuth();
  }

  /* ---------------------------------------------------------
     10. Survols : curseur, magnétisme, 3D, aperçu disciplines
     --------------------------------------------------------- */
  const cursor = $('.cursor');
  const cRing = $('[data-cursor-ring]');
  const cDot = $('[data-cursor-dot]');
  const cLabel = $('[data-cursor-label]');
  const ringPos = { x: mouse.x, y: mouse.y };
  let mouseSeen = false;
  const hoverFx = fine && !reduced;
  // curseur personnalisé retiré (site trop chargé) : le curseur natif reste affiché
  const cursorFx = hoverFx && !!cursor;

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!mouseSeen && cursor) {
      mouseSeen = true;
      ringPos.x = mouse.x;
      ringPos.y = mouse.y;
      cursor.classList.remove('is-gone');
    }
  }, { passive: true });

  if (cursorFx) {
    root.classList.add('has-cursor');
    cursor.classList.add('is-gone');
    document.addEventListener('mouseover', e => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const inter = t.closest('a, button, select, [data-tilt], label, .tape-item, .review, .pillar, .step');
      let lab = t.closest('[data-cursor]');
      if (lab && inter && inter !== lab && lab.contains(inter) && inter.matches('a, button, select')) lab = null;
      cursor.classList.toggle('has-label', !!lab);
      if (lab) cLabel.textContent = lab.dataset.cursor;
      cursor.classList.toggle('is-hover', !lab && !!inter);
      cursor.classList.toggle('is-text', !!t.closest('input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea'));
      const th = t.closest('[data-theme]');
      cursor.classList.toggle('on-light', !!th && th.dataset.theme === 'light');
    });
    root.addEventListener('mouseleave', () => cursor.classList.add('is-gone'));
    root.addEventListener('mouseenter', () => cursor.classList.remove('is-gone'));
    window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
  }

  // branche les effets de survol sur un morceau de page (utilisé aussi par pages.js)
  function bindHover(scope) {
    $$('.btn', scope).forEach(b => {
      if (b.dataset.fillDone) return;
      b.dataset.fillDone = '1';
      const setOrigin = e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', `${e.clientX - r.left}px`);
        b.style.setProperty('--my', `${e.clientY - r.top}px`);
      };
      b.addEventListener('mouseenter', setOrigin);
      b.addEventListener('mouseleave', setOrigin);
    });
    if (!hoverFx) return;
    $$('[data-magnetic]', scope).forEach(el => {
      if (el.dataset.magDone) return;
      el.dataset.magDone = '1';
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
        el.style.transform = `translate(${(x - r.width / 2) * 0.25}px, ${(y - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
    $$('[data-tilt]', scope).forEach(card => {
      if (card.dataset.tiltDone) return;
      card.dataset.tiltDone = '1';
      const inner = $('.coach-inner', card) || $('[data-tilt-inner]', card) || card.firstElementChild;
      if (!inner) return;
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        inner.style.transform = `rotateX(${((0.5 - y) * 12).toFixed(2)}deg) rotateY(${((x - 0.5) * 14).toFixed(2)}deg)`;
        card.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      });
      card.addEventListener('mouseleave', () => { inner.style.transform = ''; });
    });
  }

  // prépare un morceau de page : titres découpés, apparitions, survols
  function prepare(scope = document) {
    $$('[data-split]', scope).forEach(splitBlock);
    $$('[data-roll]', scope).forEach(rollify);
    $$('[data-stagger]', scope).forEach(list => Array.from(list.children).forEach((li, i) => li.style.setProperty('--i', i)));
    $$('[data-reveal], [data-stagger], [data-split]:not([data-hero])', scope).forEach(el => {
      if (!el.classList.contains('is-in')) io.observe(el);
    });
    bindHover(scope);
    queueMeasure();
  }

  // bandes défilantes (avis, sports…), en pause au survol si data-pausable
  const marquees = $$('[data-marquee]').map(el => {
    const track = $('.tape-track', el);
    const items = Array.from(track.children);
    for (let k = 0; k < 3; k++) {
      items.forEach(it => {
        const c = it.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        if (c.matches('a')) c.tabIndex = -1; // copies décoratives : pas dans l'ordre de tabulation
        track.appendChild(c);
      });
    }
    const m = {
      el, track,
      dir: parseFloat(el.dataset.marquee) || -1,
      speed: reduced ? 0 : (parseFloat(el.dataset.speed) || 1),
      x: 0, unit: 0, cur: 1, hover: false, top: 0, bottom: 0
    };
    if (el.hasAttribute('data-pausable')) {
      el.addEventListener('mouseenter', () => { m.hover = true; });
      el.addEventListener('mouseleave', () => { m.hover = false; });
    }
    return m;
  });

  // aperçu des univers sportifs (accueil) : une carte posée à côté de la ligne survolée,
  // qui glisse d'une ligne à l'autre (elle ne suit pas la souris)
  const preview = $('[data-preview]');
  const pvStack = $('[data-preview-stack]');
  const pv = { x: 0, y: 0, r: 0, s: 0.6, active: false, row: null };
  const pvTarget = row => {
    const r = row.getBoundingClientRect();
    return { x: r.left + r.width * 0.7, y: r.top + r.height / 2 };
  };
  const hidePreview = () => {
    pv.active = false;
    pv.row = null;
    preview.classList.remove('is-on');
  };
  if (preview && hoverFx) {
    $$('.disc').forEach((li, i) => {
      const panel = document.createElement('div');
      panel.className = 'pv-panel';
      const tags = (li.dataset.tags || '').split(',').map(t => `<span>${t}</span>`).join('');
      panel.innerHTML =
        `<div class="pv-top"><svg class="pv-icon"><use href="#${li.dataset.icon}"/></svg>` +
        `<span class="pv-from">dès<b>${li.dataset.from}€/h</b></span></div>` +
        `<span class="pv-count">${li.dataset.coaches}</span>` +
        `<span class="pv-label">coachs disponibles</span>` +
        `<div class="pv-tags">${tags}</div>`;
      pvStack.appendChild(panel);
      const a = $('a', li);
      a.addEventListener('mouseenter', () => {
        if (!pv.active) { const t = pvTarget(a); pv.x = t.x; pv.y = t.y; }
        pv.active = true;
        pv.row = a;
        pvStack.style.transform = `translateY(${-i * 100}%)`;
        preview.classList.add('is-on');
      });
      a.addEventListener('mouseleave', hidePreview);
    });
    const list = $('.disc-list');
    if (list) list.addEventListener('mouseleave', hidePreview);
    window.addEventListener('scroll', () => { if (pv.row && !pv.row.matches(':hover')) hidePreview(); }, { passive: true });
  }

  /* ---------------------------------------------------------
     11. Mesures (positions en page, recalculées au resize)
     --------------------------------------------------------- */
  const progressBar = $('[data-progress]');
  const themed = $$('main > [data-theme], footer[data-theme]');
  const navLinks = $$('.nav-links a').filter(a => (a.getAttribute('href') || '').startsWith('#'));
  const linkTargets = navLinks.map(a => $(a.getAttribute('href')));
  const rises = $$('[data-rise]');
  const pxEls = $$('[data-px]');
  const growEl = $('[data-grow]');
  const spinEl = $('[data-spin]');
  const hs = $('[data-hscroll]');
  const hsTrack = $('[data-hs-track]');
  const hsBar = $('[data-hs-bar]');
  const hsCount = $('[data-hs-count]');
  const heroLines = $$('.hero-title > .line');
  const heroCards = $('[data-hero-cards]');
  const spots = $$('[data-spot]');

  const M = { docH: 0, heroH: 0, themed: [], links: [], rises: [], px: [], grow: null, hs: null };
  const pageTop = el => el.getBoundingClientRect().top + window.scrollY;

  // grands titres : chaque ligne tient sur une seule ligne et dans sa colonne (sinon les lignes,
  // très serrées, se chevauchent ou passent sous les cartes voisines) -> la taille s'ajuste
  function fitTitles(force) {
    const W = window.innerWidth;
    $$('.display, .hero-title').forEach(h => {
      const lines = $$('.line', h);
      const byBr = !lines.length && h.querySelector('br');
      if (!lines.length && !byBr) return;
      // déjà ajusté pour cette largeur et ce texte (titres masqués : on réessaiera quand ils s'affichent)
      const key = `${W}|${h.textContent.length}`;
      if (!force && h.dataset.fit === key) return;
      if (!h.getClientRects().length) return;
      h.style.fontSize = '';
      const avail = h.clientWidth;
      if (!avail) return;
      h.dataset.fit = key;
      let need = 0;
      if (lines.length) {
        lines.forEach(l => {
          const prev = [l.style.whiteSpace, l.style.width, l.style.maxWidth];
          l.style.whiteSpace = 'nowrap'; l.style.width = 'max-content'; l.style.maxWidth = 'none';
          const cs = getComputedStyle(l);
          need = Math.max(need, l.scrollWidth + Math.max(0, parseFloat(cs.marginLeft) || 0));
          [l.style.whiteSpace, l.style.width, l.style.maxWidth] = prev;
        });
      } else {
        h.style.whiteSpace = 'nowrap';
        h.style.width = 'max-content';
        need = h.scrollWidth;
        h.style.whiteSpace = ''; h.style.width = '';
      }
      if (need > avail + 2) {
        const fs = parseFloat(getComputedStyle(h).fontSize);
        h.style.fontSize = `${Math.max(26, Math.floor(fs * (avail / need) * 0.97))}px`;
      }
    });
  }

  function measure() {
    fitTitles();
    vw = window.innerWidth;
    vh = window.innerHeight;
    if (hs && hsTrack) {
      const dist = Math.max(0, hsTrack.offsetWidth - vw);
      hs.style.height = `${Math.round(dist + vh + 40)}px`;
      M.hs = { top: pageTop(hs), dist };
    }
    M.docH = document.documentElement.scrollHeight;
    M.heroH = hero ? hero.offsetHeight : 0;
    M.themed = themed.map(s => { const t = pageTop(s); return { top: t, bottom: t + s.offsetHeight, theme: s.dataset.theme }; });
    M.links = linkTargets.map((s, i) => {
      if (!s) return null;
      const t = pageTop(s);
      return { a: navLinks[i], top: t, bottom: t + s.offsetHeight };
    }).filter(Boolean);
    M.rises = rises.map(el => ({ el, top: pageTop(el), last: -1 }));
    M.px = pxEls.map(el => ({ el, f: parseFloat(el.dataset.px) || 0, center: pageTop(el) + el.offsetHeight / 2 }));
    scrubs.forEach(s => { s.top = pageTop(s.el); s.h = s.el.offsetHeight; });
    M.grow = growEl ? { top: pageTop(growEl.closest('section') || growEl) } : null;
    M.spots = spots.map(el => ({ el, top: pageTop(el.parentElement), h: el.parentElement.offsetHeight, sx: vw * 0.7, sy: vh * 0.4 }));
    marquees.forEach(m => {
      m.unit = m.track.scrollWidth / 4;
      m.top = pageTop(m.el);
      m.bottom = m.top + m.el.offsetHeight;
    });
    placeIndicator();
    refitAuth();
  }

  let measureQueued = false;
  function queueMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => { measureQueued = false; measure(); });
  }
  if ('ResizeObserver' in window) new ResizeObserver(queueMeasure).observe(document.body);
  window.addEventListener('resize', () => {
    // sur mobile, ignorer l'apparition/disparition de la barre d'adresse
    if (!fine && window.innerWidth === vw && Math.abs(window.innerHeight - vh) < 160) return;
    queueMeasure();
  });
  window.addEventListener('load', queueMeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitTitles(true); queueMeasure(); });

  // préparation initiale de toute la page
  prepare(document);
  measure();

  /* ---------------------------------------------------------
     12. Boucle d'animation
     --------------------------------------------------------- */
  let lastY = -1;
  let vel = 0;
  let dir = 1;
  let lastT = performance.now();
  let navTheme = '';
  let hmx = 0;
  let hmy = 0;
  let spinRot = 0;
  let hsSkew = 0;

  function updateNav(y, dy) {
    if (!nav) return;
    nav.classList.toggle('is-scrolled', y > 30);
    if (!root.classList.contains('menu-open')) {
      if (y < vh * 0.5) navHidden = false;
      else if (dy > 1) navHidden = true;
      else if (dy < -1) navHidden = false;
      nav.classList.toggle('is-hidden', navHidden);
    }
    const probe = y + 38;
    let theme = 'dark';
    for (const s of M.themed) if (probe >= s.top && probe < s.bottom) theme = s.theme;
    if (root.classList.contains('menu-open')) theme = 'dark';
    if (theme !== navTheme) {
      navTheme = theme;
      nav.classList.toggle('is-light', theme === 'light');
      root.dataset.navTheme = theme;
    }
    const mid = y + vh * 0.4;
    for (const l of M.links) l.a.classList.toggle('is-active', mid >= l.top && mid < l.bottom);
  }

  function updateHero(y) {
    const nx = (mouse.x / vw - 0.5) * 2;
    const ny = (mouse.y / vh - 0.5) * 2;
    hmx = lerp(hmx, fine ? nx : 0, 0.06);
    hmy = lerp(hmy, fine ? ny : 0, 0.06);
    if (reduced) return;
    if (heroLines[0]) heroLines[0].style.transform = `translate3d(${(-hmx * 16 - y * 0.22).toFixed(2)}px, ${(-hmy * 6).toFixed(2)}px, 0)`;
    if (heroLines[1]) heroLines[1].style.transform = `translate3d(${(hmx * 16 + y * 0.14).toFixed(2)}px, ${(hmy * 6).toFixed(2)}px, 0)`;
    // le formulaire ne suit pas la souris (on doit pouvoir cliquer dedans), il remonte juste au scroll
    const cardLift = vw > 1180 ? 0.18 : 0;
    if (heroCards) heroCards.style.transform = cardLift ? `translate3d(0, ${(-y * cardLift).toFixed(2)}px, 0)` : '';
  }

  function frame(now) {
    const dt = Math.min(64, now - lastT) / 16.667;
    lastT = now;
    const y = window.scrollY;
    const dy = lastY < 0 ? 0 : y - lastY;
    lastY = y;
    vel = lerp(vel, dy, 0.15);
    if (dy > 0) dir = 1; else if (dy < 0) dir = -1;

    if (progressBar) progressBar.style.transform = `scaleX(${clamp(y / Math.max(1, M.docH - vh)).toFixed(4)})`;
    updateNav(y, dy);
    if (hero && y < M.heroH + 60) updateHero(y);

    // (halo qui suivait la souris retiré : le fond d'en-tête reste fixe)

    // sections claires qui montent
    for (const r of M.rises) {
      const v = Math.round(clamp((vh - (r.top - y)) / (vh * 0.75)) * 1000) / 1000;
      if (v !== r.last) { r.el.style.setProperty('--rise', v); r.last = v; }
    }

    // décalages horizontaux des grands titres
    if (!reduced) {
      for (const p of M.px) {
        const d = (p.center - y) - vh / 2;
        if (Math.abs(d) < vh * 1.6) p.el.style.transform = `translate3d(${(d * p.f).toFixed(2)}px,0,0)`;
      }
    }

    // textes scrubbés
    for (const s of scrubs) {
      if (!s.words.length) continue;
      const start = s.top - vh * 0.82;
      const end = s.top + s.h - vh * 0.38;
      const n = Math.round(clamp((y - start) / Math.max(1, end - start)) * s.words.length);
      if (n !== s.n) {
        s.words.forEach((w, i) => w.classList.toggle('on', i < n));
        s.n = n;
      }
    }

    // scroll horizontal "méthode"
    if (M.hs && hsTrack) {
      const h = M.hs;
      if (y > h.top - vh && y < h.top + h.dist + vh) {
        const p = clamp((y - h.top) / Math.max(1, h.dist));
        hsSkew = lerp(hsSkew, reduced ? 0 : clamp(vel * -0.12, -5, 5), 0.12);
        hsTrack.style.transform = `translate3d(${(-p * h.dist).toFixed(2)}px,0,0) skewX(${hsSkew.toFixed(2)}deg)`;
        if (hsBar) hsBar.style.transform = `scaleX(${p.toFixed(4)})`;
        if (hsCount) hsCount.textContent = String(clamp(Math.ceil(p * 4), 1, 4)).padStart(2, '0');
      }
    }

    // bandes défilantes (accélèrent avec le scroll, changent de sens)
    for (const m of marquees) {
      if (!m.unit || y + vh < m.top - 100 || y > m.bottom + 100) continue;
      m.cur = lerp(m.cur, m.hover ? 0 : 1, 0.08);
      const step = (0.9 * m.speed + Math.abs(vel) * 0.35 * Math.min(1, m.speed)) * m.cur;
      m.x += step * m.dir * dir * dt;
      if (m.x <= -m.unit) m.x += m.unit;
      else if (m.x > 0) m.x -= m.unit;
      m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`;
    }

    // titre final qui grandit
    if (M.grow && growEl && !reduced) {
      const p = clamp((y + vh - M.grow.top) / (vh * 0.9));
      const s = 0.55 + 0.45 * (1 - Math.pow(1 - p, 3));
      growEl.style.transform = `scale(${s.toFixed(4)})`;
    }

    // badge rotatif
    if (spinEl && !reduced) {
      spinRot += (0.25 + Math.abs(vel) * 0.25) * dir * dt;
      spinEl.style.transform = `rotate(${spinRot.toFixed(2)}deg)`;
    }

    // curseur
    if (cursorFx) {
      ringPos.x = lerp(ringPos.x, mouse.x, 0.2);
      ringPos.y = lerp(ringPos.y, mouse.y, 0.2);
      cRing.style.transform = `translate3d(${ringPos.x.toFixed(2)}px, ${ringPos.y.toFixed(2)}px, 0)`;
      cDot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    }

    // aperçu disciplines
    if (preview && hoverFx && (pv.active || pv.s > 0.61)) {
      const py = pv.y;
      if (pv.row) {
        const t = pvTarget(pv.row);
        pv.x = lerp(pv.x, t.x, 0.18);
        pv.y = lerp(pv.y, t.y, 0.18);
      }
      pv.r = lerp(pv.r, clamp((pv.y - py) * 0.2, -6, 6), 0.12);
      pv.s = lerp(pv.s, pv.active ? 1 : 0.6, 0.12);
      preview.style.transform = `translate3d(${pv.x.toFixed(2)}px, ${pv.y.toFixed(2)}px, 0) translate(-50%, -50%) rotate(${pv.r.toFixed(2)}deg) scale(${pv.s.toFixed(3)})`;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------------------------------------------------------
     13. Entrée de la page : loader (1re visite de l'accueil) ou rideau
     --------------------------------------------------------- */
  let started = false;
  function start() {
    if (started) return;
    started = true;
    root.classList.add('is-ready');
    $$('[data-hero]').forEach(el => el.classList.add('is-in'));
    const firstPanel = $('.auth-panel.is-active');
    if (firstPanel) setTimeout(() => enterPanel(firstPanel), 450);
    startTypewriter();
    queueMeasure();
    document.dispatchEvent(new CustomEvent('s2s:ready'));
  }

  function runLoader() {
    const loader = $('[data-loader]');
    let seen = false;
    try { seen = sessionStorage.getItem('s2s-intro') === '1'; } catch (e) { seen = false; }
    if (!loader || reduced || seen) {
      if (loader) loader.remove();
      // deux images pour que le rideau parte bien de sa position de départ
      // (+ minuterie de secours si la page s'ouvre dans un onglet en arrière-plan)
      requestAnimationFrame(() => requestAnimationFrame(start));
      setTimeout(start, 250);
      return;
    }
    try { sessionStorage.setItem('s2s-intro', '1'); } catch (e) { /* rien */ }
    root.classList.add('has-loader', 'is-loading');
    const countEl = $('[data-loader-count]');
    const bar = $('[data-loader-bar]');
    const t0 = performance.now();
    const minDur = 1600;
    let fontsOk = !document.fonts;
    if (document.fonts) document.fonts.ready.then(() => { fontsOk = true; });
    setTimeout(() => { fontsOk = true; }, 3200);
    let shown = 0;
    const tick = now => {
      const p = clamp((now - t0) / minDur);
      const eased = 1 - Math.pow(1 - p, 3);
      shown = Math.max(shown, fontsOk ? eased : Math.min(0.9, eased));
      countEl.textContent = Math.round(shown * 100);
      bar.style.transform = `scaleX(${shown})`;
      if (p >= 1 && fontsOk) {
        loader.classList.add('is-done');
        root.classList.remove('is-loading');
        setTimeout(start, 380);
        setTimeout(() => loader.remove(), 1500);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  runLoader();

  // petite boîte à outils pour pages.js
  window.S2S = {
    prepare, toast, go, setMode, swapLines, countUp, queueMeasure,
    get mode() { return mode; },
    get user() { return DB ? DB.me() : null; },
    logout() { if (DB) DB.logout(); }
  };
  document.dispatchEvent(new CustomEvent('s2s:api'));
})();
