const state = {};

function creerEtat(cle, valeurInitiale) {
  if (!(cle in state)) state[cle] = valeurInitiale;
  const getValeur = () => state[cle];
  const setValeur = (nouvelleValeur) => {
    state[cle] = nouvelleValeur;
    renderDashboard();
  };
  return [getValeur, setValeur];
}

const [getRole, setRole] = creerEtat('role', 'admin');
const [getOnglet, setOnglet] = creerEtat('onglet', 'overview');
const [getRecherche, setRecherche] = creerEtat('recherche', '');
const [getFiltreStatut, setFiltreStatut] = creerEtat('filtreStatut', 'tous');

const MENUS = {
  admin: [
    { id: 'overview', label: "Vue d'ensemble" },
    { id: 'users', label: 'Gestion Utilisateurs' },
    { id: 'support', label: 'Messagerie Support' },
    { id: 'reports', label: 'Signalements' },
    { id: 'validation', label: 'Validation Meeters' },
    { id: 'settings', label: 'Parametres' },
  ],
  user: [
    { id: 'overview', label: 'Mon Dashboard' },
    { id: 'explore', label: 'Explorer (Recherche)' },
    { id: 'activities', label: 'Mes Activites (Calendrier)' },
    { id: 'messages', label: 'Messagerie' },
    { id: 'favorites', label: 'Favoris' },
    { id: 'account', label: 'Mon Compte' },
  ],
  publisher: [
    { id: 'overview', label: 'Mon Dashboard Meeter' },
    { id: 'publish', label: 'Publier une Activite' },
    { id: 'annonces', label: 'Mes Annonces' },
    { id: 'bookings', label: 'Reservations recues' },
    { id: 'messages', label: 'Messagerie' },
    { id: 'account', label: 'Mon Compte' },
  ],
};

const UTILISATEURS = [
  { nom: 'Amine Loucif', email: 'amine@meetdo.fr', role: 'Meeter', statut: 'Actif' },
  { nom: 'Sonia Renaud', email: 'sonia@meetdo.fr', role: 'Client', statut: 'En attente' },
  { nom: 'Thomas Benarfa', email: 'thomas@meetdo.fr', role: 'Client', statut: 'Bloque' },
  { nom: 'Lina Seguin', email: 'lina@meetdo.fr', role: 'Meeter', statut: 'Actif' },
];

function injectLayoutGlobal() {
  const navRoot = document.getElementById('navbar-root');
  if (navRoot && typeof Navbar === 'function') navRoot.innerHTML = Navbar();

  const footerRoot = document.getElementById('footer-root');
  if (footerRoot && typeof Footer === 'function') footerRoot.innerHTML = Footer('..');
}

function Button({ label, variant = 'primary', action = '', classes = '' }) {
  const variantClass = variant === 'soft' ? 'button-soft' : 'button-primary';
  return `<button class="button ${variantClass} ${classes}" data-action="${action}" type="button">${label}</button>`;
}

function Card({ titre = '', contenu = '', classes = '' }) {
  return `
    <article class="card ${classes} animate-in fade-in duration-500">
      ${titre ? `<h3>${titre}</h3>` : ''}
      ${contenu}
    </article>
  `;
}

function getTitreRole(role) {
  if (role === 'admin') return 'Espace Administrateur';
  if (role === 'publisher') return 'Espace Client Editeur';
  return 'Espace Utilisateur';
}

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const role = getRole();
  const onglet = getOnglet();
  const items = MENUS[role] || [];

  sidebar.innerHTML = `
    <div class="brand">
      <div class="brand-logo">M</div>
      <div>
        <p class="brand-title">MEET & DO</p>
        <p class="brand-sub">${getTitreRole(role)}</p>
      </div>
    </div>

    <label class="menu-title" for="role-select">Role de demonstration</label>
    <select id="role-select" class="role-select">
      <option value="admin" ${role === 'admin' ? 'selected' : ''}>Administrateur</option>
      <option value="user" ${role === 'user' ? 'selected' : ''}>Utilisateur</option>
      <option value="publisher" ${role === 'publisher' ? 'selected' : ''}>Client editeur d'annonces</option>
    </select>

    <p class="menu-title">Navigation</p>
    <ul class="menu-list">
      ${items
        .map(
          (item) => `
            <li>
              <button class="menu-btn ${item.id === onglet ? 'active' : ''}" data-tab="${item.id}">
                ${item.label}
              </button>
            </li>
          `,
        )
        .join('')}
    </ul>
  `;
}

// Rafraîchit uniquement le tbody du tableau sans reconstruire tout le DOM
function rafraichirTableauUtilisateurs() {
  const tbody = document.querySelector('#dashboard-content table tbody');
  if (!tbody) return;

  const recherche = (state.recherche || '').toLowerCase();
  const filtreStatut = state.filtreStatut || 'tous';

  const lignes = UTILISATEURS.filter((u) => {
    const okRecherche = `${u.nom} ${u.email}`.toLowerCase().includes(recherche);
    const okStatut = filtreStatut === 'tous' || u.statut === filtreStatut;
    return okRecherche && okStatut;
  });

  tbody.innerHTML = lignes
    .map(
      (u) => `
        <tr>
          <td>${u.nom}</td>
          <td>${u.email}</td>
          <td>${u.role}</td>
          <td><span class="badge ${badgeClass(u.statut)}">${u.statut}</span></td>
        </tr>`,
    )
    .join('');
}

function badgeClass(statut) {
  const s = statut.toLowerCase();
  if (s === 'actif') return 'badge-actif';
  if (s === 'en attente') return 'badge-attente';
  if (s === 'confirme') return 'badge-confirme';
  return 'badge-bloque';
}

function renderAdminView() {
  const onglet = getOnglet();
  const recherche = getRecherche().toLowerCase();
  const filtreStatut = getFiltreStatut();
  const lignes = UTILISATEURS.filter((u) => {
    const okRecherche = `${u.nom} ${u.email}`.toLowerCase().includes(recherche);
    const okStatut = filtreStatut === 'tous' || u.statut === filtreStatut;
    return okRecherche && okStatut;
  });

  if (onglet !== 'overview' && onglet !== 'users') {
    return `
      <header class="view-header animate-in fade-in duration-500">
        <div>
          <h1 class="view-title">${MENUS.admin.find((m) => m.id === onglet)?.label || 'Espace Admin'}</h1>
          <p class="view-subtitle">Module administrateur en preparation.</p>
        </div>
      </header>
      ${Card({
        contenu: `
          <p>Cette section est prete a etre branchee a l'API pour gerer vos donnees reelles.</p>
          ${Button({ label: 'Configurer ce module', variant: 'soft' })}
        `,
      })}
    `;
  }

  const blocUtilisateurs = Card({
    titre: 'Liste des utilisateurs',
    contenu: `
      <div class="table-tools">
        <input id="user-search" class="input" placeholder="Rechercher un utilisateur..." value="${getRecherche()}" />
        <select id="status-filter" class="select">
          <option value="tous" ${getFiltreStatut() === 'tous' ? 'selected' : ''}>Tous les statuts</option>
          <option value="Actif" ${getFiltreStatut() === 'Actif' ? 'selected' : ''}>Actif</option>
          <option value="En attente" ${getFiltreStatut() === 'En attente' ? 'selected' : ''}>En attente</option>
          <option value="Bloque" ${getFiltreStatut() === 'Bloque' ? 'selected' : ''}>Bloque</option>
        </select>
      </div>
      <div style="overflow:auto;">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Role</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${lignes
              .map(
                (u) => `
                  <tr>
                    <td>${u.nom}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                    <td><span class="badge ${badgeClass(u.statut)}">${u.statut}</span></td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `,
  });

  if (onglet === 'users') {
    return `
      <header class="view-header animate-in fade-in duration-500">
        <div>
          <h1 class="view-title">Gestion Utilisateurs</h1>
          <p class="view-subtitle">Filtrez et surveillez les comptes de la plateforme.</p>
        </div>
      </header>
      ${blocUtilisateurs}
    `;
  }

  return `
    <header class="view-header animate-in fade-in duration-500">
      <div>
        <h1 class="view-title">Dashboard Administrateur</h1>
        <p class="view-subtitle">Pilotage global de la plateforme en temps reel.</p>
      </div>
      ${Button({ label: 'Exporter le rapport', variant: 'primary' })}
    </header>

    <section class="kpi-grid">
      ${Card({
        classes: 'kpi-card',
        contenu: `
          <div class="kpi-icon">€</div>
          <p class="kpi-title">Revenu</p>
          <p class="kpi-value">24 890 €</p>
          <p class="kpi-trend">+12% vs semaine derniere</p>
        `,
      })}
      ${Card({
        classes: 'kpi-card',
        contenu: `
          <div class="kpi-icon">👤</div>
          <p class="kpi-title">Nouveaux Meeters</p>
          <p class="kpi-value">134</p>
          <p class="kpi-trend">+8% cette semaine</p>
        `,
      })}
      ${Card({
        classes: 'kpi-card',
        contenu: `
          <div class="kpi-icon">⚑</div>
          <p class="kpi-title">Signalements</p>
          <p class="kpi-value">18</p>
          <p class="kpi-trend">-5% en 7 jours</p>
        `,
      })}
      ${Card({
        classes: 'kpi-card',
        contenu: `
          <div class="kpi-icon">↗</div>
          <p class="kpi-title">Taux de conversion</p>
          <p class="kpi-value">6,7%</p>
          <p class="kpi-trend">+0,9 point</p>
        `,
      })}
    </section>

    ${Card({
      classes: 'chart-card',
      titre: 'Flux de trafic hebdomadaire',
      contenu: `
        <svg viewBox="0 0 800 220" role="img" aria-label="Courbe du trafic hebdomadaire">
          <defs>
            <linearGradient id="gradAdmin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2563eb" stop-opacity="0.45"></stop>
              <stop offset="100%" stop-color="#2563eb" stop-opacity="0.04"></stop>
            </linearGradient>
          </defs>
          <polyline points="0,170 100,140 200,150 300,110 400,118 500,88 600,70 700,85 800,62 800,220 0,220"
                    fill="url(#gradAdmin)" stroke="none"></polyline>
          <polyline points="0,170 100,140 200,150 300,110 400,118 500,88 600,70 700,85 800,62"
                    fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round"></polyline>
        </svg>
        <div class="axis-labels">
          <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span>
        </div>
      `,
    })}

    ${blocUtilisateurs}
  `;
}

function renderUserLikeView(role) {
  const onglet = getOnglet();
  const titre = role === 'publisher' ? 'Dashboard Client Editeur' : 'Dashboard Utilisateur';
  const sousTitre = role === 'publisher'
    ? "Suivez vos annonces et vos reservations en un coup d'oeil."
    : 'Votre espace personnel pour preparer vos prochaines activites.';

  if (onglet !== 'overview') {
    const menuRole = MENUS[role] || [];
    return `
      <header class="view-header animate-in fade-in duration-500">
        <div>
          <h1 class="view-title">${menuRole.find((m) => m.id === onglet)?.label || 'Section'}</h1>
          <p class="view-subtitle">Vue dediee ${role === 'publisher' ? 'au client editeur' : "a l'utilisateur"}.</p>
        </div>
      </header>
      ${Card({
        contenu: `
          <p>Cette section est prete pour integrer les donnees metier (API, actions, filtres avances).</p>
          ${Button({ label: 'Continuer', variant: 'soft' })}
        `,
      })}
    `;
  }

  const sectionPublisher = role === 'publisher'
    ? Card({
        titre: 'Statistiques de publication',
        contenu: `
          <div class="kpi-grid">
            <div class="card"><p class="kpi-title">Annonces actives</p><p class="kpi-value">7</p></div>
            <div class="card"><p class="kpi-title">Reservations recues</p><p class="kpi-value">42</p></div>
            <div class="card"><p class="kpi-title">Taux de reponse</p><p class="kpi-value">94%</p></div>
            <div class="card"><p class="kpi-title">Revenus du mois</p><p class="kpi-value">1 280 €</p></div>
          </div>
        `,
      })
    : '';

  return `
    <header class="view-header animate-in fade-in duration-500">
      <div>
        <h1 class="view-title">${titre}</h1>
        <p class="view-subtitle">${sousTitre}</p>
      </div>
      ${Button({ label: role === 'publisher' ? 'Publier une annonce' : 'Explorer', variant: 'primary' })}
    </header>

    ${Card({
      classes: 'profile-card',
      contenu: `
        <div class="profile-row">
          <div class="profile-identity">
            <div class="profile-avatar">AL</div>
            <div>
              <h3 style="margin:0;">Alice Lemoine</h3>
              <p style="margin:0.2rem 0 0;">2 450 points fidelite</p>
            </div>
          </div>
          <span class="profile-badge">Verifie</span>
        </div>
      `,
    })}

    ${Card({
      titre: 'Prochaines sessions',
      contenu: `
        <div class="sessions-list">
          <div class="session-item">
            <div><strong>Randonnee Vallee Verte</strong><div class="session-meta">22 avril - Annecy</div></div>
            <span class="badge badge-confirme">Confirme</span>
          </div>
          <div class="session-item">
            <div><strong>Atelier photo urbaine</strong><div class="session-meta">25 avril - Lyon</div></div>
            <span class="badge badge-attente">En attente</span>
          </div>
          <div class="session-item">
            <div><strong>Yoga au lever du soleil</strong><div class="session-meta">27 avril - Marseille</div></div>
            <span class="badge badge-confirme">Confirme</span>
          </div>
        </div>
      `,
    })}

    ${Card({
      titre: 'Suggere pour vous',
      contenu: `
        <div class="suggest-grid">
          <article class="card">
            <div class="suggest-img"></div>
            <p class="suggest-title">Escape game exterieur</p>
            <p class="suggest-meta">25 € · <span class="rating">★★★★★</span></p>
            ${Button({ label: 'Reserver', variant: 'soft' })}
          </article>
          <article class="card">
            <div class="suggest-img"></div>
            <p class="suggest-title">Session surf debutant</p>
            <p class="suggest-meta">39 € · <span class="rating">★★★★☆</span></p>
            ${Button({ label: 'Reserver', variant: 'soft' })}
          </article>
          <article class="card">
            <div class="suggest-img"></div>
            <p class="suggest-title">Brunch networking</p>
            <p class="suggest-meta">18 € · <span class="rating">★★★★★</span></p>
            ${Button({ label: 'Reserver', variant: 'soft' })}
          </article>
        </div>
      `,
    })}

    ${sectionPublisher}
  `;
}

function renderDashboard() {
  document.body.setAttribute('data-role', getRole());
  renderSidebar();

  const content = document.getElementById('dashboard-content');
  const role = getRole();
  const vue = role === 'admin' ? renderAdminView() : renderUserLikeView(role);
  content.innerHTML = vue;

  bindInteractions();
}

function bindInteractions() {
  const roleSelect = document.getElementById('role-select');
  if (roleSelect) {
    roleSelect.addEventListener('change', (event) => {
      const nouveauRole = event.target.value;
      // Mise à jour groupée pour n'avoir qu'un seul re-render
      state.role = nouveauRole;
      state.onglet = MENUS[nouveauRole][0]?.id || 'overview';
      state.recherche = '';
      state.filtreStatut = 'tous';
      renderDashboard();
    });
  }

  document.querySelectorAll('.menu-btn[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setOnglet(btn.dataset.tab);
      closeMobileSidebar();
    });
  });

  const search = document.getElementById('user-search');
  if (search) {
    search.addEventListener('input', (event) => {
      // Mise à jour silencieuse du state sans re-render complet
      state.recherche = event.target.value;
      rafraichirTableauUtilisateurs();
    });
  }

  const filter = document.getElementById('status-filter');
  if (filter) {
    filter.addEventListener('change', (event) => {
      state.filtreStatut = event.target.value;
      rafraichirTableauUtilisateurs();
    });
  }
}

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  const overlay = document.getElementById('mobile-overlay');
  if (overlay) overlay.hidden = false;
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  const overlay = document.getElementById('mobile-overlay');
  if (overlay) overlay.hidden = true;
}

function bindMobileMenu() {
  document.getElementById('mobile-menu-btn')?.addEventListener('click', openMobileSidebar);
  document.getElementById('mobile-overlay')?.addEventListener('click', closeMobileSidebar);
}

document.addEventListener('DOMContentLoaded', () => {
  injectLayoutGlobal();
  bindMobileMenu();
  renderDashboard();
});
