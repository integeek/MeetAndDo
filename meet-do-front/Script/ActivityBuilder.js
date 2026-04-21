const activityDraft = {
  title: "",
  images: [],
  description: "",
  theme: [],
  eventSlots: [],
  address: "",
  group_size: "",
  price: "",
};

const ACTIVITY_API_URL = "http://localhost:3000/activity";
const AUTH_API_URL = "http://localhost:3000/authentication";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const userId = Number(params.get("userId"));
  return Number.isInteger(userId) && userId > 0 ? userId : null;
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

function setEventSlotFeedback(message = "") {
  const feedback = document.getElementById("activity-event-slot-feedback");
  if (!feedback) return;

  feedback.textContent = message;
}

function renderCategoryChip() {
  const chipContainer = document.getElementById("activity-category-chip");
  if (!chipContainer) return;

  if (!activityDraft.theme.length) {
    chipContainer.innerHTML = "";
    return;
  }

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
      resetCustomValidity("activity-category");
    });
  });
}

function renderEventDateChip() {
  const chipContainer = document.getElementById("activity-event-date-chip");
  if (!chipContainer) return;

  if (!activityDraft.eventSlots.length) {
    chipContainer.innerHTML = "";
    return;
  }

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
      resetCustomValidity("activity-event-date");
    });
  });
}

function validateImages() {
  const imageInput = document.getElementById("activity-images");
  const files = activityDraft.images;

  if (!imageInput) return false;

  if (!files.length) {
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

function validateCategories() {
  if (activityDraft.theme.length) {
    resetCustomValidity("activity-category");
    return false;
  }

  return setFieldError(
    "activity-category",
    "Select at least one category.",
  );
}

function validateEventSlots() {
  if (!activityDraft.eventSlots.length) {
    return setFieldError(
      "activity-event-date",
      "Add at least one event with a date and time.",
    );
  }

  const now = new Date();
  const invalidSlot = activityDraft.eventSlots.find((eventSlot) => {
    const slotDate = new Date(`${eventSlot.date}T${eventSlot.heure}`);
    return Number.isNaN(slotDate.getTime()) || slotDate < now;
  });

  if (invalidSlot) {
    return setFieldError(
      "activity-event-date",
      "All slots must be in the future.",
    );
  }

  resetCustomValidity("activity-event-date");
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
  if (validateCategories()) return true;
  if (validateEventSlots()) return true;

  return false;
}

function addEventSlot() {
  const dateInput = document.getElementById("activity-event-date");
  const timeInput = document.getElementById("activity-event-time");
  if (!dateInput || !timeInput) return;

  const date = dateInput.value;
  const heure = timeInput.value;
  if (!date) {
    setEventSlotFeedback("Choose a date for this slot first.");
    return;
  }

  if (!heure) {
    setEventSlotFeedback("Choose a time for this slot first.");
    return;
  }

  const slotDate = new Date(`${date}T${heure}`);
  if (Number.isNaN(slotDate.getTime()) || slotDate < new Date()) {
    setEventSlotFeedback("The slot must be scheduled in the future.");
    return;
  }

  const alreadyExists = activityDraft.eventSlots.some(
    (eventSlot) => eventSlot.date === date && eventSlot.heure === heure,
  );

  if (alreadyExists) {
    setEventSlotFeedback("This slot has already been added.");
    return;
  }

  activityDraft.eventSlots.push({ date, heure });
  activityDraft.eventSlots.sort((a, b) =>
    `${a.date}T${a.heure}`.localeCompare(`${b.date}T${b.heure}`),
  );

  dateInput.value = "";
  timeInput.value = "";
  setEventSlotFeedback("");
  resetCustomValidity("activity-event-date");
  renderEventDateChip();
}

async function getCurrentUser() {
  try {
    const response = await fetch(AUTH_API_URL, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn("Unable to fetch current user for activity creation:", error);
    return null;
  }
}

function buildActivityPayload(currentUser) {
  const userIdFromUrl = getUserIdFromUrl();

  return {
    title: activityDraft.title,
    description: activityDraft.description,
    images: [],
    address: activityDraft.address,
    theme: activityDraft.theme.join(", "),
    group_size: Number(activityDraft.group_size),
    price: Number(activityDraft.price),
    id_user: currentUser?.id ?? userIdFromUrl,
    eventSlots: activityDraft.eventSlots.map((eventSlot) => ({
      date: `${eventSlot.date}T00:00:00.000Z`,
      heure: eventSlot.heure,
    })),
  };
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

function setSubmitFeedback(message, isError = false) {
  const feedback = document.getElementById("activity-submit-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle("text-danger", isError);
  feedback.classList.toggle("text-success", !isError && Boolean(message));
}

function setFormDisabledState(isDisabled) {
  const form = document.getElementById("activity-builder-form");
  if (!form) return;

  form.querySelectorAll("input, textarea, select, button").forEach((element) => {
    element.disabled = isDisabled;
  });
}

function redirectToMyActivity(currentUser) {
  const userId = currentUser?.id ?? getUserIdFromUrl();
  const targetUrl = new URL("../Page/MyActivity.html", window.location.href);

  if (userId) {
    targetUrl.searchParams.set("userId", String(userId));
  }

  window.location.href = targetUrl.toString();
}

function resetDraft() {
  activityDraft.title = "";
  activityDraft.images = [];
  activityDraft.description = "";
  activityDraft.theme = [];
  activityDraft.eventSlots = [];
  activityDraft.address = "";
  activityDraft.group_size = "";
  activityDraft.price = "";
  renderCategoryChip();
  renderEventDateChip();
}

async function submitActivityForm(event) {
  const form = event.currentTarget;
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (validateDraft()) {
    return;
  }

  setFormDisabledState(true);
  setSubmitFeedback("Creating activity...");

  try {
    const currentUser = await getCurrentUser();
    setSubmitFeedback("Uploading images...");
    const uploadedImageUrls = await uploadActivityImages();

    setSubmitFeedback("Creating activity...");
    const response = await fetch(ACTIVITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        ...buildActivityPayload(currentUser),
        images: uploadedImageUrls,
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

    setSubmitFeedback("Activity created successfully.");
    redirectToMyActivity(currentUser);
  } catch (error) {
    console.error("Error while creating activity:", error);
    setSubmitFeedback(
      error instanceof Error
        ? error.message
        : "Unable to submit the form right now.",
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
    validateImages();
    return;
  }

  if (name === "theme") {
    if (!value) return;

    if (activityDraft.theme.includes(value)) {
      event.target.value = "";
      resetCustomValidity("activity-category");
      return;
    }

    if (activityDraft.theme.length >= 3) {
      setFieldError(
        "activity-category",
        "You can select up to 3 categories.",
      );
      event.target.value = "";
      return;
    }

    activityDraft.theme.push(value);
    event.target.value = "";
    resetCustomValidity("activity-category");
    renderCategoryChip();
    return;
  }

  if (name === "dateEvenement" || name === "heureEvenement") {
    setEventSlotFeedback("");
    resetCustomValidity("activity-event-date");
    return;
  }

  activityDraft[name] = value;
  resetCustomValidity(event.target.id);
}

function initActivityBuilderForm() {
  const form = document.getElementById("activity-builder-form");
  if (!form) return;

  form.addEventListener("input", updateDraftField);
  form.addEventListener("change", updateDraftField);
  form.addEventListener("submit", submitActivityForm);
  document
    .getElementById("add-event-slot-button")
    ?.addEventListener("click", addEventSlot);

  const submitButtonContainer = document.getElementById(
    "activity-submit-button",
  );
  if (submitButtonContainer) {
    submitButtonContainer.innerHTML = BoutonBleu("Create activity");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initActivityBuilderForm();
  window.activityDraft = activityDraft;
});
