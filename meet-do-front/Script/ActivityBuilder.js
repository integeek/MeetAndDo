const activityDraft = {
  titre: "",
  images: [],
  description: "",
  categories: [],
  evenements: [],
  numeroRue: "",
  nomRue: "",
  ville: "",
  codePostal: "",
  tailleGroupe: "",
  prix: "",
};

const ACTIVITY_API_URL = "http://localhost:3000/activity";

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

  if (!activityDraft.categories.length) {
    chipContainer.innerHTML = "";
    return;
  }

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

  if (!activityDraft.evenements.length) {
    chipContainer.innerHTML = "";
    return;
  }

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
  };
}

function setSubmitFeedback(message, isError = false) {
  const feedback = document.getElementById("activity-submit-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle("text-danger", isError);
  feedback.classList.toggle("text-success", !isError && Boolean(message));
}

async function submitActivityForm(event) {
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
  setSubmitFeedback("Création de l'activité en cours...");

  const formData = new FormData();
  formData.append("payload", JSON.stringify(buildActivityPayload()));

  activityDraft.images.forEach((imageFile) => {
    formData.append("images", imageFile);
  });

  try {
    const response = await fetch(ACTIVITY_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    setSubmitFeedback("Activité créée avec succès.");
    form.reset();
    activityDraft.titre = "";
    activityDraft.images = [];
    activityDraft.description = "";
    activityDraft.categories = [];
    activityDraft.evenements = [];
    activityDraft.numeroRue = "";
    activityDraft.nomRue = "";
    activityDraft.ville = "";
    activityDraft.codePostal = "";
    activityDraft.tailleGroupe = "";
    activityDraft.prix = "";
    renderCategoryChip();
    renderEventDateChip();
  } catch (error) {
    console.error("Erreur lors de la création de l'activité :", error);
    setSubmitFeedback(
      "Impossible d'envoyer le formulaire pour l'instant. Vérifie que le backend est disponible.",
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

function initActivityBuilderForm() {
  const form = document.getElementById("activity-builder-form");
  if (!form) return;

  form.addEventListener("input", updateDraftField);
  form.addEventListener("submit", submitActivityForm);
  document
    .getElementById("add-event-slot-button")
    ?.addEventListener("click", addEventSlot);
  const submitButtonContainer = document.getElementById("activity-submit-button");
  if (submitButtonContainer) {
    submitButtonContainer.innerHTML = BoutonBleu("Créer l'activité");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initActivityBuilderForm();
  window.activityDraft = activityDraft;
});
