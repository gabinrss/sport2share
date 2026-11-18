/* =========================================================
   Sport2Share — données de démonstration (fictives)
   Coachs, sports et univers utilisés par les pages
   Coachs, Profil coach, Sports et Espace membre.
   Pour ajouter un coach : copier un bloc dans COACHS et changer l'id.
   ========================================================= */
window.S2S_DATA = (function () {
  'use strict';

  var FAMILIES = {
    raquettes: { label: 'Raquettes', icon: 'i-tennis', desc: 'Tennis, padel, badminton… technique, tactique et jeu de jambes, du premier échange au tournoi.' },
    combat: { label: 'Combat', icon: 'i-glove', desc: 'Boxe, MMA, judo, jiu-jitsu… pour se dépasser, se défouler ou apprendre à se défendre.' },
    endurance: { label: 'Endurance', icon: 'i-shoe', desc: 'Running, trail, vélo, natation… des plans d\'entraînement pour aller plus loin et plus vite.' },
    fitness: { label: 'Fitness', icon: 'i-dumbbell', desc: 'Musculation, CrossFit, pilates, danse… force, cardio et posture, en salle ou à la maison.' },
    pleinair: { label: 'Plein air', icon: 'i-mountain', desc: 'Surf, escalade, ski, golf… le sport grandeur nature, encadré par des pros du terrain.' },
    collectifs: { label: 'Collectifs', icon: 'i-ball', desc: 'Football, basket, rugby… progresser individuellement pour briller en équipe.' },
    bienetre: { label: 'Bien-être', icon: 'i-leaf', desc: 'Yoga, stretching, méditation… récupérer, respirer et durer dans le sport.' }
  };

  // [nom, univers, nombre de coachs, prix horaire minimum]
  var SPORTS = [
    ['Tennis', 'raquettes', 120, 30], ['Padel', 'raquettes', 85, 32], ['Badminton', 'raquettes', 40, 24], ['Squash', 'raquettes', 25, 28], ['Tennis de table', 'raquettes', 28, 22], ['Pickleball', 'raquettes', 12, 26],
    ['Boxe anglaise', 'combat', 70, 28], ['Boxe thaï', 'combat', 35, 30], ['MMA', 'combat', 30, 35], ['Judo', 'combat', 30, 25], ['Karaté', 'combat', 25, 25], ['Jiu-jitsu', 'combat', 28, 32], ['Krav-maga', 'combat', 15, 30], ['Escrime', 'combat', 10, 35], ['Lutte', 'combat', 7, 25], ['Taekwondo', 'combat', 10, 25],
    ['Running', 'endurance', 110, 22], ['Trail', 'endurance', 45, 25], ['Marathon', 'endurance', 30, 28], ['Cyclisme', 'endurance', 40, 30], ['VTT', 'endurance', 15, 32], ['Triathlon', 'endurance', 25, 35], ['Natation', 'endurance', 50, 28], ['Aviron', 'endurance', 8, 30], ['Marche nordique', 'endurance', 7, 20], ['Athlétisme', 'endurance', 10, 25],
    ['Musculation', 'fitness', 120, 25], ['CrossFit', 'fitness', 60, 28], ['HIIT', 'fitness', 40, 25], ['Pilates', 'fitness', 55, 28], ['Calisthenics', 'fitness', 20, 25], ['Haltérophilie', 'fitness', 12, 30], ['Cardio', 'fitness', 18, 22], ['Prépa physique', 'fitness', 25, 30], ['Danse', 'fitness', 22, 26], ['Gymnastique', 'fitness', 8, 28],
    ['Surf', 'pleinair', 30, 40], ['Kitesurf', 'pleinair', 10, 55], ['Ski', 'pleinair', 20, 45], ['Snowboard', 'pleinair', 12, 45], ['Escalade', 'pleinair', 45, 32], ['Skate', 'pleinair', 10, 25], ['Voile', 'pleinair', 12, 45], ['Paddle', 'pleinair', 8, 30], ['Plongée', 'pleinair', 8, 50], ['Golf', 'pleinair', 20, 50], ['Équitation', 'pleinair', 8, 45], ["Tir à l'arc", 'pleinair', 4, 30], ['Roller', 'pleinair', 3, 22],
    ['Football', 'collectifs', 90, 25], ['Basket', 'collectifs', 45, 26], ['Volley', 'collectifs', 20, 25], ['Handball', 'collectifs', 20, 25], ['Rugby', 'collectifs', 25, 28], ['Hockey', 'collectifs', 8, 30], ['Futsal', 'collectifs', 12, 24],
    ['Yoga', 'bienetre', 80, 26], ['Stretching', 'bienetre', 25, 24], ['Mobilité', 'bienetre', 20, 26], ['Méditation', 'bienetre', 15, 22], ['Barre au sol', 'bienetre', 10, 26]
  ].map(function (s) { return { name: s[0], family: s[1], coaches: s[2], from: s[3] }; });

  // département de chaque ville des coachs écrits à la main
  var CITY_DEPT = { Lyon: '69', Villeurbanne: '69', Marseille: '13', Paris: '75', Lille: '59', Bordeaux: '33', Grenoble: '38', Nantes: '44', Annecy: '74', Toulouse: '31', Biarritz: '64', Strasbourg: '67', Montpellier: '34', Rennes: '35' };

  function coach(o) {
    o.initials = (o.first.charAt(0) + o.last.charAt(0)).toUpperCase();
    o.dept = o.dept || CITY_DEPT[o.city] || '';
    return o;
  }

  var COACHS = [
    coach({ id: 'ines-morel', first: 'Inès', last: 'Morel', sport: 'Tennis', sports: ['Tennis'], family: 'raquettes', city: 'Lyon', rating: 4.9, reviews: 128, price: 38, tags: ['Compétition', 'Ados'], badge: 'dispo', visual: 'plum', icon: 'i-tennis', years: 9, students: 214, formats: ['Club', 'Extérieur'], levels: ['Débutant', 'Intermédiaire', 'Compétition'], diplomas: ['DE Tennis (Diplôme d\'État)', 'Licence STAPS entraînement'], bio: 'Ancienne joueuse classée 2/6, Inès entraîne des ados et des adultes qui veulent passer un cap en tournoi. Ses séances mélangent technique, jeu de jambes et préparation mentale.' }),
    coach({ id: 'yanis-belkacem', first: 'Yanis', last: 'Belkacem', sport: 'Boxe anglaise', sports: ['Boxe anglaise', 'Prépa physique'], family: 'combat', city: 'Marseille', rating: 5.0, reviews: 86, price: 35, tags: ['Cardio', 'Débutants'], badge: 'top', visual: 'black', icon: 'i-glove', years: 7, students: 160, formats: ['Salle', 'Domicile'], levels: ['Débutant', 'Intermédiaire'], diplomas: ['BPJEPS Boxe', 'Ancien boxeur amateur, 32 combats'], bio: 'Yanis fait découvrir la boxe à ceux qui n\'ont jamais enfilé de gants. Cardio, déplacements, coordination : on sort de chaque séance lessivé et fier.' }),
    coach({ id: 'clara-nguyen', first: 'Clara', last: 'Nguyen', sport: 'Natation', sports: ['Natation', 'Triathlon'], family: 'endurance', city: 'Paris', rating: 4.8, reviews: 212, price: 34, tags: ['Crawl', 'Triathlon'], badge: 'dispo', visual: 'teal', icon: 'i-wave', years: 11, students: 390, formats: ['Piscine'], levels: ['Débutant', 'Intermédiaire', 'Compétition'], diplomas: ['BPJEPS AAN (maître-nageur)', 'Brevet fédéral triathlon'], bio: 'Clara corrige la technique de nage avec des exercices simples et filmés. Elle prépare aussi les triathlètes à leur première épreuve en eau libre.' }),
    coach({ id: 'malik-diallo', first: 'Malik', last: 'Diallo', sport: 'CrossFit & musculation', sports: ['CrossFit', 'Musculation'], family: 'fitness', city: 'Lille', rating: 4.9, reviews: 301, price: 30, tags: ['Force', 'Prépa physique'], badge: 'top', visual: 'esp', icon: 'i-dumbbell', years: 8, students: 420, formats: ['Salle', 'Extérieur'], levels: ['Débutant', 'Intermédiaire', 'Avancé'], diplomas: ['BPJEPS AF (activités de la forme)', 'Certification CrossFit L2'], bio: 'Malik construit des programmes de force et de condition physique mesurables, semaine après semaine. Priorité à la technique : on soulève lourd, mais proprement.' }),
    coach({ id: 'lea-fontaine', first: 'Léa', last: 'Fontaine', sport: 'Yoga vinyasa', sports: ['Yoga', 'Mobilité'], family: 'bienetre', city: 'Bordeaux', rating: 4.9, reviews: 97, price: 28, tags: ['Souplesse', 'Récupération'], badge: 'dispo', visual: 'plum', icon: 'i-leaf', years: 6, students: 180, formats: ['Studio', 'Visio'], levels: ['Débutant', 'Intermédiaire'], diplomas: ['Formation Yoga Alliance 500h', 'Spécialisation yoga du sportif'], bio: 'Léa accompagne les sportifs qui veulent gagner en mobilité et mieux récupérer. Ses séances de vinyasa sont dynamiques, respirées et adaptées à chaque corps.' }),
    coach({ id: 'hugo-laurent', first: 'Hugo', last: 'Laurent', sport: 'Escalade', sports: ['Escalade'], family: 'pleinair', city: 'Grenoble', rating: 4.7, reviews: 154, price: 32, tags: ['Bloc', 'Falaise'], badge: 'dispo', visual: 'teal', icon: 'i-mountain', years: 10, students: 260, formats: ['Salle', 'Falaise'], levels: ['Débutant', 'Intermédiaire', 'Avancé'], diplomas: ['DE Escalade', 'Moniteur canyon et via ferrata'], bio: 'Hugo emmène ses grimpeurs de la salle au rocher. Lecture de voie, placement des pieds, gestion de la peur : tout ce qui fait gagner des cotations.' }),
    coach({ id: 'sofia-ricci', first: 'Sofia', last: 'Ricci', sport: 'Football', sports: ['Football', 'Futsal'], family: 'collectifs', city: 'Nantes', rating: 4.9, reviews: 73, price: 36, tags: ['Technique', 'Gardiens'], badge: 'top', visual: 'esp', icon: 'i-ball', years: 12, students: 150, formats: ['Terrain'], levels: ['Débutant', 'Intermédiaire', 'Compétition'], diplomas: ['BEF (Brevet d\'entraîneur de football)', 'Ancienne joueuse de D2'], bio: 'Sofia propose des séances individuelles ou en petit groupe : technique balle au pied, finition, et un vrai programme dédié aux gardiens.' }),
    coach({ id: 'tom-bernard', first: 'Tom', last: 'Bernard', sport: 'Running & trail', sports: ['Running', 'Trail'], family: 'endurance', city: 'Annecy', rating: 5.0, reviews: 59, price: 25, tags: ['Semi', 'Ultra'], badge: 'dispo', visual: 'black', icon: 'i-shoe', years: 5, students: 120, formats: ['Extérieur', 'Visio'], levels: ['Débutant', 'Intermédiaire', 'Avancé'], diplomas: ['BPJEPS Athlétisme', 'Finisher de 4 ultra-trails'], bio: 'Tom prépare les coureurs du premier 10 km jusqu\'à l\'ultra. Plans personnalisés, sorties encadrées autour du lac et suivi entre les séances.' }),
    coach({ id: 'paul-roux', first: 'Paul', last: 'Roux', sport: 'Padel', sports: ['Padel', 'Tennis'], family: 'raquettes', city: 'Toulouse', rating: 4.8, reviews: 66, price: 40, tags: ['Tactique', 'Double'], badge: 'top', visual: 'black', icon: 'i-tennis', years: 6, students: 140, formats: ['Club'], levels: ['Débutant', 'Intermédiaire', 'Compétition'], diplomas: ['Moniteur fédéral padel', 'DE Tennis'], bio: 'Paul enseigne le padel comme un jeu d\'échecs : placement, vitres, lobs et communication avec le partenaire. Idéal pour progresser en double.' }),
    coach({ id: 'sarah-kone', first: 'Sarah', last: 'Koné', sport: 'Boxe thaï', sports: ['Boxe thaï', 'Krav-maga'], family: 'combat', city: 'Paris', rating: 4.9, reviews: 118, price: 38, tags: ['Combat', 'Self-défense'], badge: 'dispo', visual: 'plum', icon: 'i-glove', years: 9, students: 230, formats: ['Salle', 'Domicile'], levels: ['Débutant', 'Intermédiaire', 'Compétition'], diplomas: ['DEJEPS Boxe thaï', 'Instructrice self-défense'], bio: 'Championne de France amateur, Sarah enseigne la boxe thaï et la self-défense. Ses cours féminins affichent complet chaque saison.' }),
    coach({ id: 'nina-petit', first: 'Nina', last: 'Petit', sport: 'Pilates', sports: ['Pilates', 'Barre au sol'], family: 'fitness', city: 'Lyon', rating: 4.8, reviews: 142, price: 32, tags: ['Gainage', 'Postural'], badge: 'dispo', visual: 'esp', icon: 'i-dumbbell', years: 7, students: 250, formats: ['Studio', 'Domicile', 'Visio'], levels: ['Débutant', 'Intermédiaire'], diplomas: ['Certification Pilates Matwork & Reformer', 'Licence STAPS APA'], bio: 'Nina travaille la posture et le gainage profond. Ses élèves viennent pour le dos, restent pour la tonicité.' }),
    coach({ id: 'enzo-martin', first: 'Enzo', last: 'Martin', sport: 'Surf', sports: ['Surf', 'Paddle'], family: 'pleinair', city: 'Biarritz', rating: 4.9, reviews: 88, price: 45, tags: ['Débutants', 'Longboard'], badge: 'top', visual: 'teal', icon: 'i-wave', years: 8, students: 300, formats: ['Plage'], levels: ['Débutant', 'Intermédiaire'], diplomas: ['BPJEPS Surf', 'Sauveteur côtier'], bio: 'Enzo lit l\'océan mieux que personne. Il fait lever ses élèves dès la première session et les emmène vers les vagues vertes en toute sécurité.' }),
    coach({ id: 'jade-moreau', first: 'Jade', last: 'Moreau', sport: 'Basket', sports: ['Basket'], family: 'collectifs', city: 'Villeurbanne', rating: 4.7, reviews: 51, price: 30, tags: ['Shoot', 'U15'], badge: 'dispo', visual: 'plum', icon: 'i-ball', years: 5, students: 95, formats: ['Gymnase', 'Playground'], levels: ['Débutant', 'Intermédiaire'], diplomas: ['DE Basket-ball', 'Ancienne joueuse NF1'], bio: 'Jade est obsédée par la mécanique de tir. Vidéo, répétitions et petits jeux : ses jeunes joueurs gagnent en adresse et en confiance.' }),
    coach({ id: 'lucas-garnier', first: 'Lucas', last: 'Garnier', sport: 'Cyclisme', sports: ['Cyclisme', 'VTT'], family: 'endurance', city: 'Strasbourg', rating: 4.8, reviews: 77, price: 33, tags: ['Route', 'Puissance'], badge: 'dispo', visual: 'esp', icon: 'i-shoe', years: 10, students: 170, formats: ['Extérieur', 'Visio'], levels: ['Intermédiaire', 'Avancé'], diplomas: ['DEJEPS Cyclisme', 'Entraîneur capteur de puissance'], bio: 'Lucas bâtit des plans au watt près pour les cyclosportives et les cols. Analyse de tes données, séances sur home-trainer et sorties en groupe.' }),
    coach({ id: 'amel-haddad', first: 'Amel', last: 'Haddad', sport: 'Jiu-jitsu brésilien', sports: ['Jiu-jitsu', 'Lutte'], family: 'combat', city: 'Montpellier', rating: 5.0, reviews: 64, price: 36, tags: ['Grappling', 'Féminin'], badge: 'top', visual: 'teal', icon: 'i-glove', years: 8, students: 130, formats: ['Dojo'], levels: ['Débutant', 'Intermédiaire', 'Compétition'], diplomas: ['Ceinture noire JJB', 'CQP Moniteur arts martiaux'], bio: 'Amel rend le jiu-jitsu accessible : techniques décortiquées, randoris encadrés et beaucoup de bonne humeur sur le tatami.' }),
    coach({ id: 'victor-blanc', first: 'Victor', last: 'Blanc', sport: 'Golf', sports: ['Golf'], family: 'pleinair', city: 'Bordeaux', rating: 4.6, reviews: 39, price: 55, tags: ['Swing', 'Handicap'], badge: 'dispo', visual: 'black', icon: 'i-mountain', years: 14, students: 210, formats: ['Practice', 'Parcours'], levels: ['Débutant', 'Intermédiaire', 'Avancé'], diplomas: ['DE Golf', 'Analyse vidéo du swing'], bio: 'Victor fait baisser les handicaps. Analyse vidéo du swing, petit jeu et gestion de parcours : chaque séance a un objectif chiffré.' }),
    coach({ id: 'lina-benali', first: 'Lina', last: 'Benali', sport: 'Stretching & mobilité', sports: ['Stretching', 'Mobilité'], family: 'bienetre', city: 'Paris', rating: 4.9, reviews: 103, price: 27, tags: ['Mobilité', 'Seniors'], badge: 'dispo', visual: 'teal', icon: 'i-leaf', years: 6, students: 200, formats: ['Domicile', 'Visio'], levels: ['Débutant', 'Intermédiaire'], diplomas: ['Licence STAPS APA', 'Formation mobilité articulaire'], bio: 'Lina redonne de l\'amplitude aux corps raides : sportifs blessés, télétravailleurs ou seniors. Des routines courtes, efficaces et faciles à refaire seul.' }),
    coach({ id: 'marc-dubois', first: 'Marc', last: 'Dubois', sport: 'Badminton', sports: ['Badminton', 'Squash'], family: 'raquettes', city: 'Rennes', rating: 4.7, reviews: 45, price: 28, tags: ['Smash', 'Loisir'], badge: 'dispo', visual: 'esp', icon: 'i-tennis', years: 4, students: 85, formats: ['Gymnase'], levels: ['Débutant', 'Intermédiaire'], diplomas: ['DE Badminton', 'Joueur classé N3'], bio: 'Marc transmet la vitesse et la précision du badminton dans une ambiance détendue. Parfait pour débuter ou relancer une pratique loisir.' })
  ];

  var REVIEWS = [
    { name: 'Camille', meta: '16 ans', text: 'Des séances claires et motivantes. En trois mois, j\'ai vraiment senti la différence.' },
    { name: 'Julien', meta: '29 ans', text: 'Très pédagogue, toujours à l\'heure, et un vrai suivi entre les séances. Je recommande les yeux fermés.' },
    { name: 'Sophie', meta: '42 ans', text: 'Je n\'avais pas fait de sport depuis des années. Programme adapté, zéro jugement, beaucoup d\'énergie.' },
    { name: 'Karim', meta: '24 ans', text: 'Exactement le coach qu\'il me fallait : exigeant mais bienveillant. Mes progrès sont mesurables.' },
    { name: 'Emma', meta: '19 ans', text: 'Super ambiance et conseils précis. Chaque séance a un objectif, on ne perd pas de temps.' },
    { name: 'Nathan', meta: '17 ans', text: 'Il a su me redonner confiance après ma blessure. Je m\'entraîne maintenant deux fois par semaine.' },
    { name: 'Laura', meta: '35 ans', text: 'Ponctualité, écoute, technique : rien à redire. J\'ai choisi ce coach grâce aux avis, aucun regret.' }
  ];

  // élèves fictifs, utilisés quand on est connecté avec un compte coach
  var STUDENTS = [
    { id: 'camille-roche', first: 'Camille', last: 'Roche', initials: 'CR', sport: 'Tennis · intermédiaire', city: 'Lyon', visual: 'plum' },
    { id: 'nathan-blanc', first: 'Nathan', last: 'Blanc', initials: 'NB', sport: 'Football · prépa physique', city: 'Nantes', visual: 'esp' },
    { id: 'emma-leroy', first: 'Emma', last: 'Leroy', initials: 'EL', sport: 'Running · objectif 10 km', city: 'Annecy', visual: 'teal' },
    { id: 'julien-marchal', first: 'Julien', last: 'Marchal', initials: 'JM', sport: 'Musculation · débutant', city: 'Lille', visual: 'black' },
    { id: 'lucas-petit', first: 'Lucas', last: 'Petit', initials: 'LP', sport: 'Tennis · compétition', city: 'Lyon', visual: 'teal' },
    { id: 'zoe-martin', first: 'Zoé', last: 'Martin', initials: 'ZM', sport: 'Tennis · débutante', city: 'Villeurbanne', visual: 'plum' },
    { id: 'adam-roux', first: 'Adam', last: 'Roux', initials: 'AR', sport: 'Tennis · reprise', city: 'Lyon', visual: 'esp' },
    { id: 'chloe-faure', first: 'Chloé', last: 'Faure', initials: 'CF', sport: 'Tennis · ados', city: 'Caluire', visual: 'black' }
  ];

  /* ---------- Départements : [code, nom, chef-lieu] (métropole + outre-mer) ---------- */
  var DEPTS = [
    ['01', 'Ain', 'Bourg-en-Bresse'], ['02', 'Aisne', 'Laon'], ['03', 'Allier', 'Moulins'], ['04', 'Alpes-de-Haute-Provence', 'Digne-les-Bains'],
    ['05', 'Hautes-Alpes', 'Gap'], ['06', 'Alpes-Maritimes', 'Nice'], ['07', 'Ardèche', 'Privas'], ['08', 'Ardennes', 'Charleville-Mézières'],
    ['09', 'Ariège', 'Foix'], ['10', 'Aube', 'Troyes'], ['11', 'Aude', 'Carcassonne'], ['12', 'Aveyron', 'Rodez'],
    ['13', 'Bouches-du-Rhône', 'Marseille'], ['14', 'Calvados', 'Caen'], ['15', 'Cantal', 'Aurillac'], ['16', 'Charente', 'Angoulême'],
    ['17', 'Charente-Maritime', 'La Rochelle'], ['18', 'Cher', 'Bourges'], ['19', 'Corrèze', 'Tulle'], ['2A', 'Corse-du-Sud', 'Ajaccio'],
    ['2B', 'Haute-Corse', 'Bastia'], ['21', 'Côte-d\'Or', 'Dijon'], ['22', 'Côtes-d\'Armor', 'Saint-Brieuc'], ['23', 'Creuse', 'Guéret'],
    ['24', 'Dordogne', 'Périgueux'], ['25', 'Doubs', 'Besançon'], ['26', 'Drôme', 'Valence'], ['27', 'Eure', 'Évreux'],
    ['28', 'Eure-et-Loir', 'Chartres'], ['29', 'Finistère', 'Quimper'], ['30', 'Gard', 'Nîmes'], ['31', 'Haute-Garonne', 'Toulouse'],
    ['32', 'Gers', 'Auch'], ['33', 'Gironde', 'Bordeaux'], ['34', 'Hérault', 'Montpellier'], ['35', 'Ille-et-Vilaine', 'Rennes'],
    ['36', 'Indre', 'Châteauroux'], ['37', 'Indre-et-Loire', 'Tours'], ['38', 'Isère', 'Grenoble'], ['39', 'Jura', 'Lons-le-Saunier'],
    ['40', 'Landes', 'Mont-de-Marsan'], ['41', 'Loir-et-Cher', 'Blois'], ['42', 'Loire', 'Saint-Étienne'], ['43', 'Haute-Loire', 'Le Puy-en-Velay'],
    ['44', 'Loire-Atlantique', 'Nantes'], ['45', 'Loiret', 'Orléans'], ['46', 'Lot', 'Cahors'], ['47', 'Lot-et-Garonne', 'Agen'],
    ['48', 'Lozère', 'Mende'], ['49', 'Maine-et-Loire', 'Angers'], ['50', 'Manche', 'Saint-Lô'], ['51', 'Marne', 'Châlons-en-Champagne'],
    ['52', 'Haute-Marne', 'Chaumont'], ['53', 'Mayenne', 'Laval'], ['54', 'Meurthe-et-Moselle', 'Nancy'], ['55', 'Meuse', 'Bar-le-Duc'],
    ['56', 'Morbihan', 'Vannes'], ['57', 'Moselle', 'Metz'], ['58', 'Nièvre', 'Nevers'], ['59', 'Nord', 'Lille'],
    ['60', 'Oise', 'Beauvais'], ['61', 'Orne', 'Alençon'], ['62', 'Pas-de-Calais', 'Arras'], ['63', 'Puy-de-Dôme', 'Clermont-Ferrand'],
    ['64', 'Pyrénées-Atlantiques', 'Pau'], ['65', 'Hautes-Pyrénées', 'Tarbes'], ['66', 'Pyrénées-Orientales', 'Perpignan'], ['67', 'Bas-Rhin', 'Strasbourg'],
    ['68', 'Haut-Rhin', 'Colmar'], ['69', 'Rhône', 'Lyon'], ['70', 'Haute-Saône', 'Vesoul'], ['71', 'Saône-et-Loire', 'Mâcon'],
    ['72', 'Sarthe', 'Le Mans'], ['73', 'Savoie', 'Chambéry'], ['74', 'Haute-Savoie', 'Annecy'], ['75', 'Paris', 'Paris'],
    ['76', 'Seine-Maritime', 'Rouen'], ['77', 'Seine-et-Marne', 'Melun'], ['78', 'Yvelines', 'Versailles'], ['79', 'Deux-Sèvres', 'Niort'],
    ['80', 'Somme', 'Amiens'], ['81', 'Tarn', 'Albi'], ['82', 'Tarn-et-Garonne', 'Montauban'], ['83', 'Var', 'Toulon'],
    ['84', 'Vaucluse', 'Avignon'], ['85', 'Vendée', 'La Roche-sur-Yon'], ['86', 'Vienne', 'Poitiers'], ['87', 'Haute-Vienne', 'Limoges'],
    ['88', 'Vosges', 'Épinal'], ['89', 'Yonne', 'Auxerre'], ['90', 'Territoire de Belfort', 'Belfort'], ['91', 'Essonne', 'Évry-Courcouronnes'],
    ['92', 'Hauts-de-Seine', 'Nanterre'], ['93', 'Seine-Saint-Denis', 'Bobigny'], ['94', 'Val-de-Marne', 'Créteil'], ['95', 'Val-d\'Oise', 'Cergy'],
    ['971', 'Guadeloupe', 'Basse-Terre'], ['972', 'Martinique', 'Fort-de-France'], ['973', 'Guyane', 'Cayenne'], ['974', 'La Réunion', 'Saint-Denis'],
    ['976', 'Mayotte', 'Mamoudzou']
  ].map(function (d) { return { code: d[0], name: d[1], city: d[2] }; });
  var DEPT_BY_CODE = {};
  DEPTS.forEach(function (d) { DEPT_BY_CODE[d.code] = d; });

  /* ---------- Coachs supplémentaires générés pour la démo (un ou plusieurs par département) ---------- */
  (function generate() {
    var seed = 2026;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    function low(n) { return /^[A-Z]{2,}$/.test(n) || n === 'CrossFit' ? n : n.toLowerCase(); }
    var FIRST = ['Lucas', 'Chloé', 'Hugo', 'Manon', 'Louis', 'Camille', 'Gabriel', 'Léna', 'Nathan', 'Inès', 'Jules', 'Sarah', 'Adam', 'Zoé', 'Arthur', 'Lola', 'Raphaël', 'Jade', 'Noah', 'Louise', 'Ethan', 'Alice', 'Mathis', 'Romane', 'Théo', 'Clara', 'Yanis', 'Anaïs', 'Maxime', 'Eva', 'Bastien', 'Margaux', 'Rayan', 'Océane', 'Victor', 'Pauline', 'Samuel', 'Mila', 'Antoine', 'Nora'];
    var LAST = ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Girard', 'André', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez', 'Legrand', 'Faure', 'Rousseau', 'Guérin', 'Muller', 'Henry', 'Roussel', 'Nicolas', 'Perrin', 'Chevalier', 'Gauthier', 'Masson'];
    var ICON = { raquettes: 'i-tennis', combat: 'i-glove', endurance: 'i-shoe', fitness: 'i-dumbbell', pleinair: 'i-mountain', collectifs: 'i-ball', bienetre: 'i-leaf' };
    var TAGS = {
      raquettes: ['Technique', 'Compétition', 'Loisir', 'Ados', 'Double'], combat: ['Cardio', 'Self-défense', 'Débutants', 'Compétition', 'Féminin'],
      endurance: ['10 km', 'Semi', 'Trail', 'Reprise', 'Plan perso'], fitness: ['Force', 'Perte de poids', 'Posture', 'Prépa physique', 'Tonicité'],
      pleinair: ['Débutants', 'Sécurité', 'Sorties', 'Perfectionnement', 'Famille'], collectifs: ['Technique', 'Gardiens', 'Prépa', 'Jeunes', 'Tactique'],
      bienetre: ['Souplesse', 'Récupération', 'Respiration', 'Seniors', 'Anti-stress']
    };
    var FORMATS = { raquettes: ['Club', 'Extérieur'], combat: ['Salle', 'Domicile'], endurance: ['Extérieur', 'Visio'], fitness: ['Salle', 'Domicile', 'Visio'], pleinair: ['Extérieur'], collectifs: ['Terrain', 'Gymnase'], bienetre: ['Studio', 'Domicile', 'Visio'] };
    var DIPS = ['BPJEPS', 'DEJEPS', 'Diplôme d\'État', 'Licence STAPS', 'Brevet fédéral'];
    var LEVELS = ['Débutant', 'Intermédiaire', 'Avancé', 'Compétition'];
    var VIS = ['plum', 'black', 'teal', 'esp'];
    var EXTRA = { '75': 3, '69': 2, '13': 2, '33': 2, '31': 2, '59': 2, '44': 1, '06': 1, '34': 1, '67': 1, '92': 1, '93': 1, '94': 1, '35': 1, '38': 1 };
    var pool = [];
    SPORTS.forEach(function (s) { for (var k = 0; k < Math.ceil(s.coaches / 10); k++) pool.push(s); });
    var used = {};
    COACHS.forEach(function (c) { used[c.id] = true; });
    DEPTS.forEach(function (d, di) {
      var n = (di % 7 === 3 ? 0 : 1) + (EXTRA[d.code] || 0); // quelques départements restent sans coach dans la démo
      for (var k = 0; k < n; k++) {
        var s = pick(pool);
        var first = pick(FIRST);
        var last = pick(LAST);
        var id = (first + '-' + last).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z-]/g, '');
        while (used[id]) id += '-' + d.code.toLowerCase();
        used[id] = true;
        var years = 2 + Math.floor(rnd() * 13);
        var fam = s.family;
        var tags = TAGS[fam].slice().sort(function () { return rnd() - 0.5; }).slice(0, 2);
        COACHS.push(coach({
          id: id, first: first, last: last, sport: s.name, sports: [s.name], family: fam,
          city: d.city, dept: d.code,
          rating: Math.round((4.5 + rnd() * 0.5) * 10) / 10,
          reviews: 6 + Math.floor(rnd() * 180),
          price: s.from + 2 * Math.floor(rnd() * 10),
          tags: tags, badge: rnd() < 0.25 ? 'top' : 'dispo', visual: pick(VIS), icon: ICON[fam],
          years: years, students: years * 12 + Math.floor(rnd() * 40),
          formats: FORMATS[fam], levels: LEVELS.slice(0, 2 + Math.floor(rnd() * 3)),
          diplomas: [pick(DIPS) + ' · ' + s.name, years + ' ans d\'encadrement'],
          bio: first + ' est coach de ' + low(s.name) + ' depuis ' + years + ' ans. Des séances adaptées à ton niveau, un objectif clair à chaque fois et un suivi entre les séances. Intervient dans tout le département : ' + d.name + '.',
          generated: true
        }));
      }
    });
  })();

  return { FAMILIES: FAMILIES, SPORTS: SPORTS, COACHS: COACHS, REVIEWS: REVIEWS, STUDENTS: STUDENTS, DEPTS: DEPTS, DEPT_BY_CODE: DEPT_BY_CODE };
})();
