function getMeetDoApiUrl() {
  const hostname = window.location.hostname;
  const apiHostname = hostname || "localhost";

  return `http://${apiHostname}:3000`;
}

function setPublisherFeedback(message = "", status = "") {
  const feedback = document.getElementById("publisher-submit-feedback");
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `form-text mt-3 mb-0${status ? ` publisher-feedback-${status}` : ""}`;
}

function getFormValue(form, name) {
  return String(new FormData(form).get(name) || "").trim();
}

function getPublisherApplicationStorageKey(userId) {
  return `meetando_publisher_application_${userId || "current"}`;
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

function fillPublisherForm(profile) {
  const fields = {
    "publisher-firstname": profile?.firstname,
    "publisher-lastname": profile?.lastname,
    "publisher-address": profile?.address,
  };

  Object.entries(fields).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (field && value) {
      field.value = value;
    }
  });

  const details = parseJsonObject(profile?.publisher_request_details);
  const detailFields = {
    "publisher-experience": details.experienceLevel,
    "publisher-category": details.activityCategory,
    "publisher-motivation": details.motivation,
    "publisher-activity-plan": details.activityPlan,
    "publisher-links": details.links,
  };

  Object.entries(detailFields).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (field && value) {
      field.value = value;
    }
  });
}

function validatePublisherApplication(form) {
  const motivation = getFormValue(form, "motivation");
  const activityPlan = getFormValue(form, "activityPlan");

  if (!form.checkValidity()) {
    form.reportValidity();
    return false;
  }

  if (motivation.length < 40 || activityPlan.length < 40) {
    setPublisherFeedback("Please provide more detail in the motivation and activity plan fields.", "error");
    return false;
  }

  return true;
}

async function loadPublisherProfile() {
  const response = await fetch(`${getMeetDoApiUrl()}/user/me`, {
    credentials: "include",
  });

  if (!response.ok) {
    localStorage.removeItem("meetando_current_user");
    const params = new URLSearchParams({
      authMessage: "You must be logged in to apply as a publisher.",
      redirect: "PublisherApplication.html",
    });
    window.location.href = `../Page/Login.html?${params.toString()}`;
    return null;
  }

  const profile = await response.json();
  localStorage.setItem("meetando_current_user", JSON.stringify(profile));
  return profile;
}

async function submitPublisherApplication(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = document.querySelector("#publisher-submit-button button");

  if (!validatePublisherApplication(form)) {
    return;
  }

  const payload = {
    firstname: getFormValue(form, "firstname"),
    lastname: getFormValue(form, "lastname"),
    address: getFormValue(form, "address"),
    application: {
      experienceLevel: getFormValue(form, "experienceLevel"),
      activityCategory: getFormValue(form, "activityCategory"),
      motivation: getFormValue(form, "motivation"),
      activityPlan: getFormValue(form, "activityPlan"),
      links: getFormValue(form, "links"),
    },
  };

  setPublisherFeedback("Sending your application...", "");
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
  }

  try {
    const response = await fetch(`${getMeetDoApiUrl()}/user/request-publisher`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Unable to send your application.");
    }

    if (result.user) {
      localStorage.setItem("meetando_current_user", JSON.stringify(result.user));
    }

    const storageUserId = result.user?.id || JSON.parse(localStorage.getItem("meetando_current_user") || "{}")?.id;
    localStorage.setItem(
      getPublisherApplicationStorageKey(storageUserId),
      JSON.stringify(payload.application),
    );

    setPublisherFeedback("Your application has been sent. You can track it from My requests.", "success");
    setTimeout(() => {
      window.location.href = "../Page/MyRequests.html";
    }, 900);
  } catch (error) {
    setPublisherFeedback(error.message || "Unable to send your application.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Send application";
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const buttonContainer = document.getElementById("publisher-submit-button");
  const form = document.getElementById("publisher-application-form");

  if (buttonContainer) {
    buttonContainer.innerHTML = BoutonBleu("Send application");
  }

  form?.addEventListener("submit", submitPublisherApplication);

  try {
    const profile = await loadPublisherProfile();
    if (!profile) return;

    if (String(profile.role || "").toLowerCase() === "publisher") {
      setPublisherFeedback("Your account is already approved as a publisher.", "success");
      form?.querySelectorAll("input, select, textarea, button").forEach((field) => {
        field.disabled = true;
      });
      return;
    }

    if (profile.publisher_request === true) {
      setPublisherFeedback("You already have a publisher request under review.", "success");
      form?.querySelectorAll("input, select, textarea, button").forEach((field) => {
        field.disabled = true;
      });
      setTimeout(() => {
        window.location.href = "../Page/MyRequests.html";
      }, 900);
      return;
    }

    fillPublisherForm(profile);
  } catch (error) {
    setPublisherFeedback("Unable to load your profile. Please refresh the page.", "error");
  }
});
