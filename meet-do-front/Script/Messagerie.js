/* =============================================
   Meet&Do — Messaging
   ============================================= */

function getMeetDoApiUrl() {
  const hostname = window.location.hostname;
  const apiHostname = hostname || 'localhost';

  return `http://${apiHostname}:3000`;
}

const API_URL    = getMeetDoApiUrl();
const SOCKET_URL = `${API_URL}/messaging`;

// ---- Local state ---- //
const state = {
  currentUser:          null,   
  currentUserId:        null,   
  activeConversationId: null,
  conversations:        [],
  socket:               null,
  userCache:            {},     
};

// ---- Attachment ---- //
const attach = { file: null };

// ---- DOM ---- //
const DOM = {
  navbar:              document.getElementById('navbar-root'),
  footer:              document.getElementById('footer-root'),
  convList:            document.getElementById('conv-list'),
  convSearch:          document.getElementById('conv-search'),
  chatEmpty:           document.getElementById('chat-empty'),
  chatView:            document.getElementById('chat-view'),
  chatMessages:        document.getElementById('chat-messages'),
  chatHeader: {
    root:   document.getElementById('chat-header'),
    name:   document.getElementById('chat-header-name'),
    avatar: document.getElementById('chat-header-avatar'),
    status: document.getElementById('chat-header-status'),
  },
  msgInput:            document.getElementById('msg-input'),
  btnSend:             document.getElementById('btn-send'),
  btnNewConv:          document.getElementById('btn-new-conv'),
  btnBack:             document.getElementById('btn-back'),
  sidebar:             document.getElementById('conv-sidebar'),
  fileInput:           document.getElementById('file-input'),
  btnAttach:           document.getElementById('btn-attach'),
  attachPreview:       document.getElementById('attachment-preview'),
  attachPreviewInner:  document.getElementById('attachment-preview-inner'),
  btnAttachRemove:     document.getElementById('attachment-remove'),
};

// ================================================================
//  UTILITAIRES UUID
// ================================================================

function intToUUID(id) {
  return `00000000-0000-0000-0000-${String(id).padStart(12, '0')}`;
}

// ================================================================
//  INIT COMPOSANTS NAVBAR / FOOTER
// ================================================================

function initComponents() {
  if (typeof Navbar === 'function') {
    DOM.navbar.innerHTML = Navbar();
    injectBurgerMenu();
  }
  if (typeof Footer === 'function') {
    DOM.footer.innerHTML = Footer('..');
  }
}

function injectBurgerMenu() {
  const nav = DOM.navbar.querySelector('nav');
  if (!nav) return;

  const burger = document.createElement('button');
  burger.type = 'button';
  burger.id = 'burger-btn';
  burger.className = 'burger-btn';
  burger.title = 'Open menu';
  burger.setAttribute('aria-label', 'Menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = `
    <span class="burger-line"></span>
    <span class="burger-line"></span>
    <span class="burger-line"></span>`;
  nav.appendChild(burger);

  const navItems = Array.from(nav.querySelectorAll('.navLinks li a'))
    .map(a => ({ label: a.textContent.trim(), href: a.getAttribute('href') || '#' }));

  const annonceEl = nav.querySelector('.annonce a');
  const profilEl  = nav.querySelector('#profil');
  const profilLabel = profilEl ? profilEl.querySelector('div')?.textContent?.trim() || 'Profile' : 'Profile';

  const drawer = document.createElement('div');
  drawer.id = 'nav-drawer';
  drawer.className = 'nav-drawer';
  drawer.innerHTML = `
    <nav class="drawer-nav-links">
      ${navItems.map(item => `<a href="${item.href}" class="drawer-link">${item.label}</a>`).join('')}
    </nav>
    <div class="drawer-divider"></div>
    <div class="drawer-actions">
      ${annonceEl ? `<a href="${annonceEl.getAttribute('href') || '#'}" class="drawer-btn-primary">Post a listing</a>` : ''}
      <a href="${profilEl ? profilEl.getAttribute('href') || '#' : '#'}" class="drawer-btn-secondary">
        <i class="bi bi-person-circle"></i> ${profilLabel}
      </a>
    </div>`;
  nav.insertAdjacentElement('afterend', drawer);

  const toggle = () => {
    const isOpen = drawer.classList.toggle('open');
    burger.classList.toggle('active', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
  };

  burger.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  document.addEventListener('click', e => {
    if (drawer.classList.contains('open') && !drawer.contains(e.target) && !burger.contains(e.target)) {
      drawer.classList.remove('open');
      burger.classList.remove('active');
      burger.setAttribute('aria-expanded', 'false');
    }
  });
  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      burger.classList.remove('active');
    });
  });
}

// ================================================================
//  INIT USER — real API call
// ================================================================

async function initUser() {
  try {
    const res = await fetch(`${API_URL}/user/me`, { credentials: 'include' });
    let user = null;

    if (res.status === 401) {
      const authRes = await fetch(`${API_URL}/authentication/me`, { credentials: 'include' });
      if (authRes.status === 401) { window.location.href = 'Login.html'; return; }
      if (!authRes.ok) throw new Error('Unable to verify authentication');
      user = await authRes.json();
    } else {
      if (!res.ok) throw new Error('Unable to load current user');
      user = await res.json();
    }

    state.currentUser   = user;
    state.currentUserId = intToUUID(user.id);

    // Mettre en cache le nom de l'utilisateur courant
    const name = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.email;
    state.userCache[state.currentUserId] = {
      name,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      avatar_url: user.avatar_url,
      role: user.role,
    };

  } catch {
    window.location.href = 'Login.html';
  }
}

// ================================================================
//  CACHE DES NOMS D'UTILISATEURS
// ================================================================

async function loadUserName(uuid) {
  if (state.userCache[uuid]) return state.userCache[uuid].name;
  try {
    const res = await fetch(`${API_URL}/messaging/users/${uuid}`, { credentials: 'include' });
    if (res.ok) {
      const u = await res.json();
      if (u) {
        const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || u.email || uuid.slice(0, 8);
        state.userCache[uuid] = {
          name,
          email: u.email,
          firstname: u.firstname,
          lastname: u.lastname,
          avatar_url: u.avatar_url,
          role: u.role,
        };
        renderConversationList(state.conversations);
        updateHeaderIfNeeded(uuid, name);
        return name;
      }
    }
  } catch { /* silencieux */ }
  return uuid.slice(0, 8) + '…';
}

function updateHeaderIfNeeded(uuid, name) {
  if (!state.activeConversationId) return;
  const conv = state.conversations.find(c => c.id === state.activeConversationId);
  if (!conv || conv.is_group) return;
  const otherId = conv.participant_1 === state.currentUserId ? conv.participant_2 : conv.participant_1;
  if (otherId === uuid) {
    DOM.chatHeader.name.textContent   = name;
    DOM.chatHeader.avatar.textContent = name.slice(0, 2).toUpperCase();
  }
}

function getCachedName(uuid) {
  if (!uuid) return '?';
  if (state.userCache[uuid]) return state.userCache[uuid].name;
  loadUserName(uuid); // chargement asynchrone
  return uuid.slice(0, 8) + '…';
}

// ================================================================
//  SOCKET.IO
// ================================================================

function initSocket() {
  state.socket = io(SOCKET_URL, { transports: ['websocket'] });

  state.socket.on('connect', () => {
    state.socket.emit('register', { userId: state.currentUserId });
    openRequestedUserConversation();
    loadConversations();
  });

  state.socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  state.socket.on('conversations_list', data => {
    state.conversations = data;
    renderConversationList(data);

    const requestedId = getRequestedConversationId();
    const savedId = localStorage.getItem('meetando_active_conv');
    const conversationIdToOpen = requestedId || savedId;

    if (conversationIdToOpen && !state.activeConversationId) {
      const conv = data.find(c => c.id === conversationIdToOpen);
      if (conv) selectConversation(conv);
    }
  });

  state.socket.on('new_conversation_notification', conv => {
    const exists = state.conversations.find(c => c.id === conv.id);
    if (exists) Object.assign(exists, conv);
    else state.conversations.unshift(conv);
    renderConversationList(state.conversations);
  });

  state.socket.on('messages_history', messages => renderMessages(messages));

  state.socket.on('new_message', message => {
    appendMessage(message);
    updateConvLastMsg(message.conversation_id, message.content, message.created_at);
  });

  state.socket.on('conversation_opened', conv => openConversation(conv));

  state.socket.on('error', err => console.error('[Socket] Error:', err));
}

function loadConversations() {
  state.socket.emit('get_conversations', { userId: state.currentUserId });
}

function getRequestedConversationId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('conversationId');
}

function getRequestedUserId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('userId');
}

function getOtherParticipantId(conv) {
  if (!conv || conv.is_group) return null;

  return conv.participant_1 === state.currentUserId
    ? conv.participant_2
    : conv.participant_1;
}

function getUserProfileHref(uuid, profile = {}) {
  if (!uuid) return '';

  const params = new URLSearchParams({ uuid });
  const name = profile.name;

  if (profile.firstname) params.set('firstname', profile.firstname);
  if (profile.lastname) params.set('lastname', profile.lastname);
  if (!profile.firstname && !profile.lastname && name) params.set('name', name);
  if (profile.avatar_url) params.set('avatar', profile.avatar_url);
  if (profile.role) params.set('role', profile.role);

  return `UserProfile.html?${params.toString()}`;
}

function openRequestedUserConversation() {
  const requestedUserId = getRequestedUserId();

  if (!requestedUserId || requestedUserId === state.currentUserId) return;

  state.socket.emit('open_conversation', {
    userId1: state.currentUserId,
    userId2: requestedUserId,
  });
}

// ================================================================
//  LISTE DES CONVERSATIONS
// ================================================================

function renderConversationList(conversations) {
  const filtered = filterConversations(conversations, DOM.convSearch.value);

  if (!filtered.length) {
    DOM.convList.innerHTML = '<li class="conv-empty-state">No conversations yet</li>';
    return;
  }

  DOM.convList.innerHTML = filtered.map(conv => {
    const { displayName, initials } = getConvDisplay(conv);
    const lastMsg  = conv.last_message || 'New conversation';
    const time     = conv.last_message_at ? formatTime(conv.last_message_at) : '';
    const isActive = conv.id === state.activeConversationId ? 'active' : '';
    const isGroup  = conv.is_group;

    return `
      <li class="conv-item ${isActive}" role="listitem" data-id="${conv.id}">
        <div class="conv-avatar ${isGroup ? 'conv-avatar-group' : ''}">
          ${isGroup ? '<i class="bi bi-people-fill"></i>' : initials}
        </div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(displayName)}</div>
          <div class="conv-last-msg">${escapeHtml(truncate(lastMsg, 40))}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${time}</span>
        </div>
      </li>`;
  }).join('');

  DOM.convList.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => {
      const conv = state.conversations.find(c => c.id === item.dataset.id);
      if (conv) selectConversation(conv);
    });
  });
}

function getConvDisplay(conv) {
  if (conv.is_group) {
    return { displayName: conv.group_name || 'Group', initials: 'G' };
  }
  const otherId = getOtherParticipantId(conv);
  const name = getCachedName(otherId);
  const initials = name.slice(0, 2).toUpperCase();
  return { displayName: name, initials };
}

// ================================================================
//  SELECT A CONVERSATION
// ================================================================

async function selectConversation(conv) {
  state.activeConversationId = conv.id;
  localStorage.setItem('meetando_active_conv', conv.id);

  // Pre-load the other participant's name so the header shows it immediately
  if (!conv.is_group) {
    const otherId = getOtherParticipantId(conv);
    if (otherId && !state.userCache[otherId]) await loadUserName(otherId);
  }

  const { displayName, initials } = getConvDisplay(conv);
  const otherId = getOtherParticipantId(conv);
  const profileHref = getUserProfileHref(otherId, {
    ...(state.userCache[otherId] || {}),
    name: displayName,
  });
  DOM.chatHeader.name.textContent   = displayName;
  DOM.chatHeader.avatar.textContent = conv.is_group ? '' : initials;
  if (conv.is_group) DOM.chatHeader.avatar.innerHTML = '<i class="bi bi-people-fill"></i>';
  DOM.chatHeader.status.textContent = conv.is_group ? 'Group' : 'Active';
  bindChatHeaderProfileLink(profileHref);

  showChatView();
  DOM.chatMessages.innerHTML = '';

  state.socket.emit('join_conversation', {
    conversationId: conv.id,
    userId: state.currentUserId,
  });
  renderConversationList(state.conversations);

  if (window.innerWidth <= 768) {
    DOM.sidebar.classList.add('hidden-mobile');
  }
}

function bindChatHeaderProfileLink(profileHref) {
  if (!DOM.chatHeader.root) return;

  DOM.chatHeader.root.classList.toggle('chat-header-profile-link', Boolean(profileHref));
  DOM.chatHeader.root.title = profileHref ? 'View profile' : '';
  DOM.chatHeader.root.onclick = profileHref
    ? event => {
        if (event.target.closest('button')) return;
        window.location.href = profileHref;
      }
    : null;
}

// ================================================================
//  MESSAGES
// ================================================================

function renderMessages(messages) {
  DOM.chatMessages.innerHTML = '';
  let lastDate = null;

  messages.forEach(msg => {
    const msgDate = new Date(msg.created_at).toLocaleDateString('en-US', {
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

function appendMessage(msg, doScroll = true) {
  const isSent    = msg.sender_id === state.currentUserId;
  const row       = document.createElement('div');
  row.className   = `msg-row ${isSent ? 'sent' : 'recv'}`;
  row.dataset.msgId = msg.id;

  const time     = formatTime(msg.created_at);
  const senderName = isSent ? '' : getCachedName(msg.sender_id);
  const initials = senderName.slice(0, 2).toUpperCase() || '?';
  const bubbleContent = renderBubbleContent(msg.content);

  // In a group, show the sender name above the bubble
  const conv = state.conversations.find(c => c.id === msg.conversation_id);
  const showSenderName = !isSent && conv?.is_group;

  row.innerHTML = `
    ${!isSent ? `<div class="msg-bubble-avatar">${initials}</div>` : ''}
    <div class="msg-bubble">
      ${showSenderName ? `<div class="msg-sender-name">${escapeHtml(senderName)}</div>` : ''}
      ${bubbleContent}
      <span class="msg-time">${time}</span>
    </div>`;

  DOM.chatMessages.appendChild(row);
  if (doScroll) scrollToBottom();
}

function updateConvLastMsg(convId, content, timestamp) {
  const conv = state.conversations.find(c => c.id === convId);
  if (conv) {
    conv.last_message    = content;
    conv.last_message_at = timestamp;
    renderConversationList(state.conversations);
  }
}

// ================================================================
//  ENVOI
// ================================================================

async function sendMessage() {
  const content  = DOM.msgInput.value.trim();
  const hasFile  = !!attach.file;

  if (!content && !hasFile) return;
  if (!state.activeConversationId) return;

  triggerSendRipple();

  if (hasFile) {
    await uploadAttachment(attach.file);
    clearAttachment();
  }

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

// ================================================================
//  ATTACHMENTS
// ================================================================

async function uploadAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);

  const prog = document.createElement('div');
  prog.className = 'upload-progress';
  DOM.attachPreview.appendChild(prog);

  try {
    const res = await fetch(`${API_URL}/messaging/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body?.message || res.statusText || 'Unknown error';
      console.error('[Upload] Server error:', res.status, msg);
      alert(`Error sending the file: ${msg}`);
      return;
    }
    const { url } = await res.json();
    // Send the URL as a regular message through the socket so everyone sees it in real-time
    state.socket.emit('send_message', {
      conversationId: state.activeConversationId,
      senderId: state.currentUserId,
      content: url,
    });
  } catch (err) {
    console.error('[Upload]', err);
    alert(`Error sending the file: ${err.message}`);
  } finally {
    prog.remove();
  }
}

function showAttachPreview(file) {
  attach.file = file;
  const isImage = file.type.startsWith('image/');
  const sizeStr = file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(0)} KB`
    : `${(file.size / 1024 / 1024).toFixed(1)} MB`;

  if (isImage) {
    const reader = new FileReader();
    reader.onload = e => {
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

function clearAttachment() {
  attach.file = null;
  DOM.attachPreview.hidden = true;
  DOM.attachPreviewInner.innerHTML = '';
  if (DOM.fileInput) DOM.fileInput.value = '';
  updateSendButton();
}

// ================================================================
//  RENDU CONTENU BULLE (texte, image, fichier)
// ================================================================

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
  if (content.startsWith('http') && content.includes('/chat-attachments/')) {
    const name = decodeURIComponent(content.split('/').pop().split('?')[0]);
    return `<a href="${content}" target="_blank" rel="noopener" class="msg-file-link">
      <i class="bi bi-file-earmark-arrow-down"></i> ${escapeHtml(name)}
    </a>`;
  }
  return escapeHtml(content);
}

function openLightbox(src) {
  const lb = document.createElement('div');
  lb.className = 'img-lightbox';
  lb.innerHTML = `<img src="${src}" alt="enlarged image" />`;
  lb.addEventListener('click', () => lb.remove());
  document.body.appendChild(lb);
}

// ================================================================
//  NOUVELLE CONVERSATION (1-1 ou groupe)
// ================================================================

function openNewConvModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-new-conv';
  modal.innerHTML = `
    <div class="modal-card">
      <h3><i class="bi bi-pencil-square me-2"></i>New conversation</h3>

      <!-- Onglets 1-1 / Groupe -->
      <div class="modal-tabs">
        <button type="button" class="modal-tab active" data-tab="direct">
          <i class="bi bi-person-fill"></i> Direct
        </button>
        <button type="button" class="modal-tab" data-tab="group">
          <i class="bi bi-people-fill"></i> Group
        </button>
      </div>

      <!-- Panneau Direct -->
      <div id="tab-direct" class="modal-tab-panel active">
        <input type="text" class="modal-input" id="modal-search-direct"
               placeholder="Search by name or email…" autocomplete="off" />
        <div id="modal-direct-results" class="modal-results"></div>
      </div>

      <!-- Panneau Groupe -->
      <div id="tab-group" class="modal-tab-panel" style="display:none">
        <input type="text" class="modal-input" id="modal-group-name"
               placeholder="Group name…" autocomplete="off" />
        <input type="text" class="modal-input" id="modal-search-group"
               placeholder="Add members (name or email)…" autocomplete="off" />
        <div id="modal-group-results" class="modal-results"></div>
        <div id="modal-group-members" class="modal-group-members"></div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-secondary-outline" id="modal-cancel">Cancel</button>
        <button type="button" class="btn-primary-blue" id="modal-confirm">Start</button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  let currentTab     = 'direct';
  let selectedDirect = null;      
  let groupMembers   = [];         

  // ----- Onglets -----
  modal.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      modal.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      modal.querySelector('#tab-direct').style.display = currentTab === 'direct' ? '' : 'none';
      modal.querySelector('#tab-group').style.display  = currentTab === 'group'  ? '' : 'none';
    });
  });

  // ----- Recherche direct -----
  let searchTimer = null;
  modal.querySelector('#modal-search-direct').addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) { modal.querySelector('#modal-direct-results').innerHTML = ''; return; }
    searchTimer = setTimeout(() => searchAndRender(q, 'direct', modal, result => {
      selectedDirect = result;
      modal.querySelector('#modal-search-direct').value = result.name;
      modal.querySelector('#modal-direct-results').innerHTML = '';
    }), 300);
  });

  // ----- Recherche groupe -----
  let searchTimer2 = null;
  modal.querySelector('#modal-search-group').addEventListener('input', e => {
    clearTimeout(searchTimer2);
    const q = e.target.value.trim();
    if (q.length < 2) { modal.querySelector('#modal-group-results').innerHTML = ''; return; }
    searchTimer2 = setTimeout(() => searchAndRender(q, 'group', modal, result => {
      if (!groupMembers.find(m => m.uuid === result.uuid)) {
        groupMembers.push(result);
        renderGroupMembers(groupMembers, modal, m => {
          groupMembers = groupMembers.filter(x => x.uuid !== m.uuid);
          renderGroupMembers(groupMembers, modal, () => {});
        });
      }
      modal.querySelector('#modal-search-group').value = '';
      modal.querySelector('#modal-group-results').innerHTML = '';
    }), 300);
  });

  // ----- Fermer -----
  modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // ----- Confirmer -----
  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    if (currentTab === 'direct') {
      if (!selectedDirect) { alert('Please select a contact.'); return; }
      state.socket.emit('open_conversation', {
        userId1: state.currentUserId,
        userId2: selectedDirect.uuid,
      });
      modal.remove();
    } else {
      const groupName = modal.querySelector('#modal-group-name').value.trim();
      if (!groupName) { alert('Please enter a group name.'); return; }
      if (groupMembers.length === 0) { alert('Please add at least one member.'); return; }
      state.socket.emit('create_group', {
        name: groupName,
        creatorId: state.currentUserId,
        memberIds: groupMembers.map(m => m.uuid),
      });
      modal.remove();
    }
  });
}

async function searchAndRender(query, panel, modal, onSelect) {
  try {
    const res = await fetch(
      `${API_URL}/messaging/users/search?q=${encodeURIComponent(query)}`,
      { credentials: 'include' },
    );
    if (!res.ok) return;
    const users = await res.json();
    const container = modal.querySelector(panel === 'direct' ? '#modal-direct-results' : '#modal-group-results');
    if (!users.length) {
      container.innerHTML = '<div class="modal-no-result">No results</div>';
      return;
    }
    container.innerHTML = users.map(u => {
      const name = [u.firstname, u.lastname].filter(Boolean).join(' ') || u.email;
      return `<div class="modal-result-item" data-uuid="${u.uuid}" data-name="${escapeHtml(name)}">
        <div class="modal-result-avatar">${name.slice(0, 2).toUpperCase()}</div>
        <div>
          <div class="modal-result-name">${escapeHtml(name)}</div>
          <div class="modal-result-email">${escapeHtml(u.email)}</div>
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('.modal-result-item').forEach(item => {
      item.addEventListener('click', () => {
        onSelect({ uuid: item.dataset.uuid, name: item.dataset.name });
      });
    });
  } catch { /* silencieux */ }
}

function renderGroupMembers(members, modal, onRemove) {
  const container = modal.querySelector('#modal-group-members');
  if (!members.length) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <div class="modal-members-label">Members (${members.length}):</div>
    ${members.map(m => `
      <span class="modal-member-chip">
        ${escapeHtml(m.name)}
        <button type="button" data-uuid="${m.uuid}" class="chip-remove">×</button>
      </span>`).join('')}`;
  container.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', () => onRemove({ uuid: btn.dataset.uuid }));
  });
}

function openConversation(conv) {
  state.conversations = [conv, ...state.conversations.filter(c => c.id !== conv.id)];
  renderConversationList(state.conversations);
  selectConversation(conv);
}

// ================================================================
//  FILTRE DE RECHERCHE CONVERSATIONS
// ================================================================

function filterConversations(conversations, query) {
  if (!query) return conversations;
  return conversations.filter(c => {
    if (c.is_group) return (c.group_name || '').toLowerCase().includes(query.toLowerCase());
    const otherId = getOtherParticipantId(c);
    const name = state.userCache[otherId]?.name || otherId;
    return name.toLowerCase().includes(query.toLowerCase());
  });
}

// ================================================================
//  HELPERS
// ================================================================

function triggerSendRipple() {
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  DOM.btnSend.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

function updateSendButton() {
  DOM.btnSend.disabled = !DOM.msgInput.value.trim() && !attach.file;
}

function showChatView() {
  DOM.chatEmpty.style.display = 'none';
  DOM.chatView.hidden = false;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
  });
}

function formatTime(iso) {
  const d   = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
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

// ================================================================
//  EVENTS
// ================================================================

function initEvents() {
  DOM.btnSend.addEventListener('click', sendMessage);
  DOM.btnSend.disabled = true;

  DOM.msgInput.addEventListener('input', updateSendButton);
  DOM.msgInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Attachment
  if (DOM.btnAttach) {
    DOM.btnAttach.addEventListener('click', () => DOM.fileInput?.click());
  }
  if (DOM.fileInput) {
    DOM.fileInput.addEventListener('change', () => {
      const file = DOM.fileInput.files[0];
      if (file) showAttachPreview(file);
    });
  }
  if (DOM.btnAttachRemove) {
    DOM.btnAttachRemove.addEventListener('click', clearAttachment);
  }

  // Lightbox
  DOM.chatMessages.addEventListener('click', e => {
    if (e.target.classList.contains('msg-image')) openLightbox(e.target.src);
  });

  DOM.btnNewConv.addEventListener('click', openNewConvModal);

  DOM.convSearch.addEventListener('input', () => renderConversationList(state.conversations));

  DOM.btnBack.addEventListener('click', () => {
    DOM.sidebar.classList.remove('hidden-mobile');
    if (window.innerWidth <= 768) {
      DOM.chatView.hidden = true;
      DOM.chatEmpty.style.display = '';
    }
    state.activeConversationId = null;
    localStorage.removeItem('meetando_active_conv');
    renderConversationList(state.conversations);
  });
}

// ================================================================
//  BOOTSTRAP
// ================================================================

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initUser();
  if (!state.currentUserId) return; 
  initEvents();
  initSocket();
});
