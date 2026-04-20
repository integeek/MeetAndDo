function SearchBar(url) {
return `
    <div></div>
    <div class="search-bar">
        <input type="text" placeholder="Research" id="search-input">
        <button id="search-btn"><img src="../Assets/img/icon-search.svg" alt=""></button>
        <div class="separator"></div>
        <button id="settings-btn"><img src="../Assets/img/icon-settings.svg" alt=""></button>
        <button id="position-btn">
            <img src="../Assets/img/icon-position.svg" alt="">
        </button>
    </div>
    <!-- Modal Filters -->
    <div id="filters-modal" class="popup hidden">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3>Filters</h3>
            <button id="close-filters" style="font-size:1.5rem;background:none;border:none;cursor:pointer;">✖</button>
        </div>
        <div id="themes-filter" style="display:flex;gap:10px;flex-wrap:wrap;"></div>
        <button id="apply-filters" class="blueButton">Apply</button>
    </div>
    <!-- Modal Map -->
    <div id="map-modal" class="popup hidden" style="width:80vw;max-width:700px;height:70vh;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
                <h3>Carte des activités</h3>
                <div id="map-loading-indicator" style="display:flex;align-items:center;gap:8px;font-size:1rem;margin-top:2px;">
                    <span>Loading of places...</span>
                    <img src="../Assets/img/loader.gif" alt="Loading..." width="22" height="22">
                </div>
            </div>
            <button id="close-map" style="font-size:1.5rem;background:none;border:none;cursor:pointer;">✖</button>
        </div>
        <div id="map" style="width:100%;height:90%;margin-top:10px;border-radius:10px;position:relative;"></div>
    </div>
`;
}