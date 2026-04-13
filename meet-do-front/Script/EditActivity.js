const MOCK_ACTIVITY_TO_EDIT = {
  id: 42,
  titre: "Atelier Macaron",
  images: [],
  existingImages: [
    "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514517220017-8ce97a34a7b6?auto=format&fit=crop&w=1200&q=80",
  ],
  description:
    "Rejoignez-nous pour un atelier gourmand et créatif où vous apprendrez à réaliser de délicieux macarons maison.",
  categories: ["Art", "Gastronomie"],
  evenements: [
    { date: "2026-04-18", heure: "14:00" },
    { date: "2026-04-25", heure: "10:30" },
  ],
  numeroRue: "10",
  nomRue: "rue de Vanves",
  ville: "Issy-les-Moulineaux",
  codePostal: "92130",
  tailleGroupe: "10",
  prix: "30",
};

const ACTIVITY_API_URL = "http://localhost:3000/activity";
const activityDraft = structuredClone(MOCK_ACTIVITY_TO_EDIT);

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

function renderCategoryChip() {
  const chipContainer = document.getElementById("activity-category-chip");
  if (!chipContainer) return;

  chipContainer.innerHTML = activityDraft.categories
    .map(
      (categorie, index) => `
        <span class="badge text-bg-primary category-chip">
          <span>${categorie}</span>
          <button
            type="button"
            class="category-chip-remove"
            data-category-index="${index}"
            aria-label="Désélectionner la catégorie ${categorie}"
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
      activityDraft.categories.splice(index, 1);
      renderCategoryChip();
    });
  });
}

function renderEventDateChip() {
  const chipContainer = document.getElementById("activity-event-date-chip");
  if (!chipContainer) return;

  chipContainer.innerHTML = activityDraft.evenements
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
      activityDraft.evenements.splice(index, 1);
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

  const alreadyExists = activityDraft.evenements.some(
    (eventSlot) => eventSlot.date === date && eventSlot.heure === heure,
  );

  if (!alreadyExists) {
    activityDraft.evenements.push({ date, heure });
    activityDraft.evenements.sort((a, b) =>
      `${a.date}T${a.heure}`.localeCompare(`${b.date}T${b.heure}`),
    );
  }

  dateInput.value = "";
  timeInput.value = "";
  renderEventDateChip();
}

function buildActivityPayload() {
  return {
    id: activityDraft.id,
    titre: activityDraft.titre,
    description: activityDraft.description,
    categories: activityDraft.categories,
    adresse: {
      numeroRue: activityDraft.numeroRue,
      nomRue: activityDraft.nomRue,
      ville: activityDraft.ville,
      codePostal: activityDraft.codePostal,
    },
    tailleGroupe: Number(activityDraft.tailleGroupe),
    prix: Number(activityDraft.prix),
    evenements: activityDraft.evenements,
    existingImages: activityDraft.existingImages,
  };
}

function setSubmitFeedback(message, isError = false) {
  const feedback = document.getElementById("activity-submit-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle("text-danger", isError);
  feedback.classList.toggle("text-success", !isError && Boolean(message));
}

function populateForm() {
  document.getElementById("activity-title").value = activityDraft.titre;
  document.getElementById("activity-description").value =
    activityDraft.description;
  document.getElementById("activity-street-number").value =
    activityDraft.numeroRue;
  document.getElementById("activity-street-name").value = activityDraft.nomRue;
  document.getElementById("activity-city").value = activityDraft.ville;
  document.getElementById("activity-zip-code").value = activityDraft.codePostal;
  document.getElementById("activity-group-size").value =
    activityDraft.tailleGroupe;
  document.getElementById("activity-price").value = activityDraft.prix;

  renderCategoryChip();
  renderEventDateChip();
  renderExistingImages();
}

async function submitEditActivityForm(event) {
  const form = event.currentTarget;

  if (!form.checkValidity()) {
    event.preventDefault();
    form.reportValidity();
    return;
  }

  if (!activityDraft.categories.length) {
    event.preventDefault();
    const categoryField = document.getElementById("activity-category");
    categoryField?.setCustomValidity("Sélectionne au moins une catégorie.");
    categoryField?.reportValidity();
    categoryField?.setCustomValidity("");
    return;
  }

  if (!activityDraft.evenements.length) {
    event.preventDefault();
    const eventDateField = document.getElementById("activity-event-date");
    eventDateField?.setCustomValidity(
      "Ajoute au moins un événement avec une date et une heure.",
    );
    eventDateField?.reportValidity();
    eventDateField?.setCustomValidity("");
    return;
  }

  event.preventDefault();
  setSubmitFeedback("Mise à jour de l'activité en cours...");

  const formData = new FormData();
  formData.append("payload", JSON.stringify(buildActivityPayload()));

  activityDraft.images.forEach((imageFile) => {
    formData.append("images", imageFile);
  });

  try {
    const response = await fetch(`${ACTIVITY_API_URL}/${activityDraft.id}`, {
      method: "PATCH",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setSubmitFeedback("Activité mise à jour avec succès.");
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'activité :", error);
    setSubmitFeedback(
      "Impossible d'enregistrer les modifications pour l'instant. Vérifie que le backend est disponible.",
      true,
    );
  }
}

function updateDraftField(event) {
  const { name, value, files, type } = event.target;
  if (!name) return;

  if (type === "file") {
    activityDraft[name] = Array.from(files || []);
    return;
  }

  if (name === "categories") {
    if (
      value &&
      !activityDraft.categories.includes(value) &&
      activityDraft.categories.length < 3
    ) {
      activityDraft.categories.push(value);
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

  const submitButtonContainer = document.getElementById("activity-submit-button");
  if (submitButtonContainer) {
    submitButtonContainer.innerHTML = BoutonBleu("Enregistrer les modifications");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateForm();
  initEditActivityForm();
  window.activityDraft = activityDraft;
});
