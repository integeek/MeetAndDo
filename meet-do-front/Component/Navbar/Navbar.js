function Navbar () {
    return `
            <nav>
                <img src="../Assets/img/logoMeet&Do.png" id="logo">
                <ul class="navLinks">
                    <li><a href="#">Accueil</a></li>
                    <li><a href="#">Messagerie</a></li>
                </ul>
                <div id="navbarGrow"></div>
                <div class="annonce">
                    <a href="#">Poster une annonce</a>
                </div>
                <a href="#" class="profil" id="profil">
                    <div>Profil</div>
                    <image src="../Assets/img/icon-profil.png" id="profilImg">
                </a>
            </nav>
    `;
  };