const MOCK_MY_ACTIVITIES = [
  {
    id: 1,
    titre: "Atelier Macaron",
    categories: ["Art", "Gastronomie"],
    ville: "Issy-les-Moulineaux",
    prix: 30,
    nbEvenements: 3,
    image:
      "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    titre: "Sortie Running au Parc",
    categories: ["Sport", "Bien-être"],
    ville: "Paris",
    prix: 12,
    nbEvenements: 5,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    titre: "Club Lecture du Jeudi",
    categories: ["Lecture", "Culture"],
    ville: "Boulogne-Billancourt",
    prix: 8,
    nbEvenements: 2,
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
  },
];

let activityActionsModal = null;
let selectedActivity = null;

async function getMyActivities() {
  return MOCK_MY_ACTIVITIES;
  // Plus tard :
  // const response = await fetch("http://localhost:3000/activity/me");
  // return await response.json();
}

function renderMyActivities(activities) {
  const container = document.getElementById("my-activities-list");
  if (!container) return;

  if (!activities.length) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-light border mb-0" role="status">
          Tu n'as encore créé aucune activité.
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = activities
    .map(
      (activity) => `
        <div class="col-12 col-md-6">
          <article class="card h-100 border-0 shadow-sm activity-card">
            <img
              src="${activity.image}"
              class="card-img-top activity-card-image"
              alt="${activity.titre}"
            />
            <div class="card-body d-flex flex-column p-4">
              <div class="d-flex flex-wrap gap-2 mb-3">
                ${(activity.categories || [])
                  .map(
                    (category) =>
                      `<span class="badge activity-badge">${category}</span>`,
                  )
                  .join("")}
                <span class="badge text-bg-light border">${activity.nbEvenements} événements</span>
              </div>
              <h2 class="h4 fw-bold mb-2">${activity.titre}</h2>
              <p class="card-text text-secondary mb-1">${activity.ville}</p>
              <p class="card-text fw-semibold mb-4">${activity.prix} EUR / personne</p>
              <div class="mt-auto d-flex flex-wrap justify-content-center gap-3">
                <div class="activity-action-button">${BoutonBleu("Voir l'activité")}</div>
                <div
                  class="activity-action-button activity-actions-trigger"
                  data-activity-id="${activity.id}"
                >
                  ${BoutonRouge("Actions")}
                </div>
              </div>
            </div>
          </article>
        </div>
      `,
    )
    .join("");

  container.querySelectorAll(".activity-actions-trigger .buttonRo").forEach((button) => {
    button.addEventListener("click", (event) => {
      const trigger = event.currentTarget.closest(".activity-actions-trigger");
      const activityId = Number(trigger?.dataset.activityId);
      openActivityActionsModal(activityId);
    });
  });
}

function renderActivityActionModalButtons() {
  const viewButton = document.getElementById("modal-view-activity-button");
  const editButton = document.getElementById("modal-edit-activity-button");
  const deleteButton = document.getElementById("modal-delete-activity-button");

  if (viewButton) {
    viewButton.innerHTML = BoutonBleu("Voir la liste des participants");
  }

  if (editButton) {
    editButton.innerHTML = BoutonBleu("Modifier l'activité");
  }

  if (deleteButton) {
    deleteButton.innerHTML = BoutonRouge("Supprimer l'activité");
  }
}

function openActivityActionsModal(activityId) {
  selectedActivity =
    MOCK_MY_ACTIVITIES.find((activity) => activity.id === activityId) || null;

  const modalText = document.getElementById("activity-actions-modal-text");
  if (modalText) {
    modalText.textContent = selectedActivity
      ? `Choisis une action pour "${selectedActivity.titre}".`
      : "";
  }

  activityActionsModal?.show();
}

document.addEventListener("DOMContentLoaded", async () => {
  const activities = await getMyActivities();
  renderMyActivities(activities);

  const createButton = document.getElementById("create-activity-button");
  if (createButton) {
    createButton.innerHTML = BoutonBleu("Créer une activité");
  }

  renderActivityActionModalButtons();

  const modalElement = document.getElementById("activityActionsModal");
  if (modalElement) {
    activityActionsModal = new bootstrap.Modal(modalElement);
  }
});
