  function resaComponent(resa, index) {
    const imageUrl = resa.image_principale || '../Assets/img/placeholder.png';
    return `
      <div class="reservation-item" id="reservation-item-${index}">
        <div class="item-header">
          <h2>${resa.titre}</h2>
          <img src="${imageUrl}" alt="${resa.titre}" class="photo-reservation">
        </div>
        <div class="item-main">
          <div class="item-adresse">
            <img src="../Assets/img/icon-pin.png" alt="position-icon">
            <p>${resa.adresse}</p>
          </div>
          <div class="item-date">
            <img src="../Assets/img/icon-calendar.svg" alt="calendar-icon">
            <p>${resa.dateEvenement}</p>
          </div>
          <div class="item-places">
            <img src="../Assets/img/icon-group.svg" alt="group-icon">
            <p>${resa.nbPlace}</p>
          </div>
          <div class="item-prix">
            <img src="../Assets/img/icon-price.svg" alt="price-icon">
            <p>${resa.prix}</p>
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
    document.getElementById(`boutonbleu-${index}`).innerHTML = BoutonBleu("Voir l'activité");
    document.getElementById(`boutonbleu-${index}`).onclick = () => {
      window.location.href = `../../view/Page/Activite.php?id=${resa.idActivite}`;
    };

    document.getElementById(`boutonbleu1-${index}`).innerHTML = BoutonBleu("Modifier ma réservation");
    document.getElementById(`boutonbleu1-${index}`).onclick = () => {
      openPopUp('edit-reservation-popup', resa.idReservation);
    };

    document.getElementById(`boutonrouge-${index}`).innerHTML = BoutonRouge("Annuler ma réservation");
    document.getElementById(`boutonrouge-${index}`).onclick = () => {
      openCancelPopUp(resa.idReservation);
    };
  }

  async function loadReservations() {
    const response = await fetch('http://localhost:3000/reservations', {
      credentials: 'include',
    });

    if (!response.ok) {
      window.location.href = '/login.html';
      return;
    }

    const reservations = await response.json();
    const container = document.getElementById('reservation-list');

    if (reservations.length === 0) {
      container.innerHTML = `<p>Vous n'avez aucune réservation.</p>`;
      return;
    }

    container.innerHTML = reservations.map((resa, index) => resaComponent(resa, index)).join('');

    reservations.forEach((resa, index) => initButtons(resa, index));
  }

  // Annulation
  let currentIdResa = null;

  function openCancelPopUp(idResa) {
    currentIdResa = idResa;
    document.getElementById('cancel-input').value = '';
    openPopUp('cancel-popup');
  }

  async function cancelReservation() {
    const input = document.getElementById('cancel-input').value;

    if (!input) {
      alert('Veuillez entrer le mot ANNULER pour confirmer.');
      return;
    }

    if (input !== 'ANNULER') {
      alert('Erreur lors de l\'annulation de la réservation.');
      return;
    }

    const response = await fetch(`http://localhost:3000/reservations/${currentIdResa}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (response.ok) {
      alert('Réservation annulée avec succès.');
      closePopUp('cancel-popup');
      loadReservations(); // Recharge la liste
    } else {
      alert('Erreur lors de l\'annulation.');
    }
  }

  document.addEventListener('DOMContentLoaded', loadReservations);
