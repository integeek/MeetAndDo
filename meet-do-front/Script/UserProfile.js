const USER_PROFILE_AVATAR_PLACEHOLDER = "../Assets/img/icon-profil.png";
const AUTH_USER_STORAGE_KEY = "meetando_current_user";

let displayedProfileUser = null;
let displayedProfileUserId = null;
let displayedProfileUuid = null;

function getMeetDoApiUrl() {
  const hostname = window.location.hostname;
  const apiHostname = hostname || "localhost";

  return `http://${apiHostname}:3000`;
}

function intToUUID(id) {
  return `00000000-0000-0000-0000-${String(id).padStart(12, "0")}`;
}

function uuidToInt(uuid) {
  const match = String(uuid || "").match(/([0-9]+)$/);
  if (!match) return null;

  const userId = Number(match[1]);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function getRequestedProfileIdentity() {
  const params = new URLSearchParams(window.location.search);
  const userId = Number(params.get("userId") || params.get("id"));
  const uuid = params.get("uuid");
  const firstname = params.get("firstname") || "";
  const lastname = params.get("lastname") || "";
  const name = params.get("name") || "";
  const fallbackUser = {
    id: Number.isInteger(userId) && userId > 0 ? userId : uuidToInt(uuid),
    uuid,
    firstname,
    lastname,
    email: params.get("email") || "",
    avatar_url: params.get("avatar") || params.get("avatar_url") || "",
    photo: params.get("photo") || "",
    role: params.get("role") || "",
  };

  if (name && !firstname && !lastname) {
    const [firstNamePart, ...lastNameParts] = name.split(" ");
    fallbackUser.firstname = firstNamePart || "";
    fallbackUser.lastname = lastNameParts.join(" ");
  }

  return {
    userId: Number.isInteger(userId) && userId > 0 ? userId : uuidToInt(uuid),
    uuid,
    fallbackUser,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getUserFullName(user) {
  const firstName = user?.firstname || user?.first_name || "";
  const lastName = user?.lastname || user?.last_name || "";
  return `${firstName} ${lastName}`.trim() || user?.email || "Meet&Do member";
}

function getUserId(user, fallbackId = null) {
  const userId = Number(user?.id ?? user?.id_user ?? user?.userId);
  return Number.isInteger(userId) && userId > 0 ? userId : fallbackId;
}

function getUserUuid(user, fallbackUuid = "") {
  return user?.uuid || user?.user_uuid || fallbackUuid || "";
}

function isPublisher(user) {
  const role = String(user?.role || user?.user_role || "").toLowerCase();
  return role === "publisher";
}

function mergeProfileUser(primaryUser, fallbackUser) {
  return {
    ...(fallbackUser || {}),
    ...(primaryUser || {}),
    firstname:
      primaryUser?.firstname ||
      primaryUser?.first_name ||
      fallbackUser?.firstname ||
      fallbackUser?.first_name ||
      "",
    lastname:
      primaryUser?.lastname ||
      primaryUser?.last_name ||
      fallbackUser?.lastname ||
      fallbackUser?.last_name ||
      "",
    avatar_url:
      primaryUser?.avatar_url ||
      primaryUser?.photo ||
      fallbackUser?.avatar_url ||
      fallbackUser?.photo ||
      "",
    role: primaryUser?.role || fallbackUser?.role || "",
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.json();
}

async function getPublicUserProfile({ userId, uuid }) {
  const apiUrl = getMeetDoApiUrl();
  const candidates = [];

  if (userId) {
    candidates.push(`${apiUrl}/user/${userId}`);
  }

  if (uuid || userId) {
    candidates.push(`${apiUrl}/messaging/users/${uuid || intToUUID(userId)}`);
  }

  for (const url of candidates) {
    try {
      const user = await fetchJson(url);
      if (user) return user;
    } catch (error) {
      console.warn("Unable to load user profile from", url, error);
    }
  }

  return null;
}

async function getPublisherActivities(userId) {
  if (!userId) return [];

  try {
    const activities = await fetchJson(
      `${getMeetDoApiUrl()}/activity?userId=${encodeURIComponent(userId)}`,
    );
    return Array.isArray(activities) ? activities : [];
  } catch (error) {
    console.warn("Unable to load publisher activities:", error);
    return [];
  }
}

function getStoredAuthenticatedUser() {
  try {
    const rawUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!rawUser) return null;

    const user = JSON.parse(rawUser);
    return user && typeof user === "object" ? user : null;
  } catch (error) {
    console.warn("Unable to read stored authenticated user:", error);
    return null;
  }
}

async function getCurrentUser() {
  try {
    const response = await fetch(`${getMeetDoApiUrl()}/authentication/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      return getStoredAuthenticatedUser();
    }

    return await response.json();
  } catch (error) {
    console.warn("Unable to fetch current user:", error);
    return getStoredAuthenticatedUser();
  }
}

function normalizeEventSlots(activity) {
  const slots = activity?.eventSlots || activity?.events || [];
  if (!Array.isArray(slots)) return [];

  return slots
    .map((slot) => {
      const rawDate = slot?.date || slot?.datetime || slot?.start_at;
      const rawTime = slot?.heure || slot?.time;
      const dateTime = rawTime ? `${rawDate}T${rawTime}` : rawDate;
      const date = new Date(dateTime);

      return Number.isNaN(date.getTime()) ? null : date;
    })
    .filter(Boolean)
    .sort((firstDate, secondDate) => firstDate - secondDate);
}

function formatNextEvent(activity) {
  const nextEvent = normalizeEventSlots(activity).find((slot) => slot >= new Date());
  if (!nextEvent) return "Dates available soon";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(nextEvent);
}

function renderUser(user, fallbackId, options = {}) {
  const name = getUserFullName(user);
  const avatar = document.getElementById("profile-avatar");

  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-role").textContent =
    isPublisher(user) || options.hasPublisherActivities ? "Publisher" : "Member";
  document.title = `${name} - Meet&Do`;

  if (avatar) {
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = USER_PROFILE_AVATAR_PLACEHOLDER;
    };
    avatar.src = user?.avatar_url || user?.photo || USER_PROFILE_AVATAR_PLACEHOLDER;
    avatar.alt = `${name} profile photo`;
  }

  const userId = getUserId(user, fallbackId);
  return userId;
}

function setActionFeedback(message = "", tone = "error") {
  const feedback = document.getElementById("profile-action-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle("d-none", !message);
  feedback.classList.toggle("is-success", tone === "success");
}

function redirectToLoginForContact() {
  const params = new URLSearchParams({
    authMessage: "You must be logged in to contact this user.",
    redirect: `UserProfile.html${window.location.search}`,
  });

  window.location.href = `Login.html?${params.toString()}`;
}

async function contactProfileUser() {
  setActionFeedback("");

  const currentUser = await getCurrentUser();
  const currentUserId = getUserId(currentUser);

  if (!currentUserId) {
    redirectToLoginForContact();
    return;
  }

  if (displayedProfileUserId && displayedProfileUserId === currentUserId) {
    setActionFeedback("You cannot contact yourself from your public profile.");
    return;
  }

  const targetUuid =
    displayedProfileUuid ||
    getUserUuid(displayedProfileUser) ||
    (displayedProfileUserId ? intToUUID(displayedProfileUserId) : "");

  if (!targetUuid) {
    setActionFeedback("This user cannot be contacted for the moment.");
    return;
  }

  window.location.href = `Messagerie.html?userId=${encodeURIComponent(
    targetUuid,
  )}`;
}

function openReportModal() {
  const modal = document.getElementById("profile-report-modal");
  const feedback = document.getElementById("profile-report-feedback");

  if (feedback) feedback.textContent = "";
  modal?.classList.remove("d-none");
}

function closeReportModal() {
  document.getElementById("profile-report-modal")?.classList.add("d-none");
  document.getElementById("profile-report-form")?.reset();
}

function submitProfileReport(event) {
  event.preventDefault();

  const reason = document.getElementById("profile-report-reason")?.value;
  const feedback = document.getElementById("profile-report-feedback");

  if (!reason) {
    if (feedback) {
      feedback.textContent = "Please select a reason.";
      feedback.style.color = "#b42318";
    }
    return;
  }

  if (feedback) {
    feedback.textContent =
      "Report saved locally for now. The backend will be connected after the reporting PR is merged.";
    feedback.style.color = "#157347";
  }
}

function initProfileActions() {
  const contactContainer = document.getElementById("profile-contact-button");
  const reportContainer = document.getElementById("profile-report-button");

  if (contactContainer) {
    contactContainer.innerHTML = BoutonBleu("Contact");
    contactContainer
      .querySelector(".buttonCo")
      ?.addEventListener("click", contactProfileUser);
  }

  if (reportContainer) {
    reportContainer.innerHTML = BoutonRouge("Report");
    reportContainer
      .querySelector(".buttonRo")
      ?.addEventListener("click", openReportModal);
  }

  document
    .getElementById("profile-report-form")
    ?.addEventListener("submit", submitProfileReport);
  document
    .getElementById("profile-report-close")
    ?.addEventListener("click", closeReportModal);
  document
    .getElementById("profile-report-cancel")
    ?.addEventListener("click", closeReportModal);
  document
    .getElementById("profile-report-modal")
    ?.addEventListener("click", (event) => {
      if (event.target.id === "profile-report-modal") {
        closeReportModal();
      }
    });
}

function renderActivities(activities) {
  const section = document.getElementById("publisher-activities-section");
  const list = document.getElementById("publisher-activities-list");
  if (!section || !list) return;

  section.classList.remove("d-none");

  document.getElementById("publisher-activities-subtitle").textContent =
    `${activities.length} activit${activities.length === 1 ? "y" : "ies"} from this publisher.`;

  if (!activities.length) {
    list.innerHTML = `
      <div class="col-12">
        <div class="profile-empty-state">
          This publisher has no activity currently available.
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = activities
    .map((activity) => {
      const image =
        activity.image ||
        activity.images?.[0] ||
        "https://placehold.co/1200x800?text=Activity";
      const city = activity.address ? activity.address.split(", ").pop() : "";

      return `
        <div class="col-12 col-md-6 col-xl-4">
          <article class="profile-activity-card">
            <img
              src="${escapeHtml(image)}"
              class="profile-activity-image"
              alt="${escapeHtml(activity.title || "Activity")}"
            />
            <div class="profile-activity-body">
              <h3 class="profile-activity-title mb-2">
                ${escapeHtml(activity.title || "Activity")}
              </h3>
              <p class="profile-activity-meta mb-2">
                ${escapeHtml(city || activity.address || "Location to be confirmed")}
              </p>
              <p class="profile-activity-meta mb-2">
                Next event: ${escapeHtml(formatNextEvent(activity))}
              </p>
              <p class="profile-activity-price mb-4">
                ${escapeHtml(activity.price ?? "")} EUR
              </p>
              <div class="profile-activity-button" data-activity-id="${escapeHtml(activity.id)}">
                ${BoutonBleu("View activity")}
              </div>
            </div>
          </article>
        </div>
      `;
    })
    .join("");

  list.querySelectorAll(".profile-activity-button .buttonCo").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const activityId = event.currentTarget.closest(".profile-activity-button")
        ?.dataset.activityId;
      if (activityId) {
        window.location.href = `Activity.html?id=${encodeURIComponent(activityId)}`;
      }
    });
  });
}

function showFeedback(message) {
  const feedback = document.getElementById("profile-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.remove("d-none");
}

document.addEventListener("DOMContentLoaded", async () => {
  const identity = getRequestedProfileIdentity();

  if (!identity.userId && !identity.uuid) {
    showFeedback("Unable to load this profile because no user was provided.");
    return;
  }

  const fetchedUser = await getPublicUserProfile(identity);
  const user = mergeProfileUser(fetchedUser, identity.fallbackUser);
  if (!user) {
    showFeedback("This profile could not be found.");
    return;
  }

  const userId = getUserId(user, identity.userId);
  displayedProfileUser = user;
  displayedProfileUserId = userId;
  displayedProfileUuid = getUserUuid(user, identity.uuid);
  const activities = await getPublisherActivities(userId);
  const hasPublisherActivities = activities.length > 0;

  renderUser(user, identity.userId, {
    hasPublisherActivities,
  });
  initProfileActions();

  if (isPublisher(user) || hasPublisherActivities) {
    renderActivities(activities);
  }
});
