/* =====================================================
   Meet&Do — Dashboard (vanilla JS)
   ===================================================== */

// ---- État centralisé ----
const state = {};

function creerEtat(cle, valeurInitiale) {
  state[cle] = valeurInitiale;
  return {
    get: () => state[cle],
    set: (val) => { state[cle] = val; renderDashboard(); },
  };
}

const getRole   = creerEtat('role',   'user').get;
const setRole   = (v) => { state.role = v; document.getElementById('dash-layout').dataset.role = v; renderDashboard(); };
const getOnglet = creerEtat('onglet', 'overview').get;
const setOnglet = (v) => { state.onglet = v; renderDashboard(); };
const getSearch = creerEtat('search', '').get;
const setSearch = (v) => { state.search = v; rafraichirTableau(); };

// ---- Menus par rôle ----
const MENUS = {
  admin: [
    { id: 'overview',    icone: 'bi-grid-fill',         label: 'Vue d\'ensemble' },
    { id: 'users',       icone: 'bi-people-fill',        label: 'Gestion Utilisateurs' },
    { id: 'messaging',   icone: 'bi-chat-dots-fill',     label: 'Messagerie Support' },
    { id: 'reports',     icone: 'bi-flag-fill',          label: 'Signalements' },
    { id: 'validation',  icone: 'bi-patch-check-fill',   label: 'Validation Meeters' },
    { id: 'settings',    icone: 'bi-gear-fill',          label: 'Paramètres' },
  ],
  user: [
    { id: 'overview',    icone: 'bi-grid-fill',          label: 'Mon Dashboard' },
    { id: 'explore',     icone: 'bi-search',             label: 'Explorer' },
    { id: 'activities',  icone: 'bi-calendar3',          label: 'Mes Activités' },
    { id: 'messaging',   icone: 'bi-chat-dots-fill',     label: 'Messagerie' },
    { id: 'favorites',   icone: 'bi-heart-fill',         label: 'Favoris' },
    { id: 'account',     icone: 'bi-person-fill',        label: 'Mon Compte' },
  ],
  publisher: [
    { id: 'overview',    icone: 'bi-grid-fill',          label: 'Vue d\'ensemble' },
    { id: 'listings',    icone: 'bi-megaphone-fill',     label: 'Mes Annonces' },
    { id: 'bookings',    icone: 'bi-calendar-check-fill',label: 'Réservations' },
    { id: 'messaging',   icone: 'bi-chat-dots-fill',     label: 'Messagerie' },
    { id: 'stats',       icone: 'bi-bar-chart-fill',     label: 'Statistiques' },
    { id: 'account',     icone: 'bi-person-fill',        label: 'Mon Compte' },
  ],
};

// ---- Données de démo ----
const DATA = {
  admin: {
    kpi: {
      revenu:       { valeur: '12 480 €', tendance: '+8.2%', sens: 'up',      icone: '💰', couleur: '#dbeafe', couleurIcone: '#2563eb' },
      meeters:      { valeur: '1 247',    tendance: '+124 ce mois', sens: 'up', icone: '👥', couleur: '#d1fae5', couleurIcone: '#059669' },
      signalements: { valeur: '14',       tendance: '-3 vs sem. passée', sens: 'down', icone: '🚩', couleur: '#fee2e2', couleurIcone: '#dc2626' },
      conversion:   { valeur: '4.7 %',   tendance: '+0.3 pts', sens: 'up',    icone: '📈', couleur: '#ede9fe', couleurIcone: '#7c3aed' },
    },
    trafic: [
      { label: 'Lun', val: 320 }, { label: 'Mar', val: 480 },
      { label: 'Mer', val: 410 }, { label: 'Jeu', val: 560 },
      { label: 'Ven', val: 620 }, { label: 'Sam', val: 740 },
      { label: 'Dim', val: 530 },
    ],
    utilisateurs: [
      { id: 1,  nom: 'Alice Martin',    email: 'alice@example.com',    role: 'user',      statut: 'actif',   date: '12/04/2026' },
      { id: 2,  nom: 'Bob Dupont',      email: 'bob@example.com',      role: 'publisher', statut: 'actif',   date: '10/04/2026' },
      { id: 3,  nom: 'Clara Rousseau',  email: 'clara@example.com',    role: 'user',      statut: 'inactif', date: '08/04/2026' },
      { id: 4,  nom: 'David Morel',     email: 'david@example.com',    role: 'admin',     statut: 'actif',   date: '05/04/2026' },
      { id: 5,  nom: 'Eva Leclerc',     email: 'eva@example.com',      role: 'user',      statut: 'attente', date: '03/04/2026' },
      { id: 6,  nom: 'Félix Bernard',   email: 'felix@example.com',    role: 'publisher', statut: 'actif',   date: '01/04/2026' },
      { id: 7,  nom: 'Grace Petit',     email: 'grace@example.com',    role: 'user',      statut: 'actif',   date: '28/03/2026' },
      { id: 8,  nom: 'Hugo Simon',      email: 'hugo@example.com',     role: 'user',      statut: 'inactif', date: '25/03/2026' },
    ],
  },

  user: {
    profil: { prenom: 'Sophie', nom: 'Laurent', email: 'sophie@example.com', points: 1250, sessions: 8, favoris: 5 },
    sessions: [
      { titre: 'Escalade en salle',  date: '24', mois: 'AVR', lieu: 'Paris 11e',    statut: 'confirme', emoji: '🧗' },
      { titre: 'Yoga au parc',       date: '27', mois: 'AVR', lieu: 'Boulogne',      statut: 'confirme', emoji: '🧘' },
      { titre: 'Kayak en rivière',   date: '03', mois: 'MAI', lieu: 'Fontainebleau', statut: 'attente',  emoji: '🚣' },
    ],
    suggestions: [
      { titre: 'Randonnée Forêt',   lieu: 'Fontainebleau', prix: 25,  note: 4.8, emoji: '🥾' },
      { titre: 'Surf Atlantique',   lieu: 'Hossegor',      prix: 60,  note: 4.9, emoji: '🏄' },
      { titre: 'Vélo de Montagne',  lieu: 'Grenoble',      prix: 35,  note: 4.6, emoji: '🚵' },
      { titre: 'Plongée Méditerranée', lieu: 'Marseille',  prix: 80,  note: 4.7, emoji: '🤿' },
      { titre: 'Tennis Club',       lieu: 'Lyon',          prix: 20,  note: 4.5, emoji: '🎾' },
      { titre: 'Paintball Indoor',  lieu: 'Paris 15e',     prix: 30,  note: 4.4, emoji: '🎯' },
    ],
  },

  publisher: {
    profil: { prenom: 'Marc', nom: 'Dubois', email: 'marc@aventure.fr' },
    kpi: {
      annonces:      { valeur: '6',        icone: '📋', couleur: '#dbeafe', couleurIcone: '#2563eb' },
      reservations:  { valeur: '142',      icone: '📆', couleur: '#d1fae5', couleurIcone: '#059669' },
      revenu:        { valeur: '3 240 €',  icone: '💰', couleur: '#ede9fe', couleurIcone: '#7c3aed' },
      taux:          { valeur: '94 %',     icone: '↩',  couleur: '#fef3c7', couleurIcone: '#d97706' },
    },
    annonces: [
      { titre: 'Escalade Falaise', prix: 45, note: 4.8, statut: true,  reservations: 28, emoji: '🧗' },
      { titre: 'Kayak Gorges',     prix: 60, note: 4.6, statut: true,  reservations: 19, emoji: '🚣' },
      { titre: 'Rando Vosges',     prix: 30, note: 4.9, statut: true,  reservations: 41, emoji: '🥾' },
      { titre: 'VTT Massif',       prix: 35, note: 4.5, statut: false, reservations: 12, emoji: '🚵' },
      { titre: 'Spéléo Ardèche',   prix: 55, note: 4.7, statut: true,  reservations: 33, emoji: '🕳️' },
    ],
    dernieresReservations: [
      { id: 101, activite: 'Escalade Falaise', client: 'Alice M.',  groupe: 2, date: '20/04/2026' },
      { id: 102, activite: 'Rando Vosges',      client: 'Jean P.',   groupe: 4, date: '19/04/2026' },
      { id: 103, activite: 'Kayak Gorges',      client: 'Marie D.',  groupe: 3, date: '18/04/2026' },
      { id: 104, activite: 'Spéléo Ardèche',    client: 'Paul R.',   groupe: 2, date: '17/04/2026' },
      { id: 105, activite: 'Rando Vosges',      client: 'Laura B.',  groupe: 6, date: '16/04/2026' },
    ],
  },
};

// ---- Helpers ----
function initiales(nom) {
  return nom.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function etoiles(note) {
  const plein   = Math.floor(note);
  const demi    = note % 1 >= 0.5 ? 1 : 0;
  const vide    = 5 - plein - demi;
  return '★'.repeat(plein) + (demi ? '½' : '') + '☆'.repeat(vide);
}

function badgeStatut(statut) {
  const map = {
    actif:    '<span class="badge-status badge-actif"><i class="bi bi-circle-fill" style="font-size:.5rem"></i> Actif</span>',
    inactif:  '<span class="badge-status badge-inactif"><i class="bi bi-circle-fill" style="font-size:.5rem"></i> Inactif</span>',
    attente:  '<span class="badge-status badge-attente"><i class="bi bi-clock-fill" style="font-size:.6rem"></i> En attente</span>',
    confirme: '<span class="badge-status badge-actif"><i class="bi bi-check-circle-fill" style="font-size:.6rem"></i> Confirmé</span>',
  };
  return map[statut] || statut;
}

function badgeRole(role) {
  const map = {
    admin:     '<span class="badge-status badge-admin">Admin</span>',
    user:      '<span class="badge-status badge-user">Utilisateur</span>',
    publisher: '<span class="badge-status badge-publisher">Éditeur</span>',
  };
  return map[role] || role;
}

// ---- Composants réutilisables ----
function KpiCard({ icone, titre, valeur, tendance, sens, couleur, couleurIcone }) {
  return `
    <div class="kpi-card">
      <div class="kpi-icon-wrap" style="background:${couleur};color:${couleurIcone}">
        <span style="font-size:1.3rem">${icone}</span>
      </div>
      <div class="kpi-label">${titre}</div>
      <div class="kpi-value">${valeur}</div>
      ${tendance ? `<div class="kpi-trend ${sens}">
        <i class="bi bi-arrow-${sens === 'up' ? 'up' : 'down'}-right"></i> ${tendance}
      </div>` : ''}
    </div>`;
}

function Card({ titre, contenu, classes = '', style = '' }) {
  return `<div class="glass-card ${classes}" style="${style}">
    ${titre ? `<div class="card-title">${titre}</div>` : ''}
    ${contenu}
  </div>`;
}

// ---- Graphique SVG Area ----
function creerGraphiqueArea(data, couleur) {
  const W = 560;
  const H = 180;
  const padL = 36, padR = 16, padT = 12, padB = 32;
  const w = W - padL - padR;
  const h = H - padT - padB;

  const max = Math.max(...data.map((d) => d.val));
  const px  = (i) => padL + (i / (data.length - 1)) * w;
  const py  = (v) => padT + h - (v / max) * h;

  // Courbe bezier lissée
  let chemin = `M ${px(0)} ${py(data[0].val)}`;
  for (let i = 1; i < data.length; i++) {
    const cpx = (px(i - 1) + px(i)) / 2;
    chemin += ` C ${cpx} ${py(data[i - 1].val)}, ${cpx} ${py(data[i].val)}, ${px(i)} ${py(data[i].val)}`;
  }

  const aire = chemin
    + ` L ${px(data.length - 1)} ${padT + h} L ${px(0)} ${padT + h} Z`;

  const gradId = 'grad-' + Math.random().toString(36).slice(2, 7);

  // Lignes de grille horizontales
  const grilles = [0.25, 0.5, 0.75, 1].map((t) => {
    const y = padT + h * (1 - t);
    const val = Math.round(max * t);
    return `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"
            stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="${padL - 4}" y="${y + 4}" text-anchor="end"
            font-size="9" fill="#94a3b8" font-family="Inter">${val}</text>`;
  }).join('');

  // Labels X
  const labelsX = data.map((d, i) =>
    `<text x="${px(i)}" y="${H - 6}" text-anchor="middle"
            font-size="10" fill="#94a3b8" font-family="Inter">${d.label}</text>`
  ).join('');

  // Points
  const points = data.map((d, i) =>
    `<circle cx="${px(i)}" cy="${py(d.val)}" r="4"
             fill="white" stroke="${couleur}" stroke-width="2.5"/>`
  ).join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none"
         style="display:block; border-radius:.75rem; overflow:visible">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="${couleur}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${couleur}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${grilles}
      <path d="${aire}"  fill="url(#${gradId})"/>
      <path d="${chemin}" fill="none" stroke="${couleur}"
            stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${points}
      ${labelsX}
    </svg>`;
}

// ============================================================
//  RENDER SIDEBAR
// ============================================================

function renderSidebar() {
  const sidebar = document.getElementById('dash-sidebar');
  if (!sidebar) return;

  const role   = getRole();
  const onglet = getOnglet();
  const items  = MENUS[role] || [];

  const nomRole = role === 'admin' ? 'Administrateur'
    : role === 'publisher'         ? 'Client Éditeur'
    : 'Utilisateur';

  const profil = role === 'user'
    ? DATA.user.profil
    : role === 'publisher'
      ? DATA.publisher.profil
      : { prenom: 'Admin', nom: 'Meet&Do' };

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">M</div>
      <div class="sidebar-brand-text">
        <div class="sidebar-brand-name">MEET & DO</div>
        <div class="sidebar-brand-sub">Espace ${nomRole}</div>
      </div>
    </div>

    <div class="sidebar-role-selector">
      <span class="sidebar-role-label">Rôle (démo)</span>
      <select class="sidebar-role-select" id="role-select">
        <option value="user"      ${role === 'user'      ? 'selected' : ''}>👤 Utilisateur</option>
        <option value="admin"     ${role === 'admin'     ? 'selected' : ''}>🛡️ Administrateur</option>
        <option value="publisher" ${role === 'publisher' ? 'selected' : ''}>📢 Éditeur</option>
      </select>
    </div>

    <p class="sidebar-nav-title">Navigation</p>
    <ul class="sidebar-nav">
      ${items.map((item) => `
        <li class="sidebar-nav-item">
          <button type="button"
            class="sidebar-nav-btn ${onglet === item.id ? 'active' : ''}"
            data-onglet="${item.id}">
            <span class="nav-icon"><i class="bi ${item.icone}"></i></span>
            ${item.label}
          </button>
        </li>`).join('')}
    </ul>

    <div class="sidebar-user">
      <div class="sidebar-user-avatar">${initiales(profil.prenom + ' ' + profil.nom)}</div>
      <div>
        <div class="sidebar-user-name">${profil.prenom} ${profil.nom}</div>
        <div class="sidebar-user-role">${nomRole}</div>
      </div>
    </div>`;

  // Events
  document.getElementById('role-select').addEventListener('change', (e) => {
    state.onglet = 'overview';
    setRole(e.target.value);
  });

  sidebar.querySelectorAll('.sidebar-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setOnglet(btn.dataset.onglet);
      // Fermer sidebar sur mobile
      sidebar.classList.remove('open');
      document.getElementById('dash-overlay').classList.remove('visible');
    });
  });
}

// ============================================================
//  VUE ADMIN
// ============================================================

function renderAdminView() {
  const onglet = getOnglet();

  if (onglet !== 'overview') {
    return `
      <header class="view-header animate-in">
        <div>
          <h1 class="view-title">${MENUS.admin.find((m) => m.id === onglet)?.label || 'Section'}</h1>
          <p class="view-subtitle">Bientôt disponible.</p>
        </div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">Cette section sera disponible prochainement.</p>' })}`;
  }

  const d   = DATA.admin;
  const kpis = Object.entries(d.kpi);

  const lignesUtilisateurs = (recherche) => {
    const liste = recherche
      ? d.utilisateurs.filter((u) =>
          u.nom.toLowerCase().includes(recherche) ||
          u.email.toLowerCase().includes(recherche))
      : d.utilisateurs;

    if (!liste.length) {
      return '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun résultat.</td></tr>';
    }

    return liste.map((u) => `
      <tr>
        <td>
          <div class="table-user-cell">
            <div class="table-avatar">${initiales(u.nom)}</div>
            <div>
              <div style="font-weight:600;font-size:.85rem">${u.nom}</div>
              <div style="font-size:.72rem;color:var(--text-muted)">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${badgeRole(u.role)}</td>
        <td>${badgeStatut(u.statut)}</td>
        <td style="font-size:.8rem;color:var(--text-muted)">${u.date}</td>
        <td>
          <button type="button" class="btn-outline" style="padding:.3rem .75rem;font-size:.72rem">
            <i class="bi bi-pencil"></i> Éditer
          </button>
        </td>
      </tr>`).join('');
  };

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Tableau de bord Admin</h1>
        <p class="view-subtitle">Bienvenue 👋 — Vue d'ensemble de la plateforme</p>
      </div>
      <button type="button" class="btn-primary">
        <i class="bi bi-download"></i> Exporter
      </button>
    </header>

    <div class="kpi-grid mb-6">
      ${kpis.map(([, v]) => KpiCard({
        icone: v.icone, titre: Object.keys(d.kpi).find((k) => d.kpi[k] === v),
        valeur: v.valeur, tendance: v.tendance, sens: v.sens,
        couleur: v.couleur, couleurIcone: v.couleurIcone,
      })).join('')}
    </div>

    <div class="kpi-grid mb-6" style="grid-template-columns:repeat(4,1fr)">
      ${[
        { icone: '💰', titre: 'Revenu',           valeur: d.kpi.revenu.valeur,       tendance: d.kpi.revenu.tendance,       sens: 'up',   couleur: '#dbeafe', couleurIcone: '#2563eb' },
        { icone: '👥', titre: 'Nouveaux Meeters',  valeur: d.kpi.meeters.valeur,      tendance: d.kpi.meeters.tendance,      sens: 'up',   couleur: '#d1fae5', couleurIcone: '#059669' },
        { icone: '🚩', titre: 'Signalements',      valeur: d.kpi.signalements.valeur, tendance: d.kpi.signalements.tendance, sens: 'down', couleur: '#fee2e2', couleurIcone: '#dc2626' },
        { icone: '📈', titre: 'Taux conversion',   valeur: d.kpi.conversion.valeur,   tendance: d.kpi.conversion.tendance,   sens: 'up',   couleur: '#ede9fe', couleurIcone: '#7c3aed' },
      ].map((k) => KpiCard(k)).join('')}
    </div>

    ${Card({
      classes: 'chart-card mb-6',
      contenu: `
        <div class="chart-header">
          <span class="chart-title">Trafic hebdomadaire</span>
          <span class="chart-badge">7 derniers jours</span>
        </div>
        <div class="chart-wrapper" id="chart-container">
          ${creerGraphiqueArea(d.trafic, '#2563eb')}
        </div>`,
    })}

    ${Card({
      classes: 'table-card',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Utilisateurs récents</span>
          <div class="table-search">
            <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
            <input type="text" id="user-search"
              placeholder="Rechercher…" value="${getSearch()}"
              oninput="setSearch(this.value.toLowerCase())">
          </div>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Inscrit le</th><th>Action</th>
              </tr>
            </thead>
            <tbody id="users-tbody">
              ${lignesUtilisateurs(getSearch())}
            </tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  VUE UTILISATEUR
// ============================================================

function renderUserView() {
  const onglet = getOnglet();

  if (onglet !== 'overview') {
    return `
      <header class="view-header animate-in">
        <div>
          <h1 class="view-title">${MENUS.user.find((m) => m.id === onglet)?.label || 'Section'}</h1>
          <p class="view-subtitle">Bientôt disponible.</p>
        </div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">Cette section sera disponible prochainement.</p>' })}`;
  }

  const p = DATA.user.profil;

  const sessionItems = DATA.user.sessions.map((s, i) => `
    <div class="session-item stagger-${i + 1}" style="animation:fadeUp .4s ${0.05 * (i+1)}s ease both">
      <div class="session-date-badge">
        <span class="session-date-day">${s.date}</span>
        <span class="session-date-month">${s.mois}</span>
      </div>
      <div class="session-info">
        <div class="session-title">${s.emoji} ${s.titre}</div>
        <div class="session-meta">
          <i class="bi bi-geo-alt-fill" style="color:var(--accent);font-size:.7rem"></i>
          ${s.lieu}
        </div>
      </div>
      ${badgeStatut(s.statut)}
    </div>`).join('');

  const suggestItems = DATA.user.suggestions.map((a, i) => `
    <div class="suggest-card" style="animation-delay:${0.05 * (i+1)}s">
      <div class="suggest-img-placeholder">${a.emoji}</div>
      <div class="suggest-body">
        <div class="suggest-title">${a.titre}</div>
        <div class="suggest-location">
          <i class="bi bi-geo-alt-fill" style="color:var(--accent)"></i> ${a.lieu}
        </div>
        <div class="suggest-footer">
          <span class="suggest-price">${a.prix} €</span>
          <span class="suggest-rating"><i class="bi bi-star-fill"></i> ${a.note}</span>
        </div>
        <button type="button" class="btn-reserver">Réserver</button>
      </div>
    </div>`).join('');

  return `
    <div class="profile-premium-card">
      <div class="profile-avatar-lg">${initiales(p.prenom + ' ' + p.nom)}</div>
      <div>
        <div class="profile-premium-name">${p.prenom} ${p.nom}</div>
        <div class="profile-premium-email">${p.email}</div>
        <div class="profile-premium-badges">
          <span class="profile-badge-pill"><i class="bi bi-patch-check-fill"></i> Vérifié</span>
          <span class="profile-badge-pill"><i class="bi bi-star-fill"></i> ${p.points} pts</span>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-value">${p.sessions}</div>
          <div class="profile-stat-label">Sessions</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${p.favoris}</div>
          <div class="profile-stat-label">Favoris</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${p.points}</div>
          <div class="profile-stat-label">Points</div>
        </div>
      </div>
    </div>

    <div class="two-col">
      ${Card({
        titre: '📅 Prochaines sessions',
        contenu: `<div class="sessions-list">${sessionItems}</div>`,
        classes: 'animate-in',
      })}
      ${Card({
        titre: '🔥 Activité récente',
        classes: 'animate-in',
        contenu: `
          <div style="display:flex;flex-direction:column;gap:.6rem">
            ${[
              { icone: '✅', texte: 'Réservation confirmée — Escalade en salle',   date: 'Il y a 2h' },
              { icone: '⭐', texte: 'Avis laissé — Yoga au parc (4.8/5)',          date: 'Hier' },
              { icone: '❤️', texte: 'Ajouté aux favoris — Surf Atlantique',        date: '20/04' },
              { icone: '🎯', texte: 'Inscription — Kayak en rivière',              date: '18/04' },
            ].map((e, i) => `
              <div style="display:flex;gap:.75rem;align-items:flex-start;
                          padding:.6rem;border-radius:.75rem;
                          animation:fadeUp .4s ${0.05*(i+1)}s ease both">
                <span style="font-size:1.1rem;flex-shrink:0">${e.icone}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:.82rem;font-weight:500;color:var(--text)">${e.texte}</div>
                  <div style="font-size:.7rem;color:var(--text-muted);margin-top:.1rem">${e.date}</div>
                </div>
              </div>`).join('')}
          </div>`,
      })}
    </div>

    ${Card({
      titre: '✨ Suggéré pour vous',
      classes: 'animate-in',
      contenu: `<div class="suggest-grid">${suggestItems}</div>`,
    })}`;
}

// ============================================================
//  VUE PUBLISHER
// ============================================================

function renderPublisherView() {
  const onglet = getOnglet();

  if (onglet !== 'overview') {
    return `
      <header class="view-header animate-in">
        <div>
          <h1 class="view-title">${MENUS.publisher.find((m) => m.id === onglet)?.label || 'Section'}</h1>
          <p class="view-subtitle">Bientôt disponible.</p>
        </div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">Cette section sera disponible prochainement.</p>' })}`;
  }

  const d = DATA.publisher;
  const p = d.profil;

  const lignesAnnonces = d.annonces.map((a) => `
    <tr>
      <td><span style="font-size:1.1rem">${a.emoji}</span> ${a.titre}</td>
      <td style="font-weight:700;color:var(--accent)">${a.prix} €</td>
      <td style="color:#f59e0b;font-weight:600">${etoiles(a.note)} ${a.note}</td>
      <td><span class="badge-status ${a.statut ? 'badge-actif' : 'badge-inactif'}">${a.statut ? 'Visible' : 'Masquée'}</span></td>
      <td style="font-weight:600">${a.reservations}</td>
      <td>
        <button type="button" class="btn-outline" style="padding:.3rem .7rem;font-size:.72rem">
          <i class="bi bi-pencil"></i>
        </button>
      </td>
    </tr>`).join('');

  const lignesResa = d.dernieresReservations.map((r) => `
    <tr>
      <td style="font-weight:600;font-size:.8rem">#${r.id}</td>
      <td style="font-size:.82rem">${r.activite}</td>
      <td style="font-size:.82rem">${r.client}</td>
      <td><span class="badge-status badge-user">${r.groupe} pers.</span></td>
      <td style="font-size:.78rem;color:var(--text-muted)">${r.date}</td>
    </tr>`).join('');

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Bonjour ${p.prenom} 👋</h1>
        <p class="view-subtitle">Gérez vos annonces et suivez vos performances.</p>
      </div>
      <button type="button" class="btn-primary">
        <i class="bi bi-plus-lg"></i> Nouvelle annonce
      </button>
    </header>

    <div class="kpi-grid mb-6">
      ${[
        { icone: '📋', titre: 'Annonces actives',    valeur: d.kpi.annonces.valeur,     couleur: d.kpi.annonces.couleur,     couleurIcone: d.kpi.annonces.couleurIcone },
        { icone: '📆', titre: 'Réservations reçues', valeur: d.kpi.reservations.valeur, couleur: d.kpi.reservations.couleur, couleurIcone: d.kpi.reservations.couleurIcone },
        { icone: '💰', titre: 'Revenus du mois',     valeur: d.kpi.revenu.valeur,       couleur: d.kpi.revenu.couleur,       couleurIcone: d.kpi.revenu.couleurIcone },
        { icone: '↩',  titre: 'Taux de réponse',     valeur: d.kpi.taux.valeur,         couleur: d.kpi.taux.couleur,         couleurIcone: d.kpi.taux.couleurIcone },
      ].map((k) => KpiCard(k)).join('')}
    </div>

    ${Card({
      classes: 'table-card mb-6 animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Mes annonces</span>
          <button type="button" class="btn-outline" style="font-size:.78rem">
            <i class="bi bi-funnel"></i> Filtrer
          </button>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr><th>Activité</th><th>Prix</th><th>Note</th><th>Statut</th><th>Résa</th><th></th></tr>
            </thead>
            <tbody>${lignesAnnonces}</tbody>
          </table>
        </div>`,
    })}

    ${Card({
      classes: 'animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Dernières réservations reçues</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr><th>#</th><th>Activité</th><th>Client</th><th>Groupe</th><th>Date</th></tr>
            </thead>
            <tbody>${lignesResa}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  RAFRAICHIR TABLEAU (sans recréer tout le DOM)
// ============================================================

function rafraichirTableau() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  const recherche = getSearch();
  const liste = recherche
    ? DATA.admin.utilisateurs.filter((u) =>
        u.nom.toLowerCase().includes(recherche) ||
        u.email.toLowerCase().includes(recherche))
    : DATA.admin.utilisateurs;

  if (!liste.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun résultat.</td></tr>';
    return;
  }

  tbody.innerHTML = liste.map((u) => `
    <tr>
      <td>
        <div class="table-user-cell">
          <div class="table-avatar">${initiales(u.nom)}</div>
          <div>
            <div style="font-weight:600;font-size:.85rem">${u.nom}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${u.email}</div>
          </div>
        </div>
      </td>
      <td>${badgeRole(u.role)}</td>
      <td>${badgeStatut(u.statut)}</td>
      <td style="font-size:.8rem;color:var(--text-muted)">${u.date}</td>
      <td>
        <button type="button" class="btn-outline" style="padding:.3rem .75rem;font-size:.72rem">
          <i class="bi bi-pencil"></i> Éditer
        </button>
      </td>
    </tr>`).join('');
}

// ============================================================
//  RENDER PRINCIPAL
// ============================================================

function renderDashboard() {
  const layout  = document.getElementById('dash-layout');
  const main    = document.getElementById('dash-main');
  if (!main) return;

  const role = getRole();
  layout.dataset.role = role;

  let contenu = '';
  if      (role === 'admin')     contenu = renderAdminView();
  else if (role === 'publisher') contenu = renderPublisherView();
  else                           contenu = renderUserView();

  main.innerHTML = contenu;
  renderSidebar();
}

// ============================================================
//  MOBILE SIDEBAR
// ============================================================

function initMobileSidebar() {
  const burger  = document.getElementById('dash-burger');
  const sidebar = document.getElementById('dash-sidebar');
  const overlay = document.getElementById('dash-overlay');

  burger?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  });
}

// ============================================================
//  INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Définir le rôle par défaut sur le layout
  const layout = document.getElementById('dash-layout');
  if (layout) layout.dataset.role = getRole();

  // Masquer le loader et afficher le dashboard
  const loader = document.getElementById('dash-loader');
  if (loader) loader.remove();

  renderDashboard();
  initMobileSidebar();
});
