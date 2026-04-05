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
  form.addEventListener("submit", (event) => {
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
    }
  });
  document
    .getElementById("add-event-slot-button")
    ?.addEventListener("click", addEventSlot);
}

document.addEventListener("DOMContentLoaded", () => {
  initActivityBuilderForm();
  window.activityDraft = activityDraft;
});
