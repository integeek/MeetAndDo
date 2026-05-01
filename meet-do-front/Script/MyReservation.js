function resaComponent(resa, index) {
  const activity = resa.event?.activity;
  const imageUrl = activity?.image || '../Assets/img/placeholder.png';

  return `
    <div class="reservation-item" id="reservation-item-${index}">
      <div class="item-header">
        <h2>${activity?.title}</h2>
        <img src="${imageUrl}" alt="${activity?.title}" class="photo-reservation">
      </div>
      <div class="item-main">
        <div class="item-adresse">
          <img src="../Assets/img/icon-pin.png" alt="position-icon">
          <p>${activity?.address ?? '-'}</p>
        </div>
        <div class="item-date">
          <img src="../Assets/img/icon-calendar.svg" alt="calendar-icon">
          <p>${new Date(resa.event?.date).toLocaleDateString('fr-FR')}</p>
        </div>
        <div class="item-places">
          <img src="../Assets/img/icon-group.svg" alt="group-icon">
          <p>${resa.group_size} place(s)</p>
        </div>
        <div class="item-prix">
          <img src="../Assets/img/icon-price.svg" alt="price-icon">
          <p>${activity?.price ?? '-'} €</p>
        </div>
      </div>
      <div class="item-footer">
        <div id="boutonbleu-${index}"></div>
        <div id="boutonbleu1-${index}"></div>
        <div id="boutonrouge-${index}"></div>
      </div>
    </div>
  `;
}

function initButtons(resa, index) {
  document.getElementById(`boutonbleu-${index}`).innerHTML = BoutonBleu("View the activity");
  document.getElementById(`boutonbleu-${index}`).onclick = () => {
    window.location.href = `../Page/Activity.html?id=${resa.event?.id_activity}`;
  };

  document.getElementById(`boutonbleu1-${index}`).innerHTML = BoutonBleu("Change my reservation");
  document.getElementById(`boutonbleu1-${index}`).onclick = () => {
    openPopUp('edit-reservation-popup', resa.id);
  };

  document.getElementById(`boutonrouge-${index}`).innerHTML = BoutonRouge("Cancel my reservation");
  document.getElementById(`boutonrouge-${index}`).onclick = () => {
    openCancelPopUp(resa.id);
  };
}

async function loadReservations() {
  const response = await fetch('http://localhost:3000/reservation/user', {
    credentials: 'include',
  });

  if (!response.ok) {
    window.location.href = '../Page/Login.html';
    return;
  }
  const reservations = await response.json();
  const container = document.getElementById('reservation-list');

  if (!reservations || reservations.length === 0) {
    container.innerHTML = `<p>You have no reservation.</p>`;
    return;
  }

  container.innerHTML = reservations.map((resa, index) => resaComponent(resa, index)).join('');
  reservations.forEach((resa, index) => initButtons(resa, index));
}

let currentIdResa = null;
document.addEventListener('DOMContentLoaded', loadReservations);
