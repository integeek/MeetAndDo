function Navbar(options = {}) {
    let basePath = "..";
    let variant = "auto";

    if (typeof options === "string") {
        if (["auto", "guest", "user", "publisher", "creator"].includes(options)) {
            variant = options;
        } else {
            basePath = options;
        }
    } else if (options && typeof options === "object") {
        basePath = options.basePath || basePath;
        variant = options.variant || variant;
    }

    if (variant === "auto") {
        variant = getAuthenticatedUserId() ? (isPublisherUser() ? "publisher" : "user") : "guest";
    }

    if (variant === "guest") {
        return GuestNavbar(basePath);
    }

    if (variant === "user" || variant === "publisher") {
        return UserNavbar(basePath, variant);
    }

    return GuestNavbar(basePath);
}

function getAuthenticatedUserId() {
    const user = getStoredAuthenticatedUser();
    const userId = Number(user?.id);

    return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function getStoredAuthenticatedUser() {
    try {
        const rawUser = localStorage.getItem("meetando_current_user");
        if (!rawUser) return null;

        const user = JSON.parse(rawUser);
        return user && typeof user === "object" ? user : null;
    } catch (error) {
        return null;
    }
}

function isPublisherUser() {
    const role = String(getStoredAuthenticatedUser()?.role || "").toLowerCase();
    return role === "publisher";
}

function getUserAccountHref(basePath) {
    const userId = getAuthenticatedUserId();

    if (userId) {
        const params = new URLSearchParams({ userId: String(userId) });
        return `${basePath}/Page/MyAccount.html?${params.toString()}`;
    }

    const params = new URLSearchParams({
        authMessage: "Vous devez etre connecte pour acceder a votre profil.",
        redirect: "MyAccount.html",
    });
    return `${basePath}/Page/Login.html?${params.toString()}`;
}

function getCreateActivityHref(basePath) {
    const userId = getAuthenticatedUserId();
    const targetPath = "ActivityBuilder.html";

    if (userId) {
        const params = new URLSearchParams({ userId: String(userId) });
        return `${basePath}/Page/${targetPath}?${params.toString()}`;
    }

    const params = new URLSearchParams({
        authMessage: "Vous devez etre connecte pour creer une activite.",
        redirect: targetPath,
    });
    return `${basePath}/Page/Login.html?${params.toString()}`;
}

function getPublisherNavbarActions(basePath, variant = "auto") {
    if (variant !== "publisher" && !isPublisherUser()) {
        return "";
    }

    return `
        <a class="btn btn-primary meetdo-btn" href="${basePath}/Page/Dashboard.html">Dashboard</a>
        <a class="btn btn-primary meetdo-btn" href="${getCreateActivityHref(basePath)}">Create an activity</a>
    `;
}

function GuestNavbar(basePath) {
    return `
        <nav class="navbar navbar-expand-lg meetdo-navbar" aria-label="Navigation principale">
            <div class="container-fluid meetdo-navbar-inner">
                <a class="navbar-brand meetdo-brand" href="${basePath}/Page/Home.html" aria-label="Meet and Do - Accueil">
                    <img src="${basePath}/Assets/img/logoMeet&Do.png" id="logo" alt="Meet and Do">
                </a>

                <button
                    class="navbar-toggler meetdo-toggler"
                    type="button"
                    aria-controls="meetdoNavbarGuest"
                    aria-expanded="false"
                    aria-label="Afficher le menu"
                    onclick="toggleMeetDoNavbar(this)"
                >
                    <span class="navbar-toggler-icon meetdo-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse meetdo-collapse" id="meetdoNavbarGuest">
                    <ul class="navbar-nav navLinks meetdo-main-links">
                        <li class="nav-item">
                            <a class="nav-link meetdo-link" href="${basePath}/Page/Home.html">Accueil</a>
                        </li>
                    </ul>

                    <div class="meetdo-auth-actions">
                        <a class="btn btn-primary meetdo-btn" href="${basePath}/Page/Signup.html">S'inscrire</a>
                        <a class="btn btn-primary meetdo-btn" href="${basePath}/Page/Login.html">Se connecter</a>
                    </div>
                </div>
            </div>
        </nav>
    `;
}

function UserNavbar(basePath, variant = "auto") {
    const accountHref = getUserAccountHref(basePath);
    const publisherActions = getPublisherNavbarActions(basePath, variant);

    return `
        <nav class="navbar navbar-expand-lg meetdo-navbar" aria-label="Navigation principale">
            <div class="container-fluid meetdo-navbar-inner">
                <a class="navbar-brand meetdo-brand" href="${basePath}/Page/Home.html" aria-label="Meet and Do - Accueil">
                    <img src="${basePath}/Assets/img/logoMeet&Do.png" id="logo" alt="Meet and Do">
                </a>

                <button
                    class="navbar-toggler meetdo-toggler"
                    type="button"
                    aria-controls="meetdoNavbarUser"
                    aria-expanded="false"
                    aria-label="Afficher le menu"
                    onclick="toggleMeetDoNavbar(this)"
                >
                    <span class="navbar-toggler-icon meetdo-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse meetdo-collapse" id="meetdoNavbarUser">
                    <ul class="navbar-nav navLinks meetdo-main-links">
                        <li class="nav-item">
                            <a class="nav-link meetdo-link" href="${basePath}/Page/Home.html">Accueil</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link meetdo-link" href="${basePath}/Page/Messagerie.html">Messagerie</a>
                        </li>
                    </ul>

                    <div class="meetdo-auth-actions">
                        ${publisherActions}
                        <a class="btn btn-primary meetdo-btn meetdo-profile-btn" id="profil" href="${accountHref}">
                            <div>Profil</div>
                            <img src="${basePath}/Assets/img/icon-profil.png" id="profilImg" alt="" aria-hidden="true">
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    `;
}

function toggleMeetDoNavbar(button) {
    const targetId = button.getAttribute("aria-controls");
    const target = document.getElementById(targetId);
    if (!target) return;

    const isOpen = target.classList.toggle("show");
    button.setAttribute("aria-expanded", String(isOpen));
}

async function refreshNavbarAuthenticatedUser() {
    const navbarContainer = document.querySelector(".navbar-container");
    if (!navbarContainer) return;

    try {
        const response = await fetch("http://localhost:3000/authentication/me", {
            credentials: "include",
        });

        if (!response.ok) return;

        const user = await response.json();
        if (!user || typeof user !== "object") return;

        localStorage.setItem("meetando_current_user", JSON.stringify(user));
        navbarContainer.innerHTML = Navbar();
    } catch (error) {
        console.warn("Unable to refresh navbar user:", error);
    }
}

document.addEventListener("DOMContentLoaded", refreshNavbarAuthenticatedUser);
