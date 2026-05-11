document.addEventListener("DOMContentLoaded", () => {
    loadActivities();
    loadThemes();

    document.getElementById("search-input").addEventListener("input", filterActivities);
    document.getElementById("search-btn").addEventListener("click", filterActivities);

    const filtersModal = document.getElementById('filters-modal');
    document.getElementById('settings-btn').onclick = () => filtersModal.classList.remove('hidden');
    document.getElementById('close-filters').onclick = () => filtersModal.classList.add('hidden');
    document.getElementById('apply-filters').onclick = () => {
        filtersModal.classList.add('hidden');
        filterActivities();
    };
    const mapModal = document.getElementById('map-modal');
    document.getElementById('position-btn').onclick = async () => {
        mapModal.classList.remove('hidden');
        await showActivitiesOnMap();
    };
    document.getElementById('close-map').onclick = () => mapModal.classList.add('hidden');
});

class ActivityCard {
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        this.data = data;
        this.render();
    }

    render() {
        const card = document.createElement("div");
        card.classList.add("activity-card");
        card.onclick = () => window.location.href = `../Page/Activity.html?id=${this.data.id}`;

        card.innerHTML = `
            <div class="card">
                <img src="${this.data.images[0] ?? '../Assets/img/placeholder.png'}" alt="Image of the activity" class="card-img">
                <div class="card-content">
                    <h2 class="card-title">${this.data.title}</h2>
                    <p><strong>Place :</strong> ${this.data.address}</p>
                    <p><strong>Price :</strong> ${this.data.price}€</p>
                    <p><strong>Group of :</strong> ${this.data.group_size}</p>
                </div>
            </div>
        `;

        this.container.appendChild(card);
    }
}

let loading = false;
let allActivities = [];

function loadActivities() {
    loading = true;
    document.getElementById("loader").style.display = "block";

    fetch(`http://localhost:3000/activity`)
        .then(response => response.json())
        .then(activities => {
            allActivities = Array.isArray(activities) ? activities : activities.data ?? [];
            renderActivities(allActivities);
        })
        .catch(error => console.error("Error loading activities :", error))
        .finally(() => {
            loading = false;
            document.getElementById("loader").style.display = "none";
        });
}

async function loadThemes() {
    const res = await fetch('http://localhost:3000/activity/themes');
    const themes = await res.json();
    const container = document.getElementById('themes-filter');

    container.innerHTML = `<button class="theme-btn active" data-id="">All</button>`;

    themes.forEach(theme => {
        const btn = document.createElement('button');
        btn.classList.add('theme-btn');
        btn.dataset.id = theme;
        btn.textContent = theme;
        container.appendChild(btn);
    });

    container.addEventListener('click', (e) => {
        if (!e.target.classList.contains('theme-btn')) {
            return;
        }
        container.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        filterActivities();
    });
}

function renderActivities(list) {
    const container = document.getElementById("activities-container");
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = "<p>No activity find.</p>";
        return;
    }

    list.forEach(data => new ActivityCard("activities-container", data));
}

function filterActivities() {
    const search = document.getElementById("search-input").value.toLowerCase();
    const activeTheme = document.querySelector('.theme-btn.active')?.dataset.id ?? "";

    const filtered = allActivities.filter(a => {
        const matchSearch =
            a.title?.toLowerCase().includes(search) ||
            a.address?.toLowerCase().includes(search) ||
            a.description?.toLowerCase().includes(search);
            const matchTheme = activeTheme === "" || a.theme?.split(',').map(t => t.trim()).includes(activeTheme);
        return matchSearch && matchTheme;
    });

    renderActivities(filtered);
}

async function showActivitiesOnMap() {
    const mapDiv = document.getElementById('map');
    const loadingIndicator = document.getElementById('map-loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = "flex";

    const activities = allActivities;

    setTimeout(() => {
        mapDiv.innerHTML = "";
        if (window.mapInstance) {
            window.mapInstance.remove();
        }
        window.mapInstance = L.map('map').setView([48.8566, 2.3522], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(window.mapInstance);

        let index = 0;

        function loadNextBatch() {
            const batch = activities.slice(index, index + 2);
            batch.forEach(act => {
                console.log("act", act)
                if (act.address) {
                    fetch(`https://eu1.locationiq.com/v1/search.php?key=pk.d1e3a3fe1d9a93351d306e093bc54eb2&q=${encodeURIComponent(act.address)}&format=json`)
                        .then(r => r.json())
                        .then(data => {
                            if (data && data[0]) {
                                const { lat, lon } = data[0];
                                
                                L.marker([lat, lon])
                                    .addTo(window.mapInstance)
                                    .bindPopup(`
                                        <div style="text-align:center;min-width:150px;">
                                            <img src="${act.images[0] ?? '../Assets/img/placeholder.png'}" 
                                                style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;">
                                            <b>${act.title}</b><br>
                                            <small>${act.address}</small><br>
                                            <small><b>${act.price}€</b></small><br>
                                            <a href="../Page/Activity.html?id=${act.id}" style="color:#004AAD;font-size:0.85rem;">View the activity →</a>
                                        </div>
                                    `);
                            }
                        })
                        .catch(() => console.warn(`Address not found : ${act.address}`));
                }
            });

            index += 2;
            if (index < activities.length) {
                setTimeout(loadNextBatch, 1000);
            } else {
                if (loadingIndicator) loadingIndicator.style.display = "none";
            }
        }

        loadNextBatch();
    }, 300);
}

async function getCurrentUser() {
  try {
    const response = await fetch('http://localhost:3000/authentication/me', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
        return null
    };
    return await response.json();
  } catch {
    return null;
  }
}

async function updateWelcomeMessage() {
  const user = await getCurrentUser();
  console.log(user)
  const h1 = document.querySelector('.message-bienvenue');

  if (user?.firstname) {
    h1.innerHTML = `Great to see you again 
      <span style="color: #1E3A8A;">${user.firstname}</span> !`;
  } else {
    h1.innerHTML = `Welcome to Meet&Do !`;
  }
}

document.addEventListener('DOMContentLoaded', updateWelcomeMessage);