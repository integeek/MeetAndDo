function redirectToLogin() {
  localStorage.removeItem('meetando_current_user');
  const params = new URLSearchParams({
    authMessage: 'Vous devez etre connecte pour acceder a votre compte.',
    redirect: 'MyAccount.html',
  });
  window.location.href = `Login.html?${params.toString()}`;
}

function getMeetDoApiUrl() {
    const hostname = window.location.hostname;
    const apiHostname = hostname || 'localhost';

    return `http://${apiHostname}:3000`;
}

async function loadUserProfile() {
  try {
    const response = await fetch(`${getMeetDoApiUrl()}/authentication/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      redirectToLogin();
      return;
    }

    const user = await response.json();
    
    document.getElementById('firstname').value = user.firstname;
    document.getElementById('lastname').value = user.lastname;
    document.getElementById('email').value = user.email;
    document.getElementById('edited-firstname').value = user.firstname;
    document.getElementById('edited-lastname').value = user.lastname;

  } catch (error) {
    console.error('Erreur lors du chargement du profil', error);
    redirectToLogin();
  }
}

document.addEventListener('DOMContentLoaded', loadUserProfile);

function openPopUp(id) {
    document.getElementById(id).style.display = "block";
}

function closePopUp(id) {
    document.getElementById(id).style.display = "none";
}

async function updateLastname() {
  const newLastname = document.getElementById('edited-lastname').value;
  if (!newLastname.trim()) return;

  const response = await fetch(`${getMeetDoApiUrl()}/user`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastname: newLastname }),
  });

  if (response.ok) {
    closePopUp('edit-lastname-popup');
    await loadUserProfile();
  } else {
    alert('Erreur lors de la mise à jour');
  }
}

async function updateFirstname() {
  const newFirstname = document.getElementById('edited-firstname').value;
  if (!newFirstname.trim()) return;

  const response = await fetch(`${getMeetDoApiUrl()}/user`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstname: newFirstname }),
  });

  if (response.ok) {
    closePopUp('edit-firstname-popup');
    await loadUserProfile();
  } else {
    alert('Erreur lors de la mise à jour');
  }
}

async function updatePassword() {
  const oldPassword = document.getElementById('old-password').value;
  const password = document.getElementById('password').value;
  const newPassword = document.getElementById('new-password').value;
  const erreurDiv = document.querySelector('.erreur');

  if (!oldPassword.trim() || !password.trim() || !newPassword.trim()){
    return;
  }

  if (password.value !== newPassword.value) {
    erreurDiv.textContent = "The passwords do not match";
    return;
  }

  if (!/[0-9]/.test(password)) {
      erreurDiv.textContent = "The password must contain at least one number";
      return;
  }

  if (!/[A-Z]/.test(password)) {
      erreurDiv.textContent = "The password must contain at least one uppercase letter";
      return;
  }

  if (!/[a-z]/.test(password)) {
      erreurDiv.textContent = "The password must contain at least one lowercase letter";
      return;
  }

  const response = await fetch('http://localhost:3000/user/password', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword: oldPassword, password: newPassword }),
  });

  if (response.ok) {
    closePopUp('edit-password-popup');
    alert('The password has been successfully changed');
    await loadUserProfile();
  } else {
    alert('Error during update');
  }
}
