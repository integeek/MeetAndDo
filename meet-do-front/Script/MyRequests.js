function getMeetDoApiUrl() {
  const hostname = window.location.hostname;
  const apiHostname = hostname || "localhost";

  return `http://${apiHostname}:3000`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDisplayName(profile) {
  const fullName = `${profile?.firstname || ""} ${profile?.lastname || ""}`.trim();
  return fullName || profile?.email || "Your profile";
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getCurrentRequests(profile) {
  const role = String(profile?.role || "").toLowerCase();

  if (role === "publisher") {
    return [];
  }

  if (profile?.publisher_request === true) {
    return [
      {
        id: "activity-creator-application",
        title: "Publisher application",
        description:
          "Your request to become a publisher is waiting for an administrator review.",
        status: "Pending review",
        statusClass: "pending",
        submittedLabel: "Requested from your account",
        submittedAt: profile.publisher_request_submitted_at || profile.created_at,
        details: profile.publisher_request_details || {},
      },
    ];
  }

  return [];
}

function renderEmptyState(container) {
  container.innerHTML = `
    <section class="requests-empty">
      <strong>No active requests</strong>
      <span>You do not have any pending applications or account requests right now.</span>
    </section>
  `;
}

function renderRequestCard(request) {
  return `
    <article class="request-card" data-request-id="${escapeHtml(request.id)}">
      <div class="request-card-main">
        <div>
          <p class="request-type mb-2">Account request</p>
          <h2>${escapeHtml(request.title)}</h2>
        </div>
        <span class="request-status request-status-${escapeHtml(request.statusClass)}">
          ${escapeHtml(request.status)}
        </span>
      </div>
      <p class="request-description">${escapeHtml(request.description)}</p>
      <div class="request-meta">
        <span>${escapeHtml(request.submittedLabel)}</span>
        <span>${formatDate(request.submittedAt)}</span>
      </div>
      <div class="request-actions" id="request-action-${escapeHtml(request.id)}"></div>
    </article>
  `;
}

function renderRequests(profile) {
  const container = document.getElementById("requests-list");
  if (!container) return;

  const requests = getCurrentRequests(profile);

  if (!requests.length) {
    renderEmptyState(container);
    return;
  }

  container.innerHTML = requests.map(renderRequestCard).join("");
  requests.forEach((request) => {
    const actionContainer = document.getElementById(`request-action-${request.id}`);
    if (!actionContainer) return;

    actionContainer.innerHTML = BoutonBleu("View application");
    actionContainer.querySelector("button")?.addEventListener("click", () => {
      openRequestModal(request, profile);
    });
  });
}

function openRequestModal(request, profile) {
  const modal = document.getElementById("request-modal");
  const body = document.getElementById("request-modal-body");
  if (!modal || !body) return;

  body.innerHTML = `
    <dl class="request-detail-list">
      <div>
        <dt>Application</dt>
        <dd>${escapeHtml(request.title)}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd><span class="request-status request-status-${escapeHtml(request.statusClass)}">${escapeHtml(request.status)}</span></dd>
      </div>
      <div>
        <dt>Candidate</dt>
        <dd>${escapeHtml(formatDisplayName(profile))}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>${escapeHtml(profile?.email || "Not available")}</dd>
      </div>
      <div>
        <dt>Submitted</dt>
        <dd>${formatDate(request.submittedAt)}</dd>
      </div>
      <div>
        <dt>Next step</dt>
        <dd>An administrator will review your application before your account can publish activities.</dd>
      </div>
      ${renderApplicationDetails(request.details)}
    </dl>
  `;
  modal.classList.remove("d-none");
}

function renderApplicationDetails(details = {}) {
  const items = [
    ["Experience", details.experienceLevel],
    ["Category", details.activityCategory],
    ["Motivation", details.motivation],
    ["Activity plan", details.activityPlan],
    ["Links", details.links],
  ].filter(([, value]) => value);

  if (!items.length) {
    return "";
  }

  return items.map(([label, value]) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `).join("");
}

function closeRequestModal() {
  document.getElementById("request-modal")?.classList.add("d-none");
}

async function loadRequests() {
  const container = document.getElementById("requests-list");

  try {
    const response = await fetch(`${getMeetDoApiUrl()}/user/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      localStorage.removeItem("meetando_current_user");
      const params = new URLSearchParams({
        authMessage: "You must be logged in to access your requests.",
        redirect: "MyRequests.html",
      });
      window.location.href = `../Page/Login.html?${params.toString()}`;
      return;
    }

    const profile = await response.json();
    localStorage.setItem("meetando_current_user", JSON.stringify(profile));
    renderRequests(profile);
  } catch (error) {
    if (!container) return;

    container.innerHTML = `
      <section class="requests-empty requests-error">
        <strong>Unable to load your requests</strong>
        <span>Please try again in a moment.</span>
      </section>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("request-modal-close")?.addEventListener("click", closeRequestModal);
  document.getElementById("request-modal-ok")?.addEventListener("click", closeRequestModal);
  document.getElementById("request-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "request-modal") {
      closeRequestModal();
    }
  });

  loadRequests();
});
