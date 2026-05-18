function openPopUp(id) {
  document.getElementById(id).style.display = 'block';
}

function closePopUp(id) {
  document.getElementById(id).style.display = 'none';
}

function getMeetDoApiUrl() {
  const hostname = window.location.hostname;
  const apiHostname = hostname || 'localhost';

  return `http://${apiHostname}:3000`;
}

function resaComponent(resa, index) {
  const activity = resa.event?.activity;
  const imageUrl = activity?.images?.[0] ?? activity?.image ?? '../Assets/img/placeholder.png';
  const activityTitle = activity?.title || 'Activity';
  const activityAddress = activity?.address ?? '-';
  const activityPrice = activity?.price ?? '-';
  const reservationDate = resa.event?.date
    ? new Date(resa.event.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  return `
    <div class="reservation-item" id="reservation-item-${index}">
      <div class="item-header">
        <img src="${imageUrl}" alt="${activityTitle}" class="photo-reservation">
      </div>
      <div class="item-title-block">
        <span class="reservation-badge">Booked</span>
        <h2>${activityTitle}</h2>
      </div>
      <div class="item-main">
        <div class="item-adresse">
          <img src="../Assets/img/icon-pin.png" alt="position-icon">
          <p>${activityAddress}</p>
        </div>
        <div class="item-date">
          <img src="../Assets/img/icon-calendar.svg" alt="calendar-icon">
          <p>${reservationDate}</p>
        </div>
        <div class="item-places">
          <img src="../Assets/img/icon-group.svg" alt="group-icon">
          <p>${resa.group_size} place(s)</p>
        </div>
        <div class="item-prix">
          <img src="../Assets/img/icon-price.svg" alt="price-icon">
          <p>${activityPrice} €</p>
        </div>
      </div>
      <div class="item-footer">
        <div id="boutonbleu-${index}"></div>
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

  document.getElementById(`boutonrouge-${index}`).innerHTML = BoutonRouge("Cancel my reservation");
  document.getElementById(`boutonrouge-${index}`).onclick = () => {
    openCancelPopUp(resa.id);
  };
}

async function loadReservations() {
  const response = await fetch(`${getMeetDoApiUrl()}/reservation/user`, {
    credentials: 'include',
  });

  if (!response.ok) {
    localStorage.removeItem('meetando_current_user');
    window.location.href = '../Page/Login.html';
    return;
  }
  const reservations = await response.json();
  const container = document.getElementById('reservation-list');

  if (!reservations || reservations.length === 0) {
    container.innerHTML = `
      <div class="reservation-empty">
        <strong>No reservations yet</strong>
        <span>Your booked activities will appear here.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = reservations.map((resa, index) => resaComponent(resa, index)).join('');
  reservations.forEach((resa, index) => initButtons(resa, index));
}

let currentIdResa = null;

function setCancelFeedback(message = '', status = '') {
  const feedback = document.getElementById('cancel-feedback');
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `cancel-feedback${status ? ` is-${status}` : ''}`;
}

function openCancelPopUp(idResa) {
  currentIdResa = idResa;
  document.getElementById('cancel-input').value = '';
  setCancelFeedback();
  openPopUp('cancel-popup');
}

async function cancelReservation() {
  const input = document.getElementById('cancel-input').value;
  const confirmButton = document.querySelector('#bouton-confirmer button');

  if (!input || input !== 'CANCEL') {
    setCancelFeedback('Please type CANCEL exactly to confirm.', 'error');
    return;
  }

  setCancelFeedback('Cancelling your reservation...', 'loading');
  if (confirmButton) confirmButton.disabled = true;

  try {
    const response = await fetch(`${getMeetDoApiUrl()}/reservation/${currentIdResa}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      setCancelFeedback('Reservation successfully cancelled.', 'success');
      setTimeout(() => {
        closePopUp('cancel-popup');
        loadReservations();
      }, 700);
    } else {
      setCancelFeedback('Error during cancellation. Please try again.', 'error');
    }
  } catch {
    setCancelFeedback('Network error. Please try again.', 'error');
  } finally {
    if (confirmButton) confirmButton.disabled = false;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('bouton-confirmer').innerHTML = BoutonBleu("Validate");
  document.getElementById('bouton-confirmer').onclick = cancelReservation;
  loadReservations();
});
