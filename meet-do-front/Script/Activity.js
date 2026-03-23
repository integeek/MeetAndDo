const boutonContact = document.getElementById("boutonContact");

const Contact = (idMeeter, activityName) => {
  var request = new XMLHttpRequest();
  request.open(
    "POST",
    `./../../controller/Messagerie/MessagerieControlleur.php?id=${idMeeter}&activityName=${activityName}`,
    true,
  );
  request.setRequestHeader("Content-Type", "application/json");
  request.send();

  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      try {
        const responseData = JSON.parse(this.responseText);
        if (responseData.redirect) {
          window.location.href = "../../view/Page/Messagerie.php";
        }
      } catch (error) {
        console.error("Error parsing JSON response:", error);
      }
    }
  };
};

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const idActivite = params.get("id");

  if (!idActivite) {
    console.error("Aucun id fourni dans l'URL.");
    return;
  }

  fetch(`../../controller/Activite/Activite.php?idActivite=${idActivite}`)
    .then((res) => res.json())
    .then((data) => {
      const datesDisponibles = data.datesDisponibles;
      const horairesParDate = {};

      data.horairesParDate.forEach((e) => {
        if (!horairesParDate[e.dateEvenement]) {
          horairesParDate[e.dateEvenement] = [];
        }
        horairesParDate[e.dateEvenement].push({
          heure: e.heure,
          inscrits: parseInt(e.inscrits),
          max: parseInt(e.max),
        });
      });

      console.log(data);

      flatpickr("#datepicker", {
        enable: datesDisponibles,
        dateFormat: "Y-m-d",
        onChange: function (selectedDates, dateStr) {
          afficherCreneaux(dateStr, horairesParDate);
        },
      });
    })
    .catch((err) => {
      console.error("Erreur lors de la récupération des données :", err);
    });

  function afficherCreneaux(date, horairesParDate) {
    const creneaux = horairesParDate[date] || [];
    const container = document.getElementById("creneaux-container");
    container.innerHTML = "";

    document.getElementById("boutonBleuPop").innerHTML = BoutonBleu("Valider");

    if (creneaux.length === 0) {
      container.innerHTML = "<p>Aucun créneau disponible pour cette date.</p>";
      return;
    }

    creneaux.forEach((c) => {
      const btn = document.createElement("div");
      btn.classList.add("creneau-btn");

      if (c.inscrits >= c.max) {
        btn.classList.add("full");
      }

      btn.innerHTML = `
                <span class="creneau-time">${c.heure}</span>
                <span class="creneau-capacity">${c.inscrits}/${c.max} personnes</span>
            `;

      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".creneau-btn")
          .forEach((el) => el.classList.remove("selected"));
        btn.classList.add("selected");

        if (c.inscrits >= c.max) {
          document.getElementById("boutonBleuPop").innerHTML = BoutonBleu(
            "S'inscrire à la file d'attente",
          );
        } else {
          document.getElementById("boutonBleuPop").innerHTML =
            BoutonBleu("Valider");
        }

        console.log("Créneau sélectionné :", c.heure);
      });

      container.appendChild(btn);
    });
  }
});

const btn = document.getElementById("boutonBleuPop");
const meeter = document.getElementById("meeter-page");
let connected = false;

const UserInfo = () => {
  var request = new XMLHttpRequest();
  request.open("GET", "./../../controller/Navbar/Navbar.php", true);
  request.send();

  request.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      try {
        const responseData = JSON.parse(this.responseText);
        console.log(responseData, "test");
        if (responseData.success) {
          console.log("connecté");
          connected = true;
        } else {
          console.error("Error:", responseData.message);
        }
      } catch (error) {
        console.error("Error parsing JSON response:", error);
      }
    } else if (this.readyState == 4) {
      console.error("Error: Unable to fetch data. Status:", this.status);
    }
  };
};

UserInfo();

btn.addEventListener("click", () => {
  if (!connected) {
    window.location.href = "./../../view/Page/Connexion.php";
    return;
  }
  const nbPlace = document.getElementById("nbPlace").value;
  const date = document.getElementById("datepicker").value;
  const creneau = document.querySelector(".creneau-btn.selected");
  if (!nbPlace || !date || !creneau) {
    alert("Veuillez remplir tous les champs.");
    return;
  }
  const heure = creneau.querySelector(".creneau-time").textContent;
  const isFileAttente = document
    .getElementById("boutonBleuPop")
    .innerText.includes("file d'attente");

  fetch("../../controller/Activite/Reservation.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      nbPlace: nbPlace,
      date: date,
      heure: heure,
      fileAttente: isFileAttente,
    }),
  })
    .then((res) => res.text())
    .then((text) => {
      console.log("Réponse brute du serveur :", text);
      try {
        const data = JSON.parse(text);
        if (data.success) {
          alert(
            isFileAttente
              ? "Inscription en file d'attente réussie !"
              : "Réservation réussie !",
          );
          window.location.href = "./../../view/Page/PageCompte.php";
        } else {
          alert("Erreur lors de la réservation : " + data.message);
        }
      } catch (e) {
        console.error("Erreur de parsing JSON :", e);
        console.error("Réponse reçue :", text);
        alert("Erreur technique. Réponse inattendue du serveur.");
      }
    })
    .catch((err) => {
      console.error("Erreur fetch :", err);
      alert("Erreur réseau ou serveur.");
    });
});

async function initMap(address) {
  const API_KEY = "pk.d1e3a3fe1d9a93351d306e093bc54eb2";

  try {
    const response = await fetch(
      `https://eu1.locationiq.com/v1/search.php?key=${API_KEY}&q=${encodeURIComponent(address)}&format=json`,
    );
    const data = await response.json();

    if (data && data[0]) {
      const { lat, lon } = data[0];

      const map = L.map("map").setView([lat, lon], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.marker([lat, lon]).addTo(map).bindPopup(address).openPopup();
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la carte:", error);
  }
}

boutonContact.addEventListener("click", () => {
  if (!connected) {
    window.location.href = "./../../view/Page/Connexion.php";
    return;
  }
  console.log("Contact button clicked");
  console.log(activiteData.idMeeter, activiteData.titre);
  Contact(activiteData.idMeeter, activiteData.titre);
});

meeter.addEventListener("click", () => {
  window.location.href = `./../../view/Page/pageMeeter.php?id=${activiteData.idMeeter}`;
});

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    console.error("Aucun id fourni dans l'URL.");
    return;
  }

  try {
    const response = await fetch(
      `../../controller/Activite/ActiviteViewerController.php?id=${id}`,
    );
    const data = await response.json();
    window.activiteData = data;

    const boutonAvis = document.getElementById("boutonAvis");
    if (!data.userCanReview) {
      boutonAvis.style.display = "none";
    }

    if (data.adresse) {
      initMap(data.adresse);
    }
  } catch (err) {
    console.error("Erreur lors du chargement de l'activité :", err);
  }
});
