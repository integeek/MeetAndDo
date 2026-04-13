const MOCK_ACTIVITY = {
  id: 42,
  titre: "Atelier Macaron",
  adresse: "10 rue de Vanves, 92130 Issy-les-Moulineaux",
  prix: 300,
  dateCreation: "12 mars 2026",
  tailleGroupe: 10,
  noteMoyenne: 4.7,
  description:
    "Rejoignez-nous pour un atelier gourmand et creatif ou vous apprendrez a realiser de delicieux macarons maison. Encadre par un patissier experimente, vous decouvrirez les secrets d'une coque reussie et repartirez avec vos propres creations.",
  createur: {
    prenom: "Jean",
    nom: "Dupont",
    note: 4.8,
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  },
  images: [
    "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514517220017-8ce97a34a7b6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  ],
  avis: [
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
  return MOCK_ACTIVITY;
  // Quand la table sera créée
  // const response = await fetch(`http://localhost:3000/activity/${id}`);
  // return await response.json();
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
  document.getElementById("activity-title").textContent = activity.titre;
  document.getElementById("activity-report-button").innerHTML =
    renderReportButton();
  document.getElementById("activity-address-text").textContent =
    activity.adresse;
  document.getElementById("activity-description-text").textContent =
    activity.description;
  document.getElementById("activity-participate-button").innerHTML =
    BoutonBleu("Participer");
  document.getElementById("activity-review-button").innerHTML =
    BoutonBleu("Laisser un avis");
  document.getElementById("creator-contact-button").innerHTML =
    renderContactButton();
  document.getElementById("activity-group-size").textContent =
    `Taille du groupe : ${activity.tailleGroupe} personnes`;
  document.getElementById("activity-price").textContent =
    `Prix : ${activity.prix} EUR`;
  document.getElementById("activity-reviews-rating").textContent =
    `${activity.noteMoyenne} / 5`;
  document.getElementById("activity-reviews-list").innerHTML = (
    activity.avis || []
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
  document.getElementById("creator-avatar").src = activity.createur.photo;
  document.getElementById("creator-name").textContent =
    `${activity.createur.prenom} ${activity.createur.nom}`;
  document.getElementById("creator-rating").textContent =
    `Note : ${activity.createur.note} / 5`;
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
  document.title = activity.titre;
}

document.addEventListener("DOMContentLoaded", async () => {
  const activityId = 42;
  const activity = await getActivity(activityId);
  renderActivity(activity);
});
