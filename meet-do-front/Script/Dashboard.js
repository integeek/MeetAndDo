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
    { id: 'overview',             icone: 'bi-grid-fill',          label: 'Tableau de bord' },
    { id: 'users',                icone: 'bi-people-fill',         label: 'Gestion des clients' },
    { id: 'admin_messaging',      icone: 'bi-chat-dots-fill',      label: 'Messagerie' },
    { id: 'reports_users',        icone: 'bi-person-exclamation',  label: 'Signalement utilisateur' },
    { id: 'reports_activities',   icone: 'bi-flag-fill',           label: 'Signalement annonce' },
    { id: 'validation',           icone: 'bi-patch-check-fill',    label: 'Accepter Meeters' },
    { id: 'settings',             icone: 'bi-gear-fill',           label: 'Modifier les tables' },
  ],
  user: [
    { id: 'overview',   icone: 'bi-grid-fill',           label: 'Mon Dashboard' },
    { id: 'historique', icone: 'bi-clock-history',       label: 'Historique' },
    { id: 'activities', icone: 'bi-calendar3',           label: 'Mes Activités' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Messagerie' },
    { id: 'favorites',  icone: 'bi-heart-fill',          label: 'Favoris' },
    { id: 'parrainage', icone: 'bi-people-fill',         label: 'Parrainage' },
    { id: 'account',    icone: 'bi-person-fill',         label: 'Mon Compte' },
  ],
  publisher: [
    { id: 'overview',       icone: 'bi-grid-fill',           label: 'Vue d\'ensemble' },
    { id: 'listings',       icone: 'bi-megaphone-fill',      label: 'Mes Annonces' },
    { id: 'bookings',       icone: 'bi-calendar-check-fill', label: 'Réservations' },
    { id: 'messaging',      icone: 'bi-chat-dots-fill',      label: 'Messagerie' },
    { id: 'stats',          icone: 'bi-bar-chart-fill',      label: 'Statistiques' },
    { id: 'pub_activites',  icone: 'bi-calendar3',           label: 'Mes Activités' },
    { id: 'pub_historique', icone: 'bi-clock-history',       label: 'Historique' },
    { id: 'parrainage',     icone: 'bi-people-fill',         label: 'Parrainage' },
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  return String(str).length > max ? String(str).slice(0, max) + '…' : str;
}

function formatDateConv(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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

    // Rediriger les utilisateurs normaux vers leur espace dédié
    if (role === 'user') {
      window.location.href = 'UserSpace.html';
      return;
    }

    const layout = document.getElementById('dash-layout');
    if (layout) layout.dataset.role = role;

    const data = await appelApi(`/dashboard/${role}`);
    state.dashboardData = data;

    afficherLoader(false);
    renderDashboard();
    initMobileSidebar();

    if (role === 'publisher') {
      demarrerNotificationsPublisher();
    }
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
      ${items.map((item) => item.id === 'sep' ? `
        <li style="padding:.35rem .5rem;font-size:.7rem;color:var(--text-muted);letter-spacing:.05em;user-select:none">
          ── En tant qu'utilisateur
        </li>` : `
        <li class="sidebar-nav-item">
          <button type="button"
            class="sidebar-nav-btn ${onglet === item.id ? 'active' : ''}"
            data-onglet="${item.id}">
            <span class="nav-icon"><i class="bi ${item.icone}"></i></span>
            ${item.label}
            ${(item.id === 'bookings' && role === 'publisher' && _notifBadgeBookings > 0)
              ? `<span class="notif-badge">${_notifBadgeBookings}</span>`
              : ''}
          </button>
        </li>`).join('')}
    </ul>

    `;

  sidebar.querySelectorAll('.sidebar-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.onglet === 'bookings') _notifBadgeBookings = 0;
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

  if (onglet === 'validation')          { renderValidationTab();              return null; }
  if (onglet === 'users')              { renderAdminUsersTab();              return null; }
  if (onglet === 'admin_messaging')    { renderAdminMessagingTab();          return null; }
  if (onglet === 'reports_users')      { renderAdminReportsUsersTab();       return null; }
  if (onglet === 'reports_activities') { renderAdminReportsActivitiesTab();  return null; }
  if (onglet === 'settings')           { renderAdminSettingsTab();           return null; }

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
          <div style="display:flex;gap:.35rem">
            <button type="button" class="icon-btn" title="Voir le profil"
              onclick="adminOverviewVoir(${u.id})">
              <i class="bi bi-eye-fill"></i>
            </button>
            <button type="button" class="icon-btn" title="Modifier le rôle"
              onclick="adminOverviewEditer(${u.id})">
              <i class="bi bi-pencil-fill"></i>
            </button>
            <button type="button" class="icon-btn danger" title="Supprimer"
              onclick="adminOverviewSupprimer(${u.id})">
              <i class="bi bi-trash-fill"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  };

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Tableau de bord Admin</h1>
        <p class="view-subtitle">Bienvenue 👋 — Vue d'ensemble de la plateforme</p>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap">
        <button type="button" class="btn-outline" onclick="exporterDonneesAdminPDF()">
          <i class="bi bi-file-pdf-fill"></i> PDF
        </button>
        <button type="button" class="btn-primary" onclick="exporterDonneesAdmin()">
          <i class="bi bi-download"></i> CSV
        </button>
      </div>
    </header>

    <div class="kpi-grid mb-6">
      ${[
        { icone: '💰', titre: 'Revenu total',       valeur: formatPrix(kpi.revenu),            tendance: null,              sens: 'up',      couleur: '#dbeafe', couleurIcone: '#2563eb' },
        { icone: '👥', titre: 'Nouveaux Meeters',   valeur: kpi.nouveauxUtilisateurs,          tendance: '7 derniers jours', sens: 'up',      couleur: '#d1fae5', couleurIcone: '#059669' },
        { icone: '🚩', titre: 'Signalements',       valeur: kpi.signalements,                  tendance: null,              sens: 'neutral', couleur: '#fee2e2', couleurIcone: '#dc2626' },
        { icone: '📈', titre: 'Taux de conversion', valeur: `${kpi.tauxConversion ?? 0} %`,    tendance: null,              sens: 'up',      couleur: '#ede9fe', couleurIcone: '#7c3aed' },
      ].map((k) => KpiCard(k)).join('')}
    </div>

    <div id="admin-overview-extras">
      <div class="dash-loader" style="min-height:6rem"><div class="dash-spinner"></div></div>
    </div>

    ${Card({
      classes: 'chart-card mb-6',
      contenu: `
        <div class="chart-header">
          <span class="chart-title">Inscriptions hebdomadaires</span>
          <span class="chart-badge">${kpi.totalUtilisateurs ?? 0} utilisateurs au total</span>
        </div>
        <div class="chart-wrapper" id="admin-traffic-chart">
          ${creerGraphiqueArea(TRAFIC_DEMO, '#2563eb')}
        </div>`,
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

  if (onglet === 'account')    return renderMonCompte();
  if (onglet === 'messaging')  { renderMessagingTab();   return null; }
  if (onglet === 'historique') { renderHistoriqueTab();  return null; }
  if (onglet === 'activities') { renderActivitiesTab();  return null; }
  if (onglet === 'favorites')  { renderFavoritesTab();   return null; }
  if (onglet === 'parrainage') { renderParrainageTab();  return null; }

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
    ? suggest.map((a, i) => {
        const img = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
        const emoji = emojiTheme(a.theme);
        const prix = a.price != null ? `${Number(a.price).toLocaleString('fr-FR')}€` : 'Gratuit';
        return `
          <div class="home-activity-card" style="animation-delay:${0.05*(i+1)}s" onclick="">
            ${img
              ? `<img src="${img}" class="home-card-img" alt="${escapeHtml(a.title || '')}" loading="lazy">`
              : `<div class="home-card-img-placeholder">${emoji}</div>`}
            <div class="home-card-content">
              <h2 class="home-card-title">${escapeHtml(a.title || '—')}</h2>
              <p><strong>Lieu :</strong> ${escapeHtml(a.address || '—')}</p>
              <p><strong>Prix :</strong> ${prix}</p>
              <p><strong>Note :</strong> ⭐ ${(a.average_rating || 0).toFixed(1)}</p>
            </div>
          </div>`;
      }).join('')
    : '<p style="color:var(--text-muted);font-size:.85rem">Aucune suggestion disponible.</p>';

  return `
    <div class="profile-premium-card">
      <div class="profile-avatar-lg" style="${profil.avatar_url ? 'padding:0;overflow:hidden' : ''}">
        ${profil.avatar_url
          ? `<img src="${profil.avatar_url}" alt="avatar" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit">`
          : initiales(profil.firstname, profil.lastname)}
      </div>
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

    ${Card({ titre: '✨ Suggéré pour vous', classes: 'animate-in', contenu: `<div class="explorer-grid">${suggestItems}</div>` })}`;
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

  if (onglet === 'messaging')      { renderMessagingTab();              return null; }
  if (onglet === 'pub_activites')  { renderPublisherActivitesTab();     return null; }
  if (onglet === 'pub_historique') { renderPublisherHistoriqueTab();    return null; }
  if (onglet === 'stats')          { renderPublisherStatsTab();          return null; }
  if (onglet === 'listings')       { renderPublisherListingsTab();       return null; }
  if (onglet === 'bookings')       { renderPublisherBookingsTab();       return null; }
  if (onglet === 'parrainage')     { renderParrainageTab();              return null; }

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
//  ONGLET MES ACTIVITÉS — CALENDRIER
// ============================================================

let _calMois   = new Date().getMonth();
let _calAnnee  = new Date().getFullYear();
let _calJourSel = null;

async function renderActivitiesTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Mes Activités</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const reservations = await appelApi('/dashboard/activites');
    renderSidebar();
    afficherCalendrier(reservations);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${e.message}</p></div>`;
  }
}

function afficherCalendrier(reservations) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  // Index des réservations par date YYYY-MM-DD
  const parJour = {};
  reservations.forEach((r) => {
    const dateSource = r.event?.date || r.date;
    if (!dateSource) return;
    const cle = dateSource.slice(0, 10);
    if (!parJour[cle]) parJour[cle] = [];
    parJour[cle].push(r);
  });

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Mes Activités</h1>
        <p class="view-subtitle">${reservations.length} réservation(s) au total.</p>
      </div>
    </header>
    <div class="cal-layout animate-in">
      <div class="glass-card" style="flex:1;min-width:0">
        <div id="cal-root"></div>
      </div>
      <div class="glass-card cal-detail-panel" id="cal-detail">
        ${renduDetailVide()}
      </div>
    </div>`;

  _calJourSel = null;
  renduCalendrierMois(parJour);
}

function renduCalendrierMois(parJour) {
  const root = document.getElementById('cal-root');
  if (!root) return;

  const JOURS  = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const MOIS   = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const premier = new Date(_calAnnee, _calMois, 1);
  const dernier  = new Date(_calAnnee, _calMois + 1, 0);
  // lundi=0 … dimanche=6
  let debutCol = (premier.getDay() + 6) % 7;

  const cellules = [];
  for (let i = 0; i < debutCol; i++) cellules.push(null);
  for (let j = 1; j <= dernier.getDate(); j++) cellules.push(j);
  while (cellules.length % 7 !== 0) cellules.push(null);

  const aujourdhui = new Date();
  const ajdStr = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth()+1).padStart(2,'0')}-${String(aujourdhui.getDate()).padStart(2,'0')}`;

  const cases = cellules.map((j) => {
    if (!j) return `<div class="cal-cell cal-cell-vide"></div>`;
    const cle = `${_calAnnee}-${String(_calMois+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`;
    const events = parJour[cle] || [];
    const isAujd = cle === ajdStr;
    const isSel  = cle === _calJourSel;
    const nbEv   = events.length;
    return `
      <div class="cal-cell ${nbEv ? 'cal-has-event' : ''} ${isAujd ? 'cal-today' : ''} ${isSel ? 'cal-selected' : ''}"
           data-date="${cle}" onclick="selJourCal('${cle}')">
        <span class="cal-jour-num">${j}</span>
        ${nbEv ? `<div class="cal-dots">${events.slice(0,3).map(() => '<span class="cal-dot"></span>').join('')}</div>` : ''}
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="cal-header">
      <button type="button" class="cal-nav-btn" onclick="changerMoisCal(-1)">
        <i class="bi bi-chevron-left"></i>
      </button>
      <span class="cal-titre">${MOIS[_calMois]} ${_calAnnee}</span>
      <button type="button" class="cal-nav-btn" onclick="changerMoisCal(1)">
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>
    <div class="cal-grid-header">
      ${JOURS.map((j) => `<div class="cal-label-jour">${j}</div>`).join('')}
    </div>
    <div class="cal-grid">${cases}</div>`;
}

function changerMoisCal(delta) {
  _calMois += delta;
  if (_calMois > 11) { _calMois = 0;  _calAnnee++; }
  if (_calMois < 0)  { _calMois = 11; _calAnnee--; }
  _calJourSel = null;
  // reconstruire avec les mêmes données (re-fetch)
  appelApi('/dashboard/activites').then((r) => {
    const parJour = {};
    r.forEach((res) => {
      const d = (res.event?.date || res.date || '').slice(0,10);
      if (d) { if (!parJour[d]) parJour[d] = []; parJour[d].push(res); }
    });
    renduCalendrierMois(parJour);
    document.getElementById('cal-detail').innerHTML = renduDetailVide();
  });
}

function selJourCal(cle) {
  _calJourSel = cle;
  const allCells = document.querySelectorAll('.cal-cell');
  allCells.forEach((c) => c.classList.toggle('cal-selected', c.dataset.date === cle));

  appelApi('/dashboard/activites').then((reservations) => {
    const events = reservations.filter((r) => {
      const d = (r.event?.date || r.date || '').slice(0,10);
      return d === cle;
    });
    const panel = document.getElementById('cal-detail');
    if (!panel) return;
    if (!events.length) { panel.innerHTML = renduDetailVide(); return; }

    const [annee, mois, jour] = cle.split('-');
    const MOIS_COMPLET = ['Janvier','Février','Mars','Avril','Mai','Juin',
                         'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    panel.innerHTML = `
      <div class="cal-detail-titre">${parseInt(jour)} ${MOIS_COMPLET[parseInt(mois)-1]} ${annee}</div>
      <div class="cal-detail-liste">
        ${events.map((r) => {
          const a = r.event?.activity || {};
          const img = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
          return `
            <div class="cal-detail-item">
              <div class="cal-detail-img">
                ${img ? `<img src="${img}" alt="">` : `<span style="font-size:1.5rem">${emojiTheme(a.theme)}</span>`}
              </div>
              <div style="flex:1;min-width:0">
                <div class="cal-detail-name">${escapeHtml(a.title || 'Activité')}</div>
                ${a.address ? `<div class="cal-detail-addr"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(a.address)}</div>` : ''}
                <div style="display:flex;gap:.5rem;margin-top:.35rem;flex-wrap:wrap">
                  <span class="badge-status badge-actif"><i class="bi bi-check-circle-fill" style="font-size:.55rem"></i> Confirmé</span>
                  <span style="font-size:.72rem;color:var(--text-muted)">${r.group_size ?? 1} pers.</span>
                  ${a.price != null ? `<span style="font-size:.72rem;font-weight:700;color:var(--accent)">${formatPrix(a.price)}</span>` : ''}
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  });
}

function renduDetailVide() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:.75rem;color:var(--text-muted);padding:2rem;text-align:center">
      <i class="bi bi-calendar3" style="font-size:2.5rem;opacity:.35"></i>
      <p style="font-size:.85rem">Sélectionne un jour<br>pour voir tes activités</p>
    </div>`;
}

// ============================================================
//  ONGLET FAVORIS
// ============================================================

async function renderFavoritesTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Mes Favoris</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const favoris = await appelApi('/dashboard/favoris');
    renderSidebar();
    afficherFavoris(favoris);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${e.message}</p></div>`;
  }
}

function afficherFavoris(favoris) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const cartes = favoris.length
    ? favoris.map((f, i) => {
        const a = f.activity || {};
        const img = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
        const note = (a.average_rating || 0).toFixed(1);
        const prix = a.price != null ? `${Number(a.price).toLocaleString('fr-FR')}€` : 'Gratuit';
        const emoji = emojiTheme(a.theme);
        return `
          <div class="home-activity-card" style="animation:fadeUp .35s ${0.04*i}s ease both;position:relative">
            ${img
              ? `<img src="${img}" class="home-card-img" alt="${escapeHtml(a.title || '')}" loading="lazy">`
              : `<div class="home-card-img-placeholder">${emoji}</div>`}
            <button type="button" class="fav-remove-btn" data-fav-id="${f.id_activity}" title="Retirer des favoris"
              style="position:absolute;top:.6rem;right:.6rem;z-index:1">
              <i class="bi bi-heart-fill"></i>
            </button>
            <div class="home-card-content">
              <h2 class="home-card-title">${escapeHtml(a.title || '—')}</h2>
              <p><strong>Lieu :</strong> ${escapeHtml(a.address || '—')}</p>
              <p><strong>Prix :</strong> ${prix}</p>
              <p><strong>Note :</strong> ⭐ ${note}</p>
            </div>
          </div>`;
      }).join('')
    : `<div class="explorer-empty" style="grid-column:1/-1">
        <span style="font-size:2.5rem">💔</span>
        <p>Aucun favori pour le moment.</p>
        <button type="button" class="btn-primary" onclick="setOnglet('explore')">
          <i class="bi bi-search"></i> Explorer les activités
        </button>
      </div>`;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Mes Favoris</h1>
        <p class="view-subtitle">${favoris.length} activité(s) sauvegardée(s).</p>
      </div>
    </header>
    <div class="explorer-grid" id="favoris-grid">${cartes}</div>`;

  main.querySelectorAll('.fav-remove-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.favId;
      btn.disabled = true;
      try {
        await appelApi(`/dashboard/favoris/${id}`, 'DELETE');
        btn.closest('.explorer-card').style.opacity = '0';
        btn.closest('.explorer-card').style.transform = 'scale(.9)';
        btn.closest('.explorer-card').style.transition = 'all .25s ease';
        setTimeout(() => {
          btn.closest('.explorer-card').remove();
          const grid = document.getElementById('favoris-grid');
          const count = main.querySelector('.view-subtitle');
          if (count) count.textContent = `${grid?.children.length ?? 0} activité(s) sauvegardée(s).`;
        }, 260);
      } catch (err) {
        btn.disabled = false;
        alert('Erreur : ' + err.message);
      }
    });
  });
}

// ============================================================
//  ONGLET EXPLORER
// ============================================================

const EMOJIS_THEME = {
  sport:     '🏃', nature: '🌿', culture: '🎭', gastronomie: '🍽️',
  musique:   '🎵', art:    '🎨', bien_etre: '🧘', aventure: '🏕️',
  enfants:   '👦', social: '🤝', technologie: '💻', autre: '✨',
};

function emojiTheme(theme) {
  return EMOJIS_THEME[(theme || '').toLowerCase()] || '✨';
}

let _explorerCache = null;
let _explorerFiltres = { search: '', theme: '', maxPrix: '', tri: 'note' };

async function renderExplorerTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Explorer</h1><p class="view-subtitle">Chargement des activités…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    if (!_explorerCache) {
      _explorerCache = await appelApi('/dashboard/explorer');
    }
    renderSidebar();
    _explorerFiltres = { search: '', theme: '', maxPrix: '', tri: 'note' };
    afficherExplorer(_explorerCache);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${e.message}</p></div>`;
  }
}

function afficherExplorer(activites) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const themes = [...new Set((activites || []).map((a) => a.theme).filter(Boolean))].sort();

  const options = themes.map((t) => `<option value="${t}">${emojiTheme(t)} ${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('');

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Explorer</h1>
        <p class="view-subtitle" id="explorer-count">${activites.length} activité(s) disponible(s).</p>
      </div>
    </header>

    <div class="explorer-filters glass-card animate-in">
      <div class="explorer-filter-row">
        <div class="explorer-search-wrap">
          <i class="bi bi-search" style="color:var(--text-muted)"></i>
          <input type="text" id="exp-search" placeholder="Rechercher une activité…" autocomplete="off">
        </div>
        <select id="exp-theme" class="explorer-select">
          <option value="">Tous les thèmes</option>
          ${options}
        </select>
        <select id="exp-prix" class="explorer-select">
          <option value="">Tous les prix</option>
          <option value="25">Moins de 25 €</option>
          <option value="50">Moins de 50 €</option>
          <option value="100">Moins de 100 €</option>
          <option value="200">Moins de 200 €</option>
        </select>
        <select id="exp-tri" class="explorer-select">
          <option value="note">Mieux notés</option>
          <option value="prix-asc">Prix croissant</option>
          <option value="prix-desc">Prix décroissant</option>
        </select>
      </div>
      <div id="exp-tags" class="explorer-tags"></div>
    </div>

    <div id="explorer-grid" class="explorer-grid"></div>`;

  appliquerFiltresExplorer(activites);
  attachFiltresExplorer(activites);
}

function appliquerFiltresExplorer(activites) {
  const f = _explorerFiltres;
  let liste = [...activites];

  if (f.search) {
    const q = f.search.toLowerCase();
    liste = liste.filter((a) =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.address || '').toLowerCase().includes(q) ||
      (a.theme || '').toLowerCase().includes(q)
    );
  }
  if (f.theme)   liste = liste.filter((a) => a.theme === f.theme);
  if (f.maxPrix) liste = liste.filter((a) => (a.price || 0) <= Number(f.maxPrix));

  if (f.tri === 'prix-asc')  liste.sort((a, b) => (a.price || 0) - (b.price || 0));
  else if (f.tri === 'prix-desc') liste.sort((a, b) => (b.price || 0) - (a.price || 0));
  else liste.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));

  const grid = document.getElementById('explorer-grid');
  const count = document.getElementById('explorer-count');
  if (count) count.textContent = `${liste.length} activité(s) trouvée(s).`;

  if (!grid) return;
  if (!liste.length) {
    grid.innerHTML = `
      <div class="explorer-empty">
        <span style="font-size:2.5rem">🔍</span>
        <p>Aucune activité ne correspond à vos filtres.</p>
        <button type="button" class="btn-outline" onclick="resetFiltresExplorer()">Réinitialiser les filtres</button>
      </div>`;
    return;
  }

  grid.innerHTML = liste.map((a, i) => {
    const img = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
    const note = (a.average_rating || 0).toFixed(1);
    const prix = a.price != null ? `${Number(a.price).toLocaleString('fr-FR')}€` : 'Gratuit';
    const emoji = emojiTheme(a.theme);
    return `
      <div class="home-activity-card" style="animation:fadeUp .35s ${0.04 * i}s ease both" onclick="">
        ${img
          ? `<img src="${img}" class="home-card-img" alt="${escapeHtml(a.title)}" loading="lazy">`
          : `<div class="home-card-img-placeholder">${emoji}</div>`}
        <div class="home-card-content">
          <h2 class="home-card-title">${escapeHtml(a.title || '—')}</h2>
          <p><strong>Lieu :</strong> ${escapeHtml(a.address || '—')}</p>
          <p><strong>Prix :</strong> ${prix}</p>
          <p><strong>Note :</strong> ⭐ ${note}</p>
        </div>
      </div>`;
  }).join('');
}

function attachFiltresExplorer(activites) {
  const search = document.getElementById('exp-search');
  const theme  = document.getElementById('exp-theme');
  const prix   = document.getElementById('exp-prix');
  const tri    = document.getElementById('exp-tri');

  const update = () => {
    _explorerFiltres.search  = search?.value.trim() || '';
    _explorerFiltres.theme   = theme?.value || '';
    _explorerFiltres.maxPrix = prix?.value || '';
    _explorerFiltres.tri     = tri?.value || 'note';
    appliquerFiltresExplorer(activites);
    mettreAJourTags();
  };

  search?.addEventListener('input', update);
  theme?.addEventListener('change', update);
  prix?.addEventListener('change', update);
  tri?.addEventListener('change', update);
}

function mettreAJourTags() {
  const tags = document.getElementById('exp-tags');
  if (!tags) return;
  const f = _explorerFiltres;
  const liste = [];
  if (f.search)  liste.push({ label: `"${f.search}"`, key: 'search' });
  if (f.theme)   liste.push({ label: `${emojiTheme(f.theme)} ${f.theme}`, key: 'theme' });
  if (f.maxPrix) liste.push({ label: `Moins de ${f.maxPrix} €`, key: 'maxPrix' });

  tags.innerHTML = liste.map((t) => `
    <span class="explorer-tag">
      ${escapeHtml(t.label)}
      <button type="button" onclick="retirerFiltreExplorer('${t.key}')">
        <i class="bi bi-x"></i>
      </button>
    </span>`).join('');
}

function retirerFiltreExplorer(key) {
  _explorerFiltres[key] = '';
  const el = document.getElementById(
    key === 'search' ? 'exp-search' : key === 'theme' ? 'exp-theme' : 'exp-prix'
  );
  if (el) el.value = '';
  appliquerFiltresExplorer(_explorerCache || []);
  mettreAJourTags();
}

function resetFiltresExplorer() {
  _explorerFiltres = { search: '', theme: '', maxPrix: '', tri: 'note' };
  ['exp-search','exp-theme','exp-prix','exp-tri'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'exp-tri' ? 'note' : '';
  });
  appliquerFiltresExplorer(_explorerCache || []);
  mettreAJourTags();
}

// ============================================================
//  ONGLET MESSAGERIE (user + publisher)
// ============================================================

async function renderMessagingTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Messagerie</h1><p class="view-subtitle">Chargement des conversations…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const conversations = await appelApi('/dashboard/conversations');
    renderSidebar();

    const lignes = conversations.length
      ? conversations.map((conv, i) => {
          const isUnread = !conv.is_read;
          const time = formatDateConv(conv.last_message_at);
          const nomAutre = conv.other_user_id ? `Utilisateur #${conv.other_user_id}` : 'Inconnu';
          return `
            <div class="conv-dash-item ${isUnread ? 'unread' : ''}"
                 data-conv-id="${conv.id}"
                 style="animation:fadeUp .3s ${0.05 * i}s ease both;cursor:pointer">
              <div class="conv-dash-avatar">
                <i class="bi bi-person-fill" style="font-size:1.1rem;color:var(--accent)"></i>
              </div>
              <div class="conv-dash-body">
                <div class="conv-dash-name">${escapeHtml(nomAutre)}</div>
                <div class="conv-dash-last">
                  ${conv.is_mine ? '<i class="bi bi-arrow-up-right" style="color:var(--accent);font-size:.7rem"></i> ' : ''}
                  ${conv.last_message ? escapeHtml(truncate(conv.last_message, 45)) : '<em>Nouvelle conversation</em>'}
                </div>
              </div>
              <div class="conv-dash-meta">
                ${time ? `<span class="conv-dash-time">${time}</span>` : ''}
                ${isUnread ? '<span class="conv-dash-badge"><i class="bi bi-circle-fill" style="font-size:.45rem"></i> Non lu</span>' : ''}
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--text-muted);font-size:.85rem;padding:.75rem 0">Aucune conversation pour le moment.</p>';

    main.innerHTML = `
      <header class="view-header animate-in">
        <div>
          <h1 class="view-title">Messagerie</h1>
          <p class="view-subtitle">${conversations.length} conversation(s) active(s).</p>
        </div>
        <a href="../Page/Messagerie.html" class="btn-primary">
          <i class="bi bi-chat-dots-fill"></i> Ouvrir la messagerie
        </a>
      </header>
      ${Card({ classes: 'animate-in', contenu: `<div class="conv-dash-list">${lignes}</div>` })}`;

    main.querySelectorAll('.conv-dash-item[data-conv-id]').forEach((item) => {
      item.addEventListener('click', () => {
        window.location.href = `../Page/Messagerie.html?conv=${item.dataset.convId}`;
      });
    });

  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${e.message}</p></div>`;
  }
}

// ============================================================
//  ONGLET HISTORIQUE
// ============================================================

const RATING_CONFIG = {
  like:      { label: 'J\'ai adoré',    icon: 'bi-hand-thumbs-up-fill',  color: '#059669', bg: '#d1fae5' },
  dislike:   { label: 'Pas pour moi',   icon: 'bi-hand-thumbs-down-fill', color: '#dc2626', bg: '#fee2e2' },
  recommend: { label: 'Je conseille',   icon: 'bi-star-fill',             color: '#d97706', bg: '#fef3c7' },
};

async function renderHistoriqueTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Historique</h1>
        <p class="view-subtitle">Vos activités passées — classez-les et partagez vos avis.</p>
      </div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const historique = await appelApi('/dashboard/historique');
    renderSidebar();
    afficherHistorique(historique);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${e.message}</p></div>`;
  }
}

function afficherHistorique(items) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const groups = { like: [], dislike: [], recommend: [], none: [] };
  items.forEach(item => {
    const r = item.user_rating || 'none';
    (groups[r] || groups.none).push(item);
  });

  const activeFilter = { value: 'all' };

  function carteHistorique(item) {
    const act = item.event?.activity || {};
    const date = item.date ? new Date(item.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const img = (act.images && act.images[0]) ? act.images[0] : '';
    const rating = item.user_rating;
    const cfg = rating ? RATING_CONFIG[rating] : null;

    return `
      <div class="hist-card glass-card animate-in" data-id="${item.id}" data-rating="${rating || ''}">
        <div class="hist-card-img" style="background:${img ? `url('${img}') center/cover` : 'var(--accent-soft)'}">
          ${!img ? `<i class="bi bi-image" style="font-size:2rem;color:var(--accent-mid)"></i>` : ''}
          ${cfg ? `<div class="hist-badge" style="background:${cfg.bg};color:${cfg.color}"><i class="bi ${cfg.icon}"></i> ${cfg.label}</div>` : ''}
        </div>
        <div class="hist-card-body">
          <div class="hist-card-title">${escapeHtml(act.title || 'Activité')}</div>
          <div class="hist-card-meta">
            <span><i class="bi bi-calendar3"></i> ${date}</span>
            ${act.address ? `<span><i class="bi bi-geo-alt"></i> ${escapeHtml(act.address)}</span>` : ''}
          </div>
          <div class="hist-rating-btns">
            ${Object.entries(RATING_CONFIG).map(([key, c]) => `
              <button class="hist-rate-btn ${rating === key ? 'active' : ''}" data-rate="${key}"
                style="${rating === key ? `background:${c.bg};color:${c.color};border-color:${c.color}` : ''}"
                title="${c.label}">
                <i class="bi ${c.icon}"></i><span>${c.label}</span>
              </button>`).join('')}
          </div>
        </div>
      </div>`;
  }

  function renderFiltered(filter) {
    const filtered = filter === 'all' ? items
      : filter === 'none' ? items.filter(i => !i.user_rating)
      : items.filter(i => i.user_rating === filter);

    document.getElementById('hist-list').innerHTML = filtered.length
      ? filtered.map(carteHistorique).join('')
      : `<p style="color:var(--text-muted);text-align:center;padding:3rem 0;grid-column:1/-1">Aucune activité dans cette catégorie.</p>`;

    attachRatingListeners();
  }

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Historique</h1>
        <p class="view-subtitle">Vos activités passées — classez-les et partagez vos avis.</p>
      </div>
    </header>

    ${!items.length ? `
      <div class="glass-card animate-in" style="text-align:center;padding:3rem">
        <i class="bi bi-clock-history" style="font-size:3rem;color:var(--accent-mid);display:block;margin-bottom:1rem"></i>
        <p style="color:var(--text-muted)">Vous n'avez encore participé à aucune activité.</p>
      </div>` : `

    <!-- Stats rapides -->
    <div class="hist-stats animate-in">
      ${Object.entries(RATING_CONFIG).map(([key, c]) => `
        <div class="hist-stat-pill" style="background:${c.bg};color:${c.color}">
          <i class="bi ${c.icon}"></i>
          <span class="hist-stat-count">${groups[key].length}</span>
          <span>${c.label}</span>
        </div>`).join('')}
      <div class="hist-stat-pill" style="background:var(--accent-soft);color:var(--accent)">
        <i class="bi bi-clock-history"></i>
        <span class="hist-stat-count">${groups.none.length}</span>
        <span>Non classées</span>
      </div>
    </div>

    <!-- Filtres -->
    <div class="hist-filters animate-in">
      ${[
        { key: 'all', label: 'Toutes', icon: 'bi-grid' },
        { key: 'like', label: 'Adorées', icon: 'bi-hand-thumbs-up-fill' },
        { key: 'recommend', label: 'Conseillées', icon: 'bi-star-fill' },
        { key: 'dislike', label: 'Pas pour moi', icon: 'bi-hand-thumbs-down-fill' },
        { key: 'none', label: 'Non classées', icon: 'bi-question-circle' },
      ].map(f => `
        <button class="hist-filter-btn ${f.key === 'all' ? 'active' : ''}" data-filter="${f.key}">
          <i class="bi ${f.icon}"></i> ${f.label}
        </button>`).join('')}
    </div>

    <!-- Grille -->
    <div class="hist-list" id="hist-list">
      ${items.map(carteHistorique).join('')}
    </div>`}`;

  document.querySelectorAll('.hist-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hist-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter.value = btn.dataset.filter;
      renderFiltered(btn.dataset.filter);
    });
  });

  attachRatingListeners();

  function attachRatingListeners() {
    document.querySelectorAll('.hist-rate-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.hist-card');
        const reservationId = card.dataset.id;
        const newRating = btn.dataset.rate;
        const currentRating = card.dataset.rating;
        const finalRating = currentRating === newRating ? null : newRating;

        try {
          await appelApi(`/dashboard/historique/${reservationId}/rating`, 'PATCH', { rating: finalRating });
          const entry = items.find(i => String(i.id) === reservationId);
          if (entry) {
            const old = entry.user_rating;
            entry.user_rating = finalRating;
            if (old) groups[old] = groups[old].filter(i => String(i.id) !== reservationId);
            if (finalRating) (groups[finalRating] = groups[finalRating] || []).push(entry);
            else groups.none.push(entry);
          }
          renderFiltered(activeFilter.value);
        } catch (e) {
          console.error('Erreur notation:', e.message);
        }
      });
    });
  }
}

// ============================================================
//  ONGLET PARRAINAGE
// ============================================================

async function renderParrainageTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const profil = state.profil || {};
  const userId = profil.id;
  const code = `MEET${userId}`;
  const link = `${window.location.origin}/meet-do-front/Page/Signup.html?ref=${code}`;
  const points = profil.referral_points || 0;

  const paliers = [
    { pts: 50,  label: '5% de réduction',     icon: 'bi-tag-fill',        color: '#059669' },
    { pts: 100, label: '10% de réduction',    icon: 'bi-percent',          color: '#2563eb' },
    { pts: 200, label: 'Activité offerte',    icon: 'bi-gift-fill',        color: '#7c3aed' },
    { pts: 500, label: 'Statut VIP 1 mois',  icon: 'bi-star-fill',        color: '#d97706' },
  ];

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Parrainage</h1>
        <p class="view-subtitle">Invitez vos proches et gagnez des réductions.</p>
      </div>
    </header>

    <div style="max-width:720px">

      <!-- Points actuels -->
      <div class="glass-card animate-in parr-hero">
        <div class="parr-hero-icon"><i class="bi bi-people-fill"></i></div>
        <div>
          <div class="parr-pts-val">${points} pts</div>
          <div class="parr-pts-label">Points de parrainage cumulés</div>
        </div>
      </div>

      <!-- Lien de parrainage -->
      <div class="glass-card animate-in" style="margin-top:1.25rem">
        <div class="card-title">🔗 Votre lien de parrainage</div>
        <p style="font-size:.83rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">
          Partagez ce lien. Pour chaque ami qui s'inscrit et fait sa première réservation,
          vous gagnez <strong>10 points</strong>.
        </p>
        <div class="parr-link-row">
          <div class="parr-link-box" id="parr-link-text">${link}</div>
          <button class="btn-primary parr-copy-btn" id="parr-copy" title="Copier le lien">
            <i class="bi bi-clipboard-fill"></i> Copier
          </button>
        </div>
        <div id="parr-copy-feedback" style="font-size:.78rem;color:#059669;margin-top:.5rem;min-height:1rem"></div>

        <!-- Partage réseaux sociaux -->
        <div class="parr-share-row">
          <a class="parr-share-btn" style="background:#1877f2"
             href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank">
            <i class="bi bi-facebook"></i> Facebook
          </a>
          <a class="parr-share-btn" style="background:#0a66c2"
             href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}" target="_blank">
            <i class="bi bi-linkedin"></i> LinkedIn
          </a>
          <a class="parr-share-btn" style="background:#25d366"
             href="https://wa.me/?text=${encodeURIComponent('Rejoins Meet&Do avec mon lien : ' + link)}" target="_blank">
            <i class="bi bi-whatsapp"></i> WhatsApp
          </a>
        </div>
      </div>

      <!-- Paliers de récompenses -->
      <div class="glass-card animate-in" style="margin-top:1.25rem">
        <div class="card-title">🎁 Récompenses disponibles</div>
        <p style="font-size:.83rem;color:var(--text-muted);margin-bottom:1.25rem">
          Accumulez des points pour débloquer des avantages exclusifs.
        </p>
        <div class="parr-paliers">
          ${paliers.map(p => {
            const atteint = points >= p.pts;
            const pct = Math.min(100, Math.round((points / p.pts) * 100));
            return `
              <div class="parr-palier ${atteint ? 'atteint' : ''}">
                <div class="parr-palier-icon" style="color:${p.color}">
                  <i class="bi ${p.icon}"></i>
                </div>
                <div style="flex:1">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
                    <div style="font-weight:600;font-size:.9rem">${p.label}</div>
                    <div style="font-size:.78rem;color:var(--text-muted);font-weight:600">${p.pts} pts</div>
                  </div>
                  <div class="parr-progress-bar">
                    <div class="parr-progress-fill" style="width:${pct}%;background:${p.color}"></div>
                  </div>
                  <div style="font-size:.72rem;color:var(--text-muted);margin-top:.3rem">
                    ${atteint
                      ? `<span style="color:${p.color};font-weight:600"><i class="bi bi-check-circle-fill"></i> Débloqué !</span>`
                      : `${points}/${p.pts} pts — encore ${p.pts - points} pts`}
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Comment ça marche -->
      <div class="glass-card animate-in" style="margin-top:1.25rem">
        <div class="card-title">❓ Comment ça marche ?</div>
        <div class="parr-steps">
          <div class="parr-step"><div class="parr-step-num">1</div><div>Copiez votre lien unique ci-dessus</div></div>
          <div class="parr-step"><div class="parr-step-num">2</div><div>Partagez-le à vos amis par message, réseaux sociaux…</div></div>
          <div class="parr-step"><div class="parr-step-num">3</div><div>Votre ami s'inscrit avec votre lien</div></div>
          <div class="parr-step"><div class="parr-step-num">4</div><div>Il fait sa première réservation → vous gagnez <strong>10 pts</strong></div></div>
          <div class="parr-step"><div class="parr-step-num">5</div><div>Utilisez vos points pour des réductions lors de votre prochaine réservation</div></div>
        </div>
      </div>

    </div>`;

  document.getElementById('parr-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(link).then(() => {
      const fb = document.getElementById('parr-copy-feedback');
      if (fb) {
        fb.innerHTML = '<i class="bi bi-check-circle-fill"></i> Lien copié dans le presse-papier !';
        setTimeout(() => { if (fb) fb.innerHTML = ''; }, 3000);
      }
    });
  });
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

  const avatarUrl = profil.avatar_url || '';
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" alt="avatar" class="account-avatar-img">`
    : `<span class="account-avatar-initials">${(profil.firstname || profil.email || '?')[0].toUpperCase()}</span>`;

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Mon Compte</h1>
        <p class="view-subtitle">Gérez vos informations personnelles.</p>
      </div>
    </header>

    <div style="max-width:640px">

      <!-- Photo de profil -->
      <div class="glass-card animate-in" style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.25rem">
        <div class="account-avatar-wrap" id="avatar-wrap" title="Changer la photo">
          ${avatarHtml}
          <div class="account-avatar-overlay"><i class="bi bi-camera-fill"></i></div>
          <input type="file" id="avatar-input" accept="image/*" style="display:none">
        </div>
        <div>
          <div style="font-weight:700;font-size:1rem">${profil.firstname || ''} ${profil.lastname || ''}</div>
          <div style="font-size:.8rem;color:var(--text-muted)">${profil.email || ''}</div>
          <div id="avatar-feedback" style="font-size:.78rem;margin-top:.3rem"></div>
        </div>
      </div>

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

      <!-- Réservations -->
      <div class="glass-card animate-in" id="compte-reservations-card" style="margin-top:1.25rem">
        <div class="card-title">📅 Mes réservations</div>
        <div id="compte-reservations-list"><div class="dash-loader" style="min-height:5rem"><div class="dash-spinner"></div></div></div>
      </div>

      <!-- Changer le mot de passe -->
      <form class="glass-card animate-in" id="form-password" style="margin-top:1.25rem">
        <div class="card-title">🔒 Changer le mot de passe</div>
        <div id="form-password-feedback" style="margin-bottom:.75rem"></div>
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Mot de passe actuel</label>
          <input type="password" id="pwd-current" autocomplete="current-password"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Nouveau mot de passe</label>
          <input type="password" id="pwd-new" autocomplete="new-password"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Confirmer le nouveau mot de passe</label>
          <input type="password" id="pwd-confirm" autocomplete="new-password"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <button type="submit" class="btn-primary">
          <i class="bi bi-shield-lock-fill"></i> Mettre à jour le mot de passe
        </button>
      </form>

      ${sectionPublisher}
    </div>`;
}

// ============================================================
//  PUBLISHER — MES ACTIVITÉS CRÉÉES
// ============================================================

// Vue active pour l'onglet Mes Activités publisher ('grid' | 'calendar')
let _pubActVue = 'grid';
let _pubActData = [];
let _pubCalMois  = new Date().getMonth();
let _pubCalAnnee = new Date().getFullYear();
let _pubCalJourSel = null;

async function renderPublisherActivitesTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Mes Activités</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const activites = await appelApi('/dashboard/publisher/activites');
    _pubActData = activites;
    renderSidebar();
    afficherPublisherActivites(activites);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherPublisherActivites(activites) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const toolbar = `
    <div class="pub-act-toolbar animate-in">
      <div class="pub-act-vue-toggle">
        <button type="button" class="pub-vue-btn ${_pubActVue === 'grid' ? 'active' : ''}"
          onclick="changerVuePubAct('grid')">
          <i class="bi bi-grid-3x3-gap-fill"></i> Cartes
        </button>
        <button type="button" class="pub-vue-btn ${_pubActVue === 'calendar' ? 'active' : ''}"
          onclick="changerVuePubAct('calendar')">
          <i class="bi bi-calendar3"></i> Calendrier
        </button>
      </div>
      <button type="button" class="btn-primary" style="margin-left:auto">
        <i class="bi bi-plus-lg"></i> Nouvelle activité
      </button>
    </div>`;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Mes Activités</h1>
        <p class="view-subtitle">${activites.length} activité(s) créée(s).</p>
      </div>
    </header>
    ${toolbar}
    <div id="pub-act-contenu"></div>`;

  rendrePubActContenu(activites);
}

function changerVuePubAct(vue) {
  _pubActVue = vue;
  // Mettre à jour les boutons toggle
  document.querySelectorAll('.pub-vue-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase().includes(vue === 'grid' ? 'carte' : 'calendrier'));
  });
  rendrePubActContenu(_pubActData);
}

function rendrePubActContenu(activites) {
  const contenu = document.getElementById('pub-act-contenu');
  if (!contenu) return;
  if (_pubActVue === 'calendar') {
    rendrePubCalendrier(activites, contenu);
  } else {
    rendrePubGrille(activites, contenu);
  }
}

/* ---- VUE GRILLE ---- */
function rendrePubGrille(activites, contenu) {
  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin',
                'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const cartes = activites.length
    ? activites.map((a, i) => {
        const img   = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
        const emoji = emojiTheme(a.theme);
        const prix  = a.price != null ? formatPrix(a.price) : 'Gratuit';
        const note  = (a.average_rating || 0).toFixed(1);
        const statut = a.is_disabled
          ? '<span class="badge-status badge-inactif">Désactivée</span>'
          : a.is_visible
            ? '<span class="badge-status badge-actif">Visible</span>'
            : '<span class="badge-status badge-attente">Masquée</span>';

        const prochaineDate = a.prochaine_date
          ? (() => {
              const d = new Date(a.prochaine_date);
              return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
            })()
          : null;

        return `
          <div class="pub-act-card glass-card" style="animation:fadeUp .35s ${0.05 * i}s ease both">
            <div class="pub-act-img">
              ${img
                ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(a.title || '')}" loading="lazy">`
                : `<div class="pub-act-img-placeholder">${emoji}</div>`}
              <div class="pub-act-badges">${statut}</div>
            </div>
            <div class="pub-act-body">
              <h3 class="pub-act-title">${escapeHtml(a.title || '—')}</h3>
              <div class="pub-act-meta">
                <span><i class="bi bi-geo-alt-fill" style="color:var(--accent)"></i> ${escapeHtml(a.address || '—')}</span>
                <span><i class="bi bi-tag-fill" style="color:var(--accent)"></i> ${prix}</span>
                <span><i class="bi bi-star-fill" style="color:#f59e0b"></i> ${note}</span>
                <span><i class="bi bi-calendar3" style="color:var(--accent)"></i> ${formatDate(a.created_at)}</span>
                ${a.nb_evenements ? `<span><i class="bi bi-calendar-event" style="color:var(--accent)"></i> ${a.nb_evenements} événement(s)</span>` : ''}
                ${prochaineDate ? `<span><i class="bi bi-clock-fill" style="color:#059669"></i> Prochain : ${prochaineDate}</span>` : ''}
              </div>
              ${a.description ? `<p class="pub-act-desc">${escapeHtml(truncate(a.description, 120))}</p>` : ''}
              <div class="pub-act-actions">
                <button type="button" class="btn-primary" style="font-size:.78rem;padding:.4rem .9rem">
                  <i class="bi bi-pencil-fill"></i> Modifier
                </button>
                <button type="button" class="btn-outline" style="font-size:.78rem;padding:.4rem .9rem">
                  <i class="bi bi-eye-fill"></i> Réservations
                </button>
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div class="explorer-empty" style="grid-column:1/-1">
        <span style="font-size:3rem">📋</span>
        <p style="color:var(--text-muted)">Vous n'avez pas encore créé d'activité.</p>
        <button type="button" class="btn-primary"><i class="bi bi-plus-lg"></i> Créer une activité</button>
      </div>`;

  contenu.innerHTML = `<div class="pub-act-grid">${cartes}</div>`;
}

/* ---- VUE CALENDRIER ---- */
function rendrePubCalendrier(activites, contenu) {
  // Construire l'index parJour → liste d'activités
  const parJour = {};
  activites.forEach((a) => {
    (a.events || []).forEach((ev) => {
      if (!ev.date) return;
      const cle = ev.date.slice(0, 10);
      if (!parJour[cle]) parJour[cle] = [];
      parJour[cle].push({ ...a, eventDate: ev.date });
    });
  });

  contenu.innerHTML = `
    <div class="cal-layout animate-in">
      <div class="glass-card" style="flex:1;min-width:0">
        <div id="pub-cal-root"></div>
      </div>
      <div class="glass-card cal-detail-panel" id="pub-cal-detail">
        ${renduPubCalDetailVide()}
      </div>
    </div>`;

  _pubCalJourSel = null;
  rendrePubCalMois(parJour);
}

function rendrePubCalMois(parJour) {
  const root = document.getElementById('pub-cal-root');
  if (!root) return;

  const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
  const MOIS_NOM = ['Janvier','Février','Mars','Avril','Mai','Juin',
                    'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const premier  = new Date(_pubCalAnnee, _pubCalMois, 1);
  const dernier  = new Date(_pubCalAnnee, _pubCalMois + 1, 0);
  let   debutCol = (premier.getDay() + 6) % 7;

  const cellules = [];
  for (let i = 0; i < debutCol; i++) cellules.push(null);
  for (let j = 1; j <= dernier.getDate(); j++) cellules.push(j);
  while (cellules.length % 7 !== 0) cellules.push(null);

  const ajd = new Date();
  const ajdStr = `${ajd.getFullYear()}-${String(ajd.getMonth()+1).padStart(2,'0')}-${String(ajd.getDate()).padStart(2,'0')}`;

  const cases = cellules.map((j) => {
    if (!j) return `<div class="cal-cell cal-cell-vide"></div>`;
    const cle    = `${_pubCalAnnee}-${String(_pubCalMois+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`;
    const evts   = parJour[cle] || [];
    const isAjd  = cle === ajdStr;
    const isSel  = cle === _pubCalJourSel;
    return `
      <div class="cal-cell ${evts.length ? 'cal-has-event' : ''} ${isAjd ? 'cal-today' : ''} ${isSel ? 'cal-selected' : ''}"
           data-date="${cle}" onclick="selJourPubCal('${cle}', ${JSON.stringify(parJour).replace(/"/g,'&quot;')})">
        <span class="cal-jour-num">${j}</span>
        ${evts.length
          ? `<div class="cal-dots">${evts.slice(0,3).map(() => '<span class="cal-dot"></span>').join('')}</div>`
          : ''}
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="cal-header">
      <button type="button" class="cal-nav-btn" onclick="changerMoisPubCal(-1)">
        <i class="bi bi-chevron-left"></i>
      </button>
      <span class="cal-titre">${MOIS_NOM[_pubCalMois]} ${_pubCalAnnee}</span>
      <button type="button" class="cal-nav-btn" onclick="changerMoisPubCal(1)">
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>
    <div class="cal-grid-header">
      ${JOURS.map((j) => `<div class="cal-label-jour">${j}</div>`).join('')}
    </div>
    <div class="cal-grid">${cases}</div>`;
}

function changerMoisPubCal(delta) {
  _pubCalMois += delta;
  if (_pubCalMois > 11) { _pubCalMois = 0;  _pubCalAnnee++; }
  if (_pubCalMois < 0)  { _pubCalMois = 11; _pubCalAnnee--; }
  _pubCalJourSel = null;

  const parJour = {};
  _pubActData.forEach((a) => {
    (a.events || []).forEach((ev) => {
      if (!ev.date) return;
      const cle = ev.date.slice(0, 10);
      if (!parJour[cle]) parJour[cle] = [];
      parJour[cle].push({ ...a, eventDate: ev.date });
    });
  });

  rendrePubCalMois(parJour);
  const detail = document.getElementById('pub-cal-detail');
  if (detail) detail.innerHTML = renduPubCalDetailVide();
}

function selJourPubCal(cle, parJourStr) {
  _pubCalJourSel = cle;
  document.querySelectorAll('#pub-cal-root .cal-cell').forEach((c) => {
    c.classList.toggle('cal-selected', c.dataset.date === cle);
  });

  // Reconstruire parJour depuis _pubActData (plus fiable que passer via onclick)
  const parJour = {};
  _pubActData.forEach((a) => {
    (a.events || []).forEach((ev) => {
      if (!ev.date) return;
      const k = ev.date.slice(0, 10);
      if (!parJour[k]) parJour[k] = [];
      parJour[k].push({ ...a, eventDate: ev.date });
    });
  });

  const evts  = parJour[cle] || [];
  const panel = document.getElementById('pub-cal-detail');
  if (!panel) return;

  if (!evts.length) {
    panel.innerHTML = renduPubCalDetailVide();
    return;
  }

  const MOIS_COMPLET = ['Janvier','Février','Mars','Avril','Mai','Juin',
                        'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const [annee, mois, jour] = cle.split('-');
  const labelDate = `${parseInt(jour)} ${MOIS_COMPLET[parseInt(mois)-1]} ${annee}`;

  panel.innerHTML = `
    <div class="cal-detail-titre">${labelDate}</div>
    <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.75rem">
      ${evts.length} événement(s) ce jour
    </div>
    <div class="cal-detail-liste">
      ${evts.map((a) => {
        const img    = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
        const statut = a.is_disabled
          ? '<span class="badge-status badge-inactif" style="font-size:.65rem">Désactivée</span>'
          : a.is_visible
            ? '<span class="badge-status badge-actif" style="font-size:.65rem">Visible</span>'
            : '<span class="badge-status badge-attente" style="font-size:.65rem">Masquée</span>';
        return `
          <div class="cal-detail-item">
            <div class="cal-detail-img">
              ${img
                ? `<img src="${escapeHtml(img)}" alt="">`
                : `<span style="font-size:1.5rem">${emojiTheme(a.theme)}</span>`}
            </div>
            <div style="flex:1;min-width:0">
              <div class="cal-detail-name">${escapeHtml(a.title || 'Activité')}</div>
              ${a.address ? `<div class="cal-detail-addr"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(a.address)}</div>` : ''}
              <div style="display:flex;gap:.4rem;margin-top:.35rem;flex-wrap:wrap;align-items:center">
                ${statut}
                <span style="font-size:.7rem;color:var(--text-muted)">${formatPrix(a.price)}</span>
                <span style="font-size:.7rem;color:#f59e0b">${(a.average_rating||0).toFixed(1)} ★</span>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function renduPubCalDetailVide() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                height:100%;gap:.75rem;color:var(--text-muted);padding:2rem;text-align:center">
      <i class="bi bi-calendar3" style="font-size:2.5rem;opacity:.35"></i>
      <p style="font-size:.85rem">Sélectionne un jour<br>pour voir tes événements</p>
    </div>`;
}

// ============================================================
//  PUBLISHER — HISTORIQUE DES RÉSERVATIONS REÇUES
// ============================================================

async function renderPublisherHistoriqueTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Historique</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const historique = await appelApi('/dashboard/publisher/historique');
    renderSidebar();
    afficherPublisherHistorique(historique);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherPublisherHistorique(items) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  window._pubHistItems = items;

  // Regrouper par activité
  const parActivite = {};
  items.forEach((r) => {
    const titre = r.event?.activity?.title || 'Activité inconnue';
    if (!parActivite[titre]) parActivite[titre] = [];
    parActivite[titre].push(r);
  });

  const revenuTotal = items.reduce((sum, r) => {
    const prix = r.event?.activity?.price ?? 0;
    return sum + prix * (r.group_size ?? 1);
  }, 0);

  const lignes = items.length
    ? items.map((r, i) => {
        const act = r.event?.activity || {};
        const dateR = r.date ? new Date(r.date).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'short', year: 'numeric',
        }) : '—';
        const revenu = (act.price ?? 0) * (r.group_size ?? 1);
        return `
          <tr style="animation:fadeUp .3s ${0.03 * i}s ease both">
            <td style="font-weight:600;font-size:.85rem">${escapeHtml(act.title || '—')}</td>
            <td style="font-size:.82rem;color:var(--text-muted)">${dateR}</td>
            <td>
              <span class="badge-status badge-user">
                <i class="bi bi-people-fill" style="font-size:.6rem"></i>
                ${r.group_size ?? 1} pers.
              </span>
            </td>
            <td style="font-weight:700;color:var(--accent)">${formatPrix(revenu)}</td>
            <td>
              ${r.user_rating
                ? `<span class="badge-status badge-actif" style="font-size:.7rem">
                    ${r.user_rating === 'like' ? '👍 Adoré' : r.user_rating === 'recommend' ? '⭐ Conseillé' : '👎 Non apprécié'}
                  </span>`
                : '<span style="color:var(--text-muted);font-size:.78rem">—</span>'}
            </td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="color:var(--text-muted);padding:2rem;text-align:center">
        Aucune réservation passée pour vos activités.
      </td></tr>`;

  const statsPills = Object.entries(parActivite).slice(0, 4).map(([titre, resa]) => `
    <div class="kpi-card" style="min-width:0">
      <div class="kpi-label" style="font-size:.72rem">${escapeHtml(truncate(titre, 22))}</div>
      <div class="kpi-value">${resa.length}</div>
      <div class="kpi-trend neutral" style="font-size:.72rem">réservation(s)</div>
    </div>`).join('');

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Historique des réservations</h1>
        <p class="view-subtitle">${items.length} réservation(s) passée(s) — Revenu total : ${formatPrix(revenuTotal)}</p>
      </div>
      ${items.length ? `
        <button type="button" class="btn-primary" onclick="exporterReservationsPublisher(window._pubHistItems)">
          <i class="bi bi-download"></i> Exporter CSV
        </button>` : ''}
    </header>

    ${items.length ? `<div class="kpi-grid mb-6 animate-in">${statsPills}</div>` : ''}

    ${Card({
      classes: 'table-card animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Toutes les réservations reçues</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Activité</th>
                <th>Date</th>
                <th>Groupe</th>
                <th>Revenu</th>
                <th>Avis client</th>
              </tr>
            </thead>
            <tbody>${lignes}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  PUBLISHER — STATISTIQUES DÉTAILLÉES
// ============================================================

async function renderPublisherStatsTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Statistiques</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const stats = await appelApi('/dashboard/publisher/statistiques');
    renderSidebar();
    afficherPublisherStats(stats);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherPublisherStats(stats) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const revMois  = stats.revenueParMois      || [];
  const resaMois = stats.reservationsParMois || [];
  const top      = stats.topActivites        || [];

  const lignesTop = top.length
    ? top.map((a, i) => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:.6rem">
              <div style="width:28px;height:28px;border-radius:8px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0">
                ${emojiTheme(a.theme)}
              </div>
              <span style="font-weight:600;font-size:.85rem">${escapeHtml(a.title || '—')}</span>
            </div>
          </td>
          <td style="font-weight:700;color:var(--accent)">${formatPrix(a.price)}</td>
          <td style="color:#f59e0b;font-weight:600">${(a.average_rating || 0).toFixed(1)} ★</td>
          <td>
            <div style="display:flex;align-items:center;gap:.5rem">
              <div style="height:6px;border-radius:3px;background:var(--accent);width:${Math.max(8, (a.nbReservations / (top[0]?.nbReservations || 1)) * 80)}px"></div>
              <span style="font-weight:600;font-size:.82rem">${a.nbReservations}</span>
            </div>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucune donnée.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Statistiques</h1>
        <p class="view-subtitle">Performance de vos activités sur les 6 derniers mois.</p>
      </div>
    </header>

    <div class="kpi-grid mb-6 animate-in">
      ${KpiCard({ icone: '💰', titre: 'Revenu total (6 mois)', valeur: formatPrix(stats.revenuTotal || 0), couleur: '#dbeafe', couleurIcone: '#2563eb' })}
      ${KpiCard({ icone: '📆', titre: 'Réservations reçues',   valeur: stats.totalReservations || 0,      couleur: '#d1fae5', couleurIcone: '#059669' })}
      ${KpiCard({ icone: '📋', titre: 'Annonces actives',       valeur: stats.annoncesActives || 0,         couleur: '#ede9fe', couleurIcone: '#7c3aed' })}
      ${KpiCard({ icone: '📉', titre: 'Annonces inactives',     valeur: stats.annoncesInactives || 0,       couleur: '#fef3c7', couleurIcone: '#d97706' })}
    </div>

    <div class="two-col mb-6">
      ${Card({
        classes: 'chart-card animate-in',
        contenu: `
          <div class="chart-header">
            <span class="chart-title">Revenus mensuels</span>
            <span class="chart-badge">6 derniers mois</span>
          </div>
          <div class="chart-wrapper">
            ${revMois.length ? creerGraphiqueArea(revMois, 'var(--accent)') : '<p style="color:var(--text-muted);padding:1rem">Données insuffisantes.</p>'}
          </div>`,
      })}
      ${Card({
        classes: 'chart-card animate-in',
        contenu: `
          <div class="chart-header">
            <span class="chart-title">Réservations par mois</span>
            <span class="chart-badge">6 derniers mois</span>
          </div>
          <div class="chart-wrapper">
            ${resaMois.length ? creerGraphiqueArea(resaMois, '#059669') : '<p style="color:var(--text-muted);padding:1rem">Données insuffisantes.</p>'}
          </div>`,
      })}
    </div>

    ${Card({
      classes: 'table-card animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Top activités</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Activité</th><th>Prix</th><th>Note</th><th>Réservations</th></tr></thead>
            <tbody>${lignesTop}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  PUBLISHER — MES ANNONCES (gestion complète)
// ============================================================

async function renderPublisherListingsTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Mes Annonces</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const annonces = await appelApi('/dashboard/publisher/activites');
    renderSidebar();
    afficherPublisherListings(annonces);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherPublisherListings(annonces) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const visibles = annonces.filter((a) => !a.is_disabled && a.is_visible).length;
  const masquees = annonces.filter((a) => !a.is_disabled && !a.is_visible).length;
  const desact   = annonces.filter((a) => a.is_disabled).length;

  const lignes = annonces.length
    ? annonces.map((a) => {
        const statut = a.is_disabled
          ? '<span class="badge-status badge-inactif">Désactivée</span>'
          : a.is_visible
            ? '<span class="badge-status badge-actif">Visible</span>'
            : '<span class="badge-status badge-attente">Masquée</span>';
        return `
          <tr>
            <td style="font-weight:600;font-size:.85rem">${escapeHtml(a.title || '—')}</td>
            <td style="font-weight:700;color:var(--accent)">${formatPrix(a.price)}</td>
            <td style="color:#f59e0b;font-weight:600">${(a.average_rating || 0).toFixed(1)} ★</td>
            <td>${statut}</td>
            <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(a.created_at)}</td>
            <td style="font-size:.78rem;color:var(--text-muted)">${a.nb_evenements || 0} événement(s)</td>
            <td>
              <div style="display:flex;gap:.4rem">
                <button type="button" class="icon-btn" title="Modifier"><i class="bi bi-pencil-fill"></i></button>
                <button type="button" class="icon-btn" title="Voir"><i class="bi bi-eye-fill"></i></button>
              </div>
            </td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="7" style="color:var(--text-muted);padding:2rem;text-align:center">Aucune annonce publiée.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Mes Annonces</h1>
        <p class="view-subtitle">${annonces.length} annonce(s) au total.</p>
      </div>
      <button type="button" class="btn-primary">
        <i class="bi bi-plus-lg"></i> Nouvelle annonce
      </button>
    </header>

    <div class="kpi-grid mb-6 animate-in" style="grid-template-columns:repeat(3,1fr)">
      ${KpiCard({ icone: '✅', titre: 'Visibles',    valeur: visibles, couleur: '#d1fae5', couleurIcone: '#059669' })}
      ${KpiCard({ icone: '👁',  titre: 'Masquées',   valeur: masquees, couleur: '#fef3c7', couleurIcone: '#d97706' })}
      ${KpiCard({ icone: '🚫', titre: 'Désactivées', valeur: desact,   couleur: '#fee2e2', couleurIcone: '#dc2626' })}
    </div>

    ${Card({
      classes: 'table-card animate-in',
      contenu: `
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Titre</th><th>Prix</th><th>Note</th><th>Statut</th><th>Créée le</th><th>Événements</th><th></th></tr></thead>
            <tbody>${lignes}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  PUBLISHER — RÉSERVATIONS REÇUES (futures)
// ============================================================

async function renderPublisherBookingsTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Réservations</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const data = state.dashboardData || await appelApi('/dashboard/publisher');
    renderSidebar();
    const reservations = data.dernieresReservations || [];
    afficherPublisherBookings(reservations);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherPublisherBookings(reservations) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const totalPersonnes = reservations.reduce((s, r) => s + (r.group_size ?? 1), 0);

  const lignes = reservations.length
    ? reservations.map((r, i) => `
        <tr style="animation:fadeUp .3s ${0.04 * i}s ease both">
          <td style="font-weight:600;font-size:.82rem">#${r.id}</td>
          <td style="font-size:.82rem">${formatDate(r.date)}</td>
          <td>
            <span class="badge-status badge-user">
              <i class="bi bi-people-fill" style="font-size:.55rem"></i>
              ${r.group_size ?? 1} pers.
            </span>
          </td>
          <td>${badgeStatut('confirme')}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="color:var(--text-muted);padding:2rem;text-align:center">Aucune réservation reçue.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Réservations</h1>
        <p class="view-subtitle">${reservations.length} réservation(s) — ${totalPersonnes} participant(s) au total.</p>
      </div>
    </header>
    ${Card({
      classes: 'table-card animate-in',
      contenu: `
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>#</th><th>Date</th><th>Groupe</th><th>Statut</th></tr></thead>
            <tbody>${lignes}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  ONGLET ADMIN — GESTION DES CLIENTS
// ============================================================

async function renderAdminUsersTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Gestion des clients</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const users = await appelApi('/dashboard/admin/users');
    renderSidebar();
    _adminUsersData = users;
    _adminUsersSearch = '';
    afficherAdminUsers(users, 1);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

let _adminUsersData = [];
let _adminUsersSearch = '';
const ADMIN_USERS_PER_PAGE = 10;

function badgeRoleAdmin(role) {
  const r = (role || '').toLowerCase();
  if (r === 'admin')     return '<span class="badge-status badge-admin">Admin</span>';
  if (r === 'publisher') return '<span class="badge-status" style="background:#dbeafe;color:#004AAD">Meeter</span>';
  return '<span class="badge-status" style="background:#f1f5f9;color:#475569">Client</span>';
}

function afficherAdminUsers(users, page) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const q = _adminUsersSearch.toLowerCase();
  const filtered = q
    ? users.filter((u) =>
        `${u.firstname || ''} ${u.lastname || ''}`.toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q))
    : users;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_PER_PAGE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * ADMIN_USERS_PER_PAGE;
  const slice = filtered.slice(start, start + ADMIN_USERS_PER_PAGE);

  const lignes = slice.length
    ? slice.map((u) => `
        <tr>
          <td>${escapeHtml(u.lastname || '—')}</td>
          <td>${escapeHtml(u.firstname || '—')}</td>
          <td style="font-size:.82rem">${escapeHtml(u.email || '—')}</td>
          <td>${badgeRoleAdmin(u.role)}</td>
          <td>
            <span class="badge-status ${u.enabled ? 'badge-actif' : 'badge-inactif'}" style="font-size:.7rem">
              ${u.enabled ? '● Actif' : '● Bloqué'}
            </span>
          </td>
          <td>
            <button class="icon-btn" title="Voir le profil" data-action="view" data-id="${u.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn" title="Modifier le rôle" data-action="edit" data-id="${u.id}"><i class="bi bi-pencil-fill"></i></button>
            <button class="icon-btn ${u.enabled ? 'danger' : ''}" title="${u.enabled ? 'Bloquer' : 'Débloquer'}"
              data-action="block" data-id="${u.id}" data-enabled="${u.enabled}">
              <i class="bi ${u.enabled ? 'bi-slash-circle-fill' : 'bi-check-circle-fill'}"></i>
            </button>
            <button class="icon-btn danger" title="Supprimer" data-action="delete" data-id="${u.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun résultat.</td></tr>';

  const paginationHtml = renderPagination(total, current, totalPages, 'adminUsersGoPage');

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Gestion des clients</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" id="admin-users-search" placeholder="Rechercher…" value="${escapeHtml(_adminUsersSearch)}"
            oninput="adminUsersFilter(this.value)">
        </div>
        <span class="admin-count">Nombre de clients : <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Nom</th><th>Prénom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody id="admin-users-tbody">${lignes}</tbody>
        </table>
      </div>
      ${paginationHtml}
    </div>`;

  main.querySelectorAll('[data-action="view"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const u = _adminUsersData.find((x) => String(x.id) === btn.dataset.id);
      if (u) ouvrirModalUtilisateur(u);
    });
  });
  main.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const u = _adminUsersData.find((x) => String(x.id) === btn.dataset.id);
      if (u) ouvrirModalEditerRole(u);
    });
  });
  main.querySelectorAll('[data-action="block"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id      = btn.dataset.id;
      const enabled = btn.dataset.enabled === 'true';
      const libelle = enabled ? 'Bloquer' : 'Débloquer';
      if (!confirm(`${libelle} l'utilisateur #${id} ?`)) return;
      btn.disabled = true;
      try {
        await appelApi(`/dashboard/admin/users/${id}/toggle-block`, 'PATCH', { block: enabled });
        const idx = _adminUsersData.findIndex((x) => String(x.id) === id);
        if (idx !== -1) _adminUsersData[idx].enabled = !enabled;
        afficherAdminUsers(_adminUsersData, current);
      } catch (e) { alert('Erreur : ' + e.message); btn.disabled = false; }
    });
  });

  main.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Supprimer l'utilisateur #${btn.dataset.id} ?`)) return;
      try {
        await appelApi(`/dashboard/admin/users/${btn.dataset.id}`, 'DELETE');
        _adminUsersData = _adminUsersData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminUsers(_adminUsersData, current);
      } catch (e) { alert('Erreur : ' + e.message); }
    });
  });
}

function adminUsersFilter(val) {
  _adminUsersSearch = val;
  afficherAdminUsers(_adminUsersData, 1);
}

function adminUsersGoPage(page) {
  afficherAdminUsers(_adminUsersData, page);
}

function renderPagination(total, current, totalPages, fn) {
  if (totalPages <= 1) return '';
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) pages.push(i);
    if (current < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }
  return `<div class="admin-pagination">
    ${current > 1 ? `<button class="admin-page-btn" onclick="${fn}(${current - 1})"><i class="bi bi-chevron-left"></i></button>` : ''}
    ${pages.map((p) => p === '…'
      ? `<span class="admin-page-btn" style="border:none;cursor:default">…</span>`
      : `<button class="admin-page-btn ${p === current ? 'active' : ''}" onclick="${fn}(${p})">${p}</button>`
    ).join('')}
    ${current < totalPages ? `<button class="admin-page-btn" onclick="${fn}(${current + 1})"><i class="bi bi-chevron-right"></i></button>` : ''}
  </div>`;
}

function ouvrirModalUtilisateur(u) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-title">
        <span><i class="bi bi-person-fill"></i> Profil utilisateur</span>
        <button class="admin-modal-close" id="modal-close-btn"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field"><label>Nom</label><input type="text" value="${escapeHtml(u.lastname || '')}" readonly></div>
      <div class="admin-modal-field"><label>Prénom</label><input type="text" value="${escapeHtml(u.firstname || '')}" readonly></div>
      <div class="admin-modal-field"><label>Email</label><input type="text" value="${escapeHtml(u.email || '')}" readonly></div>
      <div class="admin-modal-field"><label>Rôle</label><input type="text" value="${escapeHtml(u.role || '')}" readonly></div>
      <div class="admin-modal-field"><label>Inscrit le</label><input type="text" value="${formatDate(u.created_at)}" readonly></div>
      <div class="admin-modal-field"><label>Statut</label><input type="text" value="${u.enabled ? 'Actif' : 'Inactif'}" readonly></div>
      ${u.address ? `<div class="admin-modal-field"><label>Adresse</label><input type="text" value="${escapeHtml(u.address)}" readonly></div>` : ''}
      <div class="admin-modal-actions">
        <button class="btn-primary" id="modal-close-btn2"><i class="bi bi-check-lg"></i> Fermer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#modal-close-btn').addEventListener('click', close);
  overlay.querySelector('#modal-close-btn2').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function ouvrirModalEditerRole(u) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-title">
        <span><i class="bi bi-pencil-fill"></i> Modifier le rôle</span>
        <button class="admin-modal-close" id="modal-close-edit"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>Utilisateur</label>
        <input type="text" value="${escapeHtml((u.firstname || '') + ' ' + (u.lastname || ''))}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Rôle actuel</label>
        <select id="edit-role-select">
          <option value="USER" ${(u.role||'').toUpperCase()==='USER'?'selected':''}>Client</option>
          <option value="PUBLISHER" ${(u.role||'').toUpperCase()==='PUBLISHER'?'selected':''}>Meeter (Publisher)</option>
          <option value="ADMIN" ${(u.role||'').toUpperCase()==='ADMIN'?'selected':''}>Admin</option>
        </select>
      </div>
      <div id="edit-role-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-outline" id="modal-cancel-edit">Annuler</button>
        <button class="btn-primary" id="modal-save-role"><i class="bi bi-check-lg"></i> Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#modal-close-edit').addEventListener('click', close);
  overlay.querySelector('#modal-cancel-edit').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#modal-save-role').addEventListener('click', async () => {
    const newRole = overlay.querySelector('#edit-role-select').value;
    const fb = overlay.querySelector('#edit-role-feedback');
    try {
      await appelApi(`/dashboard/admin/users/${u.id}/role`, 'PATCH', { role: newRole });
      const idx = _adminUsersData.findIndex((x) => x.id === u.id);
      if (idx !== -1) _adminUsersData[idx].role = newRole;
      fb.innerHTML = `<div style="color:#059669;font-size:.82rem;padding:.4rem 0"><i class="bi bi-check-circle-fill"></i> Rôle mis à jour.</div>`;
      setTimeout(close, 900);
    } catch (e) {
      fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem;padding:.4rem 0"><i class="bi bi-exclamation-circle-fill"></i> ${escapeHtml(e.message)}</div>`;
    }
  });
}

// ============================================================
//  ONGLET ADMIN — MESSAGERIE (messages de contact)
// ============================================================

let _adminMsgData = [];
let _adminMsgSearch = '';
const ADMIN_MSG_PER_PAGE = 10;

async function renderAdminMessagingTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Messagerie</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const msgs = await appelApi('/dashboard/admin/contact-messages');
    renderSidebar();
    _adminMsgData = msgs;
    _adminMsgSearch = '';
    afficherAdminMessages(msgs, 1);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherAdminMessages(msgs, page) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const q = _adminMsgSearch.toLowerCase();
  const filtered = q
    ? msgs.filter((m) =>
        `${m.firstname || ''} ${m.lastname || ''}`.toLowerCase().includes(q) ||
        (m.subject || '').toLowerCase().includes(q))
    : msgs;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_MSG_PER_PAGE));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * ADMIN_MSG_PER_PAGE, current * ADMIN_MSG_PER_PAGE);

  const lignes = slice.length
    ? slice.map((m) => `
        <tr>
          <td>${escapeHtml(m.lastname || '—')}</td>
          <td>${escapeHtml(m.firstname || '—')}</td>
          <td style="font-size:.82rem">${escapeHtml(m.subject || '—')}</td>
          <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(m.created_at)}</td>
          <td>
            <button class="icon-btn" title="Voir" data-action="view-msg" data-id="${m.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn" title="Répondre" data-action="reply-msg" data-id="${m.id}"><i class="bi bi-reply-fill"></i></button>
            <button class="icon-btn danger" title="Supprimer" data-action="delete-msg" data-id="${m.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun message.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Messagerie</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" id="admin-msg-search" placeholder="Rechercher…" value="${escapeHtml(_adminMsgSearch)}"
            oninput="adminMsgFilter(this.value)">
        </div>
        <span class="admin-count">Nombre de messages : <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Nom</th><th>Prénom</th><th>Sujet</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>
      ${renderPagination(total, current, totalPages, 'adminMsgGoPage')}
    </div>`;

  main.querySelectorAll('[data-action="view-msg"],[data-action="reply-msg"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = _adminMsgData.find((x) => String(x.id) === btn.dataset.id);
      const isReply = btn.dataset.action === 'reply-msg';
      if (m) ouvrirModalMessage(m, isReply);
    });
  });
  main.querySelectorAll('[data-action="delete-msg"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce message ?')) return;
      try {
        await appelApi(`/dashboard/admin/contact-messages/${btn.dataset.id}`, 'DELETE');
        _adminMsgData = _adminMsgData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminMessages(_adminMsgData, current);
      } catch (e) { alert('Erreur : ' + e.message); }
    });
  });
}

function adminMsgFilter(val) {
  _adminMsgSearch = val;
  afficherAdminMessages(_adminMsgData, 1);
}

function adminMsgGoPage(page) {
  afficherAdminMessages(_adminMsgData, page);
}

function ouvrirModalMessage(m, showReply) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  const hasReponse = !!m.reply;
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-title">
        <span><i class="bi bi-envelope-fill"></i> ${showReply ? 'Répondre au message' : 'Voir le message'}</span>
        <button class="admin-modal-close" id="msg-modal-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field"><label>Nom</label><input type="text" value="${escapeHtml(m.lastname || '')}" readonly></div>
      <div class="admin-modal-field"><label>Prénom</label><input type="text" value="${escapeHtml(m.firstname || '')}" readonly></div>
      <div class="admin-modal-field"><label>Email</label><input type="text" value="${escapeHtml(m.email || '')}" readonly></div>
      <div class="admin-modal-field"><label>Sujet du message</label><input type="text" value="${escapeHtml(m.subject || '')}" readonly></div>
      <div class="admin-modal-field"><label>Message</label><textarea rows="4" readonly>${escapeHtml(m.message || '')}</textarea></div>
      ${hasReponse ? `
        <div style="padding:.6rem .9rem;background:var(--accent-soft);border-radius:.75rem;margin-bottom:.75rem;font-size:.82rem">
          <strong>Message initial par ${escapeHtml(m.firstname || '')} ${escapeHtml(m.lastname || '')}</strong>
        </div>
        <div class="admin-modal-field"><label>Réponse précédente</label><textarea rows="3" readonly>${escapeHtml(m.reply || '')}</textarea></div>
      ` : ''}
      ${showReply ? `
        <div class="admin-modal-field">
          <label>Réponse</label>
          <textarea id="msg-reply-text" rows="4" placeholder="Votre réponse…">${escapeHtml(m.reply || '')}</textarea>
        </div>
      ` : ''}
      <div id="msg-modal-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-danger" id="msg-modal-delete"><i class="bi bi-trash-fill"></i> Supprimer</button>
        ${showReply ? `<button class="btn-primary" id="msg-modal-reply"><i class="bi bi-reply-fill"></i> Répondre</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#msg-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#msg-modal-delete').addEventListener('click', async () => {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await appelApi(`/dashboard/admin/contact-messages/${m.id}`, 'DELETE');
      _adminMsgData = _adminMsgData.filter((x) => x.id !== m.id);
      afficherAdminMessages(_adminMsgData, 1);
      close();
    } catch (e) { alert('Erreur : ' + e.message); }
  });
  if (showReply) {
    overlay.querySelector('#msg-modal-reply').addEventListener('click', async () => {
      const replyText = overlay.querySelector('#msg-reply-text').value.trim();
      const fb = overlay.querySelector('#msg-modal-feedback');
      if (!replyText) { fb.innerHTML = '<div style="color:#dc2626;font-size:.82rem">Veuillez saisir une réponse.</div>'; return; }
      fb.innerHTML = '<div style="color:var(--text-muted);font-size:.82rem">Envoi…</div>';
      try {
        await appelApi(`/dashboard/admin/contact-messages/${m.id}/reply`, 'POST', { reply: replyText });
        m.reply = replyText;
        fb.innerHTML = '<div style="color:#059669;font-size:.82rem"><i class="bi bi-check-circle-fill"></i> Réponse envoyée.</div>';
        setTimeout(close, 1000);
      } catch (e) {
        fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem"><i class="bi bi-exclamation-circle-fill"></i> ${escapeHtml(e.message)}</div>`;
      }
    });
  }
}

// ============================================================
//  ONGLET ADMIN — SIGNALEMENT UTILISATEURS
// ============================================================

let _adminRptUsersData = [];
let _adminRptUsersSearch = '';

async function renderAdminReportsUsersTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Signalement utilisateur</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const reports = await appelApi('/dashboard/admin/reports/users');
    renderSidebar();
    _adminRptUsersData = reports;
    _adminRptUsersSearch = '';
    afficherAdminReportsUsers(reports, 1);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherAdminReportsUsers(reports, page) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const q = _adminRptUsersSearch.toLowerCase();
  const filtered = q
    ? reports.filter((r) =>
        `${r.reported_firstname || ''} ${r.reported_lastname || ''}`.toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q))
    : reports;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * 10, current * 10);

  const lignes = slice.length
    ? slice.map((r) => `
        <tr>
          <td>${escapeHtml(r.reported_lastname || '—')}</td>
          <td>${escapeHtml(r.reported_firstname || '—')}</td>
          <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(r.created_at)}</td>
          <td>
            ${r.reason ? `<span class="report-badge report-badge-medium">${escapeHtml(truncate(r.reason, 30))}</span>` : '—'}
          </td>
          <td>
            <button class="icon-btn" title="Voir" data-action="view-rpt-user" data-id="${r.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn danger" title="Supprimer" data-action="delete-rpt-user" data-id="${r.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun signalement.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Signalement utilisateur</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" placeholder="Rechercher…" value="${escapeHtml(_adminRptUsersSearch)}"
            oninput="adminRptUsersFilter(this.value)">
        </div>
        <span class="admin-count">Nombre de signalements : <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Nom</th><th>Prénom</th><th>Date du signalement</th><th>Raison</th><th>Actions</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>
      ${renderPagination(total, current, totalPages, 'adminRptUsersGoPage')}
    </div>`;

  main.querySelectorAll('[data-action="view-rpt-user"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = _adminRptUsersData.find((x) => String(x.id) === btn.dataset.id);
      if (r) ouvrirModalReportUser(r);
    });
  });
  main.querySelectorAll('[data-action="delete-rpt-user"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Enlever ce signalement ?')) return;
      try {
        await appelApi(`/dashboard/admin/reports/${btn.dataset.id}`, 'DELETE');
        _adminRptUsersData = _adminRptUsersData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminReportsUsers(_adminRptUsersData, current);
      } catch (e) { alert('Erreur : ' + e.message); }
    });
  });
}

function adminRptUsersFilter(val) {
  _adminRptUsersSearch = val;
  afficherAdminReportsUsers(_adminRptUsersData, 1);
}

function adminRptUsersGoPage(page) {
  afficherAdminReportsUsers(_adminRptUsersData, page);
}

function ouvrirModalReportUser(r) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-title">
        <span><i class="bi bi-flag-fill"></i> Raison du signalement</span>
        <button class="admin-modal-close" id="rpt-modal-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>Utilisateur</label>
        <input type="text" value="${escapeHtml((r.reported_lastname || '') + ' ' + (r.reported_firstname || ''))}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Motif</label>
        <input type="text" value="${escapeHtml(r.reason || '—')}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Description</label>
        <textarea rows="4" readonly>${escapeHtml(r.description || r.message || '—')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label>Signalé le</label>
        <input type="text" value="${formatDate(r.created_at)}" readonly>
      </div>
      <div id="rpt-user-modal-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-primary" id="rpt-enlever"><i class="bi bi-shield-check"></i> Enlever le signalement</button>
        <button class="btn-danger" id="rpt-bloquer"><i class="bi bi-ban"></i> Bloquer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#rpt-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const fb = overlay.querySelector('#rpt-user-modal-feedback');
  overlay.querySelector('#rpt-enlever').addEventListener('click', async () => {
    try {
      await appelApi(`/dashboard/admin/reports/${r.id}`, 'DELETE');
      _adminRptUsersData = _adminRptUsersData.filter((x) => x.id !== r.id);
      afficherAdminReportsUsers(_adminRptUsersData, 1);
      close();
    } catch (e) { fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem">${escapeHtml(e.message)}</div>`; }
  });
  overlay.querySelector('#rpt-bloquer').addEventListener('click', async () => {
    if (!confirm('Bloquer cet utilisateur ?')) return;
    try {
      await appelApi(`/dashboard/admin/reports/users/${r.id_reported}/block`, 'PATCH');
      fb.innerHTML = '<div style="color:#059669;font-size:.82rem"><i class="bi bi-check-circle-fill"></i> Utilisateur bloqué.</div>';
      setTimeout(close, 1000);
    } catch (e) { fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem">${escapeHtml(e.message)}</div>`; }
  });
}

// ============================================================
//  ONGLET ADMIN — SIGNALEMENT ACTIVITÉS
// ============================================================

let _adminRptActData = [];
let _adminRptActSearch = '';

async function renderAdminReportsActivitiesTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Signalement annonce</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const reports = await appelApi('/dashboard/admin/reports/activities');
    renderSidebar();
    _adminRptActData = reports;
    _adminRptActSearch = '';
    afficherAdminReportsActivities(reports, 1);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherAdminReportsActivities(reports, page) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const q = _adminRptActSearch.toLowerCase();
  const filtered = q
    ? reports.filter((r) =>
        (r.activity_title || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q))
    : reports;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / 10));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * 10, current * 10);

  const lignes = slice.length
    ? slice.map((r) => `
        <tr>
          <td style="font-weight:600;font-size:.85rem">${escapeHtml(r.activity_title || '—')}</td>
          <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(r.created_at)}</td>
          <td>
            ${r.reason ? `<span class="report-badge report-badge-medium">${escapeHtml(truncate(r.reason, 30))}</span>` : '—'}
          </td>
          <td>
            <button class="icon-btn" title="Voir" data-action="view-rpt-act" data-id="${r.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn danger" title="Supprimer" data-action="delete-rpt-act" data-id="${r.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="color:var(--text-muted);padding:1.5rem;text-align:center">Aucun signalement.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Signalement annonce</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" placeholder="Rechercher…" value="${escapeHtml(_adminRptActSearch)}"
            oninput="adminRptActFilter(this.value)">
        </div>
        <span class="admin-count">Nombre de signalements : <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Nom (activité)</th><th>Date du signalement</th><th>Raison</th><th>Actions</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>
      ${renderPagination(total, current, totalPages, 'adminRptActGoPage')}
    </div>`;

  main.querySelectorAll('[data-action="view-rpt-act"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = _adminRptActData.find((x) => String(x.id) === btn.dataset.id);
      if (r) ouvrirModalReportActivity(r);
    });
  });
  main.querySelectorAll('[data-action="delete-rpt-act"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Enlever ce signalement ?')) return;
      try {
        await appelApi(`/dashboard/admin/reports/${btn.dataset.id}`, 'DELETE');
        _adminRptActData = _adminRptActData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminReportsActivities(_adminRptActData, current);
      } catch (e) { alert('Erreur : ' + e.message); }
    });
  });
}

function adminRptActFilter(val) {
  _adminRptActSearch = val;
  afficherAdminReportsActivities(_adminRptActData, 1);
}

function adminRptActGoPage(page) {
  afficherAdminReportsActivities(_adminRptActData, page);
}

function ouvrirModalReportActivity(r) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-title">
        <span><i class="bi bi-flag-fill"></i> Signalement — Annonce</span>
        <button class="admin-modal-close" id="rpt-act-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>Activité signalée</label>
        <input type="text" value="${escapeHtml(r.activity_title || '—')}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Motif</label>
        <input type="text" value="${escapeHtml(r.reason || '—')}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Description</label>
        <textarea rows="4" readonly>${escapeHtml(r.description || r.message || '—')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label>Signalé le</label>
        <input type="text" value="${formatDate(r.created_at)}" readonly>
      </div>
      <div id="rpt-act-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-primary" id="rpt-act-enlever"><i class="bi bi-shield-check"></i> Enlever le signalement</button>
        ${r.activity_id || r.id_activity
          ? `<button class="btn-danger" id="rpt-act-desactiver"><i class="bi bi-slash-circle-fill"></i> Désactiver l'activité</button>`
          : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#rpt-act-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  const fb = overlay.querySelector('#rpt-act-feedback');

  overlay.querySelector('#rpt-act-enlever').addEventListener('click', async () => {
    try {
      await appelApi(`/dashboard/admin/reports/${r.id}`, 'DELETE');
      _adminRptActData = _adminRptActData.filter((x) => x.id !== r.id);
      afficherAdminReportsActivities(_adminRptActData, 1);
      close();
    } catch (e) { fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem">${escapeHtml(e.message)}</div>`; }
  });

  const btnDesact = overlay.querySelector('#rpt-act-desactiver');
  if (btnDesact) {
    btnDesact.addEventListener('click', async () => {
      const actId = r.id_activity || r.activity_id;
      if (!actId || !confirm('Désactiver cette activité ? Elle ne sera plus visible par les utilisateurs.')) return;
      btnDesact.disabled = true;
      btnDesact.innerHTML = '<i class="bi bi-hourglass-split"></i> Désactivation…';
      try {
        await appelApi(`/dashboard/admin/activities/${actId}/disable`, 'PATCH');
        fb.innerHTML = `<div style="color:#059669;font-size:.82rem;padding:.4rem 0">
          <i class="bi bi-check-circle-fill"></i> Activité désactivée avec succès.
        </div>`;
        setTimeout(close, 1200);
      } catch (e) {
        fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem">${escapeHtml(e.message)}</div>`;
        btnDesact.disabled = false;
        btnDesact.innerHTML = '<i class="bi bi-slash-circle-fill"></i> Désactiver l\'activité';
      }
    });
  }
}

// ============================================================
//  ONGLET ADMIN — MODIFIER LES TABLES (Thèmes)
// ============================================================

const THEMES_CATEGORIES = [
  { key: 'activites',              label: 'Thèmes activités' },
  { key: 'faq',                    label: 'Thèmes FAQ' },
  { key: 'forum',                  label: 'Thèmes Forum' },
  { key: 'signalement_utilisateur', label: 'Thèmes signalement utilisateur' },
  { key: 'signalement_activite',   label: 'Thèmes signalement activité' },
];

let _themesData = {};

async function renderAdminSettingsTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Modifier les tables</h1><p class="view-subtitle">Chargement…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Chargement…</p></div>`;

  try {
    const themes = await appelApi('/dashboard/admin/themes');
    renderSidebar();
    _themesData = themes;
    afficherAdminSettings();
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherAdminSettings() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  const sections = THEMES_CATEGORIES.map((cat) => {
    const tags = (_themesData[cat.key] || []);
    const pills = tags.map((t) => `
      <span class="tag-pill">
        ${escapeHtml(t)}
        <button class="tag-remove" title="Retirer" onclick="retirerTheme('${cat.key}', '${escapeHtml(t)}')" type="button">
          <i class="bi bi-x"></i>
        </button>
      </span>`).join('');

    return `
      <div class="glass-card animate-in" style="margin-bottom:1.25rem">
        <div class="card-title">${escapeHtml(cat.label)} :</div>
        <div class="tag-add-row">
          <input type="text" id="theme-input-${cat.key}" placeholder="Nouveau thème…">
          <button class="btn-primary" style="white-space:nowrap" type="button"
            onclick="ajouterTheme('${cat.key}')">
            <i class="bi bi-plus-lg"></i> Ajouter
          </button>
        </div>
        <div class="tag-pills-wrap" id="theme-pills-${cat.key}">
          ${pills || '<span style="font-size:.8rem;color:var(--text-muted)">Aucun thème.</span>'}
        </div>
      </div>`;
  }).join('');

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Modifier les tables</h1>
        <p class="view-subtitle">Gérez les thèmes et catégories de la plateforme.</p>
      </div>
    </header>
    <div style="max-width:720px">
      ${sections}
    </div>`;
}

async function ajouterTheme(categoryKey) {
  const input = document.getElementById(`theme-input-${categoryKey}`);
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;

  try {
    await appelApi('/dashboard/admin/themes', 'POST', { category: categoryKey, theme: value });
    if (!_themesData[categoryKey]) _themesData[categoryKey] = [];
    if (!_themesData[categoryKey].includes(value)) _themesData[categoryKey].push(value);
    input.value = '';
    rafraichirThemePills(categoryKey);
  } catch (e) { alert('Erreur : ' + e.message); }
}

async function retirerTheme(categoryKey, theme) {
  try {
    await appelApi('/dashboard/admin/themes', 'DELETE', { category: categoryKey, theme });
    if (_themesData[categoryKey]) {
      _themesData[categoryKey] = _themesData[categoryKey].filter((t) => t !== theme);
    }
    rafraichirThemePills(categoryKey);
  } catch (e) { alert('Erreur : ' + e.message); }
}

function rafraichirThemePills(categoryKey) {
  const container = document.getElementById(`theme-pills-${categoryKey}`);
  if (!container) return;
  const tags = _themesData[categoryKey] || [];
  if (!tags.length) {
    container.innerHTML = '<span style="font-size:.8rem;color:var(--text-muted)">Aucun thème.</span>';
    return;
  }
  container.innerHTML = tags.map((t) => `
    <span class="tag-pill">
      ${escapeHtml(t)}
      <button class="tag-remove" title="Retirer" onclick="retirerTheme('${categoryKey}', '${escapeHtml(t)}')" type="button">
        <i class="bi bi-x"></i>
      </button>
    </span>`).join('');
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
        <div style="display:flex;gap:.35rem">
          <button type="button" class="icon-btn" title="Voir le profil"
            onclick="adminOverviewVoir(${u.id})">
            <i class="bi bi-eye-fill"></i>
          </button>
          <button type="button" class="icon-btn" title="Modifier le rôle"
            onclick="adminOverviewEditer(${u.id})">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button type="button" class="icon-btn danger" title="Supprimer"
            onclick="adminOverviewSupprimer(${u.id})">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

// Fonctions globales appelées depuis les onclick du tableau overview admin
function adminOverviewVoir(id) {
  const users = (state.dashboardData || {}).derniersUtilisateurs || [];
  const u = users.find((x) => x.id === id);
  if (u) ouvrirModalUtilisateur(u);
}

function adminOverviewEditer(id) {
  const users = (state.dashboardData || {}).derniersUtilisateurs || [];
  const u = users.find((x) => x.id === id);
  if (!u) return;
  // Ouvrir le même modal que dans "Gestion des clients"
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-title">
        <span><i class="bi bi-pencil-fill"></i> Modifier le rôle</span>
        <button class="admin-modal-close" id="ov-edit-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>Utilisateur</label>
        <input type="text" value="${escapeHtml((u.firstname || '') + ' ' + (u.lastname || ''))}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Rôle actuel</label>
        <select id="ov-edit-role-select">
          <option value="USER"      ${(u.role||'').toUpperCase()==='USER'      ?'selected':''}>Client</option>
          <option value="PUBLISHER" ${(u.role||'').toUpperCase()==='PUBLISHER' ?'selected':''}>Meeter (Publisher)</option>
          <option value="ADMIN"     ${(u.role||'').toUpperCase()==='ADMIN'     ?'selected':''}>Admin</option>
        </select>
      </div>
      <div id="ov-edit-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-outline" id="ov-edit-cancel">Annuler</button>
        <button class="btn-primary" id="ov-edit-save"><i class="bi bi-check-lg"></i> Enregistrer</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#ov-edit-close').addEventListener('click', close);
  overlay.querySelector('#ov-edit-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#ov-edit-save').addEventListener('click', async () => {
    const newRole = overlay.querySelector('#ov-edit-role-select').value;
    const fb      = overlay.querySelector('#ov-edit-feedback');
    try {
      await appelApi(`/dashboard/admin/users/${u.id}/role`, 'PATCH', { role: newRole });
      // Mettre à jour le cache local
      const users = (state.dashboardData || {}).derniersUtilisateurs || [];
      const idx = users.findIndex((x) => x.id === u.id);
      if (idx !== -1) users[idx].role = newRole;
      fb.innerHTML = `<div style="color:#059669;font-size:.82rem;padding:.4rem 0">
        <i class="bi bi-check-circle-fill"></i> Rôle mis à jour.
      </div>`;
      setTimeout(() => { close(); rafraichirTableau(); }, 900);
    } catch (err) {
      fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem;padding:.4rem 0">
        <i class="bi bi-exclamation-circle-fill"></i> ${escapeHtml(err.message)}
      </div>`;
    }
  });
}

async function adminOverviewSupprimer(id) {
  if (!confirm(`Supprimer l'utilisateur #${id} ?`)) return;
  try {
    await appelApi(`/dashboard/admin/users/${id}`, 'DELETE');
    // Retirer du cache local
    const data = state.dashboardData || {};
    data.derniersUtilisateurs = (data.derniersUtilisateurs || []).filter((x) => x.id !== id);
    rafraichirTableau();
  } catch (err) {
    alert('Erreur : ' + err.message);
  }
}

// ============================================================
//  EXPORT CSV — ADMIN
// ============================================================

function exporterDonneesAdmin() {
  const data  = state.dashboardData || {};
  const kpi   = data.kpi || {};
  const users = data.derniersUtilisateurs || [];

  // Construire le CSV
  const lignesCSV = [
    // En-tête
    ['Nom', 'Prénom', 'Email', 'Rôle', 'Statut', 'Inscrit le'].join(';'),
    // Données utilisateurs
    ...users.map((u) => [
      u.lastname  || '',
      u.firstname || '',
      u.email     || '',
      (u.role     || '').toLowerCase(),
      u.enabled ? 'Actif' : 'Inactif',
      formatDate(u.created_at),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')),
  ];

  // Ajouter un bloc KPI en fin de fichier
  lignesCSV.push('');
  lignesCSV.push('--- Statistiques ---');
  lignesCSV.push(`"Revenu total";"${formatPrix(kpi.revenu)}"`);
  lignesCSV.push(`"Nouveaux Meeters (7j)";"${kpi.nouveauxUtilisateurs ?? 0}"`);
  lignesCSV.push(`"Signalements";"${kpi.signalements ?? 0}"`);
  lignesCSV.push(`"Taux de conversion";"${kpi.tauxConversion ?? 0} %"`);
  lignesCSV.push(`"Total utilisateurs";"${kpi.totalUtilisateurs ?? 0}"`);

  const contenu = '﻿' + lignesCSV.join('\n'); // BOM UTF-8 pour Excel
  const blob    = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);

  const today = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `meetando-admin-export-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
//  EXPORT PDF — ADMIN
// ============================================================

function exporterDonneesAdminPDF() {
  const data  = state.dashboardData || {};
  const kpi   = data.kpi || {};
  const users = data.derniersUtilisateurs || [];
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const lignesHTML = users.map((u) => `
    <tr>
      <td>${escapeHtml((u.lastname || '') + ' ' + (u.firstname || ''))}</td>
      <td>${escapeHtml(u.email || '')}</td>
      <td>${escapeHtml(u.role || '')}</td>
      <td>${u.enabled ? 'Actif' : 'Inactif'}</td>
      <td>${formatDate(u.created_at)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport Admin — Meet&Do</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; padding: 2rem; font-size: 13px; }
    h1 { color: #2563eb; margin-bottom: .25rem; }
    .subtitle { color: #64748b; margin-bottom: 2rem; font-size: 12px; }
    .kpi-row { display: flex; gap: 1.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .kpi-box { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: .75rem 1.25rem; min-width: 140px; }
    .kpi-box .label { font-size: 11px; color: #64748b; margin-bottom: .25rem; }
    .kpi-box .val { font-size: 1.3rem; font-weight: 700; color: #2563eb; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th { background: #f1f5f9; padding: .5rem .75rem; text-align: left; font-size: 11px; color: #475569; }
    td { padding: .5rem .75rem; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    h2 { font-size: 1rem; margin: 1.5rem 0 .5rem; color: #1e293b; }
    .footer { margin-top: 2rem; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: .75rem; }
    @media print { body { padding: .5rem; } }
  </style>
</head>
<body>
  <h1>📊 Rapport administrateur — Meet&amp;Do</h1>
  <div class="subtitle">Généré le ${today}</div>
  <div class="kpi-row">
    <div class="kpi-box"><div class="label">Revenu total</div><div class="val">${escapeHtml(formatPrix(kpi.revenu))}</div></div>
    <div class="kpi-box"><div class="label">Nouveaux Meeters (7j)</div><div class="val">${kpi.nouveauxUtilisateurs ?? 0}</div></div>
    <div class="kpi-box"><div class="label">Signalements</div><div class="val">${kpi.signalements ?? 0}</div></div>
    <div class="kpi-box"><div class="label">Taux de conversion</div><div class="val">${kpi.tauxConversion ?? 0} %</div></div>
    <div class="kpi-box"><div class="label">Total utilisateurs</div><div class="val">${kpi.totalUtilisateurs ?? 0}</div></div>
  </div>
  <h2>Derniers utilisateurs inscrits (${users.length})</h2>
  <table>
    <thead><tr><th>Nom &amp; Prénom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Inscrit le</th></tr></thead>
    <tbody>${lignesHTML}</tbody>
  </table>
  <div class="footer">Meet&amp;Do — Rapport confidentiel — ${today}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Veuillez autoriser les fenêtres popup pour générer le PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ============================================================
//  ADMIN — TRAFIC RÉEL + ACTIVITÉ RÉCENTE (chargés après render)
// ============================================================

async function chargerExtrasAdmin() {
  await Promise.allSettled([chargerTrafficReel(), chargerActiviteRecente()]);
}

async function chargerTrafficReel() {
  const wrapper = document.getElementById('admin-traffic-chart');
  if (!wrapper) return;
  try {
    const data = await appelApi('/dashboard/admin/traffic');
    const normalise = Array.isArray(data) && data.length >= 2
      ? data.map((d) => ({ label: d.label || d.jour || '?', val: Number(d.val ?? d.count ?? 0) }))
      : null;
    if (!normalise) return;
    wrapper.innerHTML = creerGraphiqueArea(normalise, '#2563eb');
  } catch (_) { /* Garder TRAFIC_DEMO en cas d'erreur */ }
}

async function chargerActiviteRecente() {
  const container = document.getElementById('admin-overview-extras');
  if (!container) return;
  try {
    const r = await appelApi('/dashboard/admin/recent-activity');
    const inscriptions  = r.nouvellesInscriptions  ?? r.newSignups            ?? 0;
    const reservations  = r.nouvellesReservations  ?? r.newReservations        ?? 0;
    const demandesEdit  = r.nouvellesDemandesEditeur ?? r.newPublisherRequests  ?? 0;

    const pills = [
      { icone: '👥', label: 'Nouvelles inscriptions',  val: inscriptions, couleur: '#d1fae5', couleurIcone: '#059669' },
      { icone: '📆', label: 'Nouvelles réservations',  val: reservations, couleur: '#dbeafe', couleurIcone: '#2563eb' },
      { icone: '📢', label: 'Demandes éditeur',         val: demandesEdit, couleur: '#ede9fe', couleurIcone: '#7c3aed' },
    ];

    container.innerHTML = `
      <div class="glass-card mb-6 animate-in">
        <div class="card-title" style="margin-bottom:1rem">
          <i class="bi bi-activity" style="color:var(--accent)"></i> Activité des dernières 24h
        </div>
        <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">
          ${pills.map((p) => KpiCard(p)).join('')}
        </div>
      </div>`;
  } catch (_) {
    container.innerHTML = '';
  }
}

// ============================================================
//  PUBLISHER — EXPORT CSV RÉSERVATIONS
// ============================================================

function exporterReservationsPublisher(items) {
  if (!items || !items.length) {
    alert('Aucune réservation à exporter.');
    return;
  }

  const lignesCSV = [
    ['Activité', 'Date', 'Personnes', 'Revenu', 'Avis client'].join(';'),
    ...items.map((r) => {
      const act   = r.event?.activity || {};
      const dateR = r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—';
      const revenu = (act.price ?? 0) * (r.group_size ?? 1);
      const avis  = r.user_rating === 'like'      ? 'Adoré'
                  : r.user_rating === 'recommend' ? 'Conseillé'
                  : r.user_rating === 'dislike'   ? 'Non apprécié'
                  : '';
      return [act.title || '—', dateR, String(r.group_size ?? 1), formatPrix(revenu), avis]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';');
    }),
  ];

  const revenuTotal = items.reduce((s, r) => s + (r.event?.activity?.price ?? 0) * (r.group_size ?? 1), 0);
  lignesCSV.push('');
  lignesCSV.push(`"Revenu total";"${escapeHtml(formatPrix(revenuTotal))}"`);
  lignesCSV.push(`"Nombre de réservations";"${items.length}"`);

  const contenu = '﻿' + lignesCSV.join('\n');
  const blob    = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const today   = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `meetando-reservations-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
//  PUBLISHER — SYSTÈME DE NOTIFICATIONS (polling toutes les 30s)
// ============================================================

let _notifPubCount    = -1;
let _notifPubTimer    = null;
let _notifBadgeBookings = 0;

function demarrerNotificationsPublisher() {
  if (_notifPubTimer) return;
  verifierNouvellesReservations();
  _notifPubTimer = setInterval(verifierNouvellesReservations, 30000);
}

function arreterNotificationsPublisher() {
  if (_notifPubTimer) { clearInterval(_notifPubTimer); _notifPubTimer = null; }
  _notifPubCount = -1;
}

async function verifierNouvellesReservations() {
  try {
    const data  = await appelApi('/dashboard/publisher/reservations-count');
    const count = data.count ?? data.total ?? 0;
    if (_notifPubCount === -1) { _notifPubCount = count; return; }
    const diff = count - _notifPubCount;
    if (diff > 0) {
      _notifPubCount = count;
      _notifBadgeBookings += diff;
      afficherToastNotification(diff);
      renderSidebar();
    }
  } catch (_) { /* silencieux */ }
}

function afficherToastNotification(nb) {
  let toast = document.getElementById('notif-toast');
  if (toast) toast.remove();
  toast = document.createElement('div');
  toast.id = 'notif-toast';
  toast.className = 'notif-toast';
  toast.innerHTML = `
    <div class="notif-toast-inner">
      <i class="bi bi-bell-fill" style="color:#059669;font-size:1.4rem;flex-shrink:0"></i>
      <div>
        <div class="notif-toast-title">Nouvelle réservation !</div>
        <div class="notif-toast-body">${nb} nouvelle(s) réservation(s) reçue(s).</div>
      </div>
      <button type="button" class="notif-toast-close" onclick="fermerToast()">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('notif-toast-visible'));
  setTimeout(fermerToast, 6000);
}

function fermerToast() {
  const toast = document.getElementById('notif-toast');
  if (!toast) return;
  toast.classList.remove('notif-toast-visible');
  setTimeout(() => toast.remove(), 320);
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

  if (role === 'admin' && getOnglet() === 'overview') {
    chargerExtrasAdmin();
  }
}

function attachEventListeners() {
  // Charger les réservations dans Mon Compte
  const compteResa = document.getElementById('compte-reservations-list');
  if (compteResa) {
    appelApi('/dashboard/activites').then((reservations) => {
      if (!reservations.length) {
        compteResa.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">Aucune réservation.</p>';
        return;
      }
      const now = new Date();
      const items = reservations.map((r) => {
        const a = r.event?.activity || {};
        const dateVal = r.date || r.event?.date;
        const d = dateVal ? new Date(dateVal) : null;
        const isPast = d ? d < now : false;
        const jour   = d ? d.getDate() : '—';
        const mois   = d ? d.toLocaleString('fr-FR', { month: 'short' }).toUpperCase() : '';
        return `
          <div class="resa-item ${isPast ? 'past' : ''}">
            <div class="resa-item-date">
              <span class="resa-item-day">${jour}</span>
              <span class="resa-item-month">${mois}</span>
            </div>
            <div class="resa-item-info">
              <div class="resa-item-title">${escapeHtml(a.title || 'Activité')}</div>
              <div class="resa-item-meta">
                <i class="bi bi-people-fill" style="color:var(--accent)"></i> ${r.group_size ?? 1} pers.
                ${a.address ? `· ${escapeHtml(a.address)}` : ''}
              </div>
            </div>
            ${isPast
              ? '<span class="badge-status badge-inactif" style="font-size:.7rem">Passée</span>'
              : '<span class="badge-status badge-actif" style="font-size:.7rem">À venir</span>'}
          </div>`;
      }).join('');
      compteResa.innerHTML = `<div class="resa-list">${items}</div>`;
    }).catch(() => {
      compteResa.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">Impossible de charger les réservations.</p>';
    });
  }

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

  // Avatar upload
  const avatarWrap = document.getElementById('avatar-wrap');
  const avatarInput = document.getElementById('avatar-input');
  if (avatarWrap && avatarInput) {
    avatarWrap.addEventListener('click', () => avatarInput.click());
    avatarInput.addEventListener('change', async () => {
      const file = avatarInput.files[0];
      if (!file) return;
      const feedback = document.getElementById('avatar-feedback');
      feedback.innerHTML = '<span style="color:var(--text-muted)">Envoi en cours…</span>';
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const res = await fetch('http://localhost:3000/user/me/avatar', {
          method: 'POST', credentials: 'include', body: formData,
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erreur'); }
        const result = await res.json();
        state.profil = { ...state.profil, avatar_url: result.avatar_url };
        feedback.innerHTML = '<span style="color:#059669;font-weight:600"><i class="bi bi-check-circle-fill"></i> Photo mise à jour !</span>';
        const wrap = document.getElementById('avatar-wrap');
        if (wrap) {
          const img = wrap.querySelector('.account-avatar-img') || document.createElement('img');
          img.src = result.avatar_url;
          img.className = 'account-avatar-img';
          const initials = wrap.querySelector('.account-avatar-initials');
          if (initials) initials.replaceWith(img);
        }
      } catch (err) {
        feedback.innerHTML = `<span style="color:#dc2626;font-weight:600"><i class="bi bi-exclamation-circle-fill"></i> ${err.message}</span>`;
      }
    });
  }

  // Mot de passe
  const formPwd = document.getElementById('form-password');
  if (formPwd) {
    formPwd.addEventListener('submit', async (e) => {
      e.preventDefault();
      const feedback = document.getElementById('form-password-feedback');
      const currentPassword = document.getElementById('pwd-current').value;
      const newPassword     = document.getElementById('pwd-new').value;
      const confirmPassword = document.getElementById('pwd-confirm').value;
      if (!currentPassword || !newPassword || !confirmPassword) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> Veuillez remplir tous les champs.
        </div>`; return;
      }
      if (newPassword !== confirmPassword) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> Les nouveaux mots de passe ne correspondent pas.
        </div>`; return;
      }
      if (newPassword.length < 6) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> Le mot de passe doit contenir au moins 6 caractères.
        </div>`; return;
      }
      const btn = formPwd.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Mise à jour…';
      try {
        await appelApi('/user/me/password', 'PATCH', { currentPassword, newPassword });
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#d1fae5;color:#065f46;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-check-circle-fill"></i> Mot de passe modifié avec succès.
        </div>`;
        formPwd.reset();
      } catch (err) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> ${err.message}
        </div>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-shield-lock-fill"></i> Mettre à jour le mot de passe';
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
