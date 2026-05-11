const PROFILE_AVATAR_PLACEHOLDER = '../Assets/img/icon-profil.png';
const ALLOWED_PROFILE_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];
const MAX_PROFILE_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

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
    setProfileAvatar(user.avatar_url);

  } catch (error) {
    console.error('Erreur lors du chargement du profil', error);
    redirectToLogin();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  initProfilePhotoUpload();
});

function setProfileAvatar(avatarUrl) {
  const profileIcon = document.getElementById('profile-icon');
  const avatarPreview = document.getElementById('avatar-preview');
  const src = avatarUrl || PROFILE_AVATAR_PLACEHOLDER;

  if (profileIcon) {
    profileIcon.onerror = () => {
      profileIcon.onerror = null;
      profileIcon.src = PROFILE_AVATAR_PLACEHOLDER;
    };
    profileIcon.src = src;
  }

  if (avatarPreview) {
    avatarPreview.src = src;
  }
}

function setAvatarFeedback(message = '', type = '') {
  const feedback = document.getElementById('avatar-upload-feedback');
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle('is-error', type === 'error');
  feedback.classList.toggle('is-success', type === 'success');
}

function validateProfilePhotoFile(fileList) {
  const files = Array.from(fileList || []);

  if (files.length !== 1) {
    return 'Veuillez sélectionner une seule image.';
  }

  const [file] = files;

  if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
    return 'Format non autorisé. Utilisez JPG, PNG, GIF ou WebP.';
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    return "L'image doit faire moins de 5 Mo.";
  }

  return '';
}

function initProfilePhotoUpload() {
  const input = document.getElementById('input-pdp');
  if (!input) return;

  input.addEventListener('change', () => {
    const error = validateProfilePhotoFile(input.files);
    if (error) {
      input.value = '';
      setAvatarFeedback(error, 'error');
      setProfileAvatar(document.getElementById('profile-icon')?.src);
      return;
    }

    const [file] = input.files;
    const preview = document.getElementById('avatar-preview');
    if (preview) {
      preview.src = URL.createObjectURL(file);
      preview.onload = () => URL.revokeObjectURL(preview.src);
    }

    setAvatarFeedback('Image prête à être envoyée.', 'success');
  });
}

async function uploadProfilePhoto() {
  const input = document.getElementById('input-pdp');
  const confirmButton = document.querySelector('#bouton-photo-confirm .buttonCo');
  if (!input) return;

  const error = validateProfilePhotoFile(input.files);
  if (error) {
    setAvatarFeedback(error, 'error');
    return;
  }

  const [file] = input.files;
  const formData = new FormData();
  formData.append('avatar', file);

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent = 'Envoi...';
  }
  setAvatarFeedback('Upload en cours...', '');

  try {
    const response = await fetch(`${getMeetDoApiUrl()}/user/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      let message = "Erreur pendant l'upload de la photo.";
      try {
        const errorBody = await response.json();
        if (errorBody.message) {
          message = Array.isArray(errorBody.message)
            ? errorBody.message.join(' ')
            : errorBody.message;
        }
      } catch (_error) {
        // Nothing to do if the response is not JSON.
      }
      throw new Error(message);
    }

    const result = await response.json();
    setProfileAvatar(result.avatar_url);
    setAvatarFeedback('Photo mise à jour.', 'success');
    window.location.href = 'MyAccount.html';
  } catch (error) {
    setAvatarFeedback(error.message || "Erreur pendant l'upload.", 'error');
  } finally {
    if (confirmButton) {
      confirmButton.disabled = false;
      confirmButton.textContent = 'Confirmer';
    }
  }
}

function openPopUp(id) {
    document.getElementById(id).style.display = "block";
}

function closePopUp(id) {
    document.getElementById(id).style.display = "none";

    if (id === 'edit-photo-popup') {
      const input = document.getElementById('input-pdp');
      if (input) input.value = '';
      setAvatarFeedback('');
      setProfileAvatar(document.getElementById('profile-icon')?.src);
    }
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

  if (password !== newPassword) {
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

  const response = await fetch(`${getMeetDoApiUrl()}/user/password`, {
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
