const API_URL = 'http://localhost:3000';
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    const erreurDiv = document.querySelector('.erreur');
    const successDiv = document.querySelector('.success');
    const password2 = document.getElementById("password2");

    erreurDiv.textContent = '';
    successDiv.textContent = '';
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

    try {
        const response = await fetch(`${API_URL}/authentication/register`, {
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
        successDiv.textContent = ` ${user.message} !`;
    } catch (error) {
        erreurDiv.textContent = 'Unable to contact the server';
    }
});