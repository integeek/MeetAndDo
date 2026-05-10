const AUTH_USER_STORAGE_KEY = 'meetando_current_user';

function getMeetDoApiUrl() {
    const hostname = window.location.hostname;
    const apiHostname = hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';

    return `http://${apiHostname}:3000`;
}

function getRedirectParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        authMessage: params.get('authMessage') || '',
        redirect: params.get('redirect') || 'Home.html',
    };
}

function displayAuthMessage() {
    const { authMessage } = getRedirectParams();
    if (!authMessage) {
        return;
    }

    const erreurDiv = document.querySelector('.erreur');
    if (erreurDiv) {
        erreurDiv.textContent = authMessage;
    }
}

function persistAuthenticatedUser(user) {
    if (!user || typeof user !== 'object') {
        return;
    }

    try {
        localStorage.setItem(
            AUTH_USER_STORAGE_KEY,
            JSON.stringify({
                ...user,
                authenticatedAt: Date.now(),
            }),
        );
    } catch (error) {
        console.warn('Unable to persist authenticated user:', error);
    }
}

displayAuthMessage();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    const erreurDiv = document.querySelector('.erreur');
    const successDiv = document.querySelector('.success');
    const { redirect } = getRedirectParams();

    erreurDiv.textContent = '';
    successDiv.textContent = '';

    try {
        const response = await fetch(`${getMeetDoApiUrl()}/authentication/login`, {
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
        persistAuthenticatedUser(user);
        successDiv.textContent = `Welcome ${user.firstname} !`;

        setTimeout(() => {
            window.location.href = redirect;
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
        const response = await fetch(`${getMeetDoApiUrl()}/authentication/request-reset-password`, {
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
