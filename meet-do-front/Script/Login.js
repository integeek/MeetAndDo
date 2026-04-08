const API_URL = 'http://localhost:3000';
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    const erreurDiv = document.querySelector('.erreur');
    const successDiv = document.querySelector('.success');

    erreurDiv.textContent = '';
    successDiv.textContent = '';

    try {
        const response = await fetch(`${API_URL}/authentication/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            erreurDiv.textContent = error.message;
            return;
        }

        const user = await response.json();
        successDiv.textContent = `Welcome ${user.firstname} !`;

        setTimeout(() => {
            window.location.href = 'Home.html';
        }, 1000);

    } catch (error) {
        erreurDiv.textContent = 'Unable to contact the server';
    }
});

const modal = document.getElementById('forgotModal');

document.getElementById('forgotPassword').addEventListener('click', (e) => {
    e.preventDefault();
    modal.style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

document.getElementById('sendResetLink').addEventListener('click', async () => {
    const email = document.getElementById('forgotEmail').value;
    const erreurModal = document.querySelector('.erreurModal');
    const successModal = document.querySelector('.successModal');

    erreurModal.textContent = '';
    successModal.textContent = '';

    if (!email) {
        erreurModal.textContent = 'Please enter your email address.';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/authentication/request-reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const error = await response.json();
            erreurModal.textContent = error.message;
            return;
        }

        successModal.textContent = 'A reset link has been sent to your email.';
    } catch (error) {
        erreurModal.textContent = 'Unable to contact the server.';
    }
});