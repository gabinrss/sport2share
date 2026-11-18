/* =========================================================
   Sport2Share — assistant automatique (bulle en bas à droite)
   Répond à partir de mots clés repérés dans la question.
   Chargé sur toutes les pages par layout.js.
   ========================================================= */
(function () {
  'use strict';
  if (document.querySelector('[data-bot]')) return;
  var page = document.body.getAttribute('data-page') || '';
  if (page === 'messages') return; // la messagerie a déjà sa propre zone de saisie

  // ---------- base de connaissances : mots clés -> réponse ----------
  // kw : mots ou débuts de mots (sans accents). Les expressions de plusieurs mots comptent double.
  var KB = [
    { id: 'hello', kw: ['bonjour', 'salut', 'hello', 'coucou', 'bonsoir', 'hey', 'yo'], small: true,
      a: 'Salut ! Je réponds tout de suite à tes questions sur les coachs, les tarifs, les réservations ou l’inscription. Qu’est-ce que tu cherches ?' },
    { id: 'thanks', kw: ['merci', 'parfait', 'super', 'genial', 'top', 'cool', 'ok merci'], small: true,
      a: 'Avec plaisir ! Une autre question ? Je suis là.' },
    { id: 'choose', q: 'Comment choisir mon coach ?', kw: ['choisir', 'choix', 'trouver un coach', 'trouve', 'chercher', 'cherche', 'comparer', 'filtre', 'filtrer', 'meilleur coach', 'quel coach'],
      a: 'Filtre les coachs par sport, département, prix et disponibilité, puis compare leurs profils : diplômes et carte pro vérifiés, avis d’élèves, formules et séance type. Tu réserves directement celui qui te plaît : c’est toujours toi qui choisis.',
      links: [['Voir les coachs', 'coachs.html']] },
    { id: 'sports', q: 'Quels sports sont proposés ?', kw: ['sport', 'discipline', 'univers', 'activite', 'tennis', 'boxe', 'yoga', 'running', 'natation', 'foot', 'padel', 'escalade', 'muscu'],
      a: 'Plus de 60 sports, répartis en sept univers : raquettes, combat, endurance, fitness, plein air, sports collectifs et bien-être.',
      links: [['Tous les sports', 'sports.html']] },
    { id: 'price', q: 'Combien coûte une séance ?', kw: ['prix', 'tarif', 'cout', 'coute', 'combien', 'cher', 'euro', 'budget', 'abonnement', 'gratuit', 'payant'],
      a: 'L’inscription est gratuite et sans abonnement. Le tarif d’une séance est fixé uniquement par le coach : tu le vois sur son profil avant de réserver. Certains coachs proposent aussi des formules sur plusieurs séances.',
      links: [['Les tarifs', 'tarifs.html']] },
    { id: 'cancel', q: 'Comment annuler une séance ?', kw: ['annul', 'rembours', 'decommander', 'empechement', 'imprevu', 'malade', 'medical', 'certificat', 'justificatif', 'report', 'decaler', 'delai'],
      a: 'L’annulation est gratuite jusqu’à 48 h avant le début de la séance : tu es remboursé intégralement. Entre 48 h et 1 h avant, tu peux encore annuler, mais seuls 50 % de la séance sont remboursés. À moins d’1 h, la séance est due en totalité, sans remboursement. Avec un justificatif médical, tu peux plutôt reporter ta séance gratuitement depuis ton espace, au plus tard 5 h avant le début.',
      links: [['Annuler ou reporter', 'annuler.html'], ['Conditions (CGU)', 'legal.html#cgu']] },
    { id: 'pay', q: 'Quand suis-je débité ?', kw: ['paiement', 'payer', 'paye', 'carte bancaire', 'cb', 'debit', 'prelev', 'facture', 'securise', 'virement'],
      a: 'Tu paies au moment de la réservation, par paiement sécurisé. Le coach est payé une fois la séance réalisée. Annulation gratuite jusqu’à 48 h avant la séance.' },
    { id: 'book', q: 'Comment réserver une séance ?', kw: ['reserv', 'creneau', 'rendez-vous', 'rdv', 'prendre une seance', 'booker', 'disponibilit', 'planning', 'agenda'],
      a: 'Ouvre le profil d’un coach, choisis un jour, un créneau et le lieu (chez toi si le coach se déplace, en salle, en extérieur ou en visio), puis valide. Pour réserver, ta pièce d’identité doit être vérifiée dans ton espace.',
      links: [['Trouver un coach', 'coachs.html'], ['Mon espace', 'espace.html']] },
    { id: 'identity', q: 'Pourquoi une pièce d’identité ?', kw: ['identite', 'piece', 'cni', 'passeport', 'titre de sejour', 'papier', 'verification', 'verifier', 'verifie'],
      a: 'Pour la sécurité de tous, on vérifie que le prénom et le nom de ta pièce d’identité sont ceux de ton compte. Tu peux t’inscrire sans, mais la réservation (élève) ou la publication de l’annonce (coach) reste bloquée tant qu’elle manque.',
      links: [['Mon espace', 'espace.html#identite']] },
    { id: 'become', q: 'Je suis coach, comment rejoindre le club ?', kw: ['devenir coach', 'devenir', 'rejoindre', 'postuler', 'candidat', 'educateur', 'travailler', 'inscription coach', 'je suis coach', 'proposer mes cours', 'donner des cours'],
      a: 'Inscris-toi sur la page dédiée aux coachs : coordonnées (e-mail et téléphone vérifiés), pièce d’identité, carte professionnelle (numéro et photo), diplôme et assurance RC Pro. Ton annonce est publiée dès que tout est validé.',
      links: [['Inscription coach', 'inscription-coach.html'], ['Devenir coach', 'devenir-coach.html']] },
    { id: 'commission', q: 'Quelle commission pour les coachs ?', kw: ['commission', 'frais', 'pourcentage', 'palier', 'revenu', 'gagner', 'gagne', 'remuneration', 'marge'],
      a: 'Aucun frais sous 10 heures de coaching dans le mois. Ensuite : 5 % de 10 à 30 heures, 7 % de 30 à 40 heures et 10 % au-delà de 40 heures. La commission n’est prélevée que sur les séances réalisées.',
      links: [['Simuler mes revenus', 'devenir-coach.html#simulateur']] },
    { id: 'card', q: 'La carte professionnelle est-elle obligatoire ?', kw: ['carte pro', 'carte professionnelle', 'diplome', 'bpjeps', 'dejeps', 'staps', 'brevet', 'qualif', 'assurance', 'rc pro'],
      a: 'Oui : pour encadrer contre rémunération, un coach doit avoir une carte professionnelle d’éducateur sportif à jour. On vérifie son numéro, sa photo et le diplôme qui y figure. Sans carte validée, l’annonce n’est pas publiée.' },
    { id: 'formules', q: 'Comment marchent les formules ?', kw: ['formule', 'reduction', 'pack', 'carnet', 'remise', 'promo', 'plusieurs seances', 'moins cher'],
      a: 'Il n’y a pas de remise imposée par le club : chaque coach crée ses propres formules (nombre de séances, réduction). Elles sont dans l’onglet « Mes formules » de son profil et s’appliquent en un clic à ta réservation.' },
    { id: 'place', q: 'Où se passent les séances ?', kw: ['domicile', 'chez moi', 'chez vous', 'lieu', 'adresse', 'salle', 'exterieur', 'visio', 'en ligne', 'ou se passe', 'deplace'],
      a: 'Chaque coach indique où il coache : à domicile (« Chez vous »), en salle, au club, en extérieur ou en visio. Tu choisis le lieu qui te va au moment de réserver, et l’adresse du rendez-vous est rappelée dans ton espace.' },
    { id: 'switch', q: 'Et si le courant ne passe pas ?', kw: ['changer', 'courant', 'pas content', 'decu', 'autre coach', 'mauvais', 'remplacer'],
      a: 'Tu peux changer de coach à tout moment et réserver avec un autre, sans frais et sans justification.' },
    { id: 'reviews', q: 'Comment fonctionnent les avis ?', kw: ['avis', 'note', 'noter', 'commentaire', 'etoile', 'evaluation', 'faux avis'],
      a: 'Seuls les élèves qui ont réalisé une séance peuvent noter un coach (sur 5) et laisser un commentaire. Les notes moyennes affichées sont donc 100 % vérifiées.' },
    { id: 'msg', q: 'Comment contacter mon coach ?', kw: ['message', 'messagerie', 'contacter le coach', 'ecrire au coach', 'discuter', 'parler au coach', 'chat'],
      a: 'Depuis le profil du coach ou ton espace, ouvre la messagerie : tu peux lui écrire avant et après tes séances.',
      links: [['Messagerie', 'messages.html']] },
    { id: 'account', q: 'Problème de connexion ?', kw: ['mot de passe', 'connexion', 'connecter', 'compte', 'oublie', 'identifiant', 'login', 'inscri', 'creer un compte'],
      a: 'Tu peux te connecter ou créer ton compte depuis la page Connexion. Mot de passe oublié ? Utilise le lien prévu sous le formulaire. Pour la démo : eleve@sport2share.fr ou coach@sport2share.fr, mot de passe sport2026.',
      links: [['Connexion', 'connexion.html#connexion']] },
    { id: 'dept', q: 'Y a-t-il des coachs près de chez moi ?', kw: ['departement', 'ville', 'region', 'proche', 'pres de chez', 'autour', 'localisation', 'paris', 'lyon', 'marseille', 'france'],
      a: 'La recherche se fait par département : les 101 départements sont disponibles. Choisis le tien dans les filtres pour voir les coachs les plus proches.',
      links: [['Chercher par département', 'coachs.html']] },
    { id: 'trust', q: 'Comment les coachs sont-ils sélectionnés ?', kw: ['confiance', 'serieux', 'securite', 'selection', 'selectionne', 'fiable', 'arnaque'],
      a: 'Diplôme, carte professionnelle et identité vérifiés, puis notation continue par les élèves après chaque séance réalisée. Moins de 30 % des candidatures sont acceptées.' },
    { id: 'human', q: 'Parler à l’équipe', kw: ['humain', 'conseiller', 'equipe', 'contact', 'telephone', 'mail', 'joindre', 'reclamation', 'probleme', 'aide'],
      a: 'Je suis un assistant automatique. Pour une demande particulière, écris à l’équipe depuis la page Contact : elle te répond au plus vite.',
      links: [['Écrire à l’équipe', 'contact.html']] }
  ];
  var SUGGEST = ['price', 'book', 'cancel', 'become'];

  // ---------- outils ----------
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9@. -]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function score(entry, text, words) {
    var s = 0;
    entry.kw.forEach(function (k) {
      if (k.indexOf(' ') > -1) { if ((' ' + text + ' ').indexOf(' ' + k) > -1) s += 2; return; }
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        if (w === k || (k.length >= 4 && w.indexOf(k) === 0)) { s += 1; return; }
      }
    });
    return s;
  }
  // sport cité dans la question (« boxe », « padel »…) -> lien direct vers ses coachs
  function findSport(q) {
    var data = window.S2S_DATA;
    if (!data || !data.SPORTS) return '';
    var text = ' ' + norm(q) + ' ';
    var words = text.trim().split(' ');
    var hit = '';
    data.SPORTS.forEach(function (s) {
      var n = norm(s.name);
      var first = n.split(' ')[0];
      if (text.indexOf(' ' + n + ' ') > -1 || (!hit && first.length >= 4 && words.indexOf(first) > -1)) hit = s.name;
    });
    return hit;
  }
  function answer(q) {
    var text = norm(q);
    var words = text.split(' ');
    var ranked = KB.map(function (e) { return { e: e, s: score(e, text, words) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s || (a.e.small ? 1 : 0) - (b.e.small ? 1 : 0); });
    // une vraie question l'emporte sur « bonjour » / « merci » dans la même phrase
    var real = ranked.filter(function (r) { return !r.e.small; });
    if (real.length) ranked = real;
    if (!ranked.length) return { miss: true };
    var best = ranked[0].e;
    var also = ranked.slice(1, 3).filter(function (r) { return r.s >= ranked[0].s - 1 && !r.e.small; }).map(function (r) { return r.e.id; });
    return { e: best, also: also };
  }

  // ---------- interface ----------
  var ICON = '<svg aria-hidden="true"><use href="#i-bot"/></svg>';
  var wrap = document.createElement('div');
  wrap.className = 'bot';
  wrap.setAttribute('data-bot', '');
  wrap.innerHTML =
    '<button type="button" class="bot-fab" aria-expanded="false" aria-controls="bot-panel" data-bot-toggle>' +
      '<span class="bot-fab-ico">' + ICON + '<svg class="bot-x" aria-hidden="true"><use href="#i-x"/></svg></span>' +
      '<span class="bot-fab-label">Une question&nbsp;?</span><i class="bot-dot" aria-hidden="true"></i>' +
    '</button>' +
    '<section class="bot-panel" id="bot-panel" role="dialog" aria-label="Assistant Sport2Share" hidden>' +
      '<header class="bot-head"><span class="bot-avatar">' + ICON + '</span><span><b>Assistant Sport2Share</b><small><i></i>Répond automatiquement</small></span>' +
        '<button type="button" class="bot-close" aria-label="Fermer l’assistant" data-bot-close><svg aria-hidden="true"><use href="#i-x"/></svg></button></header>' +
      '<div class="bot-log" data-bot-log aria-live="polite"></div>' +
      '<div class="bot-sugs" data-bot-sugs></div>' +
      '<form class="bot-form" data-bot-form autocomplete="off"><input type="text" maxlength="300" placeholder="Écris ta question…" aria-label="Ta question" data-bot-input>' +
        '<button type="submit" aria-label="Envoyer"><svg aria-hidden="true"><use href="#i-send"/></svg></button></form>' +
    '</section>';
  document.body.appendChild(wrap);

  var fab = wrap.querySelector('[data-bot-toggle]');
  var panel = wrap.querySelector('.bot-panel');
  var log = wrap.querySelector('[data-bot-log]');
  var sugs = wrap.querySelector('[data-bot-sugs]');
  var form = wrap.querySelector('[data-bot-form]');
  var input = wrap.querySelector('[data-bot-input]');
  var KEY = 's2s-bot';
  var hist = [];
  try { hist = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) { hist = []; }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(hist.slice(-40))); } catch (e) { /* navigation privée */ } }
  var byId = {};
  KB.forEach(function (e) { byId[e.id] = e; });

  function bubble(m) {
    var el = document.createElement('div');
    el.className = 'bot-msg ' + (m.me ? 'is-me' : 'is-bot');
    var html = '<p>' + esc(m.text) + '</p>';
    if (m.links && m.links.length) html += '<div class="bot-links">' + m.links.map(function (l) { return '<a href="' + esc(l[1]) + '">' + esc(l[0]) + ' →</a>'; }).join('') + '</div>';
    el.innerHTML = html;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function chips(ids, title) {
    var list = ids.map(function (id) { return byId[id]; }).filter(function (e) { return e && e.q; });
    sugs.innerHTML = list.length ? (title ? '<span>' + esc(title) + '</span>' : '') + list.map(function (e) { return '<button type="button" data-bot-q="' + e.id + '">' + esc(e.q) + '</button>'; }).join('') : '';
  }
  function push(m) { hist.push(m); save(); bubble(m); }
  function reply(q) {
    var r = answer(q);
    var typing = document.createElement('div');
    typing.className = 'bot-msg is-bot is-typing';
    typing.innerHTML = '<p><i></i><i></i><i></i></p>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    setTimeout(function () {
      typing.remove();
      if (r.miss) {
        push({ text: 'Je n’ai pas bien compris. Essaie avec un mot clé (prix, réserver, annulation, inscription coach…) ou choisis une question ci-dessous. Tu peux aussi écrire à l’équipe.', links: [['Contacter l’équipe', 'contact.html']] });
        chips(SUGGEST);
        return;
      }
      var links = (r.e.links || []).slice();
      var sport = findSport(q);
      if (sport) links.unshift(['Coachs de ' + sport.toLowerCase(), 'coachs.html?sport=' + encodeURIComponent(sport)]);
      push({ text: r.e.a, links: links });
      chips(r.also.length ? r.also : SUGGEST.filter(function (id) { return id !== r.e.id; }).slice(0, 3), r.also.length ? 'Ça peut aussi t’aider :' : 'Autres questions :');
    }, 500 + Math.min(900, q.length * 12));
  }
  function ask(q) {
    q = String(q || '').trim();
    if (!q) return;
    push({ me: true, text: q });
    sugs.innerHTML = '';
    reply(q);
  }

  function open(state) {
    var on = state === undefined ? panel.hidden : state;
    panel.hidden = !on;
    wrap.classList.toggle('is-open', on);
    fab.setAttribute('aria-expanded', String(on));
    if (on) {
      wrap.classList.add('is-seen');
      if (!log.children.length) {
        if (hist.length) hist.forEach(bubble);
        else push({ text: 'Salut ! Je suis l’assistant de Sport2Share. Pose ta question avec tes mots : tarifs, réservation, annulation, inscription coach… je réponds tout de suite.' });
        chips(SUGGEST, 'Questions fréquentes :');
      }
      setTimeout(function () { input.focus(); }, 60);
    }
  }
  fab.addEventListener('click', function () { open(); });
  wrap.querySelector('[data-bot-close]').addEventListener('click', function () { open(false); fab.focus(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(input.value); input.value = ''; });
  sugs.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bot-q]');
    if (b) ask(byId[b.getAttribute('data-bot-q')].q);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { open(false); fab.focus(); } });
  // liens « FAQ » ou « Questions fréquentes » du site : ouvrent l'assistant
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-chat-open]');
    if (!t) return;
    e.preventDefault();
    open(true);
  });
  if (location.hash === '#faq' || location.hash === '#aide') open(true);
})();
