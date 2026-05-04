function Navbar(options = {}) {
    let basePath = "..";
    let variant = "guest";

    if (typeof options === "string") {
        if (["guest", "user", "creator"].includes(options)) {
            variant = options;
        } else {
            basePath = options;
        }
    } else if (options && typeof options === "object") {
        basePath = options.basePath || basePath;
        variant = options.variant || variant;
    }

    if (variant === "guest") {
        return GuestNavbar(basePath);
    }

    return GuestNavbar(basePath);
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

function toggleMeetDoNavbar(button) {
    const targetId = button.getAttribute("aria-controls");
    const target = document.getElementById(targetId);
    if (!target) return;

    const isOpen = target.classList.toggle("show");
    button.setAttribute("aria-expanded", String(isOpen));
}
