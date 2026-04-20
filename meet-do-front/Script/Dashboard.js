/* =====================================================
   Meet&Do — Dashboard (vanilla JS + API réelle)
   ===================================================== */

const API = 'http://localhost:3000';

// ---- État centralisé ----
const state = {};

function creerEtat(cle, valeurInitiale) {
  state[cle] = valeurInitiale;
  return { get: () => state[cle] };
}

creerEtat('role',          'user');
creerEtat('onglet',        'overview');
creerEtat('search',        '');
creerEtat('profil',        null);
creerEtat('dashboardData', null);

const getRole   = () => state.role;
const getOnglet = () => state.onglet;
const getSearch = () => state.search;

function setOnglet(v) { state.onglet = v; renderDashboard(); }
function setSearch(v) { state.search = v; rafraichirTableau(); }

// ---- Menus par rôle ----
const MENUS = {
  admin: [
    { id: 'overview',   icone: 'bi-grid-fill',          label: 'Vue d\'ensemble' },
    { id: 'users',      icone: 'bi-people-fill',         label: 'Gestion Utilisateurs' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Messagerie Support' },
    { id: 'reports',    icone: 'bi-flag-fill',           label: 'Signalements' },
    { id: 'validation', icone: 'bi-patch-check-fill',    label: 'Validation Meeters' },
    { id: 'settings',   icone: 'bi-gear-fill',           label: 'Paramètres' },
  ],
  user: [
    { id: 'overview',   icone: 'bi-grid-fill',           label: 'Mon Dashboard' },
    { id: 'explore',    icone: 'bi-search',              label: 'Explorer' },
    { id: 'activities', icone: 'bi-calendar3',           label: 'Mes Activités' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Messagerie' },
    { id: 'favorites',  icone: 'bi-heart-fill',          label: 'Favoris' },
    { id: 'account',    icone: 'bi-person-fill',         label: 'Mon Compte' },
  ],
  publisher: [
    { id: 'overview',   icone: 'bi-grid-fill',           label: 'Vue d\'ensemble' },
    { id: 'listings',   icone: 'bi-megaphone-fill',      label: 'Mes Annonces' },
    { id: 'bookings',   icone: 'bi-calendar-check-fill', label: 'Réservations' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Messagerie' },
    { id: 'stats',      icone: 'bi-bar-chart-fill',      label: 'Statistiques' },
    { id: 'account',    icone: 'bi-person-fill',         label: 'Mon Compte' },
  ],
};

// Données trafic statiques pour le graphique admin
const TRAFIC_DEMO = [
  { label: 'Lun', val: 320 }, { label: 'Mar', val: 480 },
  { label: 'Mer', val: 410 }, { label: 'Jeu', val: 560 },
  { label: 'Ven', val: 620 }, { label: 'Sam', val: 740 },
  { label: 'Dim', val: 530 },
];

// ---- Helpers ----
function initiales(prenom, nom) {
  return ((prenom || '?')[0] + (nom || '?')[0]).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPrix(val) {
  if (val === undefined || val === null) return '—';
  return Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function etoiles(note) {
  const n = Math.round(note || 0);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function badgeStatut(statut) {
  const map = {
    actif:    '<span class="badge-status badge-actif"><i class="bi bi-circle-fill" style="font-size:.45rem"></i> Actif</span>',
    inactif:  '<span class="badge-status badge-inactif"><i class="bi bi-circle-fill" style="font-size:.45rem"></i> Inactif</span>',
    attente:  '<span class="badge-status badge-attente"><i class="bi bi-clock-fill" style="font-size:.6rem"></i> En attente</span>',
    confirme: '<span class="badge-status badge-actif"><i class="bi bi-check-circle-fill" style="font-size:.6rem"></i> Confirmé</span>',
  };
  return map[statut] || `<span class="badge-status badge-attente">${statut}</span>`;
}

function badgeRole(role) {
  const r = (role || '').toLowerCase();
  const map = {
    admin:     '<span class="badge-status badge-admin">Admin</span>',
    user:      '<span class="badge-status badge-user">Utilisateur</span>',
    publisher: '<span class="badge-status badge-publisher">Éditeur</span>',
  };
  return map[r] || `<span class="badge-status badge-attente">${role}</span>`;
}

function statutDepuisEnabled(enabled) {
  return enabled ? 'actif' : 'inactif';
}

// ---- Composants réutilisables ----
function KpiCard({ icone, titre, valeur, tendance, sens, couleur, couleurIcone }) {
  return `
    <div class="kpi-card">
      <div class="kpi-icon-wrap" style="background:${couleur || '#f1f5f9'};color:${couleurIcone || 'var(--accent)'}">
        <span style="font-size:1.3rem">${icone}</span>
      </div>
      <div class="kpi-label">${titre}</div>
      <div class="kpi-value">${valeur ?? '—'}</div>
      ${tendance ? `<div class="kpi-trend ${sens || 'neutral'}">
        <i class="bi bi-arrow-${sens === 'up' ? 'up' : sens === 'down' ? 'down' : 'right'}-right"></i> ${tendance}
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
  const W = 560, H = 180;
  const padL = 36, padR = 16, padT = 12, padB = 32;
  const w = W - padL - padR;
  const h = H - padT - padB;
  const max = Math.max(...data.map((d) => d.val));
  const px  = (i) => padL + (i / (data.length - 1)) * w;
  const py  = (v) => padT + h - (v / (max || 1)) * h;

  let chemin = `M ${px(0)} ${py(data[0].val)}`;
  for (let i = 1; i < data.length; i++) {
    const cpx = (px(i - 1) + px(i)) / 2;
    chemin += ` C ${cpx} ${py(data[i-1].val)}, ${cpx} ${py(data[i].val)}, ${px(i)} ${py(data[i].val)}`;
  }
  const aire  = chemin + ` L ${px(data.length-1)} ${padT+h} L ${px(0)} ${padT+h} Z`;
  const gradId = 'g' + Math.random().toString(36).slice(2,7);

  const grilles = [0.25,0.5,0.75,1].map((t) => {
    const y = padT + h*(1-t);
    return `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/>
            <text x="${padL-4}" y="${y+4}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="Inter">${Math.round(max*t)}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" style="display:block">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${couleur}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${couleur}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${grilles}
    <path d="${aire}"  fill="url(#${gradId})"/>
    <path d="${chemin}" fill="none" stroke="${couleur}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${data.map((d,i) => `<circle cx="${px(i)}" cy="${py(d.val)}" r="4" fill="white" stroke="${couleur}" stroke-width="2.5"/>
      <text x="${px(i)}" y="${H-6}" text-anchor="middle" font-size="10" fill="#94a3b8" font-family="Inter">${d.label}</text>`).join('')}
  </svg>`;
}

// ============================================================
//  APPEL API
// ============================================================

async function appelApi(chemin, methode = 'GET', corps = null) {
  const options = {
    method: methode,
    credentials: 'include',
    headers: corps ? { 'Content-Type': 'application/json' } : {},
  };
  if (corps) options.body = JSON.stringify(corps);

  const res = await fetch(`${API}${chemin}`, options);
  if (res.status === 401) { window.location.href = 'Login.html'; throw new Error('Non authentifié'); }
  if (!res.ok) throw new Error(`Erreur ${res.status} sur ${chemin}`);
  return res.json();
}

async function chargerDonnees() {
  afficherLoader(true);
  try {
    const profil = await appelApi('/user/me');
    state.profil = profil;

    const role = (profil.role || 'user').toLowerCase();
    state.role = role;

    const layout = document.getElementById('dash-layout');
    if (layout) layout.dataset.role = role;

    const data = await appelApi(`/dashboard/${role}`);
    state.dashboardData = data;

    afficherLoader(false);
    renderDashboard();
    initMobileSidebar();
  } catch (err) {
    if (!err.message.includes('Non authentifié')) {
      afficherErreur(err.message);
    }
  }
}

function afficherLoader(visible) {
  const main = document.getElementById('dash-main');
  if (!main) return;
  if (visible) {
    main.innerHTML = `
      <div class="dash-loader">
        <div class="dash-spinner"></div>
        <p>Chargement de votre espace…</p>
      </div>`;
  }
}

function afficherErreur(message) {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <div class="dash-loader">
      <span style="font-size:2rem">⚠️</span>
      <p style="color:var(--text-muted)">${message || 'Impossible de charger les données.'}</p>
      <button type="button" class="btn-primary" onclick="chargerDonnees()">
        <i class="bi bi-arrow-clockwise"></i> Réessayer
      </button>
    </div>`;
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
  const profil = state.profil || {};

  const nomRole = role === 'admin' ? 'Administrateur'
    : role === 'publisher'         ? 'Client Éditeur'
    : 'Utilisateur';

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">M</div>
      <div class="sidebar-brand-text">
        <div class="sidebar-brand-name">MEET & DO</div>
        <div class="sidebar-brand-sub">Espace ${nomRole}</div>
      </div>
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
      <div class="sidebar-user-avatar">${initiales(profil.firstname, profil.lastname)}</div>
      <div>
        <div class="sidebar-user-name">${profil.firstname || ''} ${profil.lastname || ''}</div>
        <div class="sidebar-user-role">${nomRole}</div>
      </div>
    </div>`;

  sidebar.querySelectorAll('.sidebar-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setOnglet(btn.dataset.onglet);
      sidebar.classList.remove('open');
      document.getElementById('dash-overlay')?.classList.remove('visible');
    });
  });
}

// ============================================================
//  VUE ADMIN
// ============================================================

function renderAdminView() {
  const onglet = getOnglet();
  const data   = state.dashboardData || {};
  const kpi    = data.kpi || {};
  const users  = data.derniersUtilisateurs || [];

  if (onglet === 'validation') {
    renderValidationTab();
    return null;
  }

  if (onglet !== 'overview') {
    const label = MENUS.admin.find((m) => m.id === onglet)?.label || 'Section';
    return `
      <header class="view-header animate-in">
        <div><h1 class="view-title">${label}</h1><p class="view-subtitle">Bientôt disponible.</p></div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">Cette section sera disponible prochainement.</p>' })}`;
  }

  const lignes = (recherche) => {
    const liste = recherche
      ? users.filter((u) =>
          `${u.firstname} ${u.lastname}`.toLowerCase().includes(recherche) ||
          (u.email || '').toLowerCase().includes(recherche))
      : users;

    if (!liste.length) {
      return '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun résultat.</td></tr>';
    }
    return liste.map((u) => `
      <tr>
        <td>
          <div class="table-user-cell">
            <div class="table-avatar">${initiales(u.firstname, u.lastname)}</div>
            <div>
              <div style="font-weight:600;font-size:.85rem">${u.firstname || ''} ${u.lastname || ''}</div>
              <div style="font-size:.72rem;color:var(--text-muted)">${u.email}</div>
            </div>
          </div>
        </td>
        <td>${badgeRole(u.role)}</td>
        <td>${badgeStatut(statutDepuisEnabled(u.enabled))}</td>
        <td style="font-size:.8rem;color:var(--text-muted)">${formatDate(u.created_at)}</td>
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
      ${[
        { icone: '💰', titre: 'Revenu total',       valeur: formatPrix(kpi.revenu),            tendance: null,         sens: 'up',   couleur: '#dbeafe', couleurIcone: '#2563eb' },
        { icone: '👥', titre: 'Nouveaux Meeters',   valeur: kpi.nouveauxUtilisateurs,          tendance: '7 derniers jours', sens: 'up', couleur: '#d1fae5', couleurIcone: '#059669' },
        { icone: '🚩', titre: 'Signalements',       valeur: kpi.signalements,                  tendance: null,         sens: 'neutral', couleur: '#fee2e2', couleurIcone: '#dc2626' },
        { icone: '📈', titre: 'Taux de conversion', valeur: `${kpi.tauxConversion ?? 0} %`,    tendance: null,         sens: 'up',   couleur: '#ede9fe', couleurIcone: '#7c3aed' },
      ].map((k) => KpiCard(k)).join('')}
    </div>

    ${Card({
      classes: 'chart-card mb-6',
      contenu: `
        <div class="chart-header">
          <span class="chart-title">Trafic hebdomadaire</span>
          <span class="chart-badge">${kpi.totalUtilisateurs ?? 0} utilisateurs au total</span>
        </div>
        <div class="chart-wrapper">${creerGraphiqueArea(TRAFIC_DEMO, '#2563eb')}</div>`,
    })}

    ${Card({
      classes: 'table-card',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Derniers utilisateurs inscrits</span>
          <div class="table-search">
            <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
            <input type="text" id="user-search" placeholder="Rechercher…" value="${getSearch()}"
              oninput="setSearch(this.value.toLowerCase())">
          </div>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Inscrit le</th><th>Action</th></tr></thead>
            <tbody id="users-tbody">${lignes(getSearch())}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  VUE UTILISATEUR
// ============================================================

function renderUserView() {
  const onglet   = getOnglet();
  const profil   = state.profil || {};
  const data     = state.dashboardData || {};
  const sessions = data.prochainesSessions || [];
  const suggest  = data.activitesSuggérées || [];

  if (onglet === 'account') return renderMonCompte();

  if (onglet !== 'overview') {
    const label = MENUS.user.find((m) => m.id === onglet)?.label || 'Section';
    return `
      <header class="view-header animate-in">
        <div><h1 class="view-title">${label}</h1><p class="view-subtitle">Bientôt disponible.</p></div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">Cette section sera disponible prochainement.</p>' })}`;
  }

  const sessionItems = sessions.length
    ? sessions.map((s, i) => {
        const activity = s.event?.activity || {};
        const d = new Date(s.date || s.event?.date);
        return `
          <div class="session-item" style="animation:fadeUp .4s ${0.05*(i+1)}s ease both">
            <div class="session-date-badge">
              <span class="session-date-day">${d.getDate()}</span>
              <span class="session-date-month">${d.toLocaleString('fr-FR',{month:'short'}).toUpperCase()}</span>
            </div>
            <div class="session-info">
              <div class="session-title">🎯 ${activity.title || 'Activité'}</div>
              <div class="session-meta">
                <i class="bi bi-geo-alt-fill" style="color:var(--accent);font-size:.7rem"></i>
                ${activity.address || '—'}
              </div>
            </div>
            ${badgeStatut('confirme')}
          </div>`;
      }).join('')
    : '<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">Aucune session à venir.</p>';

  const suggestItems = suggest.length
    ? suggest.map((a, i) => `
        <div class="suggest-card" style="animation-delay:${0.05*(i+1)}s">
          <div class="suggest-img-placeholder">🏃</div>
          <div class="suggest-body">
            <div class="suggest-title">${a.title}</div>
            <div class="suggest-location">
              <i class="bi bi-geo-alt-fill" style="color:var(--accent)"></i> ${a.address || '—'}
            </div>
            <div class="suggest-footer">
              <span class="suggest-price">${formatPrix(a.price)}</span>
              <span class="suggest-rating"><i class="bi bi-star-fill"></i> ${(a.average_rating || 0).toFixed(1)}</span>
            </div>
            <button type="button" class="btn-reserver">Réserver</button>
          </div>
        </div>`).join('')
    : '<p style="color:var(--text-muted);font-size:.85rem">Aucune suggestion disponible.</p>';

  return `
    <div class="profile-premium-card">
      <div class="profile-avatar-lg">${initiales(profil.firstname, profil.lastname)}</div>
      <div>
        <div class="profile-premium-name">${profil.firstname || ''} ${profil.lastname || ''}</div>
        <div class="profile-premium-email">${profil.email || ''}</div>
        <div class="profile-premium-badges">
          <span class="profile-badge-pill"><i class="bi bi-patch-check-fill"></i> Vérifié</span>
          <span class="profile-badge-pill"><i class="bi bi-calendar-event"></i> ${sessions.length} session(s)</span>
        </div>
      </div>
      <div class="profile-stats">
        <div class="profile-stat">
          <div class="profile-stat-value">${sessions.length}</div>
          <div class="profile-stat-label">Sessions</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${suggest.length}</div>
          <div class="profile-stat-label">Suggestions</div>
        </div>
      </div>
    </div>

    <div class="two-col">
      ${Card({ titre: '📅 Prochaines sessions', contenu: `<div class="sessions-list">${sessionItems}</div>`, classes: 'animate-in' })}
      ${Card({
        titre: '✨ À découvrir',
        classes: 'animate-in',
        contenu: `<div class="suggest-grid" style="grid-template-columns:1fr">${
          suggest.slice(0,3).map((a) => `
            <div style="display:flex;gap:.75rem;align-items:center;padding:.6rem;border-radius:.75rem;transition:background .2s" onmouseover="this.style.background='var(--accent-soft)'" onmouseout="this.style.background='transparent'">
              <div style="width:42px;height:42px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">🏃</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a.title}</div>
                <div style="font-size:.72rem;color:var(--text-muted)">${formatPrix(a.price)} · ${(a.average_rating||0).toFixed(1)} ★</div>
              </div>
            </div>`).join('')
        }</div>`,
      })}
    </div>

    ${Card({ titre: '✨ Suggéré pour vous', classes: 'animate-in', contenu: `<div class="suggest-grid">${suggestItems}</div>` })}`;
}

// ============================================================
//  VUE PUBLISHER
// ============================================================

function renderPublisherView() {
  const onglet       = getOnglet();
  const profil       = state.profil || {};
  const data         = state.dashboardData || {};
  const kpi          = data.kpi || {};
  const annonces     = data.annonces || [];
  const reservations = data.dernieresReservations || [];

  if (onglet === 'account') return renderMonCompte();

  if (onglet !== 'overview') {
    const label = MENUS.publisher.find((m) => m.id === onglet)?.label || 'Section';
    return `
      <header class="view-header animate-in">
        <div><h1 class="view-title">${label}</h1><p class="view-subtitle">Bientôt disponible.</p></div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">Cette section sera disponible prochainement.</p>' })}`;
  }

  const lignesAnnonces = annonces.length
    ? annonces.map((a) => `
        <tr>
          <td style="font-weight:600;font-size:.85rem">${a.title}</td>
          <td style="font-weight:700;color:var(--accent)">${formatPrix(a.price)}</td>
          <td style="color:#f59e0b;font-weight:600">${(a.average_rating || 0).toFixed(1)} ★</td>
          <td><span class="badge-status ${a.is_visible ? 'badge-actif' : 'badge-inactif'}">${a.is_visible ? 'Visible' : 'Masquée'}</span></td>
          <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(a.created_at)}</td>
          <td>
            <button type="button" class="btn-outline" style="padding:.3rem .7rem;font-size:.72rem">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucune annonce publiée.</td></tr>';

  const lignesResa = reservations.length
    ? reservations.map((r) => `
        <tr>
          <td style="font-weight:600;font-size:.8rem">#${r.id}</td>
          <td style="font-size:.82rem">${formatDate(r.date)}</td>
          <td><span class="badge-status badge-user">${r.group_size ?? 1} pers.</span></td>
        </tr>`).join('')
    : '<tr><td colspan="3" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucune réservation reçue.</td></tr>';

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Bonjour ${profil.firstname || ''} 👋</h1>
        <p class="view-subtitle">Gérez vos annonces et suivez vos performances.</p>
      </div>
      <button type="button" class="btn-primary">
        <i class="bi bi-plus-lg"></i> Nouvelle annonce
      </button>
    </header>

    <div class="kpi-grid mb-6">
      ${[
        { icone: '📋', titre: 'Annonces actives',    valeur: kpi.annoncesActives  ?? 0, couleur: '#dbeafe', couleurIcone: '#2563eb' },
        { icone: '📆', titre: 'Réservations reçues', valeur: kpi.reservationsRecues ?? 0, couleur: '#d1fae5', couleurIcone: '#059669' },
        { icone: '💰', titre: 'Revenus du mois',     valeur: formatPrix(kpi.revenuDuMois), couleur: '#ede9fe', couleurIcone: '#7c3aed' },
        { icone: '↩',  titre: 'Taux de réponse',     valeur: `${kpi.tauxReponse ?? 0} %`, couleur: '#fef3c7', couleurIcone: '#d97706' },
      ].map((k) => KpiCard(k)).join('')}
    </div>

    ${Card({
      classes: 'table-card mb-6 animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Mes annonces</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Titre</th><th>Prix</th><th>Note</th><th>Statut</th><th>Créée le</th><th></th></tr></thead>
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
            <thead><tr><th>#</th><th>Date</th><th>Groupe</th></tr></thead>
            <tbody>${lignesResa}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  ONGLET MON COMPTE (user + publisher)
// ============================================================

function renderMonCompte() {
  const profil = state.profil || {};
  const role   = getRole();
  const isPending   = profil.publisher_request === true;
  const isPublisher = role === 'publisher';

  const sectionPublisher = (!isPublisher && role === 'user') ? `
    <div class="glass-card animate-in" style="margin-top:1.5rem;border:2px solid var(--accent-mid)">
      <div class="card-title">📢 Devenir éditeur d'annonces</div>
      ${isPending ? `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:var(--accent-soft);border-radius:var(--radius-sm)">
          <span style="font-size:1.4rem">⏳</span>
          <div>
            <div style="font-weight:600;font-size:.9rem;color:var(--accent)">Demande en cours de traitement</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:.2rem">
              Un administrateur examinera votre demande prochainement.
            </div>
          </div>
        </div>` : `
        <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">
          En devenant éditeur, vous pourrez publier vos propres annonces d'activités
          sur la plateforme et recevoir des réservations de la communauté Meet&Do.
        </p>
        <ul style="font-size:.82rem;color:var(--text-muted);margin-bottom:1.25rem;padding-left:1.2rem;line-height:1.8">
          <li>Créez et gérez vos activités facilement</li>
          <li>Recevez des réservations en temps réel</li>
          <li>Accédez à vos statistiques de performance</li>
        </ul>
        <button type="button" class="btn-primary" id="btn-request-publisher">
          <i class="bi bi-send-fill"></i> Envoyer ma demande
        </button>`}
    </div>` : '';

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Mon Compte</h1>
        <p class="view-subtitle">Gérez vos informations personnelles.</p>
      </div>
    </header>

    <div style="max-width:640px">
      <form class="glass-card animate-in" id="form-profil">
        <div class="card-title">👤 Informations personnelles</div>

        <div id="form-profil-feedback" style="margin-bottom:.75rem"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
          <div>
            <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Prénom</label>
            <input type="text" name="firstname" value="${profil.firstname || ''}"
              style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                     font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
          </div>
          <div>
            <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Nom</label>
            <input type="text" name="lastname" value="${profil.lastname || ''}"
              style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                     font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
          </div>
        </div>

        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Email</label>
          <input type="email" value="${profil.email || ''}" disabled
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.06);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;background:var(--bg);color:var(--text-muted);cursor:not-allowed">
          <p style="font-size:.7rem;color:var(--text-muted);margin-top:.25rem">L'email ne peut pas être modifié.</p>
        </div>

        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Adresse</label>
          <input type="text" name="address" value="${profil.address || ''}"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>

        <button type="submit" class="btn-primary">
          <i class="bi bi-check-lg"></i> Enregistrer les modifications
        </button>
      </form>

      ${sectionPublisher}
    </div>`;
}

// ============================================================
//  ONGLET VALIDATION (admin — demandes éditeur)
// ============================================================

async function renderValidationTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Validation Meeters</h1>
        <p class="view-subtitle">Demandes de passage au rôle éditeur.</p>
      </div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const demandes = await appelApi('/dashboard/admin/publisher-requests');
    renderSidebar();

    const lignes = demandes.length
      ? demandes.map((u) => `
          <tr>
            <td>
              <div class="table-user-cell">
                <div class="table-avatar">${initiales(u.firstname, u.lastname)}</div>
                <div>
                  <div style="font-weight:600;font-size:.85rem">${u.firstname || ''} ${u.lastname || ''}</div>
                  <div style="font-size:.72rem;color:var(--text-muted)">${u.email}</div>
                </div>
              </div>
            </td>
            <td style="font-size:.8rem;color:var(--text-muted)">${formatDate(u.created_at)}</td>
            <td>
              <div style="display:flex;gap:.5rem">
                <button type="button" class="btn-primary" style="padding:.35rem .9rem;font-size:.75rem"
                  data-action="approve" data-id="${u.id}">
                  <i class="bi bi-check-lg"></i> Approuver
                </button>
                <button type="button" class="btn-outline" style="padding:.35rem .9rem;font-size:.75rem;color:#dc2626;border-color:#dc2626"
                  data-action="reject" data-id="${u.id}">
                  <i class="bi bi-x-lg"></i> Refuser
                </button>
              </div>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="3" style="color:var(--text-muted);padding:2rem;text-align:center">Aucune demande en attente.</td></tr>';

    main.innerHTML = `
      <header class="view-header animate-in">
        <div>
          <h1 class="view-title">Validation Meeters</h1>
          <p class="view-subtitle">${demandes.length} demande(s) en attente.</p>
        </div>
      </header>
      ${Card({
        classes: 'table-card animate-in',
        contenu: `
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead><tr><th>Utilisateur</th><th>Inscrit le</th><th>Actions</th></tr></thead>
              <tbody>${lignes}</tbody>
            </table>
          </div>`,
      })}`;

    main.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const id     = btn.dataset.id;
        btn.disabled = true;
        try {
          await appelApi(`/dashboard/admin/${action}-publisher/${id}`, 'PATCH');
          renderValidationTab();
        } catch (e) {
          btn.disabled = false;
          alert('Erreur : ' + e.message);
        }
      });
    });

  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${e.message}</p></div>`;
  }
}

// ============================================================
//  RAFRAICHIR TABLEAU (sans reconstruire le DOM)
// ============================================================

function rafraichirTableau() {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  const users     = (state.dashboardData || {}).derniersUtilisateurs || [];
  const recherche = getSearch();
  const liste     = recherche
    ? users.filter((u) =>
        `${u.firstname} ${u.lastname}`.toLowerCase().includes(recherche) ||
        (u.email || '').toLowerCase().includes(recherche))
    : users;

  if (!liste.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun résultat.</td></tr>';
    return;
  }
  tbody.innerHTML = liste.map((u) => `
    <tr>
      <td>
        <div class="table-user-cell">
          <div class="table-avatar">${initiales(u.firstname, u.lastname)}</div>
          <div>
            <div style="font-weight:600;font-size:.85rem">${u.firstname || ''} ${u.lastname || ''}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${u.email}</div>
          </div>
        </div>
      </td>
      <td>${badgeRole(u.role)}</td>
      <td>${badgeStatut(statutDepuisEnabled(u.enabled))}</td>
      <td style="font-size:.8rem;color:var(--text-muted)">${formatDate(u.created_at)}</td>
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
  const main = document.getElementById('dash-main');
  if (!main) return;

  const role = getRole();
  let contenu = '';
  if      (role === 'admin')     contenu = renderAdminView();
  else if (role === 'publisher') contenu = renderPublisherView();
  else                           contenu = renderUserView();

  if (contenu === null) return; // rendu async (ex: validation)
  main.innerHTML = contenu;
  renderSidebar();
  attachEventListeners();
}

function attachEventListeners() {
  // Formulaire Mon Compte
  const form = document.getElementById('form-profil');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = document.getElementById('form-profil-feedback');
      const data = {
        firstname: form.firstname.value.trim(),
        lastname:  form.lastname.value.trim(),
        address:   form.address.value.trim(),
      };
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Enregistrement…';
      try {
        const updated = await appelApi('/user/me', 'PATCH', data);
        state.profil = { ...state.profil, ...updated };
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#d1fae5;color:#065f46;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-check-circle-fill"></i> Modifications enregistrées avec succès.
        </div>`;
        renderSidebar();
      } catch (err) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> Erreur : ${err.message}
        </div>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Enregistrer les modifications';
      }
    });
  }

  // Demande éditeur
  const btnReq = document.getElementById('btn-request-publisher');
  if (btnReq) {
    btnReq.addEventListener('click', async () => {
      btnReq.disabled = true;
      btnReq.innerHTML = '<i class="bi bi-hourglass-split"></i> Envoi…';
      try {
        await appelApi('/user/request-publisher', 'POST');
        state.profil = { ...state.profil, publisher_request: true };
        setOnglet('account');
      } catch (err) {
        btnReq.disabled = false;
        btnReq.innerHTML = '<i class="bi bi-send-fill"></i> Envoyer ma demande';
        alert('Erreur : ' + err.message);
      }
    });
  }
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
  chargerDonnees();
});
