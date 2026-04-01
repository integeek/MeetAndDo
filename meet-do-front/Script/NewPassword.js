const API_URL = 'http://localhost:3000';
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = e.target.password.value;
    const verification_token = new URLSearchParams(window.location.search).get('token');
    const erreurDiv = document.querySelector('.erreur');
    const password2 = document.getElementById("password2");

    if (password !== password2.value) {
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

    erreurDiv.textContent = '';

    try {

        const response = await fetch(`${API_URL}/authentication/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ password, verification_token }),
        });

        if (!response.ok) {
            const error = await response.json();
            erreurDiv.textContent = error.message;
            return;
        }

        setTimeout(() => {
            window.location.href = 'Login.html';
        }, 1000);
    } catch (error) {
        erreurDiv.textContent = 'Unable to contact the server';
    }
});