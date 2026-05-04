const MOCK_ACTIVITY = {
  id: 42,
  title: "Macaron Workshop",
  address: "10 rue de Vanves, 92130 Issy-les-Moulineaux",
  price: 300,
  creationDate: "12 March 2026",
  groupSize: 10,
  average_rating: 4.7,
  description:
    "Join us for a delicious and creative workshop where you will learn how to make tasty homemade macarons. Guided by an experienced pastry chef, you will discover the secrets of a perfect shell and leave with your own creations.",
  creator: {
    first_name: "Jean",
    last_name: "Dupont",
    rating: 4.8,
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  },
  images: [
    "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514517220017-8ce97a34a7b6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  ],
  reviews: [
    {
      auteur: "Alice",
      note: 5,
      commentaire:
        "Great activity, very warm welcome and clear explanations from start to finish.",
    },
    {
      auteur: "Lucas",
      note: 4.5,
      commentaire:
        "A really enjoyable time, the macarons were excellent. I recommend it.",
    },
    {
      auteur: "Sophie",
      note: 4.8,
      commentaire:
        "Well-organized workshop, friendly atmosphere and a very educational host.",
    },
    {
      auteur: "Nina",
      note: 4.2,
      commentaire:
        "Very nice, I just would have liked a little more time for decoration.",
    },
  ],
  events: [
    {
      id: 1,
      date: "2026-05-12T18:00:00.000Z",
      id_activity: 42,
    },
    {
      id: 2,
      date: "2026-05-19T18:30:00.000Z",
      id_activity: 42,
    },
    {
      id: 3,
      date: "2026-06-02T19:00:00.000Z",
      id_activity: 42,
    },
  ],
};

const EVENT_API_URL = "http://localhost:3000/event";
const RESERVATION_API_URL = "http://localhost:3000/reservation";
const AUTH_API_URL = "http://localhost:3000/authentication";
const AUTH_USER_STORAGE_KEY = "meetando_current_user";
const AUTH_FALLBACK_MAX_AGE_MS = 12 * 60 * 60 * 1000;

let currentReservationEvents = [];
let selectedReservationQuantities = new Map();
let currentReservationActivity = null;

async function getActivity(id) {
  try {
    const response = await fetch(`http://localhost:3000/activity/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Error while fetching activity:", error);
    return MOCK_ACTIVITY; // Fallback sur le mock en cas d'erreur
  }
}

function getStoredAuthenticatedUser() {
  try {
    const rawUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    const authenticatedAt = Number(parsedUser?.authenticatedAt);
    const isRecentAuthentication =
      Number.isInteger(authenticatedAt) &&
      Date.now() - authenticatedAt < AUTH_FALLBACK_MAX_AGE_MS;

    return isRecentAuthentication ? parsedUser : null;
  } catch (error) {
    console.warn("Unable to read stored authenticated user:", error);
    return null;
  }
}

async function getCurrentUser() {
  try {
    const response = await fetch(AUTH_API_URL, {
      credentials: "include",
    });

    if (!response.ok) {
      return getStoredAuthenticatedUser();
    }

    return await response.json();
  } catch (error) {
    console.warn("Unable to fetch current user for reservation:", error);
    return getStoredAuthenticatedUser();
  }
}

function getAuthenticatedUserId(user) {
  const userId = Number(
    user?.id ?? user?.id_user ?? user?.userId ?? user?.user_id,
  );
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function redirectToLoginForReservation(activityId) {
  const params = new URLSearchParams({
    authMessage: "You must be logged in to reserve an event.",
    redirect: `Activity.html?id=${activityId}`,
  });

  window.location.href = `Login.html?${params.toString()}`;
}

async function getActivityEvents(activityId, activity) {
  const activityGroupSize = Number(
    activity?.group_size || activity?.groupSize || 0,
  );
  const embeddedEvents = normalizeEvents(
    activity?.events || activity?.eventSlots,
    activityId,
    activityGroupSize,
  );

  try {
    const response = await fetch(`${EVENT_API_URL}?activityId=${activityId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const events = await response.json();
    const normalizedEvents = normalizeEvents(events, activityId);
    return normalizedEvents.length ? normalizedEvents : embeddedEvents;
  } catch (error) {
    console.error("Error while fetching activity events:", error);
    return embeddedEvents;
  }
}

function normalizeEvents(events, activityId, defaultActivityGroupSize = 0) {
  if (!Array.isArray(events)) return [];

  return events
    .map((event, index) => {
      const rawDate =
        event?.date && event?.heure
          ? `${event.date}T${event.heure}`
          : event?.date || event?.datetime || event?.start_at;
      if (!rawDate) return null;

      const eventActivityId = Number(
        event?.id_activity || event?.activityId || event?.idActivity,
      );
      const currentActivityId = Number(activityId);

      if (
        Number.isInteger(eventActivityId) &&
        Number.isInteger(currentActivityId) &&
        eventActivityId !== currentActivityId
      ) {
        return null;
      }

      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return null;

      return {
        id: event?.id ?? `${activityId}-${index}`,
        date,
        availablePlaces: getEventAvailablePlaces(event, defaultActivityGroupSize),
        reservedPlaces: Number(
          event?.reserved_places || event?.reservedPlaces || 0,
        ),
        activityGroupSize: Number(
          event?.activity_group_size ||
            event?.activityGroupSize ||
            event?.group_size ||
            0,
        ),
      };
    })
    .filter(Boolean)
    .sort((firstEvent, secondEvent) => firstEvent.date - secondEvent.date);
}

function getEventAvailablePlaces(event, defaultActivityGroupSize = 0) {
  const availablePlaces = Number(
    event?.available_places ?? event?.availablePlaces,
  );

  if (Number.isInteger(availablePlaces) && availablePlaces >= 0) {
    return availablePlaces;
  }

  const activityGroupSize = Number(
    event?.activity_group_size ||
      event?.activityGroupSize ||
      event?.group_size ||
      defaultActivityGroupSize,
  );
  const reservedPlaces = Number(
    event?.reserved_places || event?.reservedPlaces || 0,
  );

  if (Number.isInteger(activityGroupSize) && activityGroupSize >= 0) {
    return Math.max(activityGroupSize - reservedPlaces, 0);
  }

  return 0;
}

function formatEventDateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderContactButton() {
  return `
    <div class="d-none d-md-block">
      ${BoutonBleu("Contact")}
    </div>
    <div class="d-md-none creator-contact-icon" aria-label="Contact via private message">
      ${BoutonBleu(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M20.595 4.17a4.78 4.78 0 0 0-3.33-1.38H6.695a4.71 4.71 0 0 0-4.72 4.72v6.6a4.71 4.71 0 0 0 4.72 4.72h2.36l1.94 1.94c.133.14.293.253.47.33a1.4 1.4 0 0 0 1.09 0a1.5 1.5 0 0 0 .45-.31l2-2h2.33a4.73 4.73 0 0 0 3.33-1.38a4.8 4.8 0 0 0 1-1.53a4.7 4.7 0 0 0 .36-1.81v-6.6a4.7 4.7 0 0 0-1.43-3.3m-5.08 7.7h-2.55v2.53a1 1 0 1 1-2 0v-2.53h-2.53a1 1 0 1 1 0-2h2.53V7.32a1 1 0 0 1 2 0v2.55h2.55a1 1 0 1 1 0 2"/></svg>
      `)}
    </div>
  `;
}

function renderReportButton() {
  return `
    <div class="d-none d-md-block">
      ${BoutonRouge("Report")}
    </div>
    <div class="d-md-none activity-report-icon" aria-label="Report activity">
      ${BoutonRouge(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M18 3a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-4.724l-4.762 2.857a1 1 0 0 1-1.508-.743L7 21v-2H6a4 4 0 0 1-3.995-3.8L2 15V7a4 4 0 0 1 4-4zm-6 10a1 1 0 0 0-1 1v.01a1 1 0 0 0 2 0V14a1 1 0 0 0-1-1m0-6a1 1 0 0 0-1 1v3a1 1 0 0 0 2 0V8a1 1 0 0 0-1-1"/></svg>
      `)}
    </div>
  `;
}

function renderActivity(activity) {
  document.getElementById("activity-title").textContent = activity.title;
  document.getElementById("activity-report-button").innerHTML =
    renderReportButton();
  document.getElementById("activity-address-text").textContent =
    activity.address;
  document.getElementById("activity-description-text").textContent =
    activity.description;
  document.getElementById("activity-participate-button").innerHTML =
    BoutonBleu("Join");
  document.getElementById("activity-review-button").innerHTML =
    BoutonBleu("Leave a review");
  document.getElementById("creator-contact-button").innerHTML =
    renderContactButton();
  document.getElementById("activity-group-size").textContent =
    `Group size: ${activity.group_size} people`;
  document.getElementById("activity-price").textContent =
    `Price: ${activity.price} EUR`;
  document.getElementById("activity-reviews-rating").textContent =
    `${activity.average_rating} / 5`;
  document.getElementById("activity-reviews-list").innerHTML = (
    activity.reviews || []
  )
    .map(
      (avis) => `
        <div class="card border-0 bg-body-tertiary mb-3">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
              <p class="mb-0 fw-semibold">${avis.auteur}</p>
              <span class="d-flex align-items-center gap-2 fw-semibold">
                <span class="review-star-icon" aria-hidden="true">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="m12 17.27l6.18 3.73l-1.64-7.03L22 9.24l-7.19-.61L12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21z"
                    />
                  </svg>
                </span>
                ${avis.note} / 5
              </span>
            </div>
            <p class="mb-0">${avis.commentaire}</p>
          </div>
        </div>
      `,
    )
    .join("");
  document.getElementById("activity-created-by").textContent =
    "Activity created by";
  document.getElementById("creator-avatar").src = activity.creator?.photo || "";
  document.getElementById("creator-name").textContent = activity.creator
    ? `${activity.creator.first_name || ""} ${activity.creator.last_name || ""}`
    : "";
  document.getElementById("creator-rating").textContent = activity.creator
    ? `Rating: ${activity.creator.rating} / 5`
    : "";
  document.getElementById("activity-images").innerHTML = `
    <div
      id="activityCarousel"
      class="carousel slide"
      data-bs-ride="false"
    >
      <div class="carousel-inner">
        ${(activity.images || [])
          .map(
            (image, index) => `
              <div class="carousel-item ${index === 0 ? "active" : ""}">
                <img
                  src="${image}"
                  class="d-block w-100 activity-image"
                  alt="Activity image ${index + 1}"
                />
              </div>
            `,
          )
          .join("")}
      </div>
      <button
        class="carousel-control-prev"
        type="button"
        data-bs-target="#activityCarousel"
        data-bs-slide="prev"
      >
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
      </button>
      <button
        class="carousel-control-next"
        type="button"
        data-bs-target="#activityCarousel"
        data-bs-slide="next"
      >
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
      </button>
    </div>
  `;
  document.title = activity.title;
}

document.addEventListener("DOMContentLoaded", async () => {
  // Get the ID from the URL: ?id=1
  const params = new URLSearchParams(window.location.search);
  const activityId = params.get("id") || 1; // Default to 1 if no ID is provided
  const activity = await getActivity(activityId);
  const resolvedActivityId = activity?.id || activityId;
  renderActivity(activity);

  // Initialize the report modal
  initReportModal();
  initReservationModal(resolvedActivityId, activity);
});

let reportModal = null;
let reservationEventsModal = null;

function initReportModal() {
  // Get the Report button and attach an event listener
  const reportButton = document.querySelector(
    "#activity-report-button .buttonRo",
  );
  const modalElement = document.getElementById("reportActivityModal");

  if (modalElement) {
    reportModal = new bootstrap.Modal(modalElement);
  }

  if (reportButton) {
    reportButton.addEventListener("click", () => {
      reportModal?.show();
    });
  }

  // Handle form submission
  const submitBtn = document.getElementById("report-submit-btn");
  const reportForm = document.getElementById("report-form");

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const reason = document.getElementById("report-reason").value;
      const description = document.getElementById("report-description").value;

      if (!reason) {
        alert("Please select a reason.");
        return;
      }

      // Show a confirmation message
      alert("Thank you for your report. Our team will review it.");

      // Reset the form
      reportForm.reset();

      // Close the modal
      reportModal?.hide();

      // TODO: Send the data to the backend
      // await fetch('http://localhost:3000/reports', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     activityId,
      //     reason,
      //     description
      //   })
      // });
    });
  }
}

function initReservationModal(activityId, activity) {
  const joinButton = document.querySelector(
    "#activity-participate-button .buttonCo",
  );
  const modalElement = document.getElementById("reservationEventsModal");

  if (modalElement) {
    reservationEventsModal = new bootstrap.Modal(modalElement);
  }

  if (!joinButton || !modalElement) return;

  joinButton.addEventListener("click", async () => {
    const currentUser = await getCurrentUser();

    if (!getAuthenticatedUserId(currentUser)) {
      redirectToLoginForReservation(activityId);
      return;
    }

    currentReservationActivity = activity;
    selectedReservationQuantities = new Map();
    currentReservationEvents = [];
    reservationEventsModal?.show();
    renderReservationEventsLoading();

    const events = await getActivityEvents(activityId, activity);
    currentReservationEvents = events;
    renderReservationEvents(events);
  });

  document
    .getElementById("reservation-review-button")
    ?.addEventListener("click", renderReservationSummary);

  document
    .getElementById("reservation-confirm-button")
    ?.addEventListener("click", submitReservations);
}

function renderReservationEventsLoading() {
  const list = document.getElementById("reservation-events-list");
  const feedback = document.getElementById("reservation-events-feedback");

  if (feedback) {
    feedback.textContent = "Loading available events...";
    feedback.className = "mb-3 text-secondary";
  }

  if (list) {
    list.innerHTML = `
      <div class="reservation-empty-state" role="status">
        Loading...
      </div>
    `;
  }

  document.getElementById("reservation-summary")?.classList.add("d-none");
  updateReservationFooterState();
}

function renderReservationEvents(events) {
  const list = document.getElementById("reservation-events-list");
  const feedback = document.getElementById("reservation-events-feedback");
  if (!list || !feedback) return;

  if (!events.length) {
    feedback.textContent = "No events are available for this activity yet.";
    feedback.className = "mb-3 text-secondary";
    list.innerHTML = "";
    updateReservationFooterState();
    return;
  }

  feedback.textContent = "Choose an event to reserve your spot.";
  feedback.className = "mb-3 text-secondary";
  list.innerHTML = events
    .map(
      (event) => `
        <div class="reservation-event-row" role="listitem">
          <div>
            <p class="reservation-event-title mb-1">Event</p>
            <p class="reservation-event-date mb-0">${formatEventDateTime(event.date)}</p>
            <p class="reservation-event-availability mb-0">
              ${event.availablePlaces} places available
            </p>
          </div>
          <div
            class="reservation-quantity-control"
            data-event-id="${event.id}"
          >
            <button
              type="button"
              class="btn btn-outline-primary reservation-quantity-button"
              data-reservation-action="decrease"
              aria-label="Decrease reserved places"
              ${event.availablePlaces === 0 ? "disabled" : ""}
            >
              -
            </button>
            <input
              type="number"
              class="form-control reservation-quantity-input"
              value="0"
              min="0"
              max="${event.availablePlaces}"
              inputmode="numeric"
              aria-label="Reserved places"
              ${event.availablePlaces === 0 ? "disabled" : ""}
            />
            <button
              type="button"
              class="btn btn-outline-primary reservation-quantity-button"
              data-reservation-action="increase"
              aria-label="Increase reserved places"
              ${event.availablePlaces === 0 ? "disabled" : ""}
            >
              +
            </button>
          </div>
        </div>
      `,
    )
    .join("");

  bindReservationQuantityControls();
  updateReservationFooterState();
}

function bindReservationQuantityControls() {
  document
    .querySelectorAll(".reservation-quantity-control")
    .forEach((control) => {
      const eventId = control.dataset.eventId;
      const input = control.querySelector(".reservation-quantity-input");

      control
        .querySelectorAll(".reservation-quantity-button")
        .forEach((button) => {
          button.addEventListener("click", () => {
            const currentValue = Number(input.value || 0);
            const nextValue =
              button.dataset.reservationAction === "increase"
                ? currentValue + 1
                : currentValue - 1;

            setReservationQuantity(eventId, nextValue, input);
          });
        });

      input.addEventListener("input", () => {
        setReservationQuantity(eventId, Number(input.value || 0), input);
      });
    });
}

function setReservationQuantity(eventId, requestedQuantity, input) {
  const event = currentReservationEvents.find(
    (reservationEvent) => String(reservationEvent.id) === String(eventId),
  );
  const maxQuantity = event?.availablePlaces || 0;
  const quantity = Math.min(
    Math.max(Math.floor(Number(requestedQuantity) || 0), 0),
    maxQuantity,
  );

  input.value = quantity;

  if (quantity > 0) {
    selectedReservationQuantities.set(String(eventId), quantity);
  } else {
    selectedReservationQuantities.delete(String(eventId));
  }

  document.getElementById("reservation-summary")?.classList.add("d-none");
  updateReservationFooterState();
}

function updateReservationFooterState() {
  const reviewButton = document.getElementById("reservation-review-button");
  const confirmButton = document.getElementById("reservation-confirm-button");
  const hasSelection = selectedReservationQuantities.size > 0;

  if (reviewButton) {
    reviewButton.disabled = !hasSelection;
    reviewButton.classList.remove("d-none");
  }

  if (confirmButton) {
    confirmButton.classList.add("d-none");
  }
}

function getSelectedReservationItems() {
  return [...selectedReservationQuantities.entries()]
    .map(([eventId, quantity]) => {
      const event = currentReservationEvents.find(
        (reservationEvent) => String(reservationEvent.id) === String(eventId),
      );

      return event ? { event, quantity } : null;
    })
    .filter(Boolean);
}

function renderReservationSummary() {
  const summary = document.getElementById("reservation-summary");
  const feedback = document.getElementById("reservation-events-feedback");
  const reviewButton = document.getElementById("reservation-review-button");
  const confirmButton = document.getElementById("reservation-confirm-button");
  const selectedItems = getSelectedReservationItems();

  if (!summary || !feedback || !selectedItems.length) return;

  feedback.textContent = "Review your reservation before confirming.";
  feedback.className = "mb-3 text-secondary";
  summary.classList.remove("d-none");
  summary.innerHTML = `
    <h3 class="reservation-summary-title">Reservation summary</h3>
    <ul class="reservation-summary-list mb-0">
      ${selectedItems
        .map(
          ({ event, quantity }) => `
            <li>
              <span>${formatEventDateTime(event.date)}</span>
              <strong>${quantity} ${quantity === 1 ? "place" : "places"}</strong>
            </li>
          `,
        )
        .join("")}
    </ul>
  `;

  reviewButton?.classList.add("d-none");
  confirmButton?.classList.remove("d-none");
}

async function submitReservations() {
  const confirmButton = document.getElementById("reservation-confirm-button");
  const feedback = document.getElementById("reservation-events-feedback");
  const selectedItems = getSelectedReservationItems();

  if (!selectedItems.length) return;

  const currentUser = await getCurrentUser();
  const userId = getAuthenticatedUserId(currentUser);

  if (!userId) {
    redirectToLoginForReservation(currentReservationActivity?.id || "");
    return;
  }

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent = "Confirming...";
  }

  if (feedback) {
    feedback.textContent = "Sending your reservation...";
    feedback.className = "mb-3 text-secondary";
  }

  try {
    await Promise.all(
      selectedItems.map(({ event, quantity }) =>
        fetch(RESERVATION_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            date: new Date().toISOString(),
            group_size: quantity,
            id_user: userId,
            id_event: Number(event.id),
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}`);
          }
        }),
      ),
    );

    selectedReservationQuantities = new Map();
    document.getElementById("reservation-summary")?.classList.add("d-none");
    if (feedback) {
      feedback.textContent = "Your reservation has been confirmed.";
      feedback.className = "mb-3 text-success";
    }
    const refreshedEvents = await getActivityEvents(
      currentReservationActivity.id,
      currentReservationActivity,
    );
    currentReservationEvents = refreshedEvents;
    renderReservationEvents(refreshedEvents);
  } catch (error) {
    console.error("Error while creating reservation:", error);
    if (feedback) {
      feedback.textContent =
        error.message || "Unable to confirm your reservation.";
      feedback.className = "mb-3 text-danger";
    }
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = "Confirm reservation";
    }
  }
}
