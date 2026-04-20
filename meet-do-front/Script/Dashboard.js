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
    { id: 'overview',   icone: 'bi-grid-fill',          label: 'Overview' },
    { id: 'users',      icone: 'bi-people-fill',         label: 'User Management' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Support Messaging' },
    { id: 'reports',    icone: 'bi-flag-fill',           label: 'Reports' },
    { id: 'validation', icone: 'bi-patch-check-fill',    label: 'Meeter Validation' },
    { id: 'settings',   icone: 'bi-gear-fill',           label: 'Settings' },
  ],
  user: [
    { id: 'overview',   icone: 'bi-grid-fill',           label: 'My Dashboard' },
    { id: 'explore',    icone: 'bi-search',              label: 'Explore' },
    { id: 'activities', icone: 'bi-calendar3',           label: 'My Activities' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Messaging' },
    { id: 'favorites',  icone: 'bi-heart-fill',          label: 'Favorites' },
    { id: 'account',    icone: 'bi-person-fill',         label: 'My Account' },
  ],
  publisher: [
    { id: 'overview',   icone: 'bi-grid-fill',           label: 'Overview' },
    { id: 'listings',   icone: 'bi-megaphone-fill',      label: 'My Listings' },
    { id: 'bookings',   icone: 'bi-calendar-check-fill', label: 'Bookings' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Messaging' },
    { id: 'stats',      icone: 'bi-bar-chart-fill',      label: 'Statistics' },
    { id: 'account',    icone: 'bi-person-fill',         label: 'My Account' },
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

  if (onglet === 'account')    return renderMonCompte();
  if (onglet === 'messaging')  { renderMessagingTab();   return null; }
  if (onglet === 'explore')    { renderExplorerTab();    return null; }
  if (onglet === 'activities') { renderActivitiesTab();  return null; }
  if (onglet === 'favorites')  { renderFavoritesTab();   return null; }

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
  if (onglet === 'messaging') { renderMessagingTab(); return null; }

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
        const prix = a.price != null ? formatPrix(a.price) : 'Gratuit';
        const emoji = emojiTheme(a.theme);
        return `
          <div class="explorer-card" style="animation:fadeUp .35s ${0.04*i}s ease both">
            <div class="explorer-card-img">
              ${img
                ? `<img src="${img}" alt="${escapeHtml(a.title || '')}" loading="lazy">`
                : `<div class="explorer-card-img-placeholder">${emoji}</div>`}
              ${a.theme ? `<span class="explorer-card-theme">${emoji} ${a.theme}</span>` : ''}
              <button type="button" class="fav-remove-btn" data-fav-id="${f.id_activity}" title="Retirer des favoris">
                <i class="bi bi-heart-fill"></i>
              </button>
            </div>
            <div class="explorer-card-body">
              <div class="explorer-card-title">${escapeHtml(a.title || '—')}</div>
              ${a.address ? `<div class="explorer-card-addr"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(a.address)}</div>` : ''}
              <div class="explorer-card-footer">
                <span class="explorer-card-prix">${prix}</span>
                <span class="explorer-card-note"><i class="bi bi-star-fill"></i> ${note}</span>
              </div>
              <button type="button" class="btn-primary" style="width:100%;margin-top:.75rem;font-size:.8rem">
                <i class="bi bi-calendar-check"></i> Réserver
              </button>
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
    const prix = a.price != null ? formatPrix(a.price) : 'Gratuit';
    const emoji = emojiTheme(a.theme);
    return `
      <div class="explorer-card" style="animation:fadeUp .35s ${0.04 * i}s ease both">
        <div class="explorer-card-img">
          ${img
            ? `<img src="${img}" alt="${escapeHtml(a.title)}" loading="lazy">`
            : `<div class="explorer-card-img-placeholder">${emoji}</div>`}
          ${a.theme ? `<span class="explorer-card-theme">${emoji} ${a.theme}</span>` : ''}
        </div>
        <div class="explorer-card-body">
          <div class="explorer-card-title">${escapeHtml(a.title || '—')}</div>
          ${a.address ? `<div class="explorer-card-addr"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(a.address)}</div>` : ''}
          <div class="explorer-card-footer">
            <span class="explorer-card-prix">${prix}</span>
            <span class="explorer-card-note"><i class="bi bi-star-fill"></i> ${note}</span>
          </div>
          <button type="button" class="btn-primary" style="width:100%;margin-top:.75rem;font-size:.8rem">
            <i class="bi bi-calendar-check"></i> Réserver
          </button>
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
