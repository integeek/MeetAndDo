function Navbar() {
  return `
    <nav>
      <img src="../Assets/img/logoMeet&Do.png" id="logo">
      <ul class="navLinks">
        <li><a href="../Page/Home.html">Accueil</a></li>
        <li><a href="#">Messagerie</a></li>
      </ul>
      <div id="navbarGrow"></div>
      <div class="annonce">
        <a href="#">Poster une annonce</a>
      </div>
      <div class="profil-container">
        <a href="#" class="profil" id="profil" onclick="toggleDropdown(event)">
          <div>Profil</div>
          <img src="../Assets/img/icon-profil.png" id="profilImg">
        </a>
        <div class="dropdown-menu" id="dropdown-menu">
          <a href="../Page/MyAccount.html">My Account</a>
          <a href="../Page/MyReservations.html">My Reservations</a>
          <hr>
          <a href="#" onclick="logout()">Logout</a>
        </div>
      </div>
    </nav>
  `;
}

function toggleDropdown(event) {
  event.preventDefault();
  document.getElementById('dropdown-menu').classList.toggle('open');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.profil-container')) {
    document.getElementById('dropdown-menu')?.classList.remove('open');
  }
});

async function logout() {
  await fetch('http://localhost:3000/authentication/logout', {
    method: 'POST',
    credentials: 'include',
  });
  window.location.href = '../Page/Login.html';
}
