 async function loadUserProfile() {
  try {
    const response = await fetch('http://localhost:3000/authentication/me', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      window.location.href = '/login.html';
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

  const response = await fetch('http://localhost:3000/user', {
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

  const response = await fetch('http://localhost:3000/user', {
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