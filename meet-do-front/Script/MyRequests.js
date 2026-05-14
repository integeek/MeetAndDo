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

function parseJsonObject(value) {
  if (!value) return {};

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  return typeof value === "object" ? value : {};
}

function getPublisherApplicationStorageKey(userId) {
  return `meetando_publisher_application_${userId || "current"}`;
}

function clearStoredPublisherApplicationDetails(userId) {
  localStorage.removeItem(getPublisherApplicationStorageKey("current"));
  localStorage.removeItem(getPublisherApplicationStorageKey(userId));
}

function getStoredPublisherApplicationDetails(userId) {
  return parseJsonObject(localStorage.getItem(getPublisherApplicationStorageKey(userId)));
}

function pickFirstValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

let pendingCancelRequest = null;

function normalizePublisherApplicationDetails(profile) {
  const rawDetails = parseJsonObject(profile?.publisher_request_details);
  const nestedApplication = parseJsonObject(rawDetails.application);
  const storedDetails = {
    ...getStoredPublisherApplicationDetails("current"),
    ...getStoredPublisherApplicationDetails(profile?.id),
  };
  const details = {
    ...storedDetails,
    ...nestedApplication,
    ...rawDetails,
  };

  return {
    experienceLevel: pickFirstValue(
      details.experienceLevel,
      details.experience_level,
      details.experience,
    ),
    activityCategory: pickFirstValue(
      details.activityCategory,
      details.activity_category,
      details.category,
      details.theme,
    ),
    motivation: pickFirstValue(
      details.motivation,
      details.reason,
      details.why,
    ),
    activityPlan: pickFirstValue(
      details.activityPlan,
      details.activity_plan,
      details.plan,
      details.activities,
    ),
    links: pickFirstValue(
      details.links,
      details.link,
      details.website,
      details.portfolio,
      details.socialLinks,
      details.social_links,
    ),
  };
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
        details: normalizePublisherApplicationDetails(profile),
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
      <p class="request-action-feedback" id="request-feedback-${escapeHtml(request.id)}" aria-live="polite"></p>
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

    actionContainer.innerHTML = `
      <div class="request-action-item request-action-view">
        ${BoutonBleu("View application")}
      </div>
      <div class="request-action-item">
        <button class="request-cancel-button" type="button">Cancel request</button>
      </div>
    `;
    actionContainer.querySelector(".request-action-view button")?.addEventListener("click", () => {
      openRequestModal(request, profile);
    });
    actionContainer.querySelector(".request-cancel-button")?.addEventListener("click", (event) => {
      openCancelRequestModal(profile, event.currentTarget, request.id);
    });
  });
}

function setRequestFeedback(requestId, message = "", status = "") {
  const feedback = document.getElementById(`request-feedback-${requestId}`);
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `request-action-feedback${status ? ` is-${status}` : ""}`;
}

function setCancelModalFeedback(message = "", status = "") {
  const feedback = document.getElementById("request-cancel-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `request-action-feedback${status ? ` is-${status}` : ""}`;
}

function openCancelRequestModal(profile, button, requestId) {
  pendingCancelRequest = { profile, button, requestId };
  setCancelModalFeedback();
  document.getElementById("request-cancel-confirm")?.removeAttribute("disabled");
  document.getElementById("request-cancel-modal")?.classList.remove("d-none");
  document.body.classList.add("request-modal-open");
}

function closeCancelRequestModal() {
  document.getElementById("request-cancel-modal")?.classList.add("d-none");
  document.body.classList.remove("request-modal-open");
  pendingCancelRequest = null;
}

async function cancelPublisherRequest() {
  if (!pendingCancelRequest) return;

  const { profile, button, requestId } = pendingCancelRequest;
  const confirmButton = document.getElementById("request-cancel-confirm");

  setRequestFeedback(requestId, "Cancelling your request...", "loading");
  setCancelModalFeedback("Cancelling your request...", "loading");
  if (button) button.disabled = true;
  if (confirmButton) confirmButton.disabled = true;

  try {
    const response = await fetch(`${getMeetDoApiUrl()}/user/request-publisher/cancel`, {
      method: "POST",
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Unable to cancel your request.");
    }

    if (result.user) {
      localStorage.setItem("meetando_current_user", JSON.stringify(result.user));
    }

    clearStoredPublisherApplicationDetails(profile?.id);
    setRequestFeedback(requestId, "Your request has been cancelled.", "success");
    setCancelModalFeedback("Your request has been cancelled.", "success");

    setTimeout(() => {
      closeCancelRequestModal();
      renderRequests(result.user || { ...profile, publisher_request: false });
    }, 500);
  } catch (error) {
    const message = error.message || "Unable to cancel your request.";
    setRequestFeedback(requestId, error.message || "Unable to cancel your request.", "error");
    setCancelModalFeedback(message, "error");
    if (button) button.disabled = false;
    if (confirmButton) confirmButton.disabled = false;
  }
}

function openRequestModal(request, profile) {
  const modal = document.getElementById("request-modal");
  const card = modal?.querySelector(".request-modal-card");
  const body = document.getElementById("request-modal-body");
  const detailsButton = document.getElementById("request-modal-details");
  const detailsFooter = document.querySelector(".request-modal-footer");
  if (!modal || !body) return;

  card?.classList.remove("is-full-details");
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
    </dl>
  `;

  if (detailsButton) {
    detailsButton.textContent = "View more details";
    detailsButton.disabled = false;
    detailsButton.classList.remove("d-none");
    detailsButton.onclick = () => showFullApplicationDetails(request, profile);
  }

  detailsFooter?.classList.remove("d-none");
  document.body.classList.add("request-modal-open");
  modal.classList.remove("d-none");
}

function renderFullApplicationDetails(request, profile) {
  const details = request.details || {};
  const formFields = [
    ["First name", profile?.firstname],
    ["Last name", profile?.lastname],
    ["Address or operating area", profile?.address],
    ["Experience level", details.experienceLevel],
    ["Main activity category", details.activityCategory],
    ["Why do you want to become a publisher?", details.motivation],
    ["What kind of activities would you like to publish?", details.activityPlan],
    ["Website, portfolio, or social links", details.links],
  ];

  return formFields.map(([label, value]) => `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "Not provided")}</dd>
    </div>
  `).join("");
}

function showFullApplicationDetails(request, profile) {
  const body = document.getElementById("request-modal-body");
  const card = document.querySelector("#request-modal .request-modal-card");
  const detailsButton = document.getElementById("request-modal-details");
  const detailsFooter = document.querySelector(".request-modal-footer");
  if (!body || !detailsButton) return;

  card?.classList.add("is-full-details");
  body.innerHTML = `
    <div class="request-full-details request-full-details-visible">
      <h3>Full application</h3>
      <dl class="request-detail-list">
        ${renderFullApplicationDetails(request, profile)}
      </dl>
    </div>
  `;
  body.scrollTop = 0;
  detailsButton.classList.add("d-none");
  detailsFooter?.classList.add("d-none");
}

function closeRequestModal() {
  document.getElementById("request-modal")?.classList.add("d-none");
  document.body.classList.remove("request-modal-open");
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
  document.getElementById("request-cancel-close")?.addEventListener("click", closeCancelRequestModal);
  document.getElementById("request-cancel-keep")?.addEventListener("click", closeCancelRequestModal);
  document.getElementById("request-cancel-confirm")?.addEventListener("click", cancelPublisherRequest);
  document.getElementById("request-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "request-modal") {
      closeRequestModal();
    }
  });
  document.getElementById("request-cancel-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "request-cancel-modal") {
      closeCancelRequestModal();
    }
  });

  loadRequests();
});
