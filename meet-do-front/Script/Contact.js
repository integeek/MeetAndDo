/* =====================================================================
   Contact.js — MeetAndDo
   Gestion complète de la page Contact Us :
   - Formulaire multi-étapes avec validation temps réel
   - Auto-sauvegarde brouillon (localStorage)
   - Suggestions FAQ dynamiques pendant la saisie
   - Onglets : Formulaire / FAQ / Historique
   - Copie email presse-papier
   - Indicateur statut bureau ouvert/fermé
   - Toast notifications
   - Export historique
   ===================================================================== */

const API_URL = 'http://localhost:3000';
const DRAFT_KEY = 'contact_draft';
const HISTORY_KEY = 'contact_history';
const DRAFT_DEBOUNCE_MS = 800;

/* =====================================================================
   ÉTAT GLOBAL
   ===================================================================== */

let _faqData = [];
let _faqLoaded = false;
let _submitEnCours = false;
let _draftTimer = null;
let _toastTimer = null;
let _activeTab = 'form';

/* =====================================================================
   INITIALISATION
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initialiserStatutBureau();
  restaurerBrouillon();
  initialiserCompteurs();
  initialiserNavbarUser();

});

function initialiserNavbarUser() {
  try {
    const raw = localStorage.getItem('AUTH_USER_STORAGE_KEY');
    if (!raw) return;
    const user = JSON.parse(raw);
    if (user && user.email) {
      const emailInput = document.getElementById('contact-email');
      const nomInput   = document.getElementById('contact-nom');
      if (emailInput && !emailInput.value) {
        emailInput.value = user.email;
        validerChamp('email');
      }
      if (nomInput && !nomInput.value && user.firstName) {
        nomInput.value = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        validerChamp('nom');
      }
    }
  } catch (_) {}
}

/* =====================================================================
   STATUT BUREAU OUVERT / FERMÉ
   ===================================================================== */

function initialiserStatutBureau() {
  const el = document.getElementById('statut-ouvert');
  if (!el) return;

  const now    = new Date();
  const jour   = now.getDay();
  const heure  = now.getHours();
  const minute = now.getMinutes();
  const tempsDecimal = heure + minute / 60;

  const estSemaine = jour >= 1 && jour <= 5;
  const estHoraires = tempsDecimal >= 9 && tempsDecimal < 18;
  const estOuvert = estSemaine && estHoraires;

  el.textContent = estOuvert ? '● Ouvert maintenant' : '● Fermé actuellement';
  el.classList.add(estOuvert ? 'ouvert' : 'ferme');
}

/* =====================================================================
   GESTION DES ONGLETS
   ===================================================================== */

function switchTab(tab) {
  _activeTab = tab;

  document.querySelectorAll('.contact-tab').forEach(btn => {
    const isActive = btn.id === `tab-${tab}`;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  document.querySelectorAll('.tab-content').forEach(div => {
    div.classList.remove('tab-content--active');
  });

  const content = document.getElementById(`tab-content-${tab}`);
  if (content) content.classList.add('tab-content--active');

  if (tab === 'history') {
    afficherHistorique();
  }
}

/* =====================================================================
   VALIDATION TEMPS RÉEL
   ===================================================================== */

const REGLES = {
  nom: {
    required: true,
    minLength: 2,
    maxLength: 100,
    messages: {
      required: 'Le nom est obligatoire.',
      minLength: 'Le nom doit contenir au moins 2 caractères.',
      maxLength: 'Le nom ne peut pas dépasser 100 caractères.',
    },
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    maxLength: 255,
    messages: {
      required: "L'email est obligatoire.",
      pattern: "L'adresse email n'est pas valide.",
      maxLength: "L'email ne peut pas dépasser 255 caractères.",
    },
  },
  telephone: {
    required: false,
    pattern: /^[+\d\s\-().]{7,20}$/,
    messages: {
      pattern: 'Le numéro de téléphone n\'est pas valide.',
    },
  },
  categorie: {
    required: true,
    messages: {
      required: 'Veuillez choisir une catégorie.',
    },
  },
  sujet: {
    required: true,
    minLength: 5,
    maxLength: 200,
    messages: {
      required: 'Le sujet est obligatoire.',
      minLength: 'Le sujet doit contenir au moins 5 caractères.',
      maxLength: 'Le sujet ne peut pas dépasser 200 caractères.',
    },
  },
  message: {
    required: true,
    minLength: 20,
    maxLength: 2000,
    messages: {
      required: 'Le message est obligatoire.',
      minLength: 'Le message doit contenir au moins 20 caractères.',
      maxLength: 'Le message ne peut pas dépasser 2000 caractères.',
    },
  },
  consent: {
    required: true,
    messages: {
      required: 'Vous devez accepter les conditions pour envoyer votre message.',
    },
  },
};

function validerChamp(champ) {
  const regle = REGLES[champ];
  if (!regle) return true;

  let valeur;
  let el;

  if (champ === 'consent') {
    el = document.getElementById('contact-consent');
    valeur = el ? el.checked : false;
  } else {
    el = document.getElementById(`contact-${champ}`);
    valeur = el ? el.value.trim() : '';
  }

  const fieldEl = document.getElementById(`field-${champ}`);
  const errorEl = document.getElementById(`error-${champ}`);

  if (!fieldEl || !errorEl) return true;

  let erreur = '';

  if (regle.required && (valeur === '' || valeur === false)) {
    erreur = regle.messages.required;
  } else if (valeur !== '' && valeur !== false) {
    if (regle.minLength && typeof valeur === 'string' && valeur.length < regle.minLength) {
      erreur = regle.messages.minLength;
    } else if (regle.maxLength && typeof valeur === 'string' && valeur.length > regle.maxLength) {
      erreur = regle.messages.maxLength;
    } else if (regle.pattern && typeof valeur === 'string' && !regle.pattern.test(valeur)) {
      erreur = regle.messages.pattern;
    }
  }

  if (erreur) {
    fieldEl.classList.remove('field-valid');
    fieldEl.classList.add('field-invalid');
    errorEl.textContent = erreur;
  } else if (valeur !== '' && valeur !== false) {
    fieldEl.classList.remove('field-invalid');
    fieldEl.classList.add('field-valid');
    errorEl.textContent = '';
  } else {
    fieldEl.classList.remove('field-valid', 'field-invalid');
    errorEl.textContent = '';
  }

  programmeSauvegardeBrouillon();
  return erreur === '';
}

function validerTout() {
  const champs = ['nom', 'email', 'categorie', 'sujet', 'message', 'consent'];
  if (document.getElementById('contact-telephone')?.value.trim()) {
    champs.splice(2, 0, 'telephone');
  }
  const resultats = champs.map(c => validerChamp(c));
  return resultats.every(Boolean);
}

/* =====================================================================
   COMPTEURS DE CARACTÈRES
   ===================================================================== */

function initialiserCompteurs() {
  const sujetInput = document.getElementById('contact-sujet');
  const msgInput   = document.getElementById('contact-message');

  if (sujetInput) {
    sujetInput.addEventListener('input', () => majCompteur('sujet', sujetInput.value.length, 200));
  }
  if (msgInput) {
    msgInput.addEventListener('input', () => majCompteur('message', msgInput.value.length, 2000));
  }
}

function majCompteur(champ, longueur, max) {
  const el = document.getElementById(`counter-${champ}`);
  if (!el) return;
  el.textContent = longueur;
  const wrapper = el.closest('.char-counter');
  if (wrapper) {
    wrapper.classList.toggle('warn', longueur > max * 0.9);
  }
}

function updateCharCounter() {
  const msg = document.getElementById('contact-message');
  if (msg) majCompteur('message', msg.value.length, 2000);
}

/* =====================================================================
   CATÉGORIE — AIDE CONTEXTUELLE
   ===================================================================== */

const AIDE_CATEGORIE = {
  compte: {
    texte: '💡 Pour les problèmes de connexion, essayez d\'abord "Mot de passe oublié". Pour supprimer votre compte, contactez-nous depuis l\'email associé.',
  },
  reservation: {
    texte: '💡 Précisez l\'identifiant de votre réservation (visible dans Mon Compte → Mes réservations) pour une réponse plus rapide.',
  },
  paiement: {
    texte: '💡 Pour les remboursements, les délais sont de 5 à 10 jours ouvrés selon votre banque. Précisez la date et le montant de la transaction.',
  },
  technique: {
    texte: '💡 Précisez votre navigateur (Chrome, Firefox…), votre système d\'exploitation, et décrivez les étapes pour reproduire le problème.',
  },
  signalement: {
    texte: '⚠️ Pour les signalements urgents, sélectionnez la priorité "Urgente". Précisez l\'identifiant de l\'activité ou de l\'utilisateur concerné.',
  },
  activite: {
    texte: '💡 Vous souhaitez devenir publisher ? Indiquez-le dans votre message avec votre ville et le type d\'activités que vous proposez.',
  },
};

function onCategorieChange() {
  validerChamp('categorie');
  const valeur    = document.getElementById('contact-categorie')?.value;
  const helperEl  = document.getElementById('categorie-helper');
  if (!helperEl) return;

  const aide = AIDE_CATEGORIE[valeur];
  if (aide) {
    helperEl.textContent = aide.texte;
    helperEl.classList.remove('hidden');
  } else {
    helperEl.classList.add('hidden');
  }
}

/* =====================================================================
   SUGGESTIONS FAQ DYNAMIQUES (pendant la saisie du sujet)
   ===================================================================== */

let _faqSuggestTimer = null;

async function rechercherFaq() {
  const sujet = document.getElementById('contact-sujet')?.value.trim();
  const suggestEl = document.getElementById('faq-suggestions');
  if (!suggestEl) return;

  if (!sujet || sujet.length < 3) {
    suggestEl.classList.add('hidden');
    return;
  }

  clearTimeout(_faqSuggestTimer);
  _faqSuggestTimer = setTimeout(async () => {
    const data = await obtenirFaqData();
    const mots = sujet.toLowerCase().split(/\s+/).filter(m => m.length > 2);

    const resultats = data.filter(item => {
      const question = (item.question || '').toLowerCase();
      const answer   = (item.answer || '').toLowerCase();
      return mots.some(mot => question.includes(mot) || answer.includes(mot));
    }).slice(0, 3);

    if (resultats.length === 0) {
      suggestEl.classList.add('hidden');
      return;
    }

    suggestEl.innerHTML = `
      <div class="faq-suggestion-title">💡 Peut-être que la FAQ répond à votre question :</div>
      ${resultats.map(r => `
        <div class="faq-suggestion-item" onclick="ouvrirFaqSuggestion(${r.id})" role="button" tabindex="0">
          <span class="faq-suggestion-icon">❓</span>
          <div>
            <strong>${echapper(r.question)}</strong>
            <span>${tronquer(r.answer, 90)}</span>
          </div>
        </div>
      `).join('')}
    `;
    suggestEl.classList.remove('hidden');
  }, 300);
}

function ouvrirFaqSuggestion(id) {
  switchTab('faq');
  setTimeout(() => {
    const item = document.getElementById(`faq-item-${id}`);
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item.classList.add('open');
    }
  }, 150);
}

/* =====================================================================
   ONGLET FAQ
   ===================================================================== */

async function chargerFaqTab() {
  const container = document.getElementById('faq-tab-container');
  if (!container) return;

  container.innerHTML = '<div class="faq-loader">Chargement de la FAQ...</div>';

  try {
    const data = await obtenirFaqData();
    _faqLoaded = true;

    if (data.length === 0) {
      container.innerHTML = '<div class="faq-empty">Aucune question disponible pour le moment.</div>';
      return;
    }

    afficherFaqItems(container, data);
  } catch (err) {
    container.innerHTML = '<div class="faq-empty">Impossible de charger la FAQ. Réessayez plus tard.</div>';
  }
}

function afficherFaqItems(container, items) {
  container.innerHTML = items.map(item => `
    <div class="faq-item-card" id="faq-item-${item.id}">
      <button type="button" class="faq-item-btn" onclick="toggleFaqItem(${item.id})" aria-expanded="false">
        <span class="faq-item-q">${echapper(item.question)}</span>
        <span class="faq-item-icon" aria-hidden="true">▾</span>
      </button>
      <div class="faq-item-panel" id="faq-panel-${item.id}" role="region">
        <div class="faq-item-a">${echapper(item.answer)}</div>
      </div>
    </div>
  `).join('');
}

function toggleFaqItem(id) {
  const item = document.getElementById(`faq-item-${id}`);
  if (!item) return;
  const isOpen = item.classList.contains('open');

  document.querySelectorAll('.faq-item-card.open').forEach(el => {
    el.classList.remove('open');
    const btn = el.querySelector('.faq-item-btn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  if (!isOpen) {
    item.classList.add('open');
    const btn = item.querySelector('.faq-item-btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
}

function rechercherFaqTab() {
  const query     = (document.getElementById('faq-search-input')?.value || '').toLowerCase().trim();
  const container = document.getElementById('faq-tab-container');
  if (!container) return;

  if (query.length === 0) {
    afficherFaqItems(container, _faqData);
    return;
  }

  const resultats = _faqData.filter(item => {
    return (item.question || '').toLowerCase().includes(query) ||
           (item.answer   || '').toLowerCase().includes(query);
  });

  if (resultats.length === 0) {
    container.innerHTML = `<div class="faq-empty">Aucun résultat pour "<strong>${echapper(query)}</strong>".<br>Utilisez le formulaire pour poser votre question.</div>`;
    return;
  }

  afficherFaqItems(container, resultats);
}

async function obtenirFaqData() {
  if (_faqData.length > 0) return _faqData;
  try {
    const res = await fetch(`${API_URL}/faq`);
    if (!res.ok) throw new Error('Erreur réseau');
    _faqData = await res.json();
    return _faqData;
  } catch (_) {
    return [];
  }
}

/* =====================================================================
   BROUILLON (AUTO-SAVE)
   ===================================================================== */

function programmeSauvegardeBrouillon() {
  clearTimeout(_draftTimer);
  _draftTimer = setTimeout(sauvegarderBrouillon, DRAFT_DEBOUNCE_MS);
}

function sauvegarderBrouillon() {
  const brouillon = lireBrouillonDepuisForm();
  const estVide   = !brouillon.nom && !brouillon.email && !brouillon.sujet && !brouillon.message;
  if (estVide) return;

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...brouillon, savedAt: Date.now() }));
    afficherIndicateurBrouillon(true);
    afficherToast('Brouillon sauvegardé', 'info', 1800);
  } catch (_) {}
}

function lireBrouillonDepuisForm() {
  return {
    nom:       document.getElementById('contact-nom')?.value || '',
    email:     document.getElementById('contact-email')?.value || '',
    telephone: document.getElementById('contact-telephone')?.value || '',
    categorie: document.getElementById('contact-categorie')?.value || '',
    priorite:  document.querySelector('input[name="priorite"]:checked')?.value || 'normale',
    sujet:     document.getElementById('contact-sujet')?.value || '',
    message:   document.getElementById('contact-message')?.value || '',
  };
}

function restaurerBrouillon() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const brouillon = JSON.parse(raw);
    if (!brouillon) return;

    const age = Date.now() - (brouillon.savedAt || 0);
    if (age > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }

    remplirChamp('contact-nom',       brouillon.nom);
    remplirChamp('contact-email',     brouillon.email);
    remplirChamp('contact-telephone', brouillon.telephone);
    remplirChamp('contact-sujet',     brouillon.sujet);
    remplirChamp('contact-message',   brouillon.message);

    if (brouillon.categorie) {
      const sel = document.getElementById('contact-categorie');
      if (sel) { sel.value = brouillon.categorie; onCategorieChange(); }
    }

    if (brouillon.priorite) {
      const radio = document.querySelector(`input[name="priorite"][value="${brouillon.priorite}"]`);
      if (radio) radio.checked = true;
    }

    ['nom', 'email', 'telephone', 'categorie', 'sujet', 'message'].forEach(champ => {
      const el = document.getElementById(`contact-${champ}`);
      if (el && el.value) validerChamp(champ);
    });

    majCompteur('sujet',   (brouillon.sujet   || '').length, 200);
    majCompteur('message', (brouillon.message || '').length, 2000);

    afficherIndicateurBrouillon(true);
  } catch (_) {}
}

function remplirChamp(id, valeur) {
  if (!valeur) return;
  const el = document.getElementById(id);
  if (el && !el.value) el.value = valeur;
}

function afficherIndicateurBrouillon(visible) {
  const el = document.getElementById('draft-indicator');
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

function supprimerBrouillon() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
  afficherIndicateurBrouillon(false);
}

/* =====================================================================
   ENVOI DU MESSAGE
   ===================================================================== */

async function envoyerMessage(event) {
  event.preventDefault();
  if (_submitEnCours) return;

  const globalErrorEl = document.getElementById('form-global-error');
  if (globalErrorEl) globalErrorEl.classList.add('hidden');

  if (!validerTout()) {
    afficherErreurGlobale('Veuillez corriger les erreurs dans le formulaire avant d\'envoyer.');
    scrollPremierErreur();
    return;
  }

  _submitEnCours = true;
  setEtatBouton(true);

  const payload = construirePayload();

  const localId = genererIdLocal();
  sauvegarderDansHistorique({ ...payload, id: localId });
  supprimerBrouillon();

  try {
    const res = await fetch(`${API_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data = {};
    try { data = await res.json(); } catch (_) {}

    if (!res.ok) {
      const msg = data?.message || 'Une erreur est survenue lors de l\'envoi. Réessayez.';
      throw new Error(Array.isArray(msg) ? msg.join(' ') : msg);
    }

    if (data?.id) {
      mettreAJourServerId(localId, data.id);
    }

    afficherSucces(data?.id);

  } catch (err) {
    afficherErreurGlobale(err.message);
  } finally {
    _submitEnCours = false;
    setEtatBouton(false);
  }
}

function construirePayload() {
  return {
    nom:       document.getElementById('contact-nom')?.value.trim() || '',
    email:     document.getElementById('contact-email')?.value.trim() || '',
    telephone: document.getElementById('contact-telephone')?.value.trim() || undefined,
    categorie: document.getElementById('contact-categorie')?.value || 'general',
    priorite:  document.querySelector('input[name="priorite"]:checked')?.value || 'normale',
    sujet:     document.getElementById('contact-sujet')?.value.trim() || '',
    message:   document.getElementById('contact-message')?.value.trim() || '',
  };
}

function setEtatBouton(enChargement) {
  const btn     = document.getElementById('btn-submit');
  const txtEl   = btn?.querySelector('.btn-text');
  const loaderEl = btn?.querySelector('.btn-loader');
  if (!btn) return;

  btn.disabled = enChargement;
  if (txtEl)    txtEl.classList.toggle('hidden', enChargement);
  if (loaderEl) loaderEl.classList.toggle('hidden', !enChargement);
}

function afficherErreurGlobale(message) {
  const el = document.getElementById('form-global-error');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function scrollPremierErreur() {
  const premier = document.querySelector('.form-field.field-invalid');
  if (premier) {
    premier.scrollIntoView({ behavior: 'smooth', block: 'center' });
    premier.querySelector('input, textarea, select')?.focus();
  }
}

function afficherSucces(id) {
  const formEl    = document.getElementById('contact-form');
  const successEl = document.getElementById('contact-success');
  const refEl     = document.getElementById('success-ref');

  if (formEl)    formEl.classList.add('hidden');
  if (successEl) successEl.classList.remove('hidden');
  if (refEl && id) {
    refEl.textContent = `Référence : ${String(id).slice(0, 8).toUpperCase()}`;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =====================================================================
   RESET FORMULAIRE
   ===================================================================== */

function resetContactForm() {
  const formEl    = document.getElementById('contact-form');
  const successEl = document.getElementById('contact-success');

  if (formEl) {
    formEl.reset();
    formEl.classList.remove('hidden');
    document.querySelectorAll('.form-field').forEach(f => {
      f.classList.remove('field-valid', 'field-invalid');
    });
    document.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
    document.querySelectorAll('.char-counter span').forEach(s => { s.textContent = '0'; });
    document.getElementById('faq-suggestions')?.classList.add('hidden');
    document.getElementById('categorie-helper')?.classList.add('hidden');
    document.getElementById('form-global-error')?.classList.add('hidden');

    const radioNormale = document.querySelector('input[name="priorite"][value="normale"]');
    if (radioNormale) radioNormale.checked = true;
  }

  if (successEl) successEl.classList.add('hidden');
}

/* =====================================================================
   HISTORIQUE LOCAL
   ===================================================================== */

/* =====================================================================
   VUE DÉTAIL — CONVERSATION AVEC L'ADMIN
   ===================================================================== */

let _detailItemId = null;
let _pollingTimer = null;

function ouvrirDetail(itemId) {
  const item = obtenirHistorique().find(i => i.id === itemId);
  if (!item) return;

  _detailItemId = itemId;

  document.getElementById('history-list-view').classList.add('hidden');
  document.getElementById('history-detail-view').classList.remove('hidden');

  remplirDetail(item);

  if (item.serverId) {
    demarrerPolling(item.serverId);
  }

  const textarea = document.getElementById('followup-message');
  if (textarea) {
    textarea.addEventListener('input', () => {
      const n = textarea.value.length;
      document.getElementById('counter-followup').textContent = n;
    });
  }
}

function retourHistorique() {
  stopperPolling();
  _detailItemId = null;

  document.getElementById('history-detail-view').classList.add('hidden');
  document.getElementById('history-list-view').classList.remove('hidden');
  afficherHistorique();
}

function remplirDetail(item) {
  document.getElementById('detail-sujet').textContent     = item.sujet || '(sans sujet)';
  document.getElementById('detail-date').textContent      = formaterDate(item.envoyeA);
  document.getElementById('detail-categorie').textContent = labelCategorie(item.categorie || 'general');

  const prioEl = document.getElementById('detail-priorite');
  prioEl.textContent  = labelPriorite(item.priorite || 'normale');
  prioEl.className    = `history-badge history-badge-prio-${item.priorite || 'normale'}`;

  afficherStatut(item);
  afficherMessages(item);
}

function afficherStatut(item) {
  const el = document.getElementById('detail-status');
  if (!el) return;

  if (item.repondu) {
    el.innerHTML = '<span class="statut-badge statut-repondu">✓ Répondu</span>';
  } else if (item.serverId) {
    el.innerHTML = '<span class="statut-badge statut-attente">⏳ En attente de réponse</span>';
  } else {
    el.innerHTML = '<span class="statut-badge statut-local">📨 Envoyé localement</span>';
  }
}

function afficherMessages(item) {
  const container = document.getElementById('thread-messages');
  if (!container) return;

  const suivis = item.suivis || [];

  let html = `
    <div class="thread-msg thread-msg--user">
      <div class="thread-msg-avatar user-avatar">
        ${echapper(initialesDepuisNom(item.nom || 'Moi'))}
      </div>
      <div class="thread-msg-body">
        <div class="thread-msg-meta">
          <strong>${echapper(item.nom || 'Moi')}</strong>
          <span>${formaterDate(item.envoyeA)}</span>
        </div>
        <div class="thread-msg-content">${echapper(item.message)}</div>
      </div>
    </div>
  `;

  suivis.forEach(s => {
    const estAdmin = s.auteur === 'admin';
    html += `
      <div class="thread-msg ${estAdmin ? 'thread-msg--admin' : 'thread-msg--user'}">
        <div class="thread-msg-avatar ${estAdmin ? 'admin-avatar' : 'user-avatar'}">
          ${estAdmin ? 'AD' : echapper(initialesDepuisNom(item.nom || 'Moi'))}
        </div>
        <div class="thread-msg-body">
          <div class="thread-msg-meta">
            <strong>${estAdmin ? 'Équipe MeetAndDo' : echapper(item.nom || 'Moi')}</strong>
            <span>${formaterDate(s.date)}</span>
          </div>
          <div class="thread-msg-content">${echapper(s.message)}</div>
        </div>
      </div>
    `;
  });

  if (item.reponse) {
    html += `
      <div class="thread-msg thread-msg--admin">
        <div class="thread-msg-avatar admin-avatar">AD</div>
        <div class="thread-msg-body">
          <div class="thread-msg-meta">
            <strong>Équipe MeetAndDo</strong>
            <span>${item.reponse_date ? formaterDate(new Date(item.reponse_date).getTime()) : ''}</span>
          </div>
          <div class="thread-msg-content">${echapper(item.reponse)}</div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

async function actualiserReponse() {
  const historique = obtenirHistorique();
  const item = historique.find(i => i.id === _detailItemId);
  if (!item?.serverId) {
    afficherToast('Pas encore synchronisé avec le serveur', 'info');
    return;
  }

  const btn = document.getElementById('btn-refresh');
  if (btn) { btn.disabled = true; btn.textContent = '↻ ...'; }

  try {
    const res = await fetch(`${API_URL}/contact/${item.serverId}`);
    if (!res.ok) throw new Error();

    const data = await res.json();

    if (data.repondu && data.reponse) {
      mettreAJourReponseLocale(item.id, data.reponse, data.reponse_date);
      const itemMaj = obtenirHistorique().find(i => i.id === _detailItemId);
      if (itemMaj) {
        remplirDetail(itemMaj);
        afficherToast('L\'admin a répondu à votre message !', 'success', 5000);
      }
    } else {
      afficherToast('Pas encore de réponse. On vous répond sous 24h.', 'info');
    }
  } catch (_) {
    afficherToast('Impossible de contacter le serveur', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '↻ Actualiser'; }
  }
}

function demarrerPolling(serverId) {
  stopperPolling();
  _pollingTimer = setInterval(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch(`${API_URL}/contact/${serverId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.repondu && data.reponse) {
        mettreAJourReponseLocale(_detailItemId, data.reponse, data.reponse_date);
        const item = obtenirHistorique().find(i => i.id === _detailItemId);
        if (item) remplirDetail(item);
        stopperPolling();
        afficherToast('Nouvelle réponse de l\'équipe !', 'success', 5000);
      }
    } catch (_) {}
  }, 30000);
}

function stopperPolling() {
  if (_pollingTimer) { clearInterval(_pollingTimer); _pollingTimer = null; }
}

function mettreAJourReponseLocale(itemId, reponse, reponseDate) {
  try {
    const historique = obtenirHistorique();
    const idx = historique.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    historique[idx].reponse      = reponse;
    historique[idx].reponse_date = reponseDate;
    historique[idx].repondu      = true;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historique));
  } catch (_) {}
}

function mettreAJourServerId(localId, serverId) {
  try {
    const historique = obtenirHistorique();
    const idx = historique.findIndex(i => i.id === localId);
    if (idx === -1) return;
    historique[idx].serverId = serverId;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historique));
  } catch (_) {}
}

async function envoyerSuivi() {
  const textarea = document.getElementById('followup-message');
  const message  = textarea?.value.trim();
  if (!message || message.length < 5) {
    afficherToast('Écrivez un message d\'au moins 5 caractères', 'error');
    return;
  }

  const item = obtenirHistorique().find(i => i.id === _detailItemId);
  if (!item) return;

  const btn     = document.querySelector('#thread-followup-form .btn-submit');
  const txtEl   = btn?.querySelector('.btn-text');
  const loaderEl = btn?.querySelector('.btn-loader');
  if (btn) btn.disabled = true;
  if (txtEl) txtEl.classList.add('hidden');
  if (loaderEl) loaderEl.classList.remove('hidden');

  const payload = {
    nom:       item.nom,
    email:     item.email,
    sujet:     `[Suivi] ${item.sujet}`,
    message:   message,
    categorie: item.categorie || 'general',
    priorite:  item.priorite  || 'normale',
  };

  const suiviEntry = { auteur: 'user', message, date: Date.now() };

  try {
    await fetch(`${API_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (_) {}

  ajouterSuiviLocal(_detailItemId, suiviEntry);
  textarea.value = '';
  document.getElementById('counter-followup').textContent = '0';

  const itemMaj = obtenirHistorique().find(i => i.id === _detailItemId);
  if (itemMaj) afficherMessages(itemMaj);

  if (btn) btn.disabled = false;
  if (txtEl) txtEl.classList.remove('hidden');
  if (loaderEl) loaderEl.classList.add('hidden');

  afficherToast('Message de suivi envoyé', 'success');
}

function ajouterSuiviLocal(itemId, suivi) {
  try {
    const historique = obtenirHistorique();
    const idx = historique.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    if (!historique[idx].suivis) historique[idx].suivis = [];
    historique[idx].suivis.push(suivi);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historique));
  } catch (_) {}
}

function sauvegarderDansHistorique(payload) {
  try {
    const historique = obtenirHistorique();
    historique.unshift({
      ...payload,
      id: genererIdLocal(),
      envoyeA: Date.now(),
    });
    const limite = historique.slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(limite));
  } catch (_) {}
}

function obtenirHistorique() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (_) {
    return [];
  }
}

function afficherHistorique() {
  const container = document.getElementById('history-container');
  if (!container) return;

  const historique = obtenirHistorique();

  if (historique.length === 0) {
    container.innerHTML = `<div class="history-empty">Vous n'avez pas encore envoyé de message depuis cet appareil.</div>`;
    return;
  }

  container.innerHTML = historique.map(item => {
    const aReponse  = item.repondu || !!item.reponse;
    const nbSuivis  = (item.suivis || []).length;
    const statutHtml = aReponse
      ? '<span class="statut-badge statut-repondu">✓ Répondu</span>'
      : (item.serverId
          ? '<span class="statut-badge statut-attente">⏳ En attente</span>'
          : '<span class="statut-badge statut-local">📨 Envoyé</span>');
    return `
      <div class="history-item history-item--clickable animate-in" onclick="ouvrirDetail('${item.id}')">
        <div class="history-item-header">
          <span class="history-item-subject">${echapper(item.sujet)}</span>
          <div class="history-item-header-right">
            ${statutHtml}
            <span class="history-item-date">${formaterDate(item.envoyeA)}</span>
          </div>
        </div>
        <div class="history-item-meta">
          ${item.categorie ? `<span class="history-badge history-badge-cat">${echapper(labelCategorie(item.categorie))}</span>` : ''}
          <span class="history-badge history-badge-prio-${item.priorite || 'normale'}">${echapper(labelPriorite(item.priorite || 'normale'))}</span>
          ${nbSuivis > 0 ? `<span class="history-badge history-badge-suivis">${nbSuivis} suivi${nbSuivis > 1 ? 's' : ''}</span>` : ''}
        </div>
        <div class="history-item-msg">${echapper(item.message)}</div>
        <div class="history-item-chevron">›</div>
      </div>
    `;
  }).join('');
}

function effacerHistorique() {
  if (!confirm('Effacer tout l\'historique des messages envoyés ?')) return;
  try { localStorage.removeItem(HISTORY_KEY); } catch (_) {}
  afficherHistorique();
  afficherToast('Historique effacé', 'info');
}

/* =====================================================================
   COPIER EMAIL
   ===================================================================== */

async function copierEmail() {
  const email = 'meetdosav@gmail.com';
  const btn   = document.getElementById('copy-email-btn');
  try {
    await navigator.clipboard.writeText(email);
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Copié !';
      setTimeout(() => { btn.textContent = original; }, 2000);
    }
    afficherToast('Email copié dans le presse-papier', 'success');
  } catch (_) {
    afficherToast('Impossible de copier automatiquement', 'error');
  }
}

/* =====================================================================
   TOAST NOTIFICATIONS
   ===================================================================== */

function afficherToast(message, type = 'info', duree = 3500) {
  const toast  = document.getElementById('contact-toast');
  const msgEl  = document.getElementById('contact-toast-msg');
  if (!toast || !msgEl) return;

  clearTimeout(_toastTimer);
  msgEl.textContent = message;
  toast.className = `contact-toast toast--visible toast--${type}`;

  _toastTimer = setTimeout(fermerToast, duree);
}

function fermerToast() {
  const toast = document.getElementById('contact-toast');
  if (toast) toast.classList.remove('toast--visible');
}

/* =====================================================================
   UTILITAIRES
   ===================================================================== */

function echapper(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function tronquer(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}

function formaterDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function genererIdLocal() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function labelCategorie(val) {
  const labels = {
    general: 'Question générale',
    compte: 'Mon compte',
    reservation: 'Réservation',
    activite: 'Activité',
    paiement: 'Paiement',
    technique: 'Technique',
    signalement: 'Signalement',
    autre: 'Autre',
  };
  return labels[val] || val;
}

function labelPriorite(val) {
  const labels = {
    basse: 'Priorité basse',
    normale: 'Priorité normale',
    haute: 'Priorité haute',
    urgente: 'Urgent',
  };
  return labels[val] || val;
}

/* =====================================================================
   NAVIGATION CLAVIER — ACCESSIBILITÉ
   ===================================================================== */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    fermerToast();
    document.getElementById('faq-suggestions')?.classList.add('hidden');
  }
});

document.addEventListener('click', (e) => {
  const suggestEl = document.getElementById('faq-suggestions');
  if (!suggestEl) return;
  const sujetInput = document.getElementById('contact-sujet');
  if (!sujetInput) return;
  if (!sujetInput.contains(e.target) && !suggestEl.contains(e.target)) {
    suggestEl.classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    if (_activeTab === 'form') {
      e.preventDefault();
      sauvegarderBrouillon();
    }
  }
});

/* =====================================================================
   RETRY AUTOMATIQUE (network errors)
   ===================================================================== */

async function envoyerAvecRetry(payload, maxTentatives = 3) {
  let dernierErreur = null;

  for (let tentative = 1; tentative <= maxTentatives; tentative++) {
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      let data = {};
      try { data = await res.json(); } catch (_) {}

      if (!res.ok) {
        const msg = data?.message || 'Erreur serveur.';
        throw new Error(Array.isArray(msg) ? msg.join(' ') : msg);
      }

      return data;
    } catch (err) {
      dernierErreur = err;
      const estReseau = err.name === 'TypeError' || err.name === 'TimeoutError';
      if (!estReseau || tentative === maxTentatives) throw err;
      await attendre(tentative * 1000);
    }
  }

  throw dernierErreur;
}

function attendre(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =====================================================================
   INDICATEUR DE PROGRESSION DU FORMULAIRE
   ===================================================================== */

function calculerProgression() {
  const champsObligatoires = ['nom', 'email', 'categorie', 'sujet', 'message'];
  let remplis = 0;

  for (const champ of champsObligatoires) {
    const el = document.getElementById(`contact-${champ}`);
    if (el && el.value.trim().length > 0) remplis++;
  }

  const consentEl = document.getElementById('contact-consent');
  if (consentEl && consentEl.checked) remplis++;

  const total = champsObligatoires.length + 1;
  return Math.round((remplis / total) * 100);
}

function mettreAJourProgression() {
  const pct = calculerProgression();
  const barEl = document.getElementById('progress-bar-inner');
  const pctEl = document.getElementById('progress-pct');
  if (barEl) barEl.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
}

document.addEventListener('DOMContentLoaded', () => {
  const champsAEcouter = ['contact-nom', 'contact-email', 'contact-categorie', 'contact-sujet', 'contact-message', 'contact-consent'];
  champsAEcouter.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', mettreAJourProgression);
    if (el && el.type === 'checkbox') el.addEventListener('change', mettreAJourProgression);
  });
});

/* =====================================================================
   EXPORT HISTORIQUE CSV
   ===================================================================== */

function exporterHistoriqueCSV() {
  const historique = obtenirHistorique();
  if (historique.length === 0) {
    afficherToast('Aucun message dans l\'historique', 'info');
    return;
  }

  const entetes = ['Date', 'Nom', 'Email', 'Catégorie', 'Priorité', 'Sujet', 'Message'];
  const lignes = historique.map(item => [
    formaterDate(item.envoyeA),
    item.nom      || '',
    item.email    || '',
    labelCategorie(item.categorie || 'general'),
    labelPriorite(item.priorite   || 'normale'),
    item.sujet    || '',
    (item.message || '').replace(/\n/g, ' '),
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const contenu = '﻿' + [entetes.join(','), ...lignes].join('\n');
  const blob    = new Blob([contenu], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const lien    = document.createElement('a');

  lien.href     = url;
  lien.download = `contact-historique-${new Date().toISOString().slice(0, 10)}.csv`;
  lien.click();
  URL.revokeObjectURL(url);

  afficherToast('Historique exporté en CSV', 'success');
}

/* =====================================================================
   PARTAGE DU FORMULAIRE
   ===================================================================== */

async function partagerPage() {
  const data = {
    title: 'Contacter MeetAndDo',
    text: 'Envoyez un message à l\'équipe MeetAndDo.',
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(data);
    } catch (_) {}
  } else {
    try {
      await navigator.clipboard.writeText(window.location.href);
      afficherToast('Lien copié dans le presse-papier', 'success');
    } catch (_) {
      afficherToast('Impossible de partager', 'error');
    }
  }
}

/* =====================================================================
   DÉTECTION MODE HORS LIGNE
   ===================================================================== */

window.addEventListener('online',  () => afficherToast('Connexion rétablie', 'success'));
window.addEventListener('offline', () => afficherToast('Vous êtes hors ligne. Le message sera envoyé à la reconnexion.', 'error', 6000));

function estEnLigne() {
  return navigator.onLine !== false;
}

/* =====================================================================
   CONFIRMATION AVANT QUITTER (si formulaire rempli non envoyé)
   ===================================================================== */

window.addEventListener('beforeunload', (e) => {
  const formEl = document.getElementById('contact-form');
  if (!formEl || formEl.classList.contains('hidden')) return;

  const sujet   = document.getElementById('contact-sujet')?.value.trim();
  const message = document.getElementById('contact-message')?.value.trim();

  if ((sujet && sujet.length > 0) || (message && message.length > 0)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

/* =====================================================================
   ACCESSIBILITÉ — LIVE REGION POUR FEEDBACK
   ===================================================================== */

function annoncerPourLecteurEcran(message) {
  let region = document.getElementById('sr-live-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'sr-live-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
  }
  region.textContent = '';
  setTimeout(() => { region.textContent = message; }, 50);
}

/* =====================================================================
   GESTION DES ERREURS RÉSEAU — FILE D'ATTENTE LOCALE
   ===================================================================== */

const QUEUE_KEY = 'contact_pending_queue';

function ajouterFileAttente(payload) {
  try {
    const queue = obtenirFileAttente();
    queue.push({ ...payload, queuedAt: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    afficherToast('Message mis en file d\'attente (hors ligne)', 'info', 5000);
  } catch (_) {}
}

function obtenirFileAttente() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (_) {
    return [];
  }
}

async function viderFileAttente() {
  const queue = obtenirFileAttente();
  if (queue.length === 0) return;

  const restants = [];
  for (const item of queue) {
    try {
      await envoyerAvecRetry(item, 1);
      sauvegarderDansHistorique(item);
    } catch (_) {
      restants.push(item);
    }
  }

  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(restants)); } catch (_) {}

  if (restants.length < queue.length) {
    afficherToast(`${queue.length - restants.length} message(s) envoyé(s) depuis la file d'attente`, 'success');
  }
}

window.addEventListener('online', () => {
  setTimeout(viderFileAttente, 1500);
});

/* =====================================================================
   ANIMATIONS — ENTRÉE DES ÉLÉMENTS
   ===================================================================== */

function animerEntree(selector, delai = 0) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(12px)';
    el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, delai + i * 80);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  animerEntree('.info-card', 100);
  animerEntree('.form-section', 50);
});

/* =====================================================================
   UTILITAIRE — SANITISATION XSS
   ===================================================================== */

function sanitiser(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;')
    .trim();
}

/* =====================================================================
   FORMATAGE — NUMÉRO DE TÉLÉPHONE
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const telInput = document.getElementById('contact-telephone');
  if (!telInput) return;

  telInput.addEventListener('blur', () => {
    const val = telInput.value.trim();
    if (!val) return;

    const chiffres = val.replace(/\D/g, '');
    if (chiffres.startsWith('33') && chiffres.length === 11) {
      telInput.value = '+' + chiffres.replace(/(\d{2})(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5 $6');
    } else if (chiffres.startsWith('0') && chiffres.length === 10) {
      telInput.value = chiffres.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
  });
});

/* =====================================================================
   FOCUS TRAP — ACCESSIBILITÉ MODALES
   ===================================================================== */

function piegerFocus(containerEl) {
  const focusables = containerEl.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (focusables.length === 0) return;

  const premier = focusables[0];
  const dernier = focusables[focusables.length - 1];

  function gererTab(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    } else {
      if (document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    }
  }

  containerEl.addEventListener('keydown', gererTab);
  premier.focus();

  return () => containerEl.removeEventListener('keydown', gererTab);
}

/* =====================================================================
   THEME — DÉTECTION MODE SOMBRE
   ===================================================================== */

function detecterModeSombre() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  document.body.classList.toggle('dark-mode', e.matches);
});

document.addEventListener('DOMContentLoaded', () => {
  if (detecterModeSombre()) document.body.classList.add('dark-mode');
});

/* =====================================================================
   IMPRESSION / PDF
   ===================================================================== */

function imprimerConfirmation() {
  const historique  = obtenirHistorique();
  const dernier     = historique[0];
  if (!dernier) {
    afficherToast('Aucun message à imprimer', 'info');
    return;
  }

  const win = window.open('', '_blank', 'width=700,height=800');
  win.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8"/>
      <title>Confirmation de message — MeetAndDo</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2rem; color: #1a1a1a; }
        h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
        .ref { background: #f1f1ef; padding: 8px 14px; border-radius: 6px; font-size: 0.8rem; color: #666; margin-bottom: 1.5rem; display: inline-block; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px 0; border-bottom: 1px solid #eee; vertical-align: top; }
        td:first-child { font-weight: 600; width: 140px; color: #444; }
        .message-body { white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>Confirmation de message — MeetAndDo</h1>
      <span class="ref">Envoyé le ${formaterDate(dernier.envoyeA)}</span>
      <table>
        <tr><td>Nom</td><td>${sanitiser(dernier.nom)}</td></tr>
        <tr><td>Email</td><td>${sanitiser(dernier.email)}</td></tr>
        <tr><td>Catégorie</td><td>${labelCategorie(dernier.categorie || 'general')}</td></tr>
        <tr><td>Priorité</td><td>${labelPriorite(dernier.priorite || 'normale')}</td></tr>
        <tr><td>Sujet</td><td>${sanitiser(dernier.sujet)}</td></tr>
        <tr><td>Message</td><td class="message-body">${sanitiser(dernier.message)}</td></tr>
      </table>
    </body>
    </html>
  `);
  win.document.close();
  win.print();
}

/* =====================================================================
   RACCOURCIS CLAVIER — ONGLETS
   ===================================================================== */

document.addEventListener('keydown', (e) => {
  if (!e.altKey) return;
  if (e.key === '1') { e.preventDefault(); switchTab('form'); }
  if (e.key === '2') { e.preventDefault(); switchTab('history'); }
});

/* =====================================================================
   VALIDATION EMAIL AVANCÉE — MX CHECK SIMULÉ
   ===================================================================== */

const DOMAINES_JETABLES = [
  'tempmail.com', 'guerrillamail.com', 'mailinator.com',
  'throwam.com', 'trashmail.com', 'yopmail.com',
  '10minutemail.com', 'sharklasers.com', 'guerrillamailblock.com',
];

function emailEstJetable(email) {
  const domaine = (email.split('@')[1] || '').toLowerCase();
  return DOMAINES_JETABLES.includes(domaine);
}

function validerEmailAvance(email) {
  if (!email) return null;
  if (emailEstJetable(email)) {
    return 'Les adresses email temporaires ne sont pas acceptées.';
  }
  return null;
}

/* =====================================================================
   COMPTEUR DE MOTS (message)
   ===================================================================== */

function compterMots(texte) {
  if (!texte) return 0;
  return texte.trim().split(/\s+/).filter(m => m.length > 0).length;
}

document.addEventListener('DOMContentLoaded', () => {
  const msgInput  = document.getElementById('contact-message');
  const wordCount = document.createElement('span');
  wordCount.id    = 'word-count';
  wordCount.style.cssText = 'font-size:0.72rem;color:#999;margin-right:8px;';

  if (msgInput) {
    const counter = msgInput.parentElement?.querySelector('.char-counter');
    if (counter) counter.prepend(wordCount);

    msgInput.addEventListener('input', () => {
      const mots = compterMots(msgInput.value);
      wordCount.textContent = `${mots} mot${mots !== 1 ? 's' : ''} · `;
    });
  }
});

/* =====================================================================
   SMOOTH SCROLL — ANCRES INTERNES
   ===================================================================== */

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const id = link.getAttribute('href').slice(1);
  const cible = document.getElementById(id);
  if (cible) {
    e.preventDefault();
    cible.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* =====================================================================
   NETTOYAGE MÉMOIRE — RÉVOCATION URLS BLOB
   ===================================================================== */

window.addEventListener('unload', () => {
  clearTimeout(_draftTimer);
  clearTimeout(_toastTimer);
  clearTimeout(_faqSuggestTimer);
});

/* =====================================================================
   BARRE DE PROGRESSION — RENDU DYNAMIQUE
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const formArea = document.querySelector('.contact-form-area');
  if (!formArea) return;

  const barWrapper = document.createElement('div');
  barWrapper.className = 'progress-bar-wrapper';
  barWrapper.innerHTML = `
    <div class="progress-bar-track">
      <div class="progress-bar-inner" id="progress-bar-inner"></div>
    </div>
    <span class="progress-bar-label">
      Formulaire complété à <span id="progress-pct">0</span>%
    </span>
  `;
  formArea.insertBefore(barWrapper, formArea.firstChild);
});

/* =====================================================================
   INDICATEUR DE FRAPPE — "En train d'écrire..."
   ===================================================================== */

let _typingTimer = null;
const _typingDelay = 1500;

document.addEventListener('DOMContentLoaded', () => {
  const msgInput = document.getElementById('contact-message');
  if (!msgInput) return;

  msgInput.addEventListener('keydown', () => {
    clearTimeout(_typingTimer);
    _typingTimer = setTimeout(() => {}, _typingDelay);
  });
});

/* =====================================================================
   SUGGESTIONS AUTOMATIQUES — NOM (pré-remplissage depuis localStorage)
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const nomInput   = document.getElementById('contact-nom');
  const emailInput = document.getElementById('contact-email');
  if (!nomInput || !emailInput) return;

  emailInput.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (!email || nomInput.value.trim()) return;

    try {
      const raw = localStorage.getItem('AUTH_USER_STORAGE_KEY');
      if (!raw) return;
      const user = JSON.parse(raw);
      if (user?.email === email && user?.firstName) {
        nomInput.value = `${user.firstName} ${user.lastName || ''}`.trim();
        validerChamp('nom');
      }
    } catch (_) {}
  });
});

/* =====================================================================
   GESTION MULTI-LANGUE — I18N BASIQUE
   ===================================================================== */

const I18N_FR = {
  'field.required':    'Ce champ est obligatoire.',
  'form.success':      'Message envoyé avec succès !',
  'form.error':        'Une erreur est survenue. Réessayez.',
  'draft.saved':       'Brouillon sauvegardé',
  'draft.restored':    'Brouillon restauré',
  'history.cleared':   'Historique effacé',
  'copy.success':      'Copié dans le presse-papier',
  'copy.error':        'Impossible de copier',
  'offline.warning':   'Vous êtes hors ligne',
  'online.restored':   'Connexion rétablie',
  'faq.loading':       'Chargement de la FAQ...',
  'faq.empty':         'Aucune question disponible',
  'faq.no-results':    'Aucun résultat trouvé',
};

function t(key) {
  return I18N_FR[key] ?? key;
}

/* =====================================================================
   ANALYTICS INTERNE — TRACKING FORMULAIRE (sans données personnelles)
   ===================================================================== */

const _analytics = {
  formStarted:  false,
  firstKeyTime: null,
  submitCount:  0,
  errorCount:   0,
  tabSwitches:  0,
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('focusin', () => {
    if (!_analytics.formStarted) {
      _analytics.formStarted  = true;
      _analytics.firstKeyTime = Date.now();
    }
  }, { once: true });
});

function trackSubmitTentative(succes) {
  _analytics.submitCount++;
  if (!succes) _analytics.errorCount++;
}

function trackTabSwitch(tab) {
  _analytics.tabSwitches++;
}

/* =====================================================================
   DEBOUNCE GÉNÉRIQUE
   ===================================================================== */

function debounce(fn, delai) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delai);
  };
}

/* =====================================================================
   THROTTLE GÉNÉRIQUE
   ===================================================================== */

function throttle(fn, limite) {
  let enAttente = false;
  return function (...args) {
    if (enAttente) return;
    enAttente = true;
    fn.apply(this, args);
    setTimeout(() => { enAttente = false; }, limite);
  };
}

/* =====================================================================
   SCROLL INFINI POUR L'HISTORIQUE (si > 10 items)
   ===================================================================== */

let _historyPage  = 1;
const HISTORY_PER_PAGE = 5;

function afficherHistoriquePagine() {
  const container = document.getElementById('history-container');
  if (!container) return;

  const historique = obtenirHistorique();
  const debut   = (_historyPage - 1) * HISTORY_PER_PAGE;
  const fin     = debut + HISTORY_PER_PAGE;
  const page    = historique.slice(debut, fin);

  if (_historyPage === 1) {
    afficherHistorique();
    return;
  }

  const fragment = document.createDocumentFragment();
  page.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-item-header">
        <span class="history-item-subject">${echapper(item.sujet)}</span>
        <span class="history-item-date">${formaterDate(item.envoyeA)}</span>
      </div>
      <div class="history-item-meta">
        <span class="history-badge history-badge-cat">${echapper(labelCategorie(item.categorie || 'general'))}</span>
        <span class="history-badge history-badge-prio-${item.priorite || 'normale'}">${echapper(labelPriorite(item.priorite || 'normale'))}</span>
      </div>
      <div class="history-item-msg">${echapper(item.message)}</div>
    `;
    fragment.appendChild(div);
  });

  container.appendChild(fragment);

  if (fin < historique.length) {
    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'btn-load-more';
    btnPlus.textContent = 'Voir plus';
    btnPlus.onclick = () => { _historyPage++; btnPlus.remove(); afficherHistoriquePagine(); };
    container.appendChild(btnPlus);
  }
}

/* =====================================================================
   DÉTECTION NAVIGATEUR — AVERTISSEMENT IE / VIEUX NAVIGATEURS
   ===================================================================== */

function detecterNavigateurObsolete() {
  const ua = navigator.userAgent;
  const estIE = ua.indexOf('MSIE') !== -1 || ua.indexOf('Trident/') !== -1;
  if (estIE) {
    afficherToast(
      'Votre navigateur n\'est pas supporté. Utilisez Chrome, Firefox ou Edge.',
      'error',
      8000
    );
  }
}

document.addEventListener('DOMContentLoaded', detecterNavigateurObsolete);

/* =====================================================================
   INTERSECTION OBSERVER — ANIMATIONS AU SCROLL
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.info-card, .form-section, .faq-item-card, .history-item')
    .forEach(el => observer.observe(el));
});

/* =====================================================================
   VÉRIFICATION HORAIRES — RAFRAÎCHISSEMENT AUTO
   ===================================================================== */

setInterval(() => {
  initialiserStatutBureau();
}, 5 * 60 * 1000);

/* =====================================================================
   ÉVÉNEMENTS PERSONNALISÉS
   ===================================================================== */

function emettreEvenement(nom, detail = {}) {
  document.dispatchEvent(new CustomEvent(`contact:${nom}`, { detail, bubbles: true }));
}

document.addEventListener('contact:sent', (e) => {
  const { id } = e.detail;
  console.info(`[Contact] Message envoyé — ID: ${id}`);
});

document.addEventListener('contact:draft-saved', () => {
  console.info('[Contact] Brouillon sauvegardé');
});

/* =====================================================================
   API WRAPPER — ABSTRACTION DES APPELS HTTP
   ===================================================================== */

const ContactApi = {
  async envoyer(payload) {
    return envoyerAvecRetry(payload, 3);
  },

  async obtenirFaq() {
    return obtenirFaqData();
  },

  baseUrl: API_URL,
};

/* =====================================================================
   VALIDATION — RÈGLES ÉTENDUES
   ===================================================================== */

function validerNomComplet(nom) {
  if (!nom || nom.trim().length < 2) return 'Le nom est trop court.';
  if (nom.trim().length > 100) return 'Le nom est trop long.';
  if (/\d/.test(nom)) return 'Le nom ne doit pas contenir de chiffres.';
  return null;
}

function validerEmailComplet(email) {
  const erreurBase = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
    ? 'Email invalide.' : null;
  if (erreurBase) return erreurBase;
  return validerEmailAvance(email);
}

function validerSujet(sujet) {
  if (!sujet || sujet.trim().length < 5) return 'Le sujet est trop court (5 caractères minimum).';
  if (sujet.trim().length > 200) return 'Le sujet est trop long (200 caractères maximum).';
  return null;
}

function validerMessage(msg) {
  if (!msg || msg.trim().length < 20) return 'Le message est trop court (20 caractères minimum).';
  if (msg.trim().length > 2000) return 'Le message est trop long (2000 caractères maximum).';
  return null;
}

/* =====================================================================
   EXPORT — API PUBLIQUE DU MODULE
   ===================================================================== */

window.ContactModule = {
  switchTab,
  envoyerMessage,
  resetContactForm,
  sauvegarderBrouillon,
  copierEmail,
  afficherToast,
  fermerToast,
  exporterHistoriqueCSV,
  imprimerConfirmation,
  effacerHistorique,
  partagerPage,
  rechercherFaqTab,
  ContactApi,
  version: '1.0.0',
};

/* =====================================================================
   UTILITAIRE — TRONQUER AVEC MOT ENTIER
   ===================================================================== */

function tronquerMot(str, max) {
  if (!str || str.length <= max) return str || '';
  const coupe = str.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(' ');
  return (dernierEspace > 0 ? coupe.slice(0, dernierEspace) : coupe) + '…';
}

/* =====================================================================
   UTILITAIRE — FORMATER TAILLE FICHIER
   ===================================================================== */

function formaterTaille(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

/* =====================================================================
   UTILITAIRE — GÉNÉRER COULEUR DEPUIS INITIALES
   ===================================================================== */

function couleurDepuisInitiales(nom) {
  if (!nom) return '#004AAD';
  let hash = 0;
  for (let i = 0; i < nom.length; i++) {
    hash = nom.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 42%)`;
}

/* =====================================================================
   UTILITAIRE — INITIALES DEPUIS NOM COMPLET
   ===================================================================== */

function initialesDepuisNom(nom) {
  if (!nom) return '?';
  const mots = nom.trim().split(/\s+/);
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

/* =====================================================================
   UTILITAIRE — DÉLAI DEPUIS UNE DATE
   ===================================================================== */

function tempsRelatif(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const secondes = Math.floor(diff / 1000);
  const minutes  = Math.floor(secondes / 60);
  const heures   = Math.floor(minutes / 60);
  const jours    = Math.floor(heures / 24);

  if (secondes < 60)  return 'à l\'instant';
  if (minutes < 60)   return `il y a ${minutes} min`;
  if (heures < 24)    return `il y a ${heures}h`;
  if (jours < 7)      return `il y a ${jours}j`;
  return formaterDate(timestamp);
}

/* =====================================================================
   UTILITAIRE — VÉRIFIER SI UN EMAIL CONTIENT UN ALIAS (+)
   ===================================================================== */

function emailContientAlias(email) {
  if (!email) return false;
  const local = email.split('@')[0] || '';
  return local.includes('+');
}

/* =====================================================================
   UTILITAIRE — CAPITALISER PREMIÈRE LETTRE DE CHAQUE MOT
   ===================================================================== */

function capitaliserMots(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/* =====================================================================
   AUTO-COMPLÉTION NOM — FORMATAGE À LA SORTIE DU CHAMP
   ===================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const nomInput = document.getElementById('contact-nom');
  if (!nomInput) return;

  nomInput.addEventListener('blur', () => {
    const val = nomInput.value.trim();
    if (!val) return;
    if (val === val.toUpperCase() || val === val.toLowerCase()) {
      nomInput.value = capitaliserMots(val);
    }
  });
});

/* =====================================================================
   RÉSUMÉ FORMULAIRE AVANT ENVOI — POPUP DE CONFIRMATION
   ===================================================================== */

function afficherResumeAvantEnvoi() {
  const nom      = document.getElementById('contact-nom')?.value.trim();
  const email    = document.getElementById('contact-email')?.value.trim();
  const sujet    = document.getElementById('contact-sujet')?.value.trim();
  const categorie = document.getElementById('contact-categorie')?.value;
  const priorite = document.querySelector('input[name="priorite"]:checked')?.value;

  return `
    ✉ ${sujet || '(sans sujet)'}
    👤 ${nom || '(sans nom)'} — ${email || '(sans email)'}
    📂 ${labelCategorie(categorie || 'general')} · ${labelPriorite(priorite || 'normale')}
  `.trim();
}

/* =====================================================================
   COMPTEUR — MESSAGES DANS LA FILE D'ATTENTE
   ===================================================================== */

function compterFileAttente() {
  return obtenirFileAttente().length;
}

document.addEventListener('DOMContentLoaded', () => {
  const nb = compterFileAttente();
  if (nb > 0) {
    afficherToast(`${nb} message(s) en attente d'envoi`, 'info', 4000);
  }
});
