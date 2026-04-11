document.addEventListener('DOMContentLoaded', async () => {
    const settingsBtn = document.getElementById('settings-btn');
    const filtersModal = document.getElementById('filters-modal');
    const closeFilters = document.getElementById('close-filters');
    const applyFilters = document.getElementById('apply-filters');

    settingsBtn.onclick = () => filtersModal.classList.remove('hidden');
    closeFilters.onclick = () => filtersModal.classList.add('hidden');
    applyFilters.onclick = () => {
        filtersModal.classList.add('hidden');
        loadActivities(true);
    };

    const positionBtn = document.getElementById('position-btn');
    const mapModal = document.getElementById('map-modal');
    const closeMap = document.getElementById('close-map');
    positionBtn.onclick = async () => {
        mapModal.classList.remove('hidden');
        await showActivitiesOnMap();
    };
    closeMap.onclick = () => mapModal.classList.add('hidden');

    // --- Catégories dynamiques ---
    const categoriesDiv = document.getElementById('categories-filter');
    const response = await fetch('../../controller/Activite/CreerActiviteController.php', { method: 'GET' });
    const categories = await response.json();
    categories.forEach(cat => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="cat-filter" value="${cat.idCategorie}">${cat.nom}`;
        categoriesDiv.appendChild(label);
    });

    // --- Fonction pour récupérer les filtres ---
    function getFilters() {
        const search = document.getElementById('search-input').value;
        const date = document.getElementById('date').value;
        const pmr = document.getElementById('pmr-filter').checked ? 1 : 0;
        const categories = Array.from(document.querySelectorAll('.cat-filter:checked')).map(cb => cb.value);
        return { search, date, pmr, categories };
    }

    // --- Fonction pour charger les activités filtrées ---
    async function loadActivities(forceRefresh = false) {
        const { search, date, pmr, categories } = getFilters();
        const params = new URLSearchParams();
        params.append('search', search);
        params.append('date', date);
        params.append('pmr', pmr);
        categories.forEach(cat => params.append('categories[]', cat));
        const res = await fetch(`../../controller/Accueil/getActivities.php?${params.toString()}`);
        const activities = await res.json();
        const container = document.getElementById("activities-container");
        container.innerHTML = "";
        if (!activities || activities.length === 0) {
            container.innerHTML = "<p>Aucune activité trouvée.</p>";
        } else {
            activities.forEach(activityData => new ActivityCard("activities-container", activityData));
        }
    }

    // --- Fonction pour afficher les activités sur la carte ---
    async function showActivitiesOnMap() {
        const mapDiv = document.getElementById('map');
        const loadingIndicator = document.getElementById('map-loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = "flex";

        // Récupère toutes les activités
        const res = await fetch(`../../controller/Accueil/getAllActivities.php`);
        const activities = await res.json();

        // Initialise la map
        setTimeout(() => {
            mapDiv.innerHTML = "";
            if (window.mapInstance) window.mapInstance.remove();
            window.mapInstance = L.map('map').setView([48.8566, 2.3522], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(window.mapInstance);

            let index = 0;
            function loadNextBatch() {
                const batch = activities.slice(index, index + 2);
                batch.forEach(act => {
                    if (act.adresse) {
                        fetch(`https://eu1.locationiq.com/v1/search.php?key=pk.d1e3a3fe1d9a93351d306e093bc54eb2&q=${encodeURIComponent(act.adresse)}&format=json`)
                            .then(r => r.json())
                            .then(data => {
                                if (data && data[0]) {
                                    const { lat, lon } = data[0];
                                    L.marker([lat, lon]).addTo(window.mapInstance)
                                        .bindPopup(`<b>${act.titre}</b><br>${act.adresse}`);
                                }
                            });
                    }
                });
                index += 2;
                if (index < activities.length) {
                    setTimeout(loadNextBatch, 1000);
                } else {
                    // Masque le loader du modal quand tout est chargé
                    if (loadingIndicator) loadingIndicator.style.display = "none";
                }
            }
            loadNextBatch();
        }, 300);
    }

    // --- Listeners searchbar ---
    document.getElementById('search-input').addEventListener('input', () => loadActivities(true));
    // Les filtres sont appliqués via le bouton "Appliquer" du modal

    // Premier chargement (affiche tout si rien n'est filtré)
    loadActivities(true);
});