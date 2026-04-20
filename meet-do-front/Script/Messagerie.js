/* =============================================
   Meet&Do — Messagerie
   ============================================= */

const SOCKET_URL = 'http://localhost:3000/messaging';

// ---- État local ---- //
const state = {
  currentUserId: null,
  activeConversationId: null,
  conversations: [],
  socket: null,
};

// ---- DOM ---- //
const DOM = {
  navbar:       document.getElementById('navbar-root'),
  footer:       document.getElementById('footer-root'),
  convList:     document.getElementById('conv-list'),
  convSearch:   document.getElementById('conv-search'),
  chatEmpty:    document.getElementById('chat-empty'),
  chatView:     document.getElementById('chat-view'),
  chatMessages: document.getElementById('chat-messages'),
  chatHeader: {
    name:   document.getElementById('chat-header-name'),
    avatar: document.getElementById('chat-header-avatar'),
    status: document.getElementById('chat-header-status'),
  },
  msgInput:          document.getElementById('msg-input'),
  btnSend:           document.getElementById('btn-send'),
  btnNewConv:        document.getElementById('btn-new-conv'),
  btnBack:           document.getElementById('btn-back'),
  sidebar:           document.getElementById('conv-sidebar'),
  fileInput:         document.getElementById('file-input'),
  btnAttach:         document.getElementById('btn-attach'),
  attachPreview:     document.getElementById('attachment-preview'),
  attachPreviewInner:document.getElementById('attachment-preview-inner'),
  btnAttachRemove:   document.getElementById('attachment-remove'),
};

// ---- État pièce jointe ---- //
const attach = { file: null };

// ---- Init composants ---- //
function initComponents() {
  if (typeof Navbar === 'function') {
    DOM.navbar.innerHTML = Navbar();
    injectBurgerMenu();
  }
  if (typeof Footer === 'function') {
    DOM.footer.innerHTML = Footer('..');
  }
}

// ---- Burger menu (injecté dans le nav existant) ---- //
function injectBurgerMenu() {
  const nav = DOM.navbar.querySelector('nav');
  if (!nav) return;

  // Bouton burger
  const burger = document.createElement('button');
  burger.type = 'button';
  burger.id = 'burger-btn';
  burger.className = 'burger-btn';
  burger.title = 'Ouvrir le menu';
  burger.setAttribute('aria-label', 'Menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = `
    <span class="burger-line"></span>
    <span class="burger-line"></span>
    <span class="burger-line"></span>`;
  nav.appendChild(burger);

  // Lire les liens nav depuis le DOM
  const navItems = Array.from(
    nav.querySelectorAll('.navLinks li a'),
  ).map((a) => ({ label: a.textContent.trim(), href: a.getAttribute('href') || '#' }));

  const annonceEl = nav.querySelector('.annonce a');
  const profilEl  = nav.querySelector('#profil');
  const profilLabel = profilEl ? profilEl.querySelector('div')?.textContent?.trim() || 'Profil' : 'Profil';

  // Construire le drawer manuellement (ordre logique)
  const drawer = document.createElement('div');
  drawer.id = 'nav-drawer';
  drawer.className = 'nav-drawer';
  drawer.innerHTML = `
    <nav class="drawer-nav-links">
      ${navItems.map((item) => `
        <a href="${item.href}" class="drawer-link">${item.label}</a>
      `).join('')}
    </nav>
    <div class="drawer-divider"></div>
    <div class="drawer-actions">
      ${annonceEl ? `<a href="${annonceEl.getAttribute('href') || '#'}" class="drawer-btn-primary">Poster une annonce</a>` : ''}
      <a href="${profilEl ? profilEl.getAttribute('href') || '#' : '#'}" class="drawer-btn-secondary">
        <i class="bi bi-person-circle"></i> ${profilLabel}
      </a>
    </div>`;

  nav.insertAdjacentElement('afterend', drawer);

  // Toggle
  const toggle = () => {
    const isOpen = drawer.classList.toggle('open');
    burger.classList.toggle('active', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
  };

  burger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

  document.addEventListener('click', (e) => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target) && !burger.contains(e.target)) {
      drawer.classList.remove('open');
      burger.classList.remove('active');
      burger.setAttribute('aria-expanded', 'false');
    }
  });

  // Fermer après clic sur un lien
  drawer.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      burger.classList.remove('active');
    });
  });
}

// ---- Convertir un ID entier en UUID valide ---- //
function intToUUID(id) {
  return `00000000-0000-0000-0000-${id.toString().padStart(12, '0')}`;
}

// ---- Utilisateur courant (depuis l'API si connecté) ---- //
async function initUser() {
  try {
    const res = await fetch('http://localhost:3000/user/me', { credentials: 'include' });
    if (res.ok) {
      const userData = await res.json();
      state.currentUserId = intToUUID(userData.id);
    } else {
      const stored = sessionStorage.getItem('meetando_user_id');
      state.currentUserId = stored || crypto.randomUUID();
      sessionStorage.setItem('meetando_user_id', state.currentUserId);
    }
  } catch {
    const stored = sessionStorage.getItem('meetando_user_id');
    state.currentUserId = stored || crypto.randomUUID();
    sessionStorage.setItem('meetando_user_id', state.currentUserId);
  }

  const el = document.getElementById('my-id-value');
  if (el) el.textContent = state.currentUserId;

  const bar = document.getElementById('my-id-bar');
  if (bar) {
    bar.addEventListener('click', () => {
      navigator.clipboard.writeText(state.currentUserId).then(() => {
        bar.classList.add('copied');
        const icon = document.getElementById('my-id-copy');
        if (icon) { icon.className = 'bi bi-clipboard-check my-id-copy'; }
        setTimeout(() => {
          bar.classList.remove('copied');
          if (icon) { icon.className = 'bi bi-clipboard my-id-copy'; }
        }, 1800);
      });
    });
  }
}

// ---- Connexion Socket.IO ---- //
function initSocket() {
  state.socket = io(SOCKET_URL, { transports: ['websocket'] });

  state.socket.on('connect', () => {
    // S'enregistrer dans la room perso pour recevoir les notifications
    state.socket.emit('register', { userId: state.currentUserId });
    loadConversations();
  });

  state.socket.on('disconnect', () => {
    console.log('[Socket] Déconnecté');
  });

  state.socket.on('conversations_list', (data) => {
    state.conversations = data;
    renderConversationList(data);

    // Ouvrir la conversation depuis l'URL (?conv=<id> depuis le dashboard)
    const params = new URLSearchParams(window.location.search);
    const convIdFromUrl = params.get('conv');
    if (convIdFromUrl && !state.activeConversationId) {
      const conv = data.find((c) => c.id === convIdFromUrl);
      if (conv) { selectConversation(conv); return; }
    }

    // Restaurer la conversation active après un refresh
    const savedId = localStorage.getItem('meetando_active_conv');
    if (savedId && !state.activeConversationId) {
      const conv = data.find((c) => c.id === savedId);
      if (conv) selectConversation(conv);
    }
  });

  // Notification reçue sur la room perso (nouveau message ou nouvelle conv)
  state.socket.on('new_conversation_notification', (conv) => {
    const exists = state.conversations.find((c) => c.id === conv.id);
    if (exists) {
      // Mettre à jour le dernier message
      Object.assign(exists, conv);
    } else {
      state.conversations.unshift(conv);
    }
    renderConversationList(state.conversations);
  });

  state.socket.on('messages_history', (messages) => {
    renderMessages(messages);
  });

  state.socket.on('new_message', (message) => {
    appendMessage(message);
    updateConvLastMsg(message.conversation_id, message.content, message.created_at);
  });

  state.socket.on('conversation_opened', (conv) => {
    openConversation(conv);
  });

  state.socket.on('error', (err) => {
    console.error('[Socket] Erreur :', err);
  });
}

// ---- Charger les conversations ---- //
function loadConversations() {
  state.socket.emit('get_conversations', { userId: state.currentUserId });
}

// ---- Rendu liste de conversations ---- //
function renderConversationList(conversations) {
  const filtered = filterConversations(conversations, DOM.convSearch.value);

  if (filtered.length === 0) {
    DOM.convList.innerHTML = '<li class="conv-empty-state">Aucune conversation pour le moment</li>';
    return;
  }

  DOM.convList.innerHTML = filtered.map((conv) => {
    const otherId = conv.participant_1 === state.currentUserId
      ? conv.participant_2
      : conv.participant_1;
    const name = shortenId(otherId);
    const initials = name.slice(0, 2).toUpperCase();
    const lastMsg = conv.last_message || 'Nouvelle conversation';
    const time = conv.last_message_at ? formatTime(conv.last_message_at) : '';
    const isActive = conv.id === state.activeConversationId ? 'active' : '';

    return `
      <li class="conv-item ${isActive}" role="listitem" data-id="${conv.id}" data-other-id="${otherId}">
        <div class="conv-avatar">${initials}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(name)}</div>
          <div class="conv-last-msg">${escapeHtml(truncate(lastMsg, 40))}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${time}</span>
        </div>
      </li>`;
  }).join('');

  DOM.convList.querySelectorAll('.conv-item').forEach((item) => {
    item.addEventListener('click', () => {
      const convId = item.dataset.id;
      const conv = state.conversations.find((c) => c.id === convId);
      if (conv) selectConversation(conv);
    });
  });
}

// ---- Sélectionner une conversation ---- //
function selectConversation(conv) {
  state.activeConversationId = conv.id;
  localStorage.setItem('meetando_active_conv', conv.id);

  const otherId = conv.participant_1 === state.currentUserId
    ? conv.participant_2
    : conv.participant_1;
  const name = shortenId(otherId);
  const initials = name.slice(0, 2).toUpperCase();

  DOM.chatHeader.name.textContent = name;
  DOM.chatHeader.avatar.textContent = initials;
  DOM.chatHeader.status.textContent = 'En ligne';

  showChatView();
  DOM.chatMessages.innerHTML = '';

  state.socket.emit('join_conversation', { conversationId: conv.id, userId: state.currentUserId });
  renderConversationList(state.conversations);

  // Mobile (< 768px) : cacher la sidebar pour afficher uniquement le chat
  if (window.innerWidth <= 768) {
    DOM.sidebar.classList.add('hidden-mobile');
  }
}

// ---- Rendu des messages ---- //
function renderMessages(messages) {
  DOM.chatMessages.innerHTML = '';
  let lastDate = null;

  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (msgDate !== lastDate) {
      const sep = document.createElement('div');
      sep.className = 'msg-date-separator';
      sep.innerHTML = `<span>${msgDate}</span>`;
      DOM.chatMessages.appendChild(sep);
      lastDate = msgDate;
    }
    appendMessage(msg, false);
  });

  scrollToBottom();
}

// ---- Ajouter un message ---- //
function appendMessage(msg, doScroll = true) {
  const isSent = msg.sender_id === state.currentUserId;
  const row = document.createElement('div');
  row.className = `msg-row ${isSent ? 'sent' : 'recv'}`;
  row.dataset.msgId = msg.id;

  const time = formatTime(msg.created_at);
  const initials = shortenId(msg.sender_id).slice(0, 2).toUpperCase();

  const bubbleContent = renderBubbleContent(msg.content);
  row.innerHTML = `
    ${!isSent ? `<div class="msg-bubble-avatar">${initials}</div>` : ''}
    <div class="msg-bubble">
      ${bubbleContent}
      <span class="msg-time">${time}</span>
    </div>`;

  DOM.chatMessages.appendChild(row);
  if (doScroll) scrollToBottom();
}

// ---- Mettre à jour le dernier message dans la liste ---- //
function updateConvLastMsg(convId, content, timestamp) {
  const conv = state.conversations.find((c) => c.id === convId);
  if (conv) {
    conv.last_message = content;
    conv.last_message_at = timestamp;
    renderConversationList(state.conversations);
  }
}

// ---- Envoyer un message ---- //
async function sendMessage() {
  const content = DOM.msgInput.value.trim();
  const hasFile = !!attach.file;

  if (!content && !hasFile) return;
  if (!state.activeConversationId) return;

  triggerSendRipple();

  // Upload du fichier d'abord si présent
  if (hasFile) {
    await uploadAttachment(attach.file);
    clearAttachment();
  }

  // Envoi du texte si présent
  if (content) {
    state.socket.emit('send_message', {
      conversationId: state.activeConversationId,
      senderId: state.currentUserId,
      content,
    });
    DOM.msgInput.value = '';
  }

  DOM.msgInput.focus();
  updateSendButton();
}

// ---- Upload pièce jointe ---- //
async function uploadAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', state.activeConversationId);
  formData.append('senderId', state.currentUserId);

  // Barre de progression
  const prog = document.createElement('div');
  prog.className = 'upload-progress';
  DOM.attachPreview.appendChild(prog);

  try {
    const res = await fetch('http://localhost:3000/messaging/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload échoué');
    // Le message arrive via socket (new_message), pas besoin de traitement ici
  } catch (err) {
    console.error('[Upload]', err);
    alert('Erreur lors de l\'envoi du fichier.');
  } finally {
    prog.remove();
  }
}

// ---- Afficher la preview du fichier sélectionné ---- //
function showAttachPreview(file) {
  attach.file = file;
  const isImage = file.type.startsWith('image/');
  const sizeStr = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(0)} Ko`
    : `${(file.size / 1024 / 1024).toFixed(1)} Mo`;

  if (isImage) {
    const reader = new FileReader();
    reader.onload = (e) => {
      DOM.attachPreviewInner.innerHTML = `
        <img src="${e.target.result}" alt="preview">
        <div>
          <div class="attachment-preview-name">${escapeHtml(file.name)}</div>
          <div class="attachment-preview-size">${sizeStr}</div>
        </div>`;
    };
    reader.readAsDataURL(file);
  } else {
    const icon = file.type === 'application/pdf' ? 'bi-file-earmark-pdf' : 'bi-file-earmark-text';
    DOM.attachPreviewInner.innerHTML = `
      <i class="bi ${icon} attachment-preview-icon"></i>
      <div>
        <div class="attachment-preview-name">${escapeHtml(file.name)}</div>
        <div class="attachment-preview-size">${sizeStr}</div>
      </div>`;
  }

  DOM.attachPreview.hidden = false;
  updateSendButton();
}

// ---- Supprimer la pièce jointe ---- //
function clearAttachment() {
  attach.file = null;
  DOM.attachPreview.hidden = true;
  DOM.attachPreviewInner.innerHTML = '';
  DOM.fileInput.value = '';
  updateSendButton();
}

// ---- Ripple sur le bouton envoi ---- //
function triggerSendRipple() {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  DOM.btnSend.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// ---- Activer/désactiver le bouton selon le contenu ---- //
function updateSendButton() {
  DOM.btnSend.disabled = !DOM.msgInput.value.trim() && !attach.file;
}

// ---- Indicateur de frappe ---- //
let typingTimeout = null;

function showTypingIndicator() {
  if (document.getElementById('typing-indicator')) return;
  const el = document.createElement('div');
  el.id = 'typing-indicator';
  el.className = 'typing-indicator';
  el.innerHTML = `
    <div class="msg-bubble-avatar" style="width:28px;height:28px;font-size:.65rem">?</div>
    <div class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
  DOM.chatMessages.appendChild(el);
  scrollToBottom();
}

function hideTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

// ---- Afficher / cacher la vue chat ---- //
function showChatView() {
  DOM.chatEmpty.style.display = 'none';
  DOM.chatView.hidden = false;
}

// ---- Nouvelle conversation (modal) ---- //
function openNewConvModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-new-conv';
  modal.innerHTML = `
    <div class="modal-card">
      <h3><i class="bi bi-pencil-square me-2"></i>Nouvelle conversation</h3>
      <input type="text" class="modal-input" id="modal-contact-id"
             placeholder="ID du contact…" autocomplete="off" />
      <div class="modal-actions">
        <button type="button" class="btn-secondary-outline" id="modal-cancel">Annuler</button>
        <button type="button" class="btn-primary-blue" id="modal-confirm">Démarrer</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const input = modal.querySelector('#modal-contact-id');
  input.focus();

  modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    const contactId = input.value.trim();
    if (!contactId) return;
    state.socket.emit('open_conversation', {
      userId1: state.currentUserId,
      userId2: contactId,
    });
    modal.remove();
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function openConversation(conv) {
  state.conversations = [conv, ...state.conversations.filter((c) => c.id !== conv.id)];
  renderConversationList(state.conversations);
  selectConversation(conv);
}

// ---- Recherche ---- //
function filterConversations(conversations, query) {
  if (!query) return conversations;
  return conversations.filter((c) => {
    const otherId = c.participant_1 === state.currentUserId ? c.participant_2 : c.participant_1;
    return otherId.toLowerCase().includes(query.toLowerCase());
  });
}

// ---- Rendu du contenu d'une bulle (texte, image, fichier) ---- //
function renderBubbleContent(content) {
  const imageExts = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  const pdfExt    = /\.pdf(\?.*)?$/i;

  if (imageExts.test(content)) {
    return `<img src="${content}" class="msg-image" alt="image" loading="lazy" />`;
  }
  if (pdfExt.test(content)) {
    const name = decodeURIComponent(content.split('/').pop().split('?')[0]);
    return `<a href="${content}" target="_blank" rel="noopener" class="msg-file-link">
      <i class="bi bi-file-earmark-pdf-fill"></i> ${escapeHtml(name)}
    </a>`;
  }
  // Lien générique fichier
  if (content.startsWith('http') && content.includes('/chat-attachments/')) {
    const name = decodeURIComponent(content.split('/').pop().split('?')[0]);
    return `<a href="${content}" target="_blank" rel="noopener" class="msg-file-link">
      <i class="bi bi-file-earmark-arrow-down"></i> ${escapeHtml(name)}
    </a>`;
  }
  return escapeHtml(content);
}

// ---- Lightbox image ---- //
function openLightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'img-lightbox';
  lb.innerHTML = `<img src="${src}" alt="image agrandie" />`;
  lb.addEventListener('click', () => lb.remove());
  document.body.appendChild(lb);
}

// ---- Helpers ---- //
function scrollToBottom() {
  requestAnimationFrame(() => {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function shortenId(id) {
  if (!id) return '?';
  const match = id.match(/^00000000-0000-0000-0000-0*(\d+)$/);
  if (match) return `Utilisateur #${parseInt(match[1], 10)}`;
  return id.length > 12 ? id.slice(0, 8) + '…' : id;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Événements ---- //
function initEvents() {
  DOM.btnSend.addEventListener('click', sendMessage);
  DOM.btnSend.disabled = true;

  DOM.msgInput.addEventListener('input', updateSendButton);

  DOM.msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Pièce jointe
  DOM.btnAttach.addEventListener('click', () => DOM.fileInput.click());
  DOM.fileInput.addEventListener('change', () => {
    const file = DOM.fileInput.files[0];
    if (file) showAttachPreview(file);
  });
  DOM.btnAttachRemove.addEventListener('click', clearAttachment);

  // Lightbox sur clic image dans le chat
  DOM.chatMessages.addEventListener('click', (e) => {
    if (e.target.classList.contains('msg-image')) {
      openLightbox(e.target.src);
    }
  });

  DOM.btnNewConv.addEventListener('click', openNewConvModal);

  DOM.convSearch.addEventListener('input', () => {
    renderConversationList(state.conversations);
  });

  DOM.btnBack.addEventListener('click', () => {
    DOM.sidebar.classList.remove('hidden-mobile');
    // Sur mobile : cacher le chat et afficher l'état vide
    if (window.innerWidth <= 768) {
      DOM.chatView.hidden = true;
      DOM.chatEmpty.style.display = '';
    }
    state.activeConversationId = null;
    localStorage.removeItem('meetando_active_conv');
    renderConversationList(state.conversations);
  });
}

// ---- Bootstrap ---- //
document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initUser();
  initEvents();
  initSocket();
});
