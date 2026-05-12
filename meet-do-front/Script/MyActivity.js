const MOCK_MY_ACTIVITIES = [
  {
    id: 1,
    title: "Macaron Workshop",
    theme: "Art, Food",
    address: "10 rue de Vanves, 92130 Issy-les-Moulineaux",
    price: 30,
    image:
      "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=1200&q=80",
    eventSlots: [{ date: "2026-05-01", heure: "18:00" }],
  },
  {
    id: 2,
    title: "Park Running Session",
    theme: "Sports, Well-being",
    address: "Parc Monceau, 75008 Paris",
    price: 12,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    eventSlots: [],
  },
  {
    id: 3,
    title: "Thursday Book Club",
    theme: "Reading, Culture",
    address: "Bibliothèque municipale, 92100 Boulogne-Billancourt",
    price: 8,
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
    eventSlots: [{ date: "2026-04-10", heure: "19:00" }],
  },
];

const AUTH_USER_STORAGE_KEY = "meetando_current_user";

let activityActionsModal = null;
let activityDeleteConfirmModal = null;
let selectedActivity = null;
let myActivities = [];
let currentUser = null;

function getMeetDoApiUrl() {
  const hostname = window.location.hostname;
  const apiHostname = hostname || "localhost";

  return `http://${apiHostname}:3000`;
}

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const userId = Number(params.get("userId"));
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function getStoredAuthenticatedUser() {
  try {
    const rawUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    return parsedUser && typeof parsedUser === "object" ? parsedUser : null;
  } catch (error) {
    console.warn("Unable to read stored authenticated user:", error);
    return null;
  }
}

function getAuthenticatedUserId(user) {
  const currentUserId = Number(user?.id);
  const storedUserId = Number(getStoredAuthenticatedUser()?.id);
  const userIdFromUrl = getUserIdFromUrl();

  if (Number.isInteger(currentUserId) && currentUserId > 0) {
    return currentUserId;
  }

  if (Number.isInteger(storedUserId) && storedUserId > 0) {
    return storedUserId;
  }

  return userIdFromUrl;
}

function redirectToActivityBuilder() {
  if (!currentUser?.id) {
    const params = new URLSearchParams({
      authMessage: "Vous devez etre connecte pour creer une activite.",
      redirect: "ActivityBuilder.html",
    });
    window.location.href = `Login.html?${params.toString()}`;
    return;
  }

  const params = new URLSearchParams({
    userId: String(currentUser.id),
  });
  window.location.href = `ActivityBuilder.html?${params.toString()}`;
}

async function getCurrentUser() {
  try {
    const response = await fetch(`${getMeetDoApiUrl()}/authentication/me`, {
      credentials: "include",
    });

    if (!response.ok) {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn("Unable to fetch current user for my activities:", error);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    return null;
  }
}

async function getMyActivities(userId) {
  if (!userId) {
    return [];
  }

  try {
    const response = await fetch(`${getMeetDoApiUrl()}/activity?userId=${userId}`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const activities = await response.json();
    return Array.isArray(activities) ? activities : [];
  } catch (error) {
    console.error("Error while fetching activities:", error);
    return [];
  }
}

function normalizeEventSlots(eventSlots) {
  if (!Array.isArray(eventSlots)) return [];

  return eventSlots
    .map((eventSlot) => {
      const rawDate = typeof eventSlot?.date === "string" ? eventSlot.date : "";
      const date = rawDate.includes("T") ? rawDate.slice(0, 10) : rawDate;
      const heure =
        typeof eventSlot?.heure === "string" && eventSlot.heure
          ? eventSlot.heure.slice(0, 5)
          : rawDate.includes("T")
            ? rawDate.slice(11, 16)
            : "";

      if (!date || !heure) return null;
      return { date, heure };
    })
    .filter(Boolean)
    .sort((a, b) => `${a.date}T${a.heure}`.localeCompare(`${b.date}T${b.heure}`));
}

function getUpcomingEventSlots(activity) {
  const now = new Date();
  return normalizeEventSlots(activity?.eventSlots).filter((eventSlot) => {
    const slotDate = new Date(`${eventSlot.date}T${eventSlot.heure}`);
    return !Number.isNaN(slotDate.getTime()) && slotDate > now;
  });
}

function formatEventDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatEventSlot(eventSlot) {
  return `${formatEventDate(eventSlot.date)} a ${eventSlot.heure}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setDeleteFeedback(message, tone = "muted") {
  const feedback = document.getElementById("activity-delete-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.remove("text-danger", "text-muted", "text-success");
  if (message) {
    feedback.classList.add(
      tone === "error" ? "text-danger" : tone === "success" ? "text-success" : "text-muted",
    );
  }
}

function renderMyActivities(activities) {
  const container = document.getElementById("my-activities-list");
  if (!container) return;

  if (!activities.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-light border mb-0" role="status">
          You haven't created any activities yet.
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = activities
    .map((activity) => {
      const categories = Array.isArray(activity.theme)
        ? activity.theme
        : typeof activity.theme === "string"
          ? activity.theme.split(",").map((value) => value.trim()).filter(Boolean)
          : [];
      const city = activity.address ? activity.address.split(", ").pop() : "";
      const eventSlots = normalizeEventSlots(activity.eventSlots);

      return `
        <div class="col-12 col-md-6">
          <article class="card h-100 border-0 shadow-sm activity-card">
            <img
              src="${activity.image || activity.images?.[0] || "https://placehold.co/1200x800?text=Activity"}"
              class="card-img-top activity-card-image"
              alt="${escapeHtml(activity.title)}"
            />
            <div class="card-body d-flex flex-column p-4">
              <div class="d-flex flex-wrap gap-2 mb-3">
                ${categories
                  .map(
                    (category) =>
                      `<span class="badge activity-badge">${escapeHtml(category)}</span>`,
                  )
                  .join("")}
                <span class="badge text-bg-light border">${eventSlots.length} events</span>
              </div>
              <h2 class="h4 fw-bold mb-2">${escapeHtml(activity.title)}</h2>
              <p class="card-text text-secondary mb-1">${escapeHtml(city)}</p>
              <p class="card-text fw-semibold mb-4">${escapeHtml(activity.price)} EUR / person</p>
              <div class="mt-auto d-flex flex-wrap justify-content-center gap-3">
                <div class="activity-action-button">${BoutonBleu("View activity")}</div>
                <div
                  class="activity-action-button activity-actions-trigger"
                  data-activity-id="${activity.id}"
                >
                  ${BoutonRouge("Actions")}
                </div>
              </div>
            </div>
          </article>
        </div>
      `;
    })
    .join("");

  container
    .querySelectorAll(".activity-actions-trigger .buttonRo")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        const trigger = event.currentTarget.closest(
          ".activity-actions-trigger",
        );
        const activityId = Number(trigger?.dataset.activityId);
        openActivityActionsModal(activityId);
      });
    });
}

function renderActivityActionModalButtons() {
  const editButton = document.getElementById("modal-edit-activity-button");
  const deleteButton = document.getElementById("modal-delete-activity-button");
  const confirmDeleteButton = document.getElementById(
    "activity-confirm-delete-button",
  );

  if (editButton) {
    editButton.innerHTML = BoutonBleu("Edit activity");
  }

  if (deleteButton) {
    deleteButton.innerHTML = BoutonRouge("Delete activity");
  }

  if (confirmDeleteButton) {
    confirmDeleteButton.innerHTML = BoutonRouge("Confirm deletion");
  }
}

function openActivityActionsModal(activityId) {
  selectedActivity =
    myActivities.find((activity) => activity.id === activityId) ||
    MOCK_MY_ACTIVITIES.find((activity) => activity.id === activityId) ||
    null;

  const modalText = document.getElementById("activity-actions-modal-text");
  if (modalText) {
    modalText.textContent = selectedActivity
      ? `Choose an action for "${selectedActivity.title}".`
      : "";
  }

  activityActionsModal?.show();
}

function openDeleteConfirmationModal() {
  if (!selectedActivity) return;

  const upcomingSlots = getUpcomingEventSlots(selectedActivity);
  const confirmText = document.getElementById("activity-delete-confirm-text");
  const upcomingWrapper = document.getElementById(
    "activity-delete-upcoming-wrapper",
  );
  const upcomingList = document.getElementById("activity-delete-upcoming-list");
  const confirmDeleteButton = document.querySelector(
    "#activity-confirm-delete-button .buttonRo",
  );

  if (confirmText) {
    confirmText.textContent = `Are you sure you want to delete the activity "${selectedActivity.title}"?`;
  }

  if (upcomingWrapper && upcomingList) {
    if (upcomingSlots.length) {
      upcomingWrapper.classList.remove("d-none");
      upcomingList.innerHTML = upcomingSlots
        .map((eventSlot) => `<li>${escapeHtml(formatEventSlot(eventSlot))}</li>`)
        .join("");
      setDeleteFeedback(
        "Deletion is not possible while upcoming time slots exist.",
        "error",
      );
    } else {
      upcomingWrapper.classList.add("d-none");
      upcomingList.innerHTML = "";
      setDeleteFeedback(
        "This activity has no upcoming time slots. Deletion is permanent.",
      );
    }
  }

  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = upcomingSlots.length > 0;
  }

  activityActionsModal?.hide();
  activityDeleteConfirmModal?.show();
}

async function deleteSelectedActivity() {
  if (!selectedActivity?.id) return;

  const upcomingSlots = getUpcomingEventSlots(selectedActivity);
  if (upcomingSlots.length) {
    setDeleteFeedback(
      "Deletion is not possible while upcoming time slots exist.",
      "error",
    );
    return;
  }

  const confirmDeleteButton = document.querySelector(
    "#activity-confirm-delete-button .buttonRo",
  );

  if (confirmDeleteButton) {
    confirmDeleteButton.disabled = true;
    confirmDeleteButton.textContent = "Deleting...";
  }

  try {
    const response = await fetch(`${getMeetDoApiUrl()}/activity/${selectedActivity.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(errorBody?.message || `HTTP ${response.status}`);
    }

    myActivities = myActivities.filter((activity) => activity.id !== selectedActivity.id);
    renderMyActivities(myActivities);
    activityDeleteConfirmModal?.hide();
    selectedActivity = null;
  } catch (error) {
    console.error("Error while deleting activity:", error);
    setDeleteFeedback(
      error instanceof Error
        ? error.message
        : "Activity deletion failed.",
      "error",
    );
  } finally {
    if (confirmDeleteButton) {
      confirmDeleteButton.disabled = false;
      confirmDeleteButton.textContent = "Confirm deletion";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await getCurrentUser();
  const authenticatedUserId = getAuthenticatedUserId(currentUser);
  const activities = await getMyActivities(authenticatedUserId);
  myActivities = activities;
  renderMyActivities(activities);

  const createButton = document.getElementById("create-activity-button");
  if (createButton) {
    createButton.innerHTML = BoutonBleu("Create an activity");
    const createActivityButton = createButton.querySelector(".buttonCo");
    createActivityButton?.addEventListener("click", (event) => {
      event.preventDefault();
      redirectToActivityBuilder();
    });
  }

  renderActivityActionModalButtons();

  const actionModalElement = document.getElementById("activityActionsModal");
  if (actionModalElement) {
    activityActionsModal = new bootstrap.Modal(actionModalElement);
  }

  const deleteModalElement = document.getElementById(
    "activityDeleteConfirmModal",
  );
  if (deleteModalElement) {
    activityDeleteConfirmModal = new bootstrap.Modal(deleteModalElement);
    deleteModalElement.addEventListener("hidden.bs.modal", () => {
      setDeleteFeedback("");
    });
  }

  const editButton = document.querySelector(
    "#modal-edit-activity-button .buttonCo",
  );
  if (editButton) {
    editButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (!selectedActivity?.id) return;

      window.location.href = `EditActivity.html?id=${selectedActivity.id}`;
    });
  }

  const deleteButton = document.querySelector(
    "#modal-delete-activity-button .buttonRo",
  );
  if (deleteButton) {
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      openDeleteConfirmationModal();
    });
  }

  const confirmDeleteButton = document.querySelector(
    "#activity-confirm-delete-button .buttonRo",
  );
  if (confirmDeleteButton) {
    confirmDeleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      deleteSelectedActivity();
    });
  }
});
