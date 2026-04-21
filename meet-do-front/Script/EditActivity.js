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
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const activityDraft = structuredClone(EMPTY_ACTIVITY_DRAFT);

function getActivityIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const activityId = Number(params.get("id"));
  return Number.isFinite(activityId) && activityId > 0 ? activityId : null;
}

function formatEventDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatEventSlot(eventSlot) {
  return `${formatEventDate(eventSlot.date)} at ${eventSlot.heure}`;
}

function getTrimmedValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function resetCustomValidity(fieldId) {
  const field = document.getElementById(fieldId);
  field?.setCustomValidity("");
}

function setFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return false;

  field.setCustomValidity(message);
  field.reportValidity();
  field.setCustomValidity("");
  return true;
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

function validateImages() {
  const imageInput = document.getElementById("activity-images");
  const files = activityDraft.images;
  const totalImages = activityDraft.existingImages.length + files.length;

  if (!imageInput) return false;

  if (!totalImages) {
    return setFieldError(
      "activity-images",
      "Add at least one image for the activity.",
    );
  }

  const invalidFile = files.find((file) => !file.type.startsWith("image/"));
  if (invalidFile) {
    return setFieldError(
      "activity-images",
      "All files must be images.",
    );
  }

  const tooLargeFile = files.find((file) => file.size > MAX_IMAGE_SIZE_BYTES);
  if (tooLargeFile) {
    return setFieldError(
      "activity-images",
      "Each image must be smaller than 5 MB.",
    );
  }

  resetCustomValidity("activity-images");
  return false;
}

function normalizeTextFields() {
  activityDraft.title = getTrimmedValue(activityDraft.title);
  activityDraft.description = getTrimmedValue(activityDraft.description);
  activityDraft.address = getTrimmedValue(activityDraft.address);
}

function validateDraft() {
  normalizeTextFields();

  if (!activityDraft.title) {
    return setFieldError("activity-title", "The activity name is required.");
  }

  if (activityDraft.title.length < 3) {
    return setFieldError(
      "activity-title",
      "The activity name must contain at least 3 characters.",
    );
  }

  if (!activityDraft.description) {
    return setFieldError(
      "activity-description",
      "The activity description is required.",
    );
  }

  if (activityDraft.description.length < 10) {
    return setFieldError(
      "activity-description",
      "The description must contain at least 10 characters.",
    );
  }

  if (!activityDraft.address) {
    return setFieldError(
      "activity-address",
      "The activity address is required.",
    );
  }

  const groupSize = Number(activityDraft.group_size);
  if (!Number.isInteger(groupSize) || groupSize < 1) {
    return setFieldError(
      "activity-group-size",
      "Group size must be an integer greater than or equal to 1.",
    );
  }

  const price = Number(activityDraft.price);
  if (Number.isNaN(price) || price < 0) {
    return setFieldError(
      "activity-price",
      "Price must be a number greater than or equal to 0.",
    );
  }

  if (validateImages()) return true;

  if (!activityDraft.theme.length) {
    return setFieldError(
      "activity-category",
      "Select at least one category.",
    );
  }

  if (!activityDraft.eventSlots.length) {
    return setFieldError(
      "activity-event-date",
      "Add at least one event with a date and time.",
    );
  }

  return false;
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
            aria-label="Deselect category ${theme}"
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
            aria-label="Remove slot ${formatEventSlot(eventSlot)}"
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
              aria-label="Remove this photo"
            >
              ×
            </button>
            <img
              src="${image}"
              alt="Activity photo"
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
    images: [...activityDraft.existingImages],
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

async function uploadActivityImages() {
  if (!activityDraft.images.length) {
    return [];
  }

  const formData = new FormData();
  activityDraft.images.forEach((file) => {
    formData.append("images", file);
  });

  const response = await fetch(`${ACTIVITY_API_URL}/upload-images`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const errorBody = await response.json();
      if (errorBody.message) {
        errorMessage = Array.isArray(errorBody.message)
          ? errorBody.message.join(" ")
          : errorBody.message;
      }
    } catch (_error) {
      // Nothing to do if the response is not JSON.
    }

    throw new Error(errorMessage);
  }

  const body = await response.json();
  if (!Array.isArray(body.urls)) {
    throw new Error("The server did not return image URLs.");
  }

  return body.urls;
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
  document.getElementById("activity-images").value = "";
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
    throw new Error("No activity ID was found in the URL.");
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
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (validateDraft()) {
    return;
  }

  if (!activityDraft.id) {
    setSubmitFeedback("Unable to find the activity to edit.", true);
    return;
  }

  setFormDisabledState(true);
  setSubmitFeedback("Updating activity...");

  try {
    setSubmitFeedback("Uploading images...");
    const uploadedImageUrls = await uploadActivityImages();

    setSubmitFeedback("Updating activity...");
    const response = await fetch(`${ACTIVITY_API_URL}/${activityDraft.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...buildActivityPayload(),
        images: [...activityDraft.existingImages, ...uploadedImageUrls],
      }),
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
        // Nothing to do if the response is not JSON.
      }

      throw new Error(errorMessage);
    }

    const updatedActivity = await response.json();
    hydrateActivityDraft(updatedActivity);
    populateForm();
    setSubmitFeedback("Activity updated successfully.");
  } catch (error) {
    console.error("Error while updating activity:", error);
    setSubmitFeedback(
      error instanceof Error
        ? error.message
        : "Unable to save changes right now.",
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
      "Save changes",
    );
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  initEditActivityForm();
  setFormDisabledState(true);
  setSubmitFeedback("Loading activity...");

  try {
    await loadActivity();
    setSubmitFeedback("");
  } catch (error) {
    console.error("Error while loading activity:", error);
    setSubmitFeedback(
      error instanceof Error
        ? error.message
        : "Unable to load the activity to edit.",
      true,
    );
  } finally {
    setFormDisabledState(false);
  }

  window.activityDraft = activityDraft;
});
