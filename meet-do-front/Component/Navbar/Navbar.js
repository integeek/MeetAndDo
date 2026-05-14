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

function getMeetDoApiUrl() {
    const hostname = window.location.hostname;
    const apiHostname = hostname || "localhost";

    return `http://${apiHostname}:3000`;
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

function getAuthenticatedUserAvatarUrl(basePath) {
    const avatarUrl = getStoredAuthenticatedUser()?.avatar_url;
    return typeof avatarUrl === "string" && avatarUrl.trim()
        ? avatarUrl
        : `${basePath}/Assets/img/icon-profil.png`;
}

function escapeHtmlAttribute(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function isPublisherUser() {
    const role = String(getStoredAuthenticatedUser()?.role || "").toLowerCase();
    return role === "publisher";
}

function isStandardUser() {
    const role = String(getStoredAuthenticatedUser()?.role || "").toLowerCase();
    return role === "user";
}

function getUserAccountHref(basePath) {
    const userId = getAuthenticatedUserId();

    if (userId) {
        const params = new URLSearchParams({ userId: String(userId) });
        return `${basePath}/Page/MyAccount.html?${params.toString()}`;
    }

    const params = new URLSearchParams({
        authMessage: "You must be logged in to access your profile.",
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
        authMessage: "You must be logged in to create an activity.",
        redirect: targetPath,
    });
    return `${basePath}/Page/Login.html?${params.toString()}`;
}

function getPublisherApplicationHref(basePath) {
    return getAuthenticatedPageHref(
        basePath,
        "PublisherApplication.html",
        "You must be logged in to apply as a publisher.",
    );
}

function getAuthenticatedPageHref(basePath, targetPath, authMessage) {
    const userId = getAuthenticatedUserId();

    if (userId) {
        const params = new URLSearchParams({ userId: String(userId) });
        return `${basePath}/Page/${targetPath}?${params.toString()}`;
    }

    const params = new URLSearchParams({
        authMessage,
        redirect: targetPath,
    });
    return `${basePath}/Page/Login.html?${params.toString()}`;
}

function getMyReservationsHref(basePath) {
    return getAuthenticatedPageHref(
        basePath,
        "MyReservations.html",
        "You must be logged in to access your reservations.",
    );
}

function getMyActivitiesHref(basePath) {
    return getAuthenticatedPageHref(
        basePath,
        "MyActivity.html",
        "You must be logged in to access your activities.",
    );
}

function getMyRequestsHref(basePath) {
    return getAuthenticatedPageHref(
        basePath,
        "MyRequests.html",
        "You must be logged in to access your requests.",
    );
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
        <nav class="navbar navbar-expand-lg meetdo-navbar" aria-label="Main navigation">
            <div class="container-fluid meetdo-navbar-inner">
                <a class="navbar-brand meetdo-brand" href="${basePath}/Page/Home.html" aria-label="Meet and Do - Home">
                    <img src="${basePath}/Assets/img/logoMeet&Do.png" id="logo" alt="Meet and Do">
                </a>

                <button
                    class="navbar-toggler meetdo-toggler"
                    type="button"
                    aria-controls="meetdoNavbarGuest"
                    aria-expanded="false"
                    aria-label="Show menu"
                    onclick="toggleMeetDoNavbar(this)"
                >
                    <span class="navbar-toggler-icon meetdo-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse meetdo-collapse" id="meetdoNavbarGuest">
                    <ul class="navbar-nav navLinks meetdo-main-links">
                        <li class="nav-item">
                            <a class="nav-link meetdo-link" href="${basePath}/Page/Home.html">Home</a>
                        </li>
                    </ul>

                    <div class="meetdo-auth-actions">
                        <a class="btn btn-primary meetdo-btn" href="${basePath}/Page/Signup.html">Sign up</a>
                        <a class="btn btn-primary meetdo-btn" href="${basePath}/Page/Login.html">Log in</a>
                    </div>
                </div>
            </div>
        </nav>
    `;
}

function UserNavbar(basePath, variant = "auto") {
    const accountHref = getUserAccountHref(basePath);
    const avatarUrl = getAuthenticatedUserAvatarUrl(basePath);
    const escapedAvatarUrl = escapeHtmlAttribute(avatarUrl);
    const fallbackAvatarUrl = escapeHtmlAttribute(`${basePath}/Assets/img/icon-profil.png`);
    const hasCustomAvatar = avatarUrl !== `${basePath}/Assets/img/icon-profil.png`;
    const publisherActions = getPublisherNavbarActions(basePath, variant);
    const reservationsHref = getMyReservationsHref(basePath);
    const activitiesHref = getMyActivitiesHref(basePath);
    const requestsHref = getMyRequestsHref(basePath);
    const isPublisher = variant === "publisher" || isPublisherUser();
    const publisherApplicationAction = isStandardUser()
        ? `<a class="btn btn-primary meetdo-btn" href="${getPublisherApplicationHref(basePath)}">Become a publisher</a>`
        : "";
    const publisherMenuItem = isPublisher
        ? `
                                <li>
                                    <a class="dropdown-item" href="${activitiesHref}">My activities</a>
                                </li>
        `
        : "";

    return `
        <nav class="navbar navbar-expand-lg meetdo-navbar" aria-label="Main navigation">
            <div class="container-fluid meetdo-navbar-inner">
                <a class="navbar-brand meetdo-brand" href="${basePath}/Page/Home.html" aria-label="Meet and Do - Home">
                    <img src="${basePath}/Assets/img/logoMeet&Do.png" id="logo" alt="Meet and Do">
                </a>

                <button
                    class="navbar-toggler meetdo-toggler"
                    type="button"
                    aria-controls="meetdoNavbarUser"
                    aria-expanded="false"
                    aria-label="Show menu"
                    onclick="toggleMeetDoNavbar(this)"
                >
                    <span class="navbar-toggler-icon meetdo-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse meetdo-collapse" id="meetdoNavbarUser">
                    <ul class="navbar-nav navLinks meetdo-main-links">
                        <li class="nav-item">
                            <a class="nav-link meetdo-link" href="${basePath}/Page/Home.html">Home</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link meetdo-link" href="${basePath}/Page/Messagerie.html">Messages</a>
                        </li>
                    </ul>

                    <div class="meetdo-auth-actions">
                        ${publisherActions}
                        ${publisherApplicationAction}
                        <div class="dropdown meetdo-profile-dropdown">
                            <a
                                class="btn btn-primary meetdo-btn meetdo-profile-btn dropdown-toggle"
                                id="profil"
                                href="${accountHref}"
                                role="button"
                                aria-expanded="false"
                            >
                                <div>Profile</div>
                                <img
                                    src="${escapedAvatarUrl}"
                                    id="profilImg"
                                    class="${hasCustomAvatar ? "has-avatar" : ""}"
                                    alt=""
                                    aria-hidden="true"
                                    onerror="this.onerror=null;this.src='${fallbackAvatarUrl}';this.classList.remove('has-avatar');"
                                >
                            </a>
                            <ul class="dropdown-menu dropdown-menu-end meetdo-profile-menu" aria-labelledby="profil">
                                <li>
                                    <a class="dropdown-item" href="${accountHref}">My account</a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="${reservationsHref}">My reservations</a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="${requestsHref}">My requests</a>
                                </li>
                                ${publisherMenuItem}
                                <li class="meetdo-profile-menu-divider" aria-hidden="true"></li>
                                <li>
                                    <button class="dropdown-item meetdo-logout-button" type="button" onclick="logoutMeetDoUser('${basePath}')">
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
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

async function logoutMeetDoUser(basePath = "..") {
    try {
        await fetch(`${getMeetDoApiUrl()}/authentication/logout`, {
            method: "POST",
            credentials: "include",
        });
    } catch (error) {
        console.warn("Unable to logout from server:", error);
    } finally {
        localStorage.removeItem("meetando_current_user");
        window.location.href = `${basePath}/Page/Home.html`;
    }
}

async function refreshNavbarAuthenticatedUser() {
    const navbarContainer = document.querySelector(".navbar-container");
    if (!navbarContainer) return;

    try {
        const response = await fetch(`${getMeetDoApiUrl()}/authentication/me`, {
            credentials: "include",
        });

        if (!response.ok) {
            localStorage.removeItem("meetando_current_user");
            navbarContainer.innerHTML = Navbar();
            return;
        }

        const user = await response.json();
        if (!user || typeof user !== "object") return;

        localStorage.setItem("meetando_current_user", JSON.stringify(user));
        navbarContainer.innerHTML = Navbar();
    } catch (error) {
        console.warn("Unable to refresh navbar user:", error);
    }
}

document.addEventListener("DOMContentLoaded", refreshNavbarAuthenticatedUser);
