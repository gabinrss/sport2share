/* =========================================================
   Sport2Share — éléments communs à toutes les pages
   (icônes, rideau de transition, curseur, nav, menu mobile, footer)

   Chaque page l'appelle deux fois :
     <script src="layout.js" data-part="header"></script>  juste après <body>
     <script src="layout.js" data-part="footer"></script>  juste avant les autres scripts
   Pour modifier un lien de la nav ou du footer, c'est ici, une seule fois.
   ========================================================= */
(function () {
  'use strict';
  var me = document.currentScript;
  var part = (me && me.dataset.part) || 'header';
  var page = document.body.dataset.page || '';

  // compte connecté dans cet onglet (base partagée : db.js)
  var user = window.S2SDB ? window.S2SDB.me() : null;
  var unread = user && window.S2SDB ? window.S2SDB.unreadFor(user).total : 0;
  var dot = '<i class="nav-dot" data-nav-dot' + (unread ? '' : ' hidden') + '>' + (unread > 9 ? '9+' : unread) + '</i>';

  /* ---------- Navigation ---------- */
  var NAV = [
    ['coachs', 'coachs.html', 'Coachs'],
    ['sports', 'sports.html', 'Sports'],
    ['devenir-coach', 'devenir-coach.html', 'Devenir coach'],
    ['tarifs', 'tarifs.html', 'Tarifs'],
    ['a-propos', 'a-propos.html', 'Le club']
  ];
  // connecté : les élèves ont leur page "Découvrir", les coachs leur espace pro
  if (user && user.role !== 'coach') NAV.unshift(['decouvrir', 'decouvrir.html', 'Découvrir']);
  if (user && user.role === 'coach') NAV.unshift(['pro', 'pro.html', 'Espace pro']);
  var MENU = [['home', 'index.html', 'Accueil']].concat(NAV, [['contact', 'contact.html', 'Contact']]);

  function current(key) { return key === page ? ' class="is-current" aria-current="page"' : ''; }

  /* ---------- Icônes (line-art) ---------- */
  var S = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  var ICONS = [
    ['i-arrow', '0 0 24 24', '<path d="M4 12h15M13 5l7 7-7 7" ' + S + ' stroke-width="2"/>'],
    ['i-arrow-ne', '0 0 24 24', '<path d="M7 17 17 7M8 7h9v9" ' + S + ' stroke-width="2"/>'],
    ['i-arrow-up', '0 0 24 24', '<path d="M12 20V5M5 12l7-7 7 7" ' + S + ' stroke-width="2"/>'],
    ['i-arrow-left', '0 0 24 24', '<path d="M20 12H5M11 5l-7 7 7 7" ' + S + ' stroke-width="2"/>'],
    ['i-check', '0 0 24 24', '<path d="M5 12.5 10 17.5 19 7" ' + S + ' stroke-width="2.2"/>'],
    ['i-x', '0 0 24 24', '<path d="M6 6l12 12M18 6 6 18" ' + S + ' stroke-width="2"/>'],
    ['i-eye', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></g>'],
    ['i-eye-off', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.6 4.9-1.4"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></g>'],
    ['i-search', '0 0 24 24', '<g ' + S + ' stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></g>'],
    ['i-star', '0 0 24 24', '<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z" fill="currentColor"/>'],
    ['i-spark', '0 0 48 48', '<path d="M24 4v40M4 24h40M9.9 9.9l28.2 28.2M38.1 9.9 9.9 38.1" ' + S + ' stroke-width="5"/>'],
    ['i-mark', '0 0 40 40', '<circle cx="15" cy="20" r="10" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="25" cy="20" r="10" fill="currentColor"/>'],
    ['i-pin', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></g>'],
    ['i-clock', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>'],
    ['i-calendar', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></g>'],
    ['i-chat', '0 0 24 24', '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1Z" ' + S + ' stroke-width="1.8"/>'],
    ['i-send', '0 0 24 24', '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4Z" ' + S + ' stroke-width="1.8"/>'],
    ['i-user', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></g>'],
    ['i-logout', '0 0 24 24', '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H4" ' + S + ' stroke-width="1.8"/>'],
    ['i-shield', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></g>'],
    ['i-trend', '0 0 24 24', '<path d="M3 17l6-6 4 4 8-8M15 7h6v6" ' + S + ' stroke-width="1.8"/>'],
    ['i-filter', '0 0 24 24', '<path d="M4 6h16M7 12h10M10 18h4" ' + S + ' stroke-width="2"/>'],
    ['i-grid', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></g>'],
    ['i-mail', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></g>'],
    ['i-target', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></g>'],
    ['i-heart', '0 0 24 24', '<path d="M12 20s-7.2-4.5-9.3-9.1A5 5 0 0 1 12 6.3a5 5 0 0 1 9.3 4.6C19.2 15.5 12 20 12 20Z" ' + S + ' stroke-width="1.8"/>'],
    ['i-chevron', '0 0 24 24', '<path d="m6 9 6 6 6-6" ' + S + ' stroke-width="2"/>'],
    ['i-home', '0 0 24 24', '<path d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z" ' + S + ' stroke-width="1.8"/>'],
    ['i-users', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.7 2.6 3 5.2"/></g>'],
    ['i-wallet', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><path d="M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3"/><path d="M15 13.5h2"/></g>'],
    ['i-plus', '0 0 24 24', '<path d="M12 5v14M5 12h14" ' + S + ' stroke-width="2"/>'],
    ['i-pen', '0 0 24 24', '<path d="M4 20h4L19 9l-4-4L4 16Zm9-13 4 4" ' + S + ' stroke-width="1.8"/>'],
    ['i-phone', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></g>'],
    ['i-trophy', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5"/></g>'],
    ['i-bot', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4h0A2 2 0 0 1 4 15Z"/><path d="M9 10.5h.01M15 10.5h.01" stroke-width="2.6"/></g>'],
    ['i-upload', '0 0 24 24', '<path d="M12 16V4M6 10l6-6 6 6M4 20h16" ' + S + ' stroke-width="1.8"/>'],
    ['i-lock', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></g>'],
    ['i-card', '0 0 24 24', '<g ' + S + ' stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h5M14 13.5h3.5"/></g>'],
    ['i-euro', '0 0 24 24', '<path d="M18 6.5A7 7 0 1 0 18 17.5M4 10h9M4 14h9" ' + S + ' stroke-width="1.8"/>'],
    ['i-cap', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><path d="M4 18 24 9l20 9-20 9Z"/><path d="M12 22v9c0 3 5.4 6 12 6s12-3 12-6v-9"/><path d="M44 18v11"/></g>'],
    ['i-whistle', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><circle cx="16" cy="28" r="10"/><path d="M22 20h20v8H26"/><circle cx="16" cy="28" r="3"/><path d="M9 9l2.5 4.5M17 6.5v5M25 9l-2.5 4.5"/></g>'],
    ['i-tennis', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><circle cx="24" cy="24" r="16"/><path d="M12 13c5 5 5 17 0 22M36 13c-5 5-5 17 0 22"/></g>'],
    ['i-glove', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><path d="M15 31V17A11 11 0 0 1 26 6h1a11 11 0 0 1 11 11v6c0 6-4 10-10 10h-5"/><path d="M15 24c-3 0-6 1.5-6 5s3 5 6 5h8"/><path d="M14 36h20v6H14z"/><path d="M22 14c3-1 7-1 10 1"/></g>'],
    ['i-shoe', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><path d="M5 33V21l7-3c1 3 4 5 7 5l4-1 5 6 10 2c4 1 6 3 6 6v1H5Z"/><path d="M5 39h38"/><path d="M17 24l2 3M22 23l2 3"/></g>'],
    ['i-dumbbell', '0 0 48 48', '<path d="M6 19v10M12 14v20M36 14v20M42 19v10M12 24h24" ' + S + ' stroke-width="3"/>'],
    ['i-mountain', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><path d="M3 40 17 15l7 11 6-8 15 22Z"/><path d="M12.5 23l4.5 3 3-3"/></g>'],
    ['i-ball', '0 0 48 48', '<g ' + S + ' stroke-width="2.2"><circle cx="24" cy="24" r="17"/><path d="m24 17 6.7 4.9-2.6 7.8h-8.2l-2.6-7.8Z"/><path d="M24 7v10M30.7 21.9l9.5-3.1M28.1 29.7l5.9 8.1M19.9 29.7 14 37.8M17.3 21.9l-9.5-3.1"/></g>'],
    ['i-wave', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><circle cx="33" cy="12" r="4"/><path d="M8 26l10-9 7 5 6-3"/><path d="M4 33c3.3 0 3.3-3 6.7-3s3.3 3 6.6 3 3.4-3 6.7-3 3.3 3 6.7 3 3.3-3 6.6-3 3.4 3 6.7 3"/><path d="M4 41c3.3 0 3.3-3 6.7-3s3.3 3 6.6 3 3.4-3 6.7-3 3.3 3 6.7 3 3.3-3 6.6-3 3.4 3 6.7 3"/></g>'],
    ['i-leaf', '0 0 48 48', '<g ' + S + ' stroke-width="2.4"><path d="M24 41c-9-4-14-11-14-19 0-5 2-9 4-11 6 2 10 7 10 13 0-6 4-11 10-13 2 2 4 6 4 11 0 8-5 15-14 19Z"/><path d="M24 24v17"/></g>']
  ];
  var sprite = '<svg class="sprite" width="0" height="0" aria-hidden="true" focusable="false"><defs>' +
    ICONS.map(function (i) { return '<symbol id="' + i[0] + '" viewBox="' + i[1] + '">' + i[2] + '</symbol>'; }).join('') +
    '</defs></svg>';

  /* ---------- Compte (démo : mémorisé dans le navigateur) ---------- */
  var home = user && user.role === 'coach' ? 'pro.html' : 'espace.html';
  var actions = user
    ? '<span class="nav-me"><a href="' + home + '" class="btn btn-primary btn-nav" data-magnetic><span data-roll>' + (user.role === 'coach' ? 'Espace pro' : 'Mon espace') + '</span></a>' + dot + '</span>'
    : '<a href="connexion.html#connexion" class="nav-login" data-roll data-auth-open="login">Connexion</a>' +
      '<a href="connexion.html#inscription" class="btn btn-primary btn-nav" data-magnetic data-auth-open="signup"><span data-roll>Rejoindre</span></a>';
  var menuFoot = user
    ? '<a href="' + (user.role === 'coach' ? 'pro.html' : 'espace.html') + '" class="btn btn-primary btn-lg">' + (user.role === 'coach' ? 'Espace pro' : 'Mon espace') + ' <svg class="ico"><use href="#i-arrow"/></svg></a>'
    : '<a href="connexion.html#inscription" class="btn btn-primary btn-lg" data-auth-open="signup">Rejoindre le club <svg class="ico"><use href="#i-arrow"/></svg></a>' +
      '<a href="connexion.html#connexion" class="menu-login" data-auth-open="login">Déjà membre&nbsp;? Connexion</a>';

  var header =
    sprite +
    '<div class="curtain" data-curtain aria-hidden="true"><span class="curtain-mark"><svg><use href="#i-mark"/></svg>Sport2Share</span></div>' +
    '<div class="grain" aria-hidden="true"></div>' +
    '<div class="progress" aria-hidden="true"><span data-progress></span></div>' +
    '<div class="toast" role="status" aria-live="polite" data-toast><i></i><span data-toast-text></span></div>' +
    '<header class="nav" data-nav>' +
      '<a href="index.html" class="logo" aria-label="Sport2Share, accueil"><svg class="logo-mark"><use href="#i-mark"/></svg><span class="logo-text"><span>Sport2</span><span>Share</span><span>Club</span></span></a>' +
      '<nav class="nav-links" aria-label="Navigation principale">' +
        NAV.map(function (n) { return '<a href="' + n[1] + '"' + current(n[0]) + ' data-roll>' + n[2] + '</a>'; }).join('') +
      '</nav>' +
      '<div class="nav-actions">' + actions +
        '<button class="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" data-burger><span></span><span></span></button>' +
      '</div>' +
    '</header>' +
    '<div class="menu" data-menu>' +
      '<nav class="menu-links" aria-label="Menu mobile">' +
        MENU.map(function (n, i) { return '<a href="' + n[1] + '" style="--i:' + i + '"' + current(n[0]) + '><span>' + n[2] + '</span></a>'; }).join('') +
      '</nav>' +
      '<div class="menu-foot">' + menuFoot + '</div>' +
    '</div>';

  var word = 'SPORT2SHARE'.split('').map(function (l, i) {
    return '<span style="--i:' + i + '"' + (l === '2' ? ' class="hl"' : '') + '><span>' + l + '</span></span>';
  }).join('');

  var footer =
    '<footer class="footer dark" data-theme="dark">' +
      '<div class="foot-cols">' +
        '<div class="foot-brand">' +
          '<a href="index.html" class="logo" aria-label="Sport2Share, accueil"><svg class="logo-mark"><use href="#i-mark"/></svg><span class="logo-text"><span>Sport2</span><span>Share</span><span>Club</span></span></a>' +
          '<p>Le club où tu choisis ton coach sportif. Plus de 60 sports, tous niveaux, partout en France.</p>' +
        '</div>' +
        '<div class="foot-col"><h3>Plateforme</h3>' +
          '<a href="coachs.html">Trouver un coach</a><a href="sports.html">Tous les sports</a><a href="devenir-coach.html">Devenir coach</a><a href="tarifs.html">Tarifs</a><a href="espace.html">Espace membre</a>' +
        '</div>' +
        '<div class="foot-col"><h3>Club</h3>' +
          '<a href="a-propos.html">Manifeste</a><a href="index.html#avis">Témoignages</a><a href="a-propos.html#presse">Presse</a>' +
        '</div>' +
        '<div class="foot-col"><h3>Aide</h3>' +
          '<a href="#faq" data-chat-open>FAQ · assistant</a><a href="contact.html">Contact</a><a href="legal.html#cgu">CGU</a><a href="legal.html#confidentialite">Confidentialité</a>' +
        '</div>' +
        '<div class="foot-col"><h3>Suivre</h3>' +
          '<a href="#">Instagram</a><a href="#">TikTok</a><a href="#">LinkedIn</a><a href="#">YouTube</a>' +
        '</div>' +
      '</div>' +
      '<div class="foot-word" data-reveal="word" aria-hidden="true">' + word + '</div>' +
      '<div class="foot-bottom">' +
        '<span>© 2026 Sport2Share</span>' +
        '<a href="legal.html">Mentions légales</a>' +
        '<a href="#top" class="to-top" data-roll>Retour en haut</a>' +
      '</div>' +
    '</footer>';

  me.insertAdjacentHTML('beforebegin', part === 'footer' ? footer : header);
  // assistant automatique (bulle en bas à droite), sur toutes les pages (y compris l'espace pro, sans pied de page)
  if (part === 'header') {
    var bot = document.createElement('script');
    bot.src = 'chatbot.js';
    bot.defer = true;
    document.body.appendChild(bot);
  }
})();
