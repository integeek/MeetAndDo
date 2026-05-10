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
    { id: 'overview',             icone: 'bi-grid-fill',          label: 'Dashboard' },
    { id: 'users',                icone: 'bi-people-fill',         label: 'Client Management' },
    { id: 'admin_messaging',      icone: 'bi-chat-dots-fill',      label: 'Messaging' },
    { id: 'reports_users',        icone: 'bi-person-exclamation',  label: 'User Reports' },
    { id: 'reports_activities',   icone: 'bi-flag-fill',           label: 'Listing Reports' },
    { id: 'validation',           icone: 'bi-patch-check-fill',    label: 'Approve Meeters' },
    { id: 'settings',             icone: 'bi-gear-fill',           label: 'Edit Tables' },
  ],
  user: [
    { id: 'overview',   icone: 'bi-grid-fill',           label: 'My Dashboard' },
    { id: 'historique', icone: 'bi-clock-history',       label: 'History' },
    { id: 'activities', icone: 'bi-calendar3',           label: 'My Activities' },
    { id: 'messaging',  icone: 'bi-chat-dots-fill',      label: 'Messaging' },
    { id: 'favorites',  icone: 'bi-heart-fill',          label: 'Favorites' },
    { id: 'parrainage', icone: 'bi-people-fill',         label: 'Referral' },
    { id: 'account',    icone: 'bi-person-fill',         label: 'My Account' },
  ],
  publisher: [
    { id: 'overview',       icone: 'bi-grid-fill',           label: 'Overview' },
    { id: 'listings',       icone: 'bi-megaphone-fill',      label: 'My Listings' },
    { id: 'bookings',       icone: 'bi-calendar-check-fill', label: 'Bookings' },
    { id: 'messaging',      icone: 'bi-chat-dots-fill',      label: 'Messaging' },
    { id: 'stats',          icone: 'bi-bar-chart-fill',      label: 'Statistics' },
    { id: 'pub_activites',  icone: 'bi-star-fill',           label: 'Reviews' },
    { id: 'pub_historique', icone: 'bi-clock-history',       label: 'History' },
    { id: 'parrainage',     icone: 'bi-people-fill',         label: 'Referral' },
  ],
};

// Données trafic statiques pour le graphique admin
const TRAFIC_DEMO = [
  { label: 'Mon', val: 320 }, { label: 'Tue', val: 480 },
  { label: 'Wed', val: 410 }, { label: 'Thu', val: 560 },
  { label: 'Fri', val: 620 }, { label: 'Sat', val: 740 },
  { label: 'Sun', val: 530 },
];

// ---- Helpers ----
function initiales(prenom, nom) {
  return ((prenom || '?')[0] + (nom || '?')[0]).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatPrix(val) {
  if (val === undefined || val === null) return '—';
  return Number(val).toLocaleString('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

function etoiles(note) {
  const n = Math.round(note || 0);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function badgeStatut(statut) {
  const map = {
    actif:    '<span class="badge-status badge-actif"><i class="bi bi-circle-fill" style="font-size:.45rem"></i> Active</span>',
    inactif:  '<span class="badge-status badge-inactif"><i class="bi bi-circle-fill" style="font-size:.45rem"></i> Inactive</span>',
    attente:  '<span class="badge-status badge-attente"><i class="bi bi-clock-fill" style="font-size:.6rem"></i> Pending</span>',
    confirme: '<span class="badge-status badge-actif"><i class="bi bi-check-circle-fill" style="font-size:.6rem"></i> Confirmed</span>',
  };
  return map[statut] || `<span class="badge-status badge-attente">${statut}</span>`;
}

function badgeRole(role) {
  const r = (role || '').toLowerCase();
  const map = {
    admin:     '<span class="badge-status badge-admin">Admin</span>',
    user:      '<span class="badge-status badge-user">User</span>',
    publisher: '<span class="badge-status badge-publisher">Publisher</span>',
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
  if (res.status === 401) { window.location.href = 'Login.html'; throw new Error('Not authenticated'); }
  if (!res.ok) throw new Error(`Error ${res.status} on ${chemin}`);
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
    if (!err.message.includes('Not authenticated')) {
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
        <p>Loading your space…</p>
      </div>`;
  }
}

function afficherErreur(message) {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <div class="dash-loader">
      <span style="font-size:2rem">⚠️</span>
      <p style="color:var(--text-muted)">${message || 'Unable to load data.'}</p>
      <button type="button" class="btn-primary" onclick="chargerDonnees()">
        <i class="bi bi-arrow-clockwise"></i> Try again
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

  const nomRole = role === 'admin' ? 'Administrator'
    : role === 'publisher'         ? 'Publisher'
    : 'User';

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">M</div>
      <div class="sidebar-brand-text">
        <div class="sidebar-brand-name">MEET & DO</div>
        <div class="sidebar-brand-sub">${nomRole} Space</div>
      </div>
    </div>

    <p class="sidebar-nav-title">Navigation</p>
    <ul class="sidebar-nav">
      ${items.map((item) => item.id === 'sep' ? `
        <li style="padding:.35rem .5rem;font-size:.7rem;color:var(--text-muted);letter-spacing:.05em;user-select:none">
          ── As user
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
        <div><h1 class="view-title">${label}</h1><p class="view-subtitle">Coming soon.</p></div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">This section will be available soon.</p>' })}`;
  }

  const lignes = (recherche) => {
    const liste = recherche
      ? users.filter((u) =>
          `${u.firstname} ${u.lastname}`.toLowerCase().includes(recherche) ||
          (u.email || '').toLowerCase().includes(recherche))
      : users;

    if (!liste.length) {
      return '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">No results.</td></tr>';
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
            <button type="button" class="icon-btn" title="View profile"
              onclick="adminOverviewVoir(${u.id})">
              <i class="bi bi-eye-fill"></i>
            </button>
            <button type="button" class="icon-btn" title="Edit role"
              onclick="adminOverviewEditer(${u.id})">
              <i class="bi bi-pencil-fill"></i>
            </button>
            <button type="button" class="icon-btn danger" title="Delete"
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
        <h1 class="view-title">Admin Dashboard</h1>
        <p class="view-subtitle">Welcome 👋 — Platform overview</p>
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
        { icone: '💰', titre: 'Total Revenue',       valeur: formatPrix(kpi.revenu),            tendance: null,           sens: 'up',      couleur: '#dbeafe', couleurIcone: '#2563eb' },
        { icone: '👥', titre: 'New Meeters',        valeur: kpi.nouveauxUtilisateurs,          tendance: 'Last 7 days',  sens: 'up',      couleur: '#d1fae5', couleurIcone: '#059669' },
        { icone: '🚩', titre: 'Reports',            valeur: kpi.signalements,                  tendance: null,           sens: 'neutral', couleur: '#fee2e2', couleurIcone: '#dc2626' },
        { icone: '📈', titre: 'Conversion rate',    valeur: `${kpi.tauxConversion ?? 0} %`,    tendance: null,           sens: 'up',      couleur: '#ede9fe', couleurIcone: '#7c3aed' },
      ].map((k) => KpiCard(k)).join('')}
    </div>

    <div id="admin-overview-extras">
      <div class="dash-loader" style="min-height:6rem"><div class="dash-spinner"></div></div>
    </div>

    ${Card({
      classes: 'chart-card mb-6',
      contenu: `
        <div class="chart-header">
          <span class="chart-title">Weekly registrations</span>
          <span class="chart-badge">${kpi.totalUtilisateurs ?? 0} total users</span>
        </div>
        <div class="chart-wrapper" id="admin-traffic-chart">
          ${creerGraphiqueArea(TRAFIC_DEMO, '#2563eb')}
        </div>`,
    })}

    ${Card({
      classes: 'table-card',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Recently registered users</span>
          <div class="table-search">
            <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
            <input type="text" id="user-search" placeholder="Search…" value="${getSearch()}"
              oninput="setSearch(this.value.toLowerCase())">
          </div>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Registered on</th><th>Action</th></tr></thead>
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
        <div><h1 class="view-title">${label}</h1><p class="view-subtitle">Coming soon.</p></div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">This section will be available soon.</p>' })}`;
  }

  const sessionItems = sessions.length
    ? sessions.map((s, i) => {
        const activity = s.event?.activity || {};
        const d = new Date(s.date || s.event?.date);
        return `
          <div class="session-item" style="animation:fadeUp .4s ${0.05*(i+1)}s ease both">
            <div class="session-date-badge">
              <span class="session-date-day">${d.getDate()}</span>
              <span class="session-date-month">${d.toLocaleString('en-US',{month:'short'}).toUpperCase()}</span>
            </div>
            <div class="session-info">
              <div class="session-title">🎯 ${activity.title || 'Activity'}</div>
              <div class="session-meta">
                <i class="bi bi-geo-alt-fill" style="color:var(--accent);font-size:.7rem"></i>
                ${activity.address || '—'}
              </div>
            </div>
            ${badgeStatut('confirme')}
          </div>`;
      }).join('')
    : '<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">No upcoming sessions.</p>';

  const suggestItems = suggest.length
    ? suggest.map((a, i) => {
        const img = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
        const emoji = emojiTheme(a.theme);
        const prix = a.price != null ? `${Number(a.price).toLocaleString('en-US')}€` : 'Free';
        return `
          <div class="home-activity-card" style="animation-delay:${0.05*(i+1)}s" onclick="">
            ${img
              ? `<img src="${img}" class="home-card-img" alt="${escapeHtml(a.title || '')}" loading="lazy">`
              : `<div class="home-card-img-placeholder">${emoji}</div>`}
            <div class="home-card-content">
              <h2 class="home-card-title">${escapeHtml(a.title || '—')}</h2>
              <p><strong>Location:</strong> ${escapeHtml(a.address || '—')}</p>
              <p><strong>Price:</strong> ${prix}</p>
              <p><strong>Rating:</strong> ⭐ ${(a.average_rating || 0).toFixed(1)}</p>
            </div>
          </div>`;
      }).join('')
    : '<p style="color:var(--text-muted);font-size:.85rem">No suggestions available.</p>';

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
          <span class="profile-badge-pill"><i class="bi bi-patch-check-fill"></i> Verified</span>
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
      ${Card({ titre: '📅 Upcoming sessions', contenu: `<div class="sessions-list">${sessionItems}</div>`, classes: 'animate-in' })}
      ${Card({
        titre: '✨ Discover',
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

    ${Card({ titre: '✨ Suggested for you', classes: 'animate-in', contenu: `<div class="explorer-grid">${suggestItems}</div>` })}`;
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
        <div><h1 class="view-title">${label}</h1><p class="view-subtitle">Coming soon.</p></div>
      </header>
      ${Card({ contenu: '<p style="color:var(--text-muted);padding:1rem 0">This section will be available soon.</p>' })}`;
  }

  const lignesAnnonces = annonces.length
    ? annonces.map((a) => `
        <tr>
          <td style="font-weight:600;font-size:.85rem">${a.title}</td>
          <td style="font-weight:700;color:var(--accent)">${formatPrix(a.price)}</td>
          <td style="color:#f59e0b;font-weight:600">${(a.average_rating || 0).toFixed(1)} ★</td>
          <td><span class="badge-status ${a.is_visible ? 'badge-actif' : 'badge-inactif'}">${a.is_visible ? 'Visible' : 'Hidden'}</span></td>
          <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(a.created_at)}</td>
          <td>
            <button type="button" class="btn-outline" style="padding:.3rem .7rem;font-size:.72rem"
                    onclick="window.location.href='EditActivity.html?id=${a.id}'">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="6" style="color:var(--text-muted);padding:1.5rem;text-align:center">No listings published.</td></tr>';

  const lignesResa = reservations.length
    ? reservations.map((r) => `
        <tr>
          <td style="font-weight:600;font-size:.8rem">#${r.id}</td>
          <td style="font-size:.82rem">${formatDate(r.date)}</td>
          <td><span class="badge-status badge-user">${r.group_size ?? 1} ppl.</span></td>
        </tr>`).join('')
    : '<tr><td colspan="3" style="color:var(--text-muted);padding:1.5rem;text-align:center">No bookings received.</td></tr>';

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Hello ${profil.firstname || ''} 👋</h1>
        <p class="view-subtitle">Manage your listings and track your performance.</p>
      </div>
      <button type="button" class="btn-primary"
              onclick="window.location.href='ActivityBuilder.html'">
        <i class="bi bi-plus-lg"></i> New listing
      </button>
    </header>

    <div class="kpi-grid mb-6">
      ${[
        { icone: '📋', titre: 'Active listings',    valeur: kpi.annoncesActives  ?? 0, couleur: '#dbeafe', couleurIcone: '#2563eb' },
        { icone: '📆', titre: 'Bookings received', valeur: kpi.reservationsRecues ?? 0, couleur: '#d1fae5', couleurIcone: '#059669' },
        { icone: '💰', titre: 'Monthly revenue',   valeur: formatPrix(kpi.revenuDuMois), couleur: '#ede9fe', couleurIcone: '#7c3aed' },
        { icone: '↩',  titre: 'Response rate',     valeur: `${kpi.tauxReponse ?? 0} %`, couleur: '#fef3c7', couleurIcone: '#d97706' },
      ].map((k) => KpiCard(k)).join('')}
    </div>

    ${Card({
      classes: 'table-card mb-6 animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">My listings</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Title</th><th>Price</th><th>Rating</th><th>Status</th><th>Created on</th><th></th></tr></thead>
            <tbody>${lignesAnnonces}</tbody>
          </table>
        </div>`,
    })}

    ${Card({
      classes: 'animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Latest bookings received</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>#</th><th>Date</th><th>Group</th></tr></thead>
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
      <div><h1 class="view-title">My Activities</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
        <h1 class="view-title">My Activities</h1>
        <p class="view-subtitle">${reservations.length} booking(s) total.</p>
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

  const JOURS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const MOIS   = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];

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
    const MOIS_COMPLET = ['January','February','March','April','May','June',
                         'July','August','September','October','November','December'];
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
                <div class="cal-detail-name">${escapeHtml(a.title || 'Activity')}</div>
                ${a.address ? `<div class="cal-detail-addr"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(a.address)}</div>` : ''}
                <div style="display:flex;gap:.5rem;margin-top:.35rem;flex-wrap:wrap">
                  <span class="badge-status badge-actif"><i class="bi bi-check-circle-fill" style="font-size:.55rem"></i> Confirmed</span>
                  <span style="font-size:.72rem;color:var(--text-muted)">${r.group_size ?? 1} ppl.</span>
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
      <p style="font-size:.85rem">Select a day<br>to view your activities</p>
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
      <div><h1 class="view-title">My Favorites</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
        const prix = a.price != null ? `${Number(a.price).toLocaleString('en-US')}€` : 'Free';
        const emoji = emojiTheme(a.theme);
        return `
          <div class="home-activity-card" style="animation:fadeUp .35s ${0.04*i}s ease both;position:relative">
            ${img
              ? `<img src="${img}" class="home-card-img" alt="${escapeHtml(a.title || '')}" loading="lazy">`
              : `<div class="home-card-img-placeholder">${emoji}</div>`}
            <button type="button" class="fav-remove-btn" data-fav-id="${f.id_activity}" title="Remove from favorites"
              style="position:absolute;top:.6rem;right:.6rem;z-index:1">
              <i class="bi bi-heart-fill"></i>
            </button>
            <div class="home-card-content">
              <h2 class="home-card-title">${escapeHtml(a.title || '—')}</h2>
              <p><strong>Location:</strong> ${escapeHtml(a.address || '—')}</p>
              <p><strong>Price:</strong> ${prix}</p>
              <p><strong>Rating:</strong> ⭐ ${note}</p>
            </div>
          </div>`;
      }).join('')
    : `<div class="explorer-empty" style="grid-column:1/-1">
        <span style="font-size:2.5rem">💔</span>
        <p>No favorites yet.</p>
        <button type="button" class="btn-primary" onclick="setOnglet('explore')">
          <i class="bi bi-search"></i> Explore activities
        </button>
      </div>`;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">My Favorites</h1>
        <p class="view-subtitle">${favoris.length} saved activity(ies).</p>
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
          if (count) count.textContent = `${grid?.children.length ?? 0} saved activity(ies).`;
        }, 260);
      } catch (err) {
        btn.disabled = false;
        alert('Error: ' + err.message);
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
      <div><h1 class="view-title">Explore</h1><p class="view-subtitle">Loading activities…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
        <h1 class="view-title">Explore</h1>
        <p class="view-subtitle" id="explorer-count">${activites.length} activity(ies) available.</p>
      </div>
    </header>

    <div class="explorer-filters glass-card animate-in">
      <div class="explorer-filter-row">
        <div class="explorer-search-wrap">
          <i class="bi bi-search" style="color:var(--text-muted)"></i>
          <input type="text" id="exp-search" placeholder="Search for an activity…" autocomplete="off">
        </div>
        <select id="exp-theme" class="explorer-select">
          <option value="">All themes</option>
          ${options}
        </select>
        <select id="exp-prix" class="explorer-select">
          <option value="">All prices</option>
          <option value="25">Under €25</option>
          <option value="50">Under €50</option>
          <option value="100">Under €100</option>
          <option value="200">Under €200</option>
        </select>
        <select id="exp-tri" class="explorer-select">
          <option value="note">Best rated</option>
          <option value="prix-asc">Price: low to high</option>
          <option value="prix-desc">Price: high to low</option>
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
  if (count) count.textContent = `${liste.length} activity(ies) found.`;

  if (!grid) return;
  if (!liste.length) {
    grid.innerHTML = `
      <div class="explorer-empty">
        <span style="font-size:2.5rem">🔍</span>
        <p>No activities match your filters.</p>
        <button type="button" class="btn-outline" onclick="resetFiltresExplorer()">Reset filters</button>
      </div>`;
    return;
  }

  grid.innerHTML = liste.map((a, i) => {
    const img = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
    const note = (a.average_rating || 0).toFixed(1);
    const prix = a.price != null ? `${Number(a.price).toLocaleString('en-US')}€` : 'Free';
    const emoji = emojiTheme(a.theme);
    return `
      <div class="home-activity-card" style="animation:fadeUp .35s ${0.04 * i}s ease both" onclick="">
        ${img
          ? `<img src="${img}" class="home-card-img" alt="${escapeHtml(a.title)}" loading="lazy">`
          : `<div class="home-card-img-placeholder">${emoji}</div>`}
        <div class="home-card-content">
          <h2 class="home-card-title">${escapeHtml(a.title || '—')}</h2>
          <p><strong>Location:</strong> ${escapeHtml(a.address || '—')}</p>
          <p><strong>Price:</strong> ${prix}</p>
          <p><strong>Rating:</strong> ⭐ ${note}</p>
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
  if (f.maxPrix) liste.push({ label: `Under €${f.maxPrix}`, key: 'maxPrix' });

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
      <div><h1 class="view-title">Messaging</h1><p class="view-subtitle">Loading conversations…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

  try {
    const conversations = await appelApi('/dashboard/conversations');
    renderSidebar();

    const lignes = conversations.length
      ? conversations.map((conv, i) => {
          const isUnread = !conv.is_read;
          const time = formatDateConv(conv.last_message_at);
          const nomAutre = conv.other_user_id ? `User #${conv.other_user_id}` : 'Unknown';
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
                  ${conv.last_message ? escapeHtml(truncate(conv.last_message, 45)) : '<em>New conversation</em>'}
                </div>
              </div>
              <div class="conv-dash-meta">
                ${time ? `<span class="conv-dash-time">${time}</span>` : ''}
                ${isUnread ? '<span class="conv-dash-badge"><i class="bi bi-circle-fill" style="font-size:.45rem"></i> Unread</span>' : ''}
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--text-muted);font-size:.85rem;padding:.75rem 0">No conversations yet.</p>';

    main.innerHTML = `
      <header class="view-header animate-in">
        <div>
          <h1 class="view-title">Messaging</h1>
          <p class="view-subtitle">${conversations.length} active conversation(s).</p>
        </div>
        <a href="../Page/Messagerie.html" class="btn-primary">
          <i class="bi bi-chat-dots-fill"></i> Open messaging
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
  like:      { label: 'Loved it',      icon: 'bi-hand-thumbs-up-fill',  color: '#059669', bg: '#d1fae5' },
  dislike:   { label: 'Not for me',    icon: 'bi-hand-thumbs-down-fill', color: '#dc2626', bg: '#fee2e2' },
  recommend: { label: 'Recommended',   icon: 'bi-star-fill',             color: '#d97706', bg: '#fef3c7' },
};

async function renderHistoriqueTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">History</h1>
        <p class="view-subtitle">Your past activities — rate them and share your opinions.</p>
      </div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
    const date = item.date ? new Date(item.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
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
          <div class="hist-card-title">${escapeHtml(act.title || 'Activity')}</div>
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
      : `<p style="color:var(--text-muted);text-align:center;padding:3rem 0;grid-column:1/-1">No activities in this category.</p>`;

    attachRatingListeners();
  }

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">History</h1>
        <p class="view-subtitle">Your past activities — rate them and share your opinions.</p>
      </div>
    </header>

    ${!items.length ? `
      <div class="glass-card animate-in" style="text-align:center;padding:3rem">
        <i class="bi bi-clock-history" style="font-size:3rem;color:var(--accent-mid);display:block;margin-bottom:1rem"></i>
        <p style="color:var(--text-muted)">You haven't participated in any activity yet.</p>
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
        <span>Unrated</span>
      </div>
    </div>

    <!-- Filtres -->
    <div class="hist-filters animate-in">
      ${[
        { key: 'all', label: 'All', icon: 'bi-grid' },
        { key: 'like', label: 'Loved', icon: 'bi-hand-thumbs-up-fill' },
        { key: 'recommend', label: 'Recommended', icon: 'bi-star-fill' },
        { key: 'dislike', label: 'Not for me', icon: 'bi-hand-thumbs-down-fill' },
        { key: 'none', label: 'Unrated', icon: 'bi-question-circle' },
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

  renderSidebar();

  const profil = state.profil || {};
  const userId = profil.id;
  const code = `MEET${userId}`;
  const link = `${window.location.origin}/meet-do-front/Page/Signup.html?ref=${code}`;
  const points = profil.referral_points || 0;

  const paliers = [
    { pts: 50,  label: '5% discount',      icon: 'bi-tag-fill',        color: '#059669' },
    { pts: 100, label: '10% discount',     icon: 'bi-percent',          color: '#2563eb' },
    { pts: 200, label: 'Free activity',    icon: 'bi-gift-fill',        color: '#7c3aed' },
    { pts: 500, label: 'VIP status 1 month', icon: 'bi-star-fill',     color: '#d97706' },
  ];

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Referral</h1>
        <p class="view-subtitle">Invite your friends and earn discounts.</p>
      </div>
    </header>

    <div style="max-width:720px">

      <!-- Points actuels -->
      <div class="glass-card animate-in parr-hero">
        <div class="parr-hero-icon"><i class="bi bi-people-fill"></i></div>
        <div>
          <div class="parr-pts-val">${points} pts</div>
          <div class="parr-pts-label">Referral points earned</div>
        </div>
      </div>

      <!-- Lien de parrainage -->
      <div class="glass-card animate-in" style="margin-top:1.25rem">
        <div class="card-title">🔗 Your referral link</div>
        <p style="font-size:.83rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">
          Share this link. For each friend who signs up and makes their first booking,
          you earn <strong>10 points</strong>.
        </p>
        <div class="parr-link-row">
          <div class="parr-link-box" id="parr-link-text">${link}</div>
          <button class="btn-primary parr-copy-btn" id="parr-copy" title="Copy link">
            <i class="bi bi-clipboard-fill"></i> Copy
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
             href="https://wa.me/?text=${encodeURIComponent('Join Meet&Do with my link: ' + link)}" target="_blank">
            <i class="bi bi-whatsapp"></i> WhatsApp
          </a>
        </div>
      </div>

      <!-- Paliers de récompenses -->
      <div class="glass-card animate-in" style="margin-top:1.25rem">
        <div class="card-title">🎁 Available rewards</div>
        <p style="font-size:.83rem;color:var(--text-muted);margin-bottom:1.25rem">
          Accumulate points to unlock exclusive benefits.
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
                      ? `<span style="color:${p.color};font-weight:600"><i class="bi bi-check-circle-fill"></i> Unlocked!</span>`
                      : `${points}/${p.pts} pts — ${p.pts - points} pts to go`}
                  </div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Comment ça marche -->
      <div class="glass-card animate-in" style="margin-top:1.25rem">
        <div class="card-title">❓ How does it work?</div>
        <div class="parr-steps">
          <div class="parr-step"><div class="parr-step-num">1</div><div>Copy your unique link above</div></div>
          <div class="parr-step"><div class="parr-step-num">2</div><div>Share it with your friends via message, social media…</div></div>
          <div class="parr-step"><div class="parr-step-num">3</div><div>Your friend signs up with your link</div></div>
          <div class="parr-step"><div class="parr-step-num">4</div><div>They make their first booking → you earn <strong>10 pts</strong></div></div>
          <div class="parr-step"><div class="parr-step-num">5</div><div>Use your points for discounts on your next booking</div></div>
        </div>
      </div>

    </div>`;

  document.getElementById('parr-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(link).then(() => {
      const fb = document.getElementById('parr-copy-feedback');
      if (fb) {
        fb.innerHTML = '<i class="bi bi-check-circle-fill"></i> Link copied to clipboard!';
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
      <div class="card-title">📢 Become a listing publisher</div>
      ${isPending ? `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.75rem 1rem;background:var(--accent-soft);border-radius:var(--radius-sm)">
          <span style="font-size:1.4rem">⏳</span>
          <div>
            <div style="font-weight:600;font-size:.9rem;color:var(--accent)">Request being processed</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:.2rem">
              An administrator will review your request soon.
            </div>
          </div>
        </div>` : `
        <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">
          By becoming a publisher, you can post your own activity listings
          on the platform and receive bookings from the Meet&Do community.
        </p>
        <ul style="font-size:.82rem;color:var(--text-muted);margin-bottom:1.25rem;padding-left:1.2rem;line-height:1.8">
          <li>Create and manage your activities easily</li>
          <li>Receive bookings in real time</li>
          <li>Access your performance statistics</li>
        </ul>
        <button type="button" class="btn-primary" id="btn-request-publisher">
          <i class="bi bi-send-fill"></i> Send my request
        </button>`}
    </div>` : '';

  const avatarUrl = profil.avatar_url || '';
  const avatarHtml = avatarUrl
    ? `<img src="${avatarUrl}" alt="avatar" class="account-avatar-img">`
    : `<span class="account-avatar-initials">${(profil.firstname || profil.email || '?')[0].toUpperCase()}</span>`;

  return `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">My Account</h1>
        <p class="view-subtitle">Manage your personal information.</p>
      </div>
    </header>

    <div style="max-width:640px">

      <!-- Photo de profil -->
      <div class="glass-card animate-in" style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.25rem">
        <div class="account-avatar-wrap" id="avatar-wrap" title="Change photo">
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
        <div class="card-title">👤 Personal information</div>

        <div id="form-profil-feedback" style="margin-bottom:.75rem"></div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
          <div>
            <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">First name</label>
            <input type="text" name="firstname" value="${profil.firstname || ''}"
              style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                     font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
          </div>
          <div>
            <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Last name</label>
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
          <p style="font-size:.7rem;color:var(--text-muted);margin-top:.25rem">Email cannot be changed.</p>
        </div>

        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Address</label>
          <input type="text" name="address" value="${profil.address || ''}"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>

        <button type="submit" class="btn-primary">
          <i class="bi bi-check-lg"></i> Save changes
        </button>
      </form>

      <!-- Bookings -->
      <div class="glass-card animate-in" id="compte-reservations-card" style="margin-top:1.25rem">
        <div class="card-title">📅 My bookings</div>
        <div id="compte-reservations-list"><div class="dash-loader" style="min-height:5rem"><div class="dash-spinner"></div></div></div>
      </div>

      <!-- Changer le mot de passe -->
      <form class="glass-card animate-in" id="form-password" style="margin-top:1.25rem">
        <div class="card-title">🔒 Change password</div>
        <div id="form-password-feedback" style="margin-bottom:.75rem"></div>
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Current password</label>
          <input type="password" id="pwd-current" autocomplete="current-password"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <div style="margin-bottom:1rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">New password</label>
          <input type="password" id="pwd-new" autocomplete="new-password"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:.78rem;font-weight:600;color:var(--text-muted);margin-bottom:.35rem">Confirm new password</label>
          <input type="password" id="pwd-confirm" autocomplete="new-password"
            style="width:100%;padding:.6rem .9rem;border:1.5px solid rgba(0,0,0,0.1);border-radius:.75rem;
                   font-family:Inter,sans-serif;font-size:.88rem;outline:none;transition:border-color .2s;background:var(--bg)"
            onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='rgba(0,0,0,0.1)'">
        </div>
        <button type="submit" class="btn-primary">
          <i class="bi bi-shield-lock-fill"></i> Update password
        </button>
      </form>

      ${sectionPublisher}
    </div>`;
}

// ============================================================
//  PUBLISHER — REVIEWS & RATINGS
// ============================================================

async function renderPublisherActivitesTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Reviews</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

  try {
    const historique = await appelApi('/dashboard/publisher/historique');
    renderSidebar();
    afficherPublisherReviews(historique);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherPublisherReviews(historique) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  // Only keep entries that have a user_rating
  const avecNote = historique.filter((r) => r.user_rating != null);

  // Global stats
  const total    = avecNote.length;
  const moyenne  = total ? (avecNote.reduce((s, r) => s + Number(r.user_rating), 0) / total) : 0;
  const positifs = avecNote.filter((r) => Number(r.user_rating) >= 4).length;
  const dist     = [5, 4, 3, 2, 1].map((n) => ({
    n, count: avecNote.filter((r) => Number(r.user_rating) === n).length,
  }));
  const maxDist = Math.max(1, ...dist.map((d) => d.count));

  // Group reviews by activity
  const parActivite = {};
  avecNote.forEach((r) => {
    const actId    = r.event?.id_activity ?? 'unknown';
    const actTitle = r.event?.activity?.title ?? '—';
    const actImg   = r.event?.activity?.images;
    const actTheme = r.event?.activity?.theme;
    if (!parActivite[actId]) {
      parActivite[actId] = { actId, actTitle, actImg, actTheme, reviews: [] };
    }
    parActivite[actId].reviews.push(r);
  });

  const groupes = Object.values(parActivite).sort((a, b) => b.reviews.length - a.reviews.length);

  // Star rendering helper
  const renderStars = (n) => {
    const full = Math.round(Number(n));
    return Array.from({ length: 5 }, (_, i) =>
      `<i class="bi bi-star${i < full ? '-fill' : ''}" style="color:${i < full ? '#f59e0b' : '#d1d5db'};font-size:.8rem"></i>`
    ).join('');
  };

  const barreDistrib = dist.map((d) => `
    <div style="display:flex;align-items:center;gap:.5rem;font-size:.78rem">
      <span style="width:14px;color:var(--text-muted);text-align:right">${d.n}</span>
      <i class="bi bi-star-fill" style="color:#f59e0b;font-size:.7rem"></i>
      <div style="flex:1;height:7px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.round((d.count / maxDist) * 100)}%;background:#f59e0b;border-radius:4px;transition:width .4s"></div>
      </div>
      <span style="width:20px;color:var(--text-muted)">${d.count}</span>
    </div>`).join('');

  const carteGroupes = groupes.length
    ? groupes.map((g) => {
        const img      = Array.isArray(g.actImg) && g.actImg[0] ? g.actImg[0] : null;
        const avgAct   = g.reviews.reduce((s, r) => s + Number(r.user_rating), 0) / g.reviews.length;
        const lignes   = g.reviews
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .map((r) => `
            <div style="display:flex;align-items:center;gap:.75rem;padding:.6rem 0;
                        border-bottom:1px solid var(--border)">
              <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;
                          background:var(--accent-soft);display:flex;align-items:center;
                          justify-content:center;font-size:.75rem;font-weight:600;color:var(--accent)">
                U${r.id_user ?? '?'}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;gap:.25rem;margin-bottom:.2rem">
                  ${renderStars(r.user_rating)}
                </div>
                <div style="font-size:.72rem;color:var(--text-muted)">
                  ${formatDate(r.date)} · Group of ${r.group_size ?? 1}
                </div>
              </div>
              <span style="font-weight:700;font-size:1rem;color:#f59e0b">${Number(r.user_rating).toFixed(1)}</span>
            </div>`).join('');

        return `
          <div class="glass-card animate-in" style="padding:1.25rem 1.5rem;margin-bottom:1rem">
            <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">
              <div style="width:48px;height:48px;border-radius:12px;overflow:hidden;flex-shrink:0;
                          background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-size:1.5rem">
                ${img ? `<img src="${escapeHtml(img)}" style="width:100%;height:100%;object-fit:cover" alt="">` : emojiTheme(g.actTheme)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.95rem;margin-bottom:.2rem">${escapeHtml(g.actTitle)}</div>
                <div style="display:flex;align-items:center;gap:.5rem">
                  ${renderStars(avgAct)}
                  <span style="font-size:.78rem;color:var(--text-muted)">${avgAct.toFixed(1)} · ${g.reviews.length} review(s)</span>
                </div>
              </div>
            </div>
            <div style="max-height:260px;overflow-y:auto">${lignes}</div>
          </div>`;
      }).join('')
    : `<div class="explorer-empty">
        <span style="font-size:3rem">⭐</span>
        <p style="color:var(--text-muted)">No ratings yet.<br>Participants can rate activities after attending.</p>
      </div>`;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Reviews &amp; Ratings</h1>
        <p class="view-subtitle">${total} rating(s) received across all your activities.</p>
      </div>
    </header>

    <div class="kpi-grid mb-6 animate-in">
      ${KpiCard({ icone: '⭐', titre: 'Average rating',   valeur: total ? moyenne.toFixed(2) + ' / 5' : '—',        couleur: '#fef3c7', couleurIcone: '#d97706' })}
      ${KpiCard({ icone: '💬', titre: 'Total reviews',    valeur: total,                                             couleur: '#dbeafe', couleurIcone: '#2563eb' })}
      ${KpiCard({ icone: '👍', titre: 'Positive (4-5★)',  valeur: total ? Math.round((positifs / total) * 100) + '%' : '—', couleur: '#d1fae5', couleurIcone: '#059669' })}
      ${KpiCard({ icone: '📊', titre: 'Rated activities', valeur: groupes.length,                                    couleur: '#ede9fe', couleurIcone: '#7c3aed' })}
    </div>

    ${total ? `
    <div class="glass-card animate-in mb-6" style="padding:1.25rem 1.5rem;max-width:380px">
      <div style="font-weight:600;font-size:.88rem;margin-bottom:.85rem;color:var(--text)">
        <i class="bi bi-bar-chart-fill" style="color:var(--accent);margin-right:.4rem"></i>Rating distribution
      </div>
      <div style="display:flex;flex-direction:column;gap:.45rem">${barreDistrib}</div>
    </div>` : ''}

    <div style="display:flex;flex-direction:column;gap:0">
      ${carteGroupes}
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
      <div><h1 class="view-title">History</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
    const titre = r.event?.activity?.title || 'Unknown activity';
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
        const dateR = r.date ? new Date(r.date).toLocaleDateString('en-US', {
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
                ${r.group_size ?? 1} ppl.
              </span>
            </td>
            <td style="font-weight:700;color:var(--accent)">${formatPrix(revenu)}</td>
            <td>
              ${r.user_rating
                ? `<span class="badge-status badge-actif" style="font-size:.7rem">
                    ${r.user_rating === 'like' ? '👍 Loved' : r.user_rating === 'recommend' ? '⭐ Recommended' : '👎 Not liked'}
                  </span>`
                : '<span style="color:var(--text-muted);font-size:.78rem">—</span>'}
            </td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="5" style="color:var(--text-muted);padding:2rem;text-align:center">
        No past bookings for your activities.
      </td></tr>`;

  const statsPills = Object.entries(parActivite).slice(0, 4).map(([titre, resa]) => `
    <div class="kpi-card" style="min-width:0">
      <div class="kpi-label" style="font-size:.72rem">${escapeHtml(truncate(titre, 22))}</div>
      <div class="kpi-value">${resa.length}</div>
      <div class="kpi-trend neutral" style="font-size:.72rem">booking(s)</div>
    </div>`).join('');

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Booking history</h1>
        <p class="view-subtitle">${items.length} past booking(s) — Total revenue: ${formatPrix(revenuTotal)}</p>
      </div>
      ${items.length ? `
        <button type="button" class="btn-primary" onclick="exporterReservationsPublisher(window._pubHistItems)">
          <i class="bi bi-download"></i> Export CSV
        </button>` : ''}
    </header>

    ${items.length ? `<div class="kpi-grid mb-6 animate-in">${statsPills}</div>` : ''}

    ${Card({
      classes: 'table-card animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">All received bookings</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Date</th>
                <th>Group</th>
                <th>Revenue</th>
                <th>Customer review</th>
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
      <div><h1 class="view-title">Statistics</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
    : '<tr><td colspan="4" style="color:var(--text-muted);padding:1.5rem;text-align:center">No data.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Statistics</h1>
        <p class="view-subtitle">Your activities performance over the last 6 months.</p>
      </div>
    </header>

    <div class="kpi-grid mb-6 animate-in">
      ${KpiCard({ icone: '💰', titre: 'Total revenue (6 months)', valeur: formatPrix(stats.revenuTotal || 0), couleur: '#dbeafe', couleurIcone: '#2563eb' })}
      ${KpiCard({ icone: '📆', titre: 'Bookings received',        valeur: stats.totalReservations || 0,      couleur: '#d1fae5', couleurIcone: '#059669' })}
      ${KpiCard({ icone: '📋', titre: 'Active listings',          valeur: stats.annoncesActives || 0,         couleur: '#ede9fe', couleurIcone: '#7c3aed' })}
      ${KpiCard({ icone: '📉', titre: 'Inactive listings',        valeur: stats.annoncesInactives || 0,       couleur: '#fef3c7', couleurIcone: '#d97706' })}
    </div>

    <div class="two-col mb-6">
      ${Card({
        classes: 'chart-card animate-in',
        contenu: `
          <div class="chart-header">
            <span class="chart-title">Monthly revenue</span>
            <span class="chart-badge">Last 6 months</span>
          </div>
          <div class="chart-wrapper">
            ${revMois.length ? creerGraphiqueArea(revMois, 'var(--accent)') : '<p style="color:var(--text-muted);padding:1rem">Insufficient data.</p>'}
          </div>`,
      })}
      ${Card({
        classes: 'chart-card animate-in',
        contenu: `
          <div class="chart-header">
            <span class="chart-title">Bookings by month</span>
            <span class="chart-badge">Last 6 months</span>
          </div>
          <div class="chart-wrapper">
            ${resaMois.length ? creerGraphiqueArea(resaMois, '#059669') : '<p style="color:var(--text-muted);padding:1rem">Insufficient data.</p>'}
          </div>`,
      })}
    </div>

    ${Card({
      classes: 'table-card animate-in',
      contenu: `
        <div class="table-header">
          <span class="card-title" style="margin:0">Top activities</span>
        </div>
        <div class="dash-table-wrap">
          <table class="dash-table">
            <thead><tr><th>Activity</th><th>Price</th><th>Rating</th><th>Bookings</th></tr></thead>
            <tbody>${lignesTop}</tbody>
          </table>
        </div>`,
    })}`;
}

// ============================================================
//  PUBLISHER — MES ANNONCES (gestion complète)
// ============================================================

let _listingsData   = [];
let _listingsVue    = 'table';
let _listingsCalMois  = new Date().getMonth();
let _listingsCalAnnee = new Date().getFullYear();
let _listingsCalJour  = null;

async function renderPublisherListingsTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">My Listings</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

  try {
    const annonces = await appelApi('/dashboard/publisher/activites');
    renderSidebar();
    _listingsData = annonces;
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

  const toolbar = `
    <div class="pub-act-toolbar animate-in">
      <div class="pub-act-vue-toggle">
        <button type="button" class="pub-vue-btn ${_listingsVue === 'table' ? 'active' : ''}"
                onclick="changerVueListings('table')">
          <i class="bi bi-list-ul"></i> Table
        </button>
        <button type="button" class="pub-vue-btn ${_listingsVue === 'grid' ? 'active' : ''}"
                onclick="changerVueListings('grid')">
          <i class="bi bi-grid-3x3-gap-fill"></i> Grid
        </button>
        <button type="button" class="pub-vue-btn ${_listingsVue === 'calendar' ? 'active' : ''}"
                onclick="changerVueListings('calendar')">
          <i class="bi bi-calendar3"></i> Calendar
        </button>
      </div>
      <button type="button" class="btn-primary"
              onclick="window.location.href='ActivityBuilder.html'">
        <i class="bi bi-plus-lg"></i> New listing
      </button>
    </div>`;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">My Listings</h1>
        <p class="view-subtitle">${annonces.length} total listing(s).</p>
      </div>
    </header>

    <div class="kpi-grid mb-6 animate-in" style="grid-template-columns:repeat(3,1fr)">
      ${KpiCard({ icone: '✅', titre: 'Visible',   valeur: visibles, couleur: '#d1fae5', couleurIcone: '#059669' })}
      ${KpiCard({ icone: '👁',  titre: 'Hidden',   valeur: masquees, couleur: '#fef3c7', couleurIcone: '#d97706' })}
      ${KpiCard({ icone: '🚫', titre: 'Disabled', valeur: desact,   couleur: '#fee2e2', couleurIcone: '#dc2626' })}
    </div>

    ${toolbar}
    <div id="listings-contenu"></div>`;

  rendreListingsContenu(annonces);
}

function changerVueListings(vue) {
  _listingsVue = vue;
  document.querySelectorAll('.pub-act-vue-toggle .pub-vue-btn').forEach((btn) => {
    btn.classList.toggle('active',
      (vue === 'table'    && btn.textContent.includes('Table'))    ||
      (vue === 'grid'     && btn.textContent.includes('Grid'))     ||
      (vue === 'calendar' && btn.textContent.includes('Calendar'))
    );
  });
  rendreListingsContenu(_listingsData);
}

function rendreListingsContenu(annonces) {
  const contenu = document.getElementById('listings-contenu');
  if (!contenu) return;
  if (_listingsVue === 'grid')     rendreListingsGrille(annonces, contenu);
  else if (_listingsVue === 'calendar') rendreListingsCalendrier(annonces, contenu);
  else                             rendreListingsTable(annonces, contenu);
}

/* ---- Vue table ---- */
function rendreListingsTable(annonces, contenu) {
  const lignes = annonces.length
    ? annonces.map((a) => {
        const isVisible = !!a.is_visible && !a.is_disabled;
        const toggleIcon  = isVisible ? 'bi-eye-slash-fill' : 'bi-eye-fill';
        const toggleStyle = isVisible
          ? 'background:#fef3c7;color:#d97706;border:none'
          : 'background:#d1fae5;color:#059669;border:none';
        const statut = a.is_disabled
          ? '<span class="badge-status badge-inactif">Disabled</span>'
          : a.is_visible
            ? '<span class="badge-status badge-actif">Visible</span>'
            : '<span class="badge-status badge-attente">Hidden</span>';
        return `
          <tr id="listing-row-${a.id}" style="transition:opacity .3s,transform .3s">
            <td style="font-weight:600;font-size:.85rem">${escapeHtml(a.title || '—')}</td>
            <td style="font-weight:700;color:var(--accent)">${formatPrix(a.price)}</td>
            <td style="color:#f59e0b;font-weight:600">${(a.average_rating || 0).toFixed(1)} ★</td>
            <td>${statut}</td>
            <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(a.created_at)}</td>
            <td style="font-size:.78rem;color:var(--text-muted)">${a.nb_evenements || 0} event(s)</td>
            <td>
              <div style="display:flex;gap:.4rem">
                <button type="button" class="icon-btn" title="Edit"
                        onclick="window.location.href='EditActivity.html?id=${a.id}'">
                  <i class="bi bi-pencil-fill"></i>
                </button>
                <button type="button" class="icon-btn" title="View bookings"
                        onclick="ouvrirBookingsActivite(${a.id})">
                  <i class="bi bi-calendar-check-fill"></i>
                </button>
                ${!a.is_disabled ? `
                <button type="button" class="icon-btn" title="${isVisible ? 'Hide' : 'Show'}"
                        id="toggle-btn-${a.id}"
                        style="${toggleStyle};border-radius:8px;padding:.35rem .5rem"
                        onclick="toggleVisibiliteActivite(${a.id}, ${isVisible})">
                  <i class="bi ${toggleIcon}"></i>
                <\/button>` : ''}
                <button type="button" class="icon-btn danger" title="Delete activity"
                        onclick="supprimerActivite(${a.id}, '${escapeHtml((a.title || '').replace(/'/g, ''))}')">
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('')
    : '<tr><td colspan="7" style="color:var(--text-muted);padding:2rem;text-align:center">No listings published.</td></tr>';

  contenu.innerHTML = Card({
    classes: 'table-card animate-in',
    contenu: `
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Title</th><th>Price</th><th>Rating</th><th>Status</th><th>Created on</th><th>Events</th><th></th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>`,
  });
}

/* ---- Vue grille ---- */
function rendreListingsGrille(annonces, contenu) {
  const MOIS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

  const cartes = annonces.length
    ? annonces.map((a, i) => {
        const img      = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
        const emoji    = emojiTheme(a.theme);
        const prix     = a.price != null ? formatPrix(a.price) : 'Free';
        const note     = (a.average_rating || 0).toFixed(1);
        const isVisible = !!a.is_visible && !a.is_disabled;
        const statut   = a.is_disabled
          ? '<span class="badge-status badge-inactif">Disabled</span>'
          : a.is_visible
            ? '<span class="badge-status badge-actif">Visible</span>'
            : '<span class="badge-status badge-attente">Hidden</span>';
        const toggleIcon  = isVisible ? 'bi-eye-slash-fill' : 'bi-eye-fill';
        const toggleTitle = isVisible ? 'Hide' : 'Show';
        const toggleStyle = isVisible
          ? 'background:#fef3c7;color:#d97706;border:1px solid #fde68a'
          : 'background:#d1fae5;color:#059669;border:1px solid #a7f3d0';

        const prochaineDate = a.prochaine_date
          ? (() => {
              const d = new Date(a.prochaine_date);
              return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
            })()
          : null;

        return `
          <div class="pub-act-card glass-card" id="listing-row-${a.id}"
               style="animation:fadeUp .35s ${0.05 * i}s ease both;transition:opacity .3s,transform .3s">
            <div class="pub-act-img">
              ${img
                ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(a.title || '')}" loading="lazy">`
                : `<div class="pub-act-img-placeholder">${emoji}</div>`}
              <div class="pub-act-badges">${statut}</div>
            </div>
            <div class="pub-act-body">
              <h3 class="pub-act-title">${escapeHtml(a.title || '—')}</h3>
              <div class="pub-act-meta">
                <span><i class="bi bi-tag-fill" style="color:var(--accent)"></i> ${prix}</span>
                <span><i class="bi bi-star-fill" style="color:#f59e0b"></i> ${note}</span>
                <span><i class="bi bi-calendar3" style="color:var(--accent)"></i> ${formatDate(a.created_at)}</span>
                ${a.nb_evenements ? `<span><i class="bi bi-calendar-event" style="color:var(--accent)"></i> ${a.nb_evenements} event(s)</span>` : ''}
                ${prochaineDate ? `<span><i class="bi bi-clock-fill" style="color:#059669"></i> Next: ${prochaineDate}</span>` : ''}
              </div>
              <div class="pub-act-actions" style="flex-wrap:wrap;gap:.4rem">
                <button type="button" class="btn-primary" style="font-size:.75rem;padding:.35rem .8rem"
                        onclick="window.location.href='EditActivity.html?id=${a.id}'">
                  <i class="bi bi-pencil-fill"></i> Edit
                </button>
                <button type="button" class="btn-outline" style="font-size:.75rem;padding:.35rem .8rem"
                        onclick="ouvrirBookingsActivite(${a.id})">
                  <i class="bi bi-calendar-check-fill"></i> Bookings
                </button>
                ${!a.is_disabled ? `
                <button type="button" class="btn-outline" id="toggle-btn-${a.id}"
                        style="${toggleStyle};font-size:.75rem;padding:.35rem .8rem;border-radius:8px"
                        title="${toggleTitle}"
                        onclick="toggleVisibiliteActivite(${a.id}, ${isVisible})">
                  <i class="bi ${toggleIcon}"></i> ${toggleTitle}
                </button>` : ''}
                <button type="button" class="btn-outline"
                        style="font-size:.75rem;padding:.35rem .8rem;color:#dc2626;border-color:#fca5a5"
                        onclick="supprimerActivite(${a.id}, '${escapeHtml((a.title || '').replace(/'/g, ''))}')">
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div class="explorer-empty" style="grid-column:1/-1">
        <span style="font-size:3rem">📋</span>
        <p style="color:var(--text-muted)">No listings yet.</p>
        <button type="button" class="btn-primary" onclick="window.location.href='ActivityBuilder.html'">
          <i class="bi bi-plus-lg"></i> New listing
        </button>
      </div>`;

  contenu.innerHTML = `<div class="pub-act-grid">${cartes}</div>`;
}

/* ---- Vue calendrier ---- */
function rendreListingsCalendrier(annonces, contenu) {
  const parJour = {};
  annonces.forEach((a) => {
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
        <div id="listings-cal-root"></div>
      </div>
      <div class="glass-card cal-detail-panel" id="listings-cal-detail">
        ${rendreListingsCalDetailVide()}
      </div>
    </div>`;

  _listingsCalJour = null;
  rendreListingsCalMois(parJour);
}

function rendreListingsCalMois(parJour) {
  const root = document.getElementById('listings-cal-root');
  if (!root) return;

  const JOURS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const MOIS_NOM = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

  const premier  = new Date(_listingsCalAnnee, _listingsCalMois, 1);
  const dernier  = new Date(_listingsCalAnnee, _listingsCalMois + 1, 0);
  const debutCol = (premier.getDay() + 6) % 7;

  const cellules = [];
  for (let i = 0; i < debutCol; i++) cellules.push(null);
  for (let j = 1; j <= dernier.getDate(); j++) cellules.push(j);
  while (cellules.length % 7 !== 0) cellules.push(null);

  const ajd    = new Date();
  const ajdStr = `${ajd.getFullYear()}-${String(ajd.getMonth()+1).padStart(2,'0')}-${String(ajd.getDate()).padStart(2,'0')}`;

  const cases = cellules.map((j) => {
    if (!j) return `<div class="cal-cell cal-cell-vide"></div>`;
    const cle   = `${_listingsCalAnnee}-${String(_listingsCalMois+1).padStart(2,'0')}-${String(j).padStart(2,'0')}`;
    const evts  = parJour[cle] || [];
    const isAjd = cle === ajdStr;
    const isSel = cle === _listingsCalJour;
    return `
      <div class="cal-cell ${evts.length ? 'cal-has-event' : ''} ${isAjd ? 'cal-today' : ''} ${isSel ? 'cal-selected' : ''}"
           data-date="${cle}" onclick="selJourListingsCal('${cle}')">
        <span class="cal-jour-num">${j}</span>
        ${evts.length
          ? `<div class="cal-dots">${evts.slice(0,3).map(() => '<span class="cal-dot"></span>').join('')}</div>`
          : ''}
      </div>`;
  }).join('');

  root.innerHTML = `
    <div class="cal-header">
      <button type="button" class="cal-nav-btn" onclick="changerMoisListingsCal(-1)">
        <i class="bi bi-chevron-left"></i>
      </button>
      <span class="cal-titre">${MOIS_NOM[_listingsCalMois]} ${_listingsCalAnnee}</span>
      <button type="button" class="cal-nav-btn" onclick="changerMoisListingsCal(1)">
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>
    <div class="cal-grid-header">
      ${JOURS.map((j) => `<div class="cal-label-jour">${j}</div>`).join('')}
    </div>
    <div class="cal-grid">${cases}</div>`;
}

function changerMoisListingsCal(delta) {
  _listingsCalMois += delta;
  if (_listingsCalMois > 11) { _listingsCalMois = 0;  _listingsCalAnnee++; }
  if (_listingsCalMois < 0)  { _listingsCalMois = 11; _listingsCalAnnee--; }
  _listingsCalJour = null;

  const parJour = {};
  _listingsData.forEach((a) => {
    (a.events || []).forEach((ev) => {
      if (!ev.date) return;
      const cle = ev.date.slice(0, 10);
      if (!parJour[cle]) parJour[cle] = [];
      parJour[cle].push({ ...a, eventDate: ev.date });
    });
  });

  rendreListingsCalMois(parJour);
  const detail = document.getElementById('listings-cal-detail');
  if (detail) detail.innerHTML = rendreListingsCalDetailVide();
}

function selJourListingsCal(cle) {
  _listingsCalJour = cle;
  document.querySelectorAll('#listings-cal-root .cal-cell').forEach((c) => {
    c.classList.toggle('cal-selected', c.dataset.date === cle);
  });

  const parJour = {};
  _listingsData.forEach((a) => {
    (a.events || []).forEach((ev) => {
      if (!ev.date) return;
      const k = ev.date.slice(0, 10);
      if (!parJour[k]) parJour[k] = [];
      parJour[k].push({ ...a, eventDate: ev.date });
    });
  });

  const evts  = parJour[cle] || [];
  const panel = document.getElementById('listings-cal-detail');
  if (!panel) return;

  if (!evts.length) { panel.innerHTML = rendreListingsCalDetailVide(); return; }

  const MOIS_COMPLET = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
  const [annee, mois, jour] = cle.split('-');
  const labelDate = `${parseInt(jour)} ${MOIS_COMPLET[parseInt(mois)-1]} ${annee}`;

  panel.innerHTML = `
    <div class="cal-detail-titre">${labelDate}</div>
    <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.75rem">
      ${evts.length} event(s) this day
    </div>
    <div class="cal-detail-liste">
      ${evts.map((a) => {
        const img      = Array.isArray(a.images) && a.images[0] ? a.images[0] : null;
        const isVisible = !!a.is_visible && !a.is_disabled;
        const statut   = a.is_disabled
          ? '<span class="badge-status badge-inactif" style="font-size:.65rem">Disabled</span>'
          : a.is_visible
            ? '<span class="badge-status badge-actif" style="font-size:.65rem">Visible</span>'
            : '<span class="badge-status badge-attente" style="font-size:.65rem">Hidden</span>';
        return `
          <div class="cal-detail-item">
            <div class="cal-detail-img">
              ${img
                ? `<img src="${escapeHtml(img)}" alt="">`
                : `<span style="font-size:1.5rem">${emojiTheme(a.theme)}</span>`}
            </div>
            <div style="flex:1;min-width:0">
              <div class="cal-detail-name">${escapeHtml(a.title || 'Activity')}</div>
              ${a.address ? `<div class="cal-detail-addr"><i class="bi bi-geo-alt-fill"></i> ${escapeHtml(a.address)}</div>` : ''}
              <div style="display:flex;gap:.4rem;margin-top:.4rem;flex-wrap:wrap">
                ${statut}
                <span style="font-size:.7rem;color:var(--text-muted)">${formatPrix(a.price)}</span>
                <span style="font-size:.7rem;color:#f59e0b">${(a.average_rating||0).toFixed(1)} ★</span>
              </div>
              <div style="display:flex;gap:.35rem;margin-top:.5rem;flex-wrap:wrap">
                <button type="button" class="btn-primary" style="font-size:.68rem;padding:.25rem .6rem"
                        onclick="window.location.href='EditActivity.html?id=${a.id}'">
                  <i class="bi bi-pencil-fill"></i> Edit
                </button>
                <button type="button" class="btn-outline" style="font-size:.68rem;padding:.25rem .6rem"
                        onclick="ouvrirBookingsActivite(${a.id})">
                  <i class="bi bi-calendar-check-fill"></i>
                </button>
                ${!a.is_disabled ? `
                <button type="button" class="btn-outline" id="toggle-btn-${a.id}"
                        style="font-size:.68rem;padding:.25rem .6rem"
                        onclick="toggleVisibiliteActivite(${a.id}, ${isVisible})">
                  <i class="bi bi-eye${isVisible ? '-slash' : ''}-fill"></i>
                </button>` : ''}
                <button type="button" class="btn-outline"
                        style="font-size:.68rem;padding:.25rem .6rem;color:#dc2626;border-color:#fca5a5"
                        onclick="supprimerActivite(${a.id}, '${escapeHtml((a.title || '').replace(/'/g, ''))}')">
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function rendreListingsCalDetailVide() {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                height:100%;gap:.75rem;color:var(--text-muted);padding:2rem;text-align:center">
      <i class="bi bi-calendar3" style="font-size:2.5rem;opacity:.35"></i>
      <p style="font-size:.85rem">Select a day<br>to view your events</p>
    </div>`;
}

async function toggleVisibiliteActivite(actId, isCurrentlyVisible) {
  const btn = document.getElementById(`toggle-btn-${actId}`);
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-hourglass-split"></i>'; }

  try {
    const token = JSON.parse(localStorage.getItem('meetando_current_user') || '{}')?.token || '';
    const res = await fetch(`${API}/activity/${actId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ is_visible: !isCurrentlyVisible }),
    });
    if (!res.ok) throw new Error('Failed to update visibility');

    _listingsData = _listingsData.map((a) =>
      a.id === actId ? { ...a, is_visible: !isCurrentlyVisible } : a,
    );
    afficherPublisherListings(_listingsData);
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="bi bi-${isCurrentlyVisible ? 'eye-slash' : 'eye'}-fill"></i>`;
    }
    alert('Error updating visibility: ' + e.message);
  }
}

async function supprimerActivite(actId, titre) {
  if (!confirm(`Delete "${titre}"? This action cannot be undone.`)) return;

  try {
    const token = JSON.parse(localStorage.getItem('meetando_current_user') || '{}')?.token || '';
    const res = await fetch(`${API}/activity/${actId}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete activity');

    _listingsData = _listingsData.filter((a) => a.id !== actId);
    const row = document.getElementById(`listing-row-${actId}`);
    if (row) {
      row.style.transition = 'opacity .3s, transform .3s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(20px)';
      setTimeout(() => afficherPublisherListings(_listingsData), 320);
    } else {
      afficherPublisherListings(_listingsData);
    }
  } catch (e) {
    alert('Error deleting activity: ' + e.message);
  }
}

// ============================================================
//  PUBLISHER — RÉSERVATIONS REÇUES (futures)
// ============================================================

let _pendingBookingsActivity = null;
let _bookingsDataByActivity = {};

async function renderPublisherBookingsTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;
  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Bookings</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

  try {
    const reservations = await appelApi('/dashboard/publisher/historique');
    renderSidebar();
    afficherPublisherBookings(reservations);
  } catch (e) {
    main.innerHTML = `<div class="dash-loader"><p style="color:var(--text-muted)">${escapeHtml(e.message)}</p></div>`;
  }
}

function afficherPublisherBookings(reservations) {
  const main = document.getElementById('dash-main');
  if (!main) return;

  // Group reservations by activity
  const byActivity = {};
  reservations.forEach((r) => {
    const act = r.event?.activity;
    if (!act) return;
    const key = act.id;
    if (!byActivity[key]) byActivity[key] = { activity: act, reservations: [] };
    byActivity[key].reservations.push(r);
  });

  _bookingsDataByActivity = byActivity;

  const groups = Object.values(byActivity);
  const totalBookings = reservations.length;
  const totalParticipants = reservations.reduce((s, r) => s + (r.group_size ?? 1), 0);
  const activitiesCount = groups.length;

  const cartes = groups.length
    ? groups.map((g, gi) => {
        const act = g.activity;
        const resas = g.reservations;
        const img = act.images?.[0] ?? '';
        const totalPax = resas.reduce((s, r) => s + (r.group_size ?? 1), 0);
        const lignes = resas.map((r, ri) => `
          <tr style="animation:fadeUp .2s ${0.03 * ri}s ease both">
            <td style="font-size:.78rem;color:var(--text-muted)">#${r.id}</td>
            <td style="font-size:.8rem">${formatDate(r.date)}</td>
            <td>
              <span class="badge-status badge-user" style="font-size:.72rem">
                <i class="bi bi-people-fill" style="font-size:.5rem"></i>
                ${r.group_size ?? 1} ppl
              </span>
            </td>
            <td style="font-size:.78rem;color:var(--text-muted)">User #${r.id_user}</td>
            <td>${badgeStatut('confirme')}</td>
          </tr>`).join('');

        return `
          <div class="glass-card animate-in" style="animation:fadeUp .3s ${0.08 * gi}s ease both;margin-bottom:1.25rem">
            <div style="display:flex;align-items:center;gap:.75rem;padding:.25rem 0">
              <div style="display:flex;align-items:center;gap:1rem;flex:1;min-width:0;cursor:pointer"
                   onclick="toggleBookingAct(${act.id})">
                ${img
                  ? `<img src="${escapeHtml(img)}" alt="" style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex-shrink:0">`
                  : `<div style="width:52px;height:52px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="bi bi-image" style="font-size:1.2rem;color:var(--accent)"></i></div>`}
                <div style="flex:1;min-width:0">
                  <div style="font-weight:700;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(act.title ?? '—')}</div>
                  <div style="font-size:.78rem;color:var(--text-muted);margin-top:.2rem">
                    ${resas.length} booking(s) &middot; ${totalPax} participant(s)
                  </div>
                </div>
                <i class="bi bi-chevron-down" id="chevron-act-${act.id}"
                   style="color:var(--text-muted);transition:transform .2s;flex-shrink:0"></i>
              </div>
              <button type="button" class="btn-outline"
                      style="font-size:.72rem;padding:.35rem .75rem;white-space:nowrap;flex-shrink:0"
                      onclick="exportBookingsActivite(${act.id})"
                      title="Export participant list as CSV">
                <i class="bi bi-download"></i> Export
              </button>
            </div>
            <div id="participants-act-${act.id}" style="display:none;margin-top:1rem">
              <div class="dash-table-wrap">
                <table class="dash-table" style="font-size:.82rem">
                  <thead>
                    <tr><th>#</th><th>Date</th><th>Group</th><th>User</th><th>Status</th></tr>
                  </thead>
                  <tbody>${lignes}</tbody>
                </table>
              </div>
            </div>
          </div>`;
      }).join('')
    : `<div class="explorer-empty" style="padding:3rem;text-align:center">
         <span style="font-size:3rem">📋</span>
         <p style="color:var(--text-muted);margin-top:.75rem">No bookings received yet.</p>
       </div>`;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Bookings</h1>
        <p class="view-subtitle">
          ${totalBookings} booking(s) &mdash; ${totalParticipants} total participant(s) across ${activitiesCount} activit${activitiesCount !== 1 ? 'ies' : 'y'}.
        </p>
      </div>
    </header>
    <div id="bookings-list">${cartes}</div>`;

  if (_pendingBookingsActivity !== null) {
    const targetId = _pendingBookingsActivity;
    _pendingBookingsActivity = null;
    setTimeout(() => {
      const panel = document.getElementById(`participants-act-${targetId}`);
      if (panel && panel.style.display === 'none') toggleBookingAct(targetId);
      panel?.closest('.glass-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }
}

function toggleBookingAct(actId) {
  const panel = document.getElementById(`participants-act-${actId}`);
  const chevron = document.getElementById(`chevron-act-${actId}`);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : '';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function ouvrirBookingsActivite(actId) {
  _pendingBookingsActivity = actId;
  setOnglet('bookings');
}

function exportBookingsActivite(actId) {
  const group = _bookingsDataByActivity[actId];
  if (!group) return;

  const titre = group.activity.title || `activity-${actId}`;
  const entetes = ['Booking #', 'Date', 'Group Size', 'User ID', 'Status'];
  const lignes = group.reservations.map((r) => [
    `#${r.id}`,
    r.date ? new Date(r.date).toLocaleDateString('en-GB') : '—',
    r.group_size ?? 1,
    `User #${r.id_user}`,
    'Confirmed',
  ]);

  const csvContent = [entetes, ...lignes]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = `bookings-${titre.replace(/[^a-z0-9]/gi, '_')}.csv`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}

// ============================================================
//  ONGLET ADMIN — GESTION DES CLIENTS
// ============================================================

async function renderAdminUsersTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Client Management</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
              ${u.enabled ? '● Active' : '● Blocked'}
            </span>
          </td>
          <td>
            <button class="icon-btn" title="View profile" data-action="view" data-id="${u.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn" title="Edit role" data-action="edit" data-id="${u.id}"><i class="bi bi-pencil-fill"></i></button>
            <button class="icon-btn ${u.enabled ? 'danger' : ''}" title="${u.enabled ? 'Block' : 'Unblock'}"
              data-action="block" data-id="${u.id}" data-enabled="${u.enabled}">
              <i class="bi ${u.enabled ? 'bi-slash-circle-fill' : 'bi-check-circle-fill'}"></i>
            </button>
            <button class="icon-btn danger" title="Delete" data-action="delete" data-id="${u.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">No results.</td></tr>';

  const paginationHtml = renderPagination(total, current, totalPages, 'adminUsersGoPage');

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Client Management</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" id="admin-users-search" placeholder="Search…" value="${escapeHtml(_adminUsersSearch)}"
            oninput="adminUsersFilter(this.value)">
        </div>
        <span class="admin-count">Number of clients: <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Last name</th><th>First name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
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
      const libelle = enabled ? 'Block' : 'Unblock';
      if (!confirm(`${libelle} user #${id}?`)) return;
      btn.disabled = true;
      try {
        await appelApi(`/dashboard/admin/users/${id}/toggle-block`, 'PATCH', { block: enabled });
        const idx = _adminUsersData.findIndex((x) => String(x.id) === id);
        if (idx !== -1) _adminUsersData[idx].enabled = !enabled;
        afficherAdminUsers(_adminUsersData, current);
      } catch (e) { alert('Error: ' + e.message); btn.disabled = false; }
    });
  });

  main.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Delete user #${btn.dataset.id}?`)) return;
      try {
        await appelApi(`/dashboard/admin/users/${btn.dataset.id}`, 'DELETE');
        _adminUsersData = _adminUsersData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminUsers(_adminUsersData, current);
      } catch (e) { alert('Error: ' + e.message); }
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
        <span><i class="bi bi-person-fill"></i> User Profile</span>
        <button class="admin-modal-close" id="modal-close-btn"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field"><label>Last name</label><input type="text" value="${escapeHtml(u.lastname || '')}" readonly></div>
      <div class="admin-modal-field"><label>First name</label><input type="text" value="${escapeHtml(u.firstname || '')}" readonly></div>
      <div class="admin-modal-field"><label>Email</label><input type="text" value="${escapeHtml(u.email || '')}" readonly></div>
      <div class="admin-modal-field"><label>Role</label><input type="text" value="${escapeHtml(u.role || '')}" readonly></div>
      <div class="admin-modal-field"><label>Registered on</label><input type="text" value="${formatDate(u.created_at)}" readonly></div>
      <div class="admin-modal-field"><label>Status</label><input type="text" value="${u.enabled ? 'Active' : 'Inactive'}" readonly></div>
      ${u.address ? `<div class="admin-modal-field"><label>Address</label><input type="text" value="${escapeHtml(u.address)}" readonly></div>` : ''}
      <div class="admin-modal-actions">
        <button class="btn-primary" id="modal-close-btn2"><i class="bi bi-check-lg"></i> Close</button>
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
        <span><i class="bi bi-pencil-fill"></i> Edit role</span>
        <button class="admin-modal-close" id="modal-close-edit"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>User</label>
        <input type="text" value="${escapeHtml((u.firstname || '') + ' ' + (u.lastname || ''))}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Current role</label>
        <select id="edit-role-select">
          <option value="USER" ${(u.role||'').toUpperCase()==='USER'?'selected':''}>User</option>
          <option value="PUBLISHER" ${(u.role||'').toUpperCase()==='PUBLISHER'?'selected':''}>Meeter (Publisher)</option>
          <option value="ADMIN" ${(u.role||'').toUpperCase()==='ADMIN'?'selected':''}>Admin</option>
        </select>
      </div>
      <div id="edit-role-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-outline" id="modal-cancel-edit">Cancel</button>
        <button class="btn-primary" id="modal-save-role"><i class="bi bi-check-lg"></i> Save</button>
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
      fb.innerHTML = `<div style="color:#059669;font-size:.82rem;padding:.4rem 0"><i class="bi bi-check-circle-fill"></i> Role updated.</div>`;
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
      <div><h1 class="view-title">Messaging</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
        (m.nom || '').toLowerCase().includes(q) ||
        (m.sujet || '').toLowerCase().includes(q))
    : msgs;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_MSG_PER_PAGE));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * ADMIN_MSG_PER_PAGE, current * ADMIN_MSG_PER_PAGE);

  const lignes = slice.length
    ? slice.map((m) => `
        <tr>
          <td>${escapeHtml(m.nom || '—')}</td>
          <td style="font-size:.82rem">${escapeHtml(m.sujet || '—')}</td>
          <td style="font-size:.78rem;color:var(--text-muted)">${formatDate(m.created_at)}</td>
          <td>
            <button class="icon-btn" title="View" data-action="view-msg" data-id="${m.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn" title="Reply" data-action="reply-msg" data-id="${m.id}"><i class="bi bi-reply-fill"></i></button>
            <button class="icon-btn danger" title="Delete" data-action="delete-msg" data-id="${m.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="color:var(--text-muted);padding:1.5rem;text-align:center">No messages.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Messaging</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" id="admin-msg-search" placeholder="Search…" value="${escapeHtml(_adminMsgSearch)}"
            oninput="adminMsgFilter(this.value)">
        </div>
        <span class="admin-count">Number of messages: <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Name</th><th>Subject</th><th>Date</th><th>Actions</th></tr></thead>
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
      if (!confirm('Delete this message?')) return;
      try {
        await appelApi(`/dashboard/admin/contact-messages/${btn.dataset.id}`, 'DELETE');
        _adminMsgData = _adminMsgData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminMessages(_adminMsgData, current);
      } catch (e) { alert('Error: ' + e.message); }
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
  // Build chronological thread from suivis JSONB column + admin reply
  const events = [];
  (m.suivis || []).forEach(s => events.push({ ts: new Date(s.date).getTime(), type: s.auteur === 'admin' ? 'admin' : 'user', message: s.message, date: s.date }));
  if (m.reponse) events.push({ ts: m.reponse_date ? new Date(m.reponse_date).getTime() : Infinity, type: 'admin', message: m.reponse, date: m.reponse_date });
  events.sort((a, b) => a.ts - b.ts);

  const initiales = (nom) => nom.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';

  const threadHtml = events.map(e => {
    const isAdmin = e.type === 'admin';
    const avatar = isAdmin ? 'AD' : initiales(m.nom || '?');
    const author = isAdmin ? 'MeetAndDo Team' : escapeHtml(m.nom || '');
    const dateStr = e.date ? new Date(e.date).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div style="display:flex;gap:.6rem;align-items:flex-start;margin-bottom:.75rem;${isAdmin ? 'flex-direction:row-reverse' : ''}">
        <div style="width:2rem;height:2rem;border-radius:50%;background:${isAdmin ? '#6366f1' : '#004AAD'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;flex-shrink:0">${avatar}</div>
        <div style="max-width:80%">
          <div style="font-size:.72rem;color:#6b7280;margin-bottom:.2rem;${isAdmin ? 'text-align:right' : ''}">${author} · ${dateStr}</div>
          <div style="background:${isAdmin ? '#ede9fe' : '#f3f4f6'};padding:.5rem .75rem;border-radius:.6rem;font-size:.85rem;white-space:pre-wrap">${escapeHtml(e.message)}</div>
        </div>
      </div>`;
  }).join('');

  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-title">
        <span><i class="bi bi-envelope-fill"></i> ${showReply ? 'Reply to message' : 'View message'}</span>
        <button class="admin-modal-close" id="msg-modal-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field"><label>Name</label><input type="text" value="${escapeHtml(m.nom || '')}" readonly></div>
      <div class="admin-modal-field"><label>Email</label><input type="text" value="${escapeHtml(m.email || '')}" readonly></div>
      <div class="admin-modal-field"><label>Subject</label><input type="text" value="${escapeHtml(m.sujet || '')}" readonly></div>
      <div class="admin-modal-field"><label>Message</label><textarea rows="3" readonly>${escapeHtml(m.message || '')}</textarea></div>
      ${events.length > 0 ? `
        <div style="border-top:1px solid #e5e7eb;padding-top:.75rem;margin-top:.25rem">
          <div style="font-size:.75rem;font-weight:600;color:#6b7280;margin-bottom:.6rem;text-transform:uppercase;letter-spacing:.05em">Conversation thread</div>
          ${threadHtml}
        </div>` : ''}
      ${showReply ? `
        <div class="admin-modal-field" style="margin-top:.5rem">
          <label>Reply</label>
          <textarea id="msg-reply-text" rows="4" placeholder="Your reply…"></textarea>
        </div>
      ` : ''}
      <div id="msg-modal-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-danger" id="msg-modal-delete"><i class="bi bi-trash-fill"></i> Delete</button>
        ${showReply ? `<button class="btn-primary" id="msg-modal-reply"><i class="bi bi-reply-fill"></i> Reply</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#msg-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#msg-modal-delete').addEventListener('click', async () => {
    if (!confirm('Delete this message?')) return;
    try {
      await appelApi(`/dashboard/admin/contact-messages/${m.id}`, 'DELETE');
      _adminMsgData = _adminMsgData.filter((x) => x.id !== m.id);
      afficherAdminMessages(_adminMsgData, 1);
      close();
    } catch (e) { alert('Error: ' + e.message); }
  });
  if (showReply) {
    overlay.querySelector('#msg-modal-reply').addEventListener('click', async () => {
      const replyText = overlay.querySelector('#msg-reply-text').value.trim();
      const fb = overlay.querySelector('#msg-modal-feedback');
      if (!replyText) { fb.innerHTML = '<div style="color:#dc2626;font-size:.82rem">Please enter a reply.</div>'; return; }
      fb.innerHTML = '<div style="color:var(--text-muted);font-size:.82rem">Sending…</div>';
      try {
        await appelApi(`/dashboard/admin/contact-messages/${m.id}/reply`, 'POST', { reply: replyText });
        m.reponse = replyText;
        fb.innerHTML = '<div style="color:#059669;font-size:.82rem"><i class="bi bi-check-circle-fill"></i> Reply sent.</div>';
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
      <div><h1 class="view-title">User Reports</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
            <button class="icon-btn" title="View" data-action="view-rpt-user" data-id="${r.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn danger" title="Delete" data-action="delete-rpt-user" data-id="${r.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">No reports.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">User Reports</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" placeholder="Search…" value="${escapeHtml(_adminRptUsersSearch)}"
            oninput="adminRptUsersFilter(this.value)">
        </div>
        <span class="admin-count">Number of reports: <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Last name</th><th>First name</th><th>Report date</th><th>Reason</th><th>Actions</th></tr></thead>
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
      if (!confirm('Remove this report?')) return;
      try {
        await appelApi(`/dashboard/admin/reports/${btn.dataset.id}`, 'DELETE');
        _adminRptUsersData = _adminRptUsersData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminReportsUsers(_adminRptUsersData, current);
      } catch (e) { alert('Error: ' + e.message); }
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
        <span><i class="bi bi-flag-fill"></i> Report Reason</span>
        <button class="admin-modal-close" id="rpt-modal-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>User</label>
        <input type="text" value="${escapeHtml((r.reported_lastname || '') + ' ' + (r.reported_firstname || ''))}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Reason</label>
        <input type="text" value="${escapeHtml(r.reason || '—')}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Description</label>
        <textarea rows="4" readonly>${escapeHtml(r.description || r.message || '—')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label>Reported on</label>
        <input type="text" value="${formatDate(r.created_at)}" readonly>
      </div>
      <div id="rpt-user-modal-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-primary" id="rpt-enlever"><i class="bi bi-shield-check"></i> Remove report</button>
        <button class="btn-danger" id="rpt-bloquer"><i class="bi bi-ban"></i> Block</button>
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
    if (!confirm('Block this user?')) return;
    try {
      await appelApi(`/dashboard/admin/reports/users/${r.id_reported}/block`, 'PATCH');
      fb.innerHTML = '<div style="color:#059669;font-size:.82rem"><i class="bi bi-check-circle-fill"></i> User blocked.</div>';
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
      <div><h1 class="view-title">Listing Reports</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
            <button class="icon-btn" title="View" data-action="view-rpt-act" data-id="${r.id}"><i class="bi bi-eye-fill"></i></button>
            <button class="icon-btn danger" title="Delete" data-action="delete-rpt-act" data-id="${r.id}"><i class="bi bi-trash-fill"></i></button>
          </td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="color:var(--text-muted);padding:1.5rem;text-align:center">No reports.</td></tr>';

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Listing Reports</h1></div>
    </header>
    <div class="glass-card animate-in">
      <div class="admin-search-row">
        <div class="table-search">
          <i class="bi bi-search" style="color:var(--text-muted);font-size:.85rem"></i>
          <input type="text" placeholder="Search…" value="${escapeHtml(_adminRptActSearch)}"
            oninput="adminRptActFilter(this.value)">
        </div>
        <span class="admin-count">Number of reports: <strong>${total}</strong></span>
      </div>
      <div class="dash-table-wrap">
        <table class="dash-table">
          <thead><tr><th>Activity name</th><th>Report date</th><th>Reason</th><th>Actions</th></tr></thead>
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
      if (!confirm('Remove this report?')) return;
      try {
        await appelApi(`/dashboard/admin/reports/${btn.dataset.id}`, 'DELETE');
        _adminRptActData = _adminRptActData.filter((x) => String(x.id) !== btn.dataset.id);
        afficherAdminReportsActivities(_adminRptActData, current);
      } catch (e) { alert('Error: ' + e.message); }
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
        <span><i class="bi bi-flag-fill"></i> Report — Listing</span>
        <button class="admin-modal-close" id="rpt-act-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>Reported activity</label>
        <input type="text" value="${escapeHtml(r.activity_title || '—')}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Reason</label>
        <input type="text" value="${escapeHtml(r.reason || '—')}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Description</label>
        <textarea rows="4" readonly>${escapeHtml(r.description || r.message || '—')}</textarea>
      </div>
      <div class="admin-modal-field">
        <label>Reported on</label>
        <input type="text" value="${formatDate(r.created_at)}" readonly>
      </div>
      <div id="rpt-act-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-primary" id="rpt-act-enlever"><i class="bi bi-shield-check"></i> Remove report</button>
        ${r.activity_id || r.id_activity
          ? `<button class="btn-danger" id="rpt-act-desactiver"><i class="bi bi-slash-circle-fill"></i> Disable activity</button>`
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
      if (!actId || !confirm('Disable this activity? It will no longer be visible to users.')) return;
      btnDesact.disabled = true;
      btnDesact.innerHTML = '<i class="bi bi-hourglass-split"></i> Disabling…';
      try {
        await appelApi(`/dashboard/admin/activities/${actId}/disable`, 'PATCH');
        fb.innerHTML = `<div style="color:#059669;font-size:.82rem;padding:.4rem 0">
          <i class="bi bi-check-circle-fill"></i> Activity disabled successfully.
        </div>`;
        setTimeout(close, 1200);
      } catch (e) {
        fb.innerHTML = `<div style="color:#dc2626;font-size:.82rem">${escapeHtml(e.message)}</div>`;
        btnDesact.disabled = false;
        btnDesact.innerHTML = '<i class="bi bi-slash-circle-fill"></i> Disable activity';
      }
    });
  }
}

// ============================================================
//  ONGLET ADMIN — MODIFIER LES TABLES (Thèmes)
// ============================================================

const THEMES_CATEGORIES = [
  { key: 'activites',              label: 'Activity themes' },
  { key: 'faq',                    label: 'FAQ themes' },
  { key: 'forum',                  label: 'Forum themes' },
  { key: 'signalement_utilisateur', label: 'User report themes' },
  { key: 'signalement_activite',   label: 'Activity report themes' },
];

let _themesData = {};

async function renderAdminSettingsTab() {
  const main = document.getElementById('dash-main');
  if (!main) return;

  main.innerHTML = `
    <header class="view-header animate-in">
      <div><h1 class="view-title">Edit Tables</h1><p class="view-subtitle">Loading…</p></div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
        <button class="tag-remove" title="Remove" onclick="retirerTheme('${cat.key}', '${escapeHtml(t)}')" type="button">
          <i class="bi bi-x"></i>
        </button>
      </span>`).join('');

    return `
      <div class="glass-card animate-in" style="margin-bottom:1.25rem">
        <div class="card-title">${escapeHtml(cat.label)} :</div>
        <div class="tag-add-row">
          <input type="text" id="theme-input-${cat.key}" placeholder="New theme…">
          <button class="btn-primary" style="white-space:nowrap" type="button"
            onclick="ajouterTheme('${cat.key}')">
            <i class="bi bi-plus-lg"></i> Add
          </button>
        </div>
        <div class="tag-pills-wrap" id="theme-pills-${cat.key}">
          ${pills || '<span style="font-size:.8rem;color:var(--text-muted)">No themes.</span>'}
        </div>
      </div>`;
  }).join('');

  main.innerHTML = `
    <header class="view-header animate-in">
      <div>
        <h1 class="view-title">Edit Tables</h1>
        <p class="view-subtitle">Manage the platform themes and categories.</p>
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
  } catch (e) { alert('Error: ' + e.message); }
}

async function retirerTheme(categoryKey, theme) {
  try {
    await appelApi('/dashboard/admin/themes', 'DELETE', { category: categoryKey, theme });
    if (_themesData[categoryKey]) {
      _themesData[categoryKey] = _themesData[categoryKey].filter((t) => t !== theme);
    }
    rafraichirThemePills(categoryKey);
  } catch (e) { alert('Error: ' + e.message); }
}

function rafraichirThemePills(categoryKey) {
  const container = document.getElementById(`theme-pills-${categoryKey}`);
  if (!container) return;
  const tags = _themesData[categoryKey] || [];
  if (!tags.length) {
    container.innerHTML = '<span style="font-size:.8rem;color:var(--text-muted)">No themes.</span>';
    return;
  }
  container.innerHTML = tags.map((t) => `
    <span class="tag-pill">
      ${escapeHtml(t)}
      <button class="tag-remove" title="Remove" onclick="retirerTheme('${categoryKey}', '${escapeHtml(t)}')" type="button">
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
        <h1 class="view-title">Approve Meeters</h1>
        <p class="view-subtitle">Publisher role upgrade requests.</p>
      </div>
    </header>
    <div class="dash-loader"><div class="dash-spinner"></div><p>Loading…</p></div>`;

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
                  <i class="bi bi-check-lg"></i> Approve
                </button>
                <button type="button" class="btn-outline" style="padding:.35rem .9rem;font-size:.75rem;color:#dc2626;border-color:#dc2626"
                  data-action="reject" data-id="${u.id}">
                  <i class="bi bi-x-lg"></i> Reject
                </button>
              </div>
            </td>
          </tr>`).join('')
      : '<tr><td colspan="3" style="color:var(--text-muted);padding:2rem;text-align:center">No pending requests.</td></tr>';

    main.innerHTML = `
      <header class="view-header animate-in">
        <div>
          <h1 class="view-title">Approve Meeters</h1>
          <p class="view-subtitle">${demandes.length} pending request(s).</p>
        </div>
      </header>
      ${Card({
        classes: 'table-card animate-in',
        contenu: `
          <div class="dash-table-wrap">
            <table class="dash-table">
              <thead><tr><th>User</th><th>Registered on</th><th>Actions</th></tr></thead>
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
          alert('Error: ' + e.message);
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
    tbody.innerHTML = '<tr><td colspan="5" style="color:var(--text-muted);padding:1.5rem;text-align:center">No results.</td></tr>';
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
          <button type="button" class="icon-btn" title="View profile"
            onclick="adminOverviewVoir(${u.id})">
            <i class="bi bi-eye-fill"></i>
          </button>
          <button type="button" class="icon-btn" title="Edit role"
            onclick="adminOverviewEditer(${u.id})">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button type="button" class="icon-btn danger" title="Delete"
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
        <span><i class="bi bi-pencil-fill"></i> Edit role</span>
        <button class="admin-modal-close" id="ov-edit-close"><i class="bi bi-x-lg"></i></button>
      </div>
      <div class="admin-modal-field">
        <label>User</label>
        <input type="text" value="${escapeHtml((u.firstname || '') + ' ' + (u.lastname || ''))}" readonly>
      </div>
      <div class="admin-modal-field">
        <label>Current role</label>
        <select id="ov-edit-role-select">
          <option value="USER"      ${(u.role||'').toUpperCase()==='USER'      ?'selected':''}>User</option>
          <option value="PUBLISHER" ${(u.role||'').toUpperCase()==='PUBLISHER' ?'selected':''}>Meeter (Publisher)</option>
          <option value="ADMIN"     ${(u.role||'').toUpperCase()==='ADMIN'     ?'selected':''}>Admin</option>
        </select>
      </div>
      <div id="ov-edit-feedback"></div>
      <div class="admin-modal-actions">
        <button class="btn-outline" id="ov-edit-cancel">Cancel</button>
        <button class="btn-primary" id="ov-edit-save"><i class="bi bi-check-lg"></i> Save</button>
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
        <i class="bi bi-check-circle-fill"></i> Role updated.
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
  if (!confirm(`Delete user #${id}?`)) return;
  try {
    await appelApi(`/dashboard/admin/users/${id}`, 'DELETE');
    // Retirer du cache local
    const data = state.dashboardData || {};
    data.derniersUtilisateurs = (data.derniersUtilisateurs || []).filter((x) => x.id !== id);
    rafraichirTableau();
  } catch (err) {
    alert('Error: ' + err.message);
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
    ['Last name', 'First name', 'Email', 'Role', 'Status', 'Registered on'].join(';'),
    // Données utilisateurs
    ...users.map((u) => [
      u.lastname  || '',
      u.firstname || '',
      u.email     || '',
      (u.role     || '').toLowerCase(),
      u.enabled ? 'Active' : 'Inactive',
      formatDate(u.created_at),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')),
  ];

  // Ajouter un bloc KPI en fin de fichier
  lignesCSV.push('');
  lignesCSV.push('--- Statistics ---');
  lignesCSV.push(`"Total Revenue";"${formatPrix(kpi.revenu)}"`);
  lignesCSV.push(`"New Meeters (7d)";"${kpi.nouveauxUtilisateurs ?? 0}"`);
  lignesCSV.push(`"Reports";"${kpi.signalements ?? 0}"`);
  lignesCSV.push(`"Conversion rate";"${kpi.tauxConversion ?? 0} %"`);
  lignesCSV.push(`"Total users";"${kpi.totalUtilisateurs ?? 0}"`);

  const contenu = '﻿' + lignesCSV.join('\n'); // BOM UTF-8 pour Excel
  const blob    = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);

  const today = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
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
  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const lignesHTML = users.map((u) => `
    <tr>
      <td>${escapeHtml((u.lastname || '') + ' ' + (u.firstname || ''))}</td>
      <td>${escapeHtml(u.email || '')}</td>
      <td>${escapeHtml(u.role || '')}</td>
      <td>${u.enabled ? 'Active' : 'Inactive'}</td>
      <td>${formatDate(u.created_at)}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Admin Report — Meet&Do</title>
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
  <h1>📊 Admin report — Meet&amp;Do</h1>
  <div class="subtitle">Generated on ${today}</div>
  <div class="kpi-row">
    <div class="kpi-box"><div class="label">Total revenue</div><div class="val">${escapeHtml(formatPrix(kpi.revenu))}</div></div>
    <div class="kpi-box"><div class="label">New Meeters (7d)</div><div class="val">${kpi.nouveauxUtilisateurs ?? 0}</div></div>
    <div class="kpi-box"><div class="label">Reports</div><div class="val">${kpi.signalements ?? 0}</div></div>
    <div class="kpi-box"><div class="label">Conversion rate</div><div class="val">${kpi.tauxConversion ?? 0} %</div></div>
    <div class="kpi-box"><div class="label">Total users</div><div class="val">${kpi.totalUtilisateurs ?? 0}</div></div>
  </div>
  <h2>Recently registered users (${users.length})</h2>
  <table>
    <thead><tr><th>Full name</th><th>Email</th><th>Role</th><th>Status</th><th>Registered on</th></tr></thead>
    <tbody>${lignesHTML}</tbody>
  </table>
  <div class="footer">Meet&amp;Do — Confidential report — ${today}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow popups to generate the PDF.');
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
      { icone: '👥', label: 'New registrations',  val: inscriptions, couleur: '#d1fae5', couleurIcone: '#059669' },
      { icone: '📆', label: 'New bookings',       val: reservations, couleur: '#dbeafe', couleurIcone: '#2563eb' },
      { icone: '📢', label: 'Publisher requests', val: demandesEdit, couleur: '#ede9fe', couleurIcone: '#7c3aed' },
    ];

    container.innerHTML = `
      <div class="glass-card mb-6 animate-in">
        <div class="card-title" style="margin-bottom:1rem">
          <i class="bi bi-activity" style="color:var(--accent)"></i> Activity in the last 24h
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
    alert('No bookings to export.');
    return;
  }

  const lignesCSV = [
    ['Activity', 'Date', 'Persons', 'Revenue', 'Customer review'].join(';'),
    ...items.map((r) => {
      const act   = r.event?.activity || {};
      const dateR = r.date ? new Date(r.date).toLocaleDateString('en-US') : '—';
      const revenu = (act.price ?? 0) * (r.group_size ?? 1);
      const avis  = r.user_rating === 'like'      ? 'Loved'
                  : r.user_rating === 'recommend' ? 'Recommended'
                  : r.user_rating === 'dislike'   ? 'Not liked'
                  : '';
      return [act.title || '—', dateR, String(r.group_size ?? 1), formatPrix(revenu), avis]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';');
    }),
  ];

  const revenuTotal = items.reduce((s, r) => s + (r.event?.activity?.price ?? 0) * (r.group_size ?? 1), 0);
  lignesCSV.push('');
  lignesCSV.push(`"Total revenue";"${escapeHtml(formatPrix(revenuTotal))}"`);
  lignesCSV.push(`"Number of bookings";"${items.length}"`);

  const contenu = '﻿' + lignesCSV.join('\n');
  const blob    = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const today   = new Date().toLocaleDateString('en-US').replace(/\//g, '-');
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
        <div class="notif-toast-title">New booking!</div>
        <div class="notif-toast-body">${nb} new booking(s) received.</div>
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
        compteResa.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">No bookings.</p>';
        return;
      }
      const now = new Date();
      const items = reservations.map((r) => {
        const a = r.event?.activity || {};
        const dateVal = r.date || r.event?.date;
        const d = dateVal ? new Date(dateVal) : null;
        const isPast = d ? d < now : false;
        const jour   = d ? d.getDate() : '—';
        const mois   = d ? d.toLocaleString('en-US', { month: 'short' }).toUpperCase() : '';
        return `
          <div class="resa-item ${isPast ? 'past' : ''}">
            <div class="resa-item-date">
              <span class="resa-item-day">${jour}</span>
              <span class="resa-item-month">${mois}</span>
            </div>
            <div class="resa-item-info">
              <div class="resa-item-title">${escapeHtml(a.title || 'Activity')}</div>
              <div class="resa-item-meta">
                <i class="bi bi-people-fill" style="color:var(--accent)"></i> ${r.group_size ?? 1} ppl.
                ${a.address ? `· ${escapeHtml(a.address)}` : ''}
              </div>
            </div>
            ${isPast
              ? '<span class="badge-status badge-inactif" style="font-size:.7rem">Past</span>'
              : '<span class="badge-status badge-actif" style="font-size:.7rem">Upcoming</span>'}
          </div>`;
      }).join('');
      compteResa.innerHTML = `<div class="resa-list">${items}</div>`;
    }).catch(() => {
      compteResa.innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">Failed to load bookings.</p>';
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
      btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving…';
      try {
        const updated = await appelApi('/user/me', 'PATCH', data);
        state.profil = { ...state.profil, ...updated };
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#d1fae5;color:#065f46;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-check-circle-fill"></i> Changes saved successfully.
        </div>`;
        renderSidebar();
      } catch (err) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> Error: ${err.message}
        </div>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Save changes';
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
      feedback.innerHTML = '<span style="color:var(--text-muted)">Uploading…</span>';
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const res = await fetch('http://localhost:3000/user/me/avatar', {
          method: 'POST', credentials: 'include', body: formData,
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Erreur'); }
        const result = await res.json();
        state.profil = { ...state.profil, avatar_url: result.avatar_url };
        feedback.innerHTML = '<span style="color:#059669;font-weight:600"><i class="bi bi-check-circle-fill"></i> Photo updated!</span>';
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
          <i class="bi bi-exclamation-circle-fill"></i> Please fill in all fields.
        </div>`; return;
      }
      if (newPassword !== confirmPassword) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> New passwords do not match.
        </div>`; return;
      }
      if (newPassword.length < 6) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> Password must be at least 6 characters.
        </div>`; return;
      }
      const btn = formPwd.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating…';
      try {
        await appelApi('/user/me/password', 'PATCH', { currentPassword, newPassword });
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#d1fae5;color:#065f46;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-check-circle-fill"></i> Password changed successfully.
        </div>`;
        formPwd.reset();
      } catch (err) {
        feedback.innerHTML = `<div style="padding:.6rem 1rem;background:#fee2e2;color:#991b1b;border-radius:.75rem;font-size:.83rem;font-weight:600">
          <i class="bi bi-exclamation-circle-fill"></i> ${err.message}
        </div>`;
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-shield-lock-fill"></i> Update password';
      }
    });
  }

  // Demande éditeur
  const btnReq = document.getElementById('btn-request-publisher');
  if (btnReq) {
    btnReq.addEventListener('click', async () => {
      btnReq.disabled = true;
      btnReq.innerHTML = '<i class="bi bi-hourglass-split"></i> Sending…';
      try {
        await appelApi('/user/request-publisher', 'POST');
        state.profil = { ...state.profil, publisher_request: true };
        setOnglet('account');
      } catch (err) {
        btnReq.disabled = false;
        btnReq.innerHTML = '<i class="bi bi-send-fill"></i> Send my request';
        alert('Error: ' + err.message);
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
