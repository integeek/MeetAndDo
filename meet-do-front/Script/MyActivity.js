const MOCK_MY_ACTIVITIES = [
  {
    id: 1,
    title: "Atelier Macaron",
    theme: "Art, Gastronomie",
    address: "10 rue de Vanves, 92130 Issy-les-Moulineaux",
    price: 30,
    image:
      "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 2,
    title: "Sortie Running au Parc",
    theme: "Sport, Bien-être",
    address: "Parc Monceau, 75008 Paris",
    price: 12,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: 3,
    title: "Club Lecture du Jeudi",
    theme: "Lecture, Culture",
    address: "Bibliothèque municipale, 92100 Boulogne-Billancourt",
    price: 8,
    image:
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80",
  },
];

let activityActionsModal = null;
let selectedActivity = null;

async function getMyActivities() {
  try {
    const response = await fetch("http://localhost:3000/activity");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Erreur lors de la récupération des activités :", error);
    return MOCK_MY_ACTIVITIES; // Fallback sur le mock en cas d'erreur
  }
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
    .map((activity) => {
      const categories = activity.theme ? activity.theme.split(", ") : [];
      const city = activity.address ? activity.address.split(", ").pop() : "";

      return `
        <div class="col-12 col-md-6">
          <article class="card h-100 border-0 shadow-sm activity-card">
            <img
              src="${activity.image}"
              class="card-img-top activity-card-image"
              alt="${activity.title}"
            />
            <div class="card-body d-flex flex-column p-4">
              <div class="d-flex flex-wrap gap-2 mb-3">
                ${categories
                  .map(
                    (category) =>
                      `<span class="badge activity-badge">${category}</span>`,
                  )
                  .join("")}
                <span class="badge text-bg-light border">${(activity.eventSlots || []).length} événements</span>
              </div>
              <h2 class="h4 fw-bold mb-2">${activity.title}</h2>
              <p class="card-text text-secondary mb-1">${city}</p>
              <p class="card-text fw-semibold mb-4">${activity.price} EUR / personne</p>
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
      `;
    })
    .join("");

  container
    .querySelectorAll(".activity-actions-trigger .buttonRo")
    .forEach((button) => {
      button.addEventListener("click", (event) => {
        const trigger = event.currentTarget.closest(
          ".activity-actions-trigger",
        );
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
      ? `Choisis une action pour "${selectedActivity.title}."`
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
