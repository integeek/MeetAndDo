const MOCK_ACTIVITY = {
  id: 42,
  title: "Atelier Macaron",
  address: "10 rue de Vanves, 92130 Issy-les-Moulineaux",
  price: 300,
  creationDate: "12 mars 2026",
  groupSize: 10,
  average_rating: 4.7,
  description:
    "Rejoignez-nous pour un atelier gourmand et creatif ou vous apprendrez a realiser de delicieux macarons maison. Encadre par un patissier experimente, vous decouvrirez les secrets d'une coque reussie et repartirez avec vos propres creations.",
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
        "Super activité, très bon accueil et explications claires du début à la fin.",
    },
    {
      auteur: "Lucas",
      note: 4.5,
      commentaire:
        "Moment vraiment agréable, les macarons étaient excellents. Je recommande.",
    },
    {
      auteur: "Sophie",
      note: 4.8,
      commentaire:
        "Atelier bien organisé, ambiance conviviale et créateur très pédagogue.",
    },
    {
      auteur: "Nina",
      note: 4.2,
      commentaire:
        "Très sympa, j'aurais juste aimé un peu plus de temps sur la décoration.",
    },
  ],
};

async function getActivity(id) {
  try {
    const response = await fetch(`http://localhost:3000/activity/${id}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Erreur lors de la récupération de l'activité :", error);
    return MOCK_ACTIVITY; // Fallback sur le mock en cas d'erreur
  }
}

function renderContactButton() {
  return `
    <div class="d-none d-md-block">
      ${BoutonBleu("Contacter")}
    </div>
    <div class="d-md-none creator-contact-icon" aria-label="Contacter par messagerie privée">
      ${BoutonBleu(`
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#fff" d="M20.595 4.17a4.78 4.78 0 0 0-3.33-1.38H6.695a4.71 4.71 0 0 0-4.72 4.72v6.6a4.71 4.71 0 0 0 4.72 4.72h2.36l1.94 1.94c.133.14.293.253.47.33a1.4 1.4 0 0 0 1.09 0a1.5 1.5 0 0 0 .45-.31l2-2h2.33a4.73 4.73 0 0 0 3.33-1.38a4.8 4.8 0 0 0 1-1.53a4.7 4.7 0 0 0 .36-1.81v-6.6a4.7 4.7 0 0 0-1.43-3.3m-5.08 7.7h-2.55v2.53a1 1 0 1 1-2 0v-2.53h-2.53a1 1 0 1 1 0-2h2.53V7.32a1 1 0 0 1 2 0v2.55h2.55a1 1 0 1 1 0 2"/></svg>
      `)}
    </div>
  `;
}

function renderReportButton() {
  return `
    <div class="d-none d-md-block">
      ${BoutonRouge("Signaler")}
    </div>
    <div class="d-md-none activity-report-icon" aria-label="Signaler l'activité">
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
    BoutonBleu("Participer");
  document.getElementById("activity-review-button").innerHTML =
    BoutonBleu("Laisser un avis");
  document.getElementById("creator-contact-button").innerHTML =
    renderContactButton();
  document.getElementById("activity-group-size").textContent =
    `Taille du groupe : ${activity.group_size} personnes`;
  document.getElementById("activity-price").textContent =
    `Prix : ${activity.price} EUR`;
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
    "Activité créée par";
  document.getElementById("creator-avatar").src = activity.creator?.photo || "";
  document.getElementById("creator-name").textContent = activity.creator
    ? `${activity.creator.first_name || ""} ${activity.creator.last_name || ""}`
    : "";
  document.getElementById("creator-rating").textContent = activity.creator
    ? `Note : ${activity.creator.rating} / 5`
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
                  alt="Image ${index + 1} de l'activite"
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
  // Récupère l'ID depuis l'URL: ?id=1
  const params = new URLSearchParams(window.location.search);
  const activityId = params.get("id") || 1; // Par défaut 1 si pas d'ID
  const activity = await getActivity(activityId);
  renderActivity(activity);

  // Initialiser le modal Signaler
  initReportModal();
});

let reportModal = null;

function initReportModal() {
  // Récupérer le bouton Signaler et ajouter un event listener
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

  // Gérer la soumission du formulaire
  const submitBtn = document.getElementById("report-submit-btn");
  const reportForm = document.getElementById("report-form");

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const reason = document.getElementById("report-reason").value;
      const description = document.getElementById("report-description").value;

      if (!reason) {
        alert("Veuillez sélectionner une raison");
        return;
      }

      // Afficher un message de confirmation
      alert(
        "Merci de votre signalement. Notre équipe examinera votre rapport.",
      );

      // Réinitialiser le formulaire
      reportForm.reset();

      // Fermer le modal
      reportModal?.hide();

      // TODO: Envoyer les données au backend
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
