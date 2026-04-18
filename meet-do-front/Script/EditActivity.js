const EMPTY_ACTIVITY_DRAFT = {
  id: null,
  title: "",
  images: [],
  existingImages: [],
  description: "",
  theme: [],
  eventSlots: [],
  address: "",
  group_size: "",
  price: "",
};

const ACTIVITY_API_URL = "http://localhost:3000/activity";
const activityDraft = structuredClone(EMPTY_ACTIVITY_DRAFT);

function getActivityIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const activityId = Number(params.get("id"));
  return Number.isFinite(activityId) && activityId > 0 ? activityId : null;
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
  return `${formatEventDate(eventSlot.date)} à ${eventSlot.heure}`;
}

function normalizeTheme(theme) {
  if (Array.isArray(theme)) return theme;
  if (typeof theme !== "string") return [];

  return theme
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeEventSlots(eventSlots) {
  if (!Array.isArray(eventSlots)) return [];

  return eventSlots
    .map((eventSlot) => {
      const rawDate = typeof eventSlot?.date === "string" ? eventSlot.date : "";
      const datePart = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
      const heure =
        typeof eventSlot?.heure === "string" && eventSlot.heure
          ? eventSlot.heure.slice(0, 5)
          : rawDate.includes("T")
            ? rawDate.slice(11, 16)
            : "";

      if (!datePart || !heure) return null;
      return { date: datePart, heure };
    })
    .filter(Boolean)
    .sort((a, b) => `${a.date}T${a.heure}`.localeCompare(`${b.date}T${b.heure}`));
}

function hydrateActivityDraft(activity) {
  activityDraft.id = activity.id ?? null;
  activityDraft.title = activity.title ?? "";
  activityDraft.images = [];
  activityDraft.existingImages = Array.isArray(activity.images) ? [...activity.images] : [];
  activityDraft.description = activity.description ?? "";
  activityDraft.theme = normalizeTheme(activity.theme);
  activityDraft.eventSlots = normalizeEventSlots(activity.eventSlots);
  activityDraft.address = activity.address ?? "";
  activityDraft.group_size = activity.group_size ?? "";
  activityDraft.price = activity.price ?? "";
}

function renderCategoryChip() {
  const chipContainer = document.getElementById("activity-category-chip");
  if (!chipContainer) return;

  chipContainer.innerHTML = activityDraft.theme
    .map(
      (theme, index) => `
        <span class="badge text-bg-primary category-chip">
          <span>${theme}</span>
          <button
            type="button"
            class="category-chip-remove"
            data-category-index="${index}"
            aria-label="Désélectionner la catégorie ${theme}"
          >
            ×
          </button>
        </span>
      `,
    )
    .join("");

  chipContainer.querySelectorAll(".category-chip-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.categoryIndex);
      activityDraft.theme.splice(index, 1);
      renderCategoryChip();
    });
  });
}

function renderEventDateChip() {
  const chipContainer = document.getElementById("activity-event-date-chip");
  if (!chipContainer) return;

  chipContainer.innerHTML = activityDraft.eventSlots
    .map(
      (eventSlot, index) => `
        <span class="badge text-bg-secondary category-chip">
          <span>${formatEventSlot(eventSlot)}</span>
          <button
            type="button"
            class="category-chip-remove"
            data-date-index="${index}"
            aria-label="Supprimer le créneau ${formatEventSlot(eventSlot)}"
          >
            ×
          </button>
        </span>
      `,
    )
    .join("");

  chipContainer.querySelectorAll(".category-chip-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.dateIndex);
      activityDraft.eventSlots.splice(index, 1);
      renderEventDateChip();
    });
  });
}

function renderExistingImages() {
  const container = document.getElementById("existing-activity-images");
  if (!container) return;

  container.innerHTML = (activityDraft.existingImages || [])
    .map(
      (image, index) => `
        <div class="col-6 col-md-4">
          <div class="existing-activity-image-wrap">
            <button
              type="button"
              class="btn btn-danger btn-sm existing-image-remove"
              data-image-index="${index}"
              aria-label="Supprimer cette photo"
            >
              ×
            </button>
            <img
              src="${image}"
              alt="Photo de l'activité"
              class="img-fluid rounded existing-activity-image"
            />
          </div>
        </div>
      `,
    )
    .join("");

  container.querySelectorAll(".existing-image-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.imageIndex);
      activityDraft.existingImages.splice(index, 1);
      renderExistingImages();
    });
  });
}

function addEventSlot() {
  const dateInput = document.getElementById("activity-event-date");
  const timeInput = document.getElementById("activity-event-time");
  if (!dateInput || !timeInput) return;

  const date = dateInput.value;
  const heure = timeInput.value;
  if (!date) {
    dateInput.reportValidity();
    return;
  }

  if (!heure) {
    timeInput.reportValidity();
    return;
  }

  const alreadyExists = activityDraft.eventSlots.some(
    (eventSlot) => eventSlot.date === date && eventSlot.heure === heure,
  );

  if (!alreadyExists) {
    activityDraft.eventSlots.push({ date, heure });
    activityDraft.eventSlots.sort((a, b) =>
      `${a.date}T${a.heure}`.localeCompare(`${b.date}T${b.heure}`),
    );
  }

  dateInput.value = "";
  timeInput.value = "";
  renderEventDateChip();
}

function buildActivityPayload() {
  return {
    title: activityDraft.title,
    description: activityDraft.description,
    images: [...activityDraft.existingImages, ...activityDraft.images.map((file) => file.name)],
    address: activityDraft.address,
    theme: activityDraft.theme.join(", "),
    group_size: Number(activityDraft.group_size),
    price: Number(activityDraft.price),
    eventSlots: activityDraft.eventSlots.map((eventSlot) => ({
      date: `${eventSlot.date}T00:00:00.000Z`,
      heure: eventSlot.heure,
    })),
  };
}

function setSubmitFeedback(message, isError = false) {
  const feedback = document.getElementById("activity-submit-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle("text-danger", isError);
  feedback.classList.toggle("text-success", !isError && Boolean(message));
}

function setFormDisabledState(isDisabled) {
  const form = document.getElementById("edit-activity-form");
  if (!form) return;

  form.querySelectorAll("input, textarea, select, button").forEach((element) => {
    element.disabled = isDisabled;
  });
}

function populateForm() {
  document.getElementById("activity-title").value = activityDraft.title;
  document.getElementById("activity-description").value =
    activityDraft.description;
  document.getElementById("activity-address").value = activityDraft.address;
  document.getElementById("activity-group-size").value =
    activityDraft.group_size;
  document.getElementById("activity-price").value = activityDraft.price;

  renderCategoryChip();
  renderEventDateChip();
  renderExistingImages();
}

async function loadActivity() {
  const activityId = getActivityIdFromUrl();

  if (!activityId) {
    throw new Error("Aucun identifiant d'activité n'a été trouvé dans l'URL.");
  }

  const response = await fetch(`${ACTIVITY_API_URL}/${activityId}`);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const activity = await response.json();
  hydrateActivityDraft(activity);
  populateForm();
}

async function submitEditActivityForm(event) {
  const form = event.currentTarget;

  if (!form.checkValidity()) {
    event.preventDefault();
    form.reportValidity();
    return;
  }

  if (!activityDraft.theme.length) {
    event.preventDefault();
    const categoryField = document.getElementById("activity-category");
    categoryField?.setCustomValidity("Sélectionne au moins une catégorie.");
    categoryField?.reportValidity();
    categoryField?.setCustomValidity("");
    return;
  }

  if (!activityDraft.eventSlots.length) {
    event.preventDefault();
    const eventDateField = document.getElementById("activity-event-date");
    eventDateField?.setCustomValidity(
      "Ajoute au moins un événement avec une date et une heure.",
    );
    eventDateField?.reportValidity();
    eventDateField?.setCustomValidity("");
    return;
  }

  if (!activityDraft.id) {
    event.preventDefault();
    setSubmitFeedback("Impossible de retrouver l'activité à modifier.", true);
    return;
  }

  event.preventDefault();
  setFormDisabledState(true);
  setSubmitFeedback("Mise à jour de l'activité en cours...");

  try {
    const response = await fetch(`${ACTIVITY_API_URL}/${activityDraft.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildActivityPayload()),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      try {
        const errorBody = await response.json();
        if (Array.isArray(errorBody.message)) {
          errorMessage = errorBody.message.join(" ");
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch (_error) {
        // Rien à faire si la réponse n'est pas du JSON.
      }

      throw new Error(errorMessage);
    }

    const updatedActivity = await response.json();
    hydrateActivityDraft(updatedActivity);
    populateForm();
    setSubmitFeedback("Activité mise à jour avec succès.");
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'activité :", error);
    setSubmitFeedback(
      error instanceof Error
        ? error.message
        : "Impossible d'enregistrer les modifications pour l'instant.",
      true,
    );
  } finally {
    setFormDisabledState(false);
  }
}

function updateDraftField(event) {
  const { name, value, files, type } = event.target;
  if (!name) return;

  if (type === "file") {
    activityDraft[name] = Array.from(files || []);
    return;
  }

  if (name === "theme") {
    if (
      value &&
      !activityDraft.theme.includes(value) &&
      activityDraft.theme.length < 3
    ) {
      activityDraft.theme.push(value);
    }

    event.target.value = "";
    renderCategoryChip();
    return;
  }

  if (name === "dateEvenement" || name === "heureEvenement") {
    return;
  }

  activityDraft[name] = value;
}

function initEditActivityForm() {
  const form = document.getElementById("edit-activity-form");
  if (!form) return;

  form.addEventListener("input", updateDraftField);
  form.addEventListener("submit", submitEditActivityForm);
  document
    .getElementById("add-event-slot-button")
    ?.addEventListener("click", addEventSlot);

  const submitButtonContainer = document.getElementById(
    "activity-submit-button",
  );
  if (submitButtonContainer) {
    submitButtonContainer.innerHTML = BoutonBleu(
      "Enregistrer les modifications",
    );
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initEditActivityForm();
  setFormDisabledState(true);
  setSubmitFeedback("Chargement de l'activité...");

  try {
    await loadActivity();
    setSubmitFeedback("");
  } catch (error) {
    console.error("Erreur lors du chargement de l'activité :", error);
    setSubmitFeedback(
      error instanceof Error
        ? error.message
        : "Impossible de charger l'activité à modifier.",
      true,
    );
  } finally {
    setFormDisabledState(false);
  }

  window.activityDraft = activityDraft;
});
