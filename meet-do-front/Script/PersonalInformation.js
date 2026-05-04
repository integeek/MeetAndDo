const API_URL = 'http://localhost:3000';
document.getElementById('personalInformationForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const lastname = e.target.lastname.value;
    const firstname = e.target.firstname.value;
    const address = e.target.address.value;
    const verificationToken = new URLSearchParams(window.location.search).get('token');
    const erreurDiv = document.querySelector('.erreur');
    const successDiv = document.querySelector('.success');

    erreurDiv.textContent = '';
    successDiv.textContent = '';

    try {
        const response = await fetch(`${API_URL}/authentication/complete-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ lastname, firstname, address, verificationToken }),
        });

        if (!response.ok) {
            const error = await response.json();
            erreurDiv.textContent = error.message;
            return;
        }

        const user = await response.json();
        successDiv.textContent = `Welcome ${firstname} !`;

        setTimeout(() => {
            window.location.href = 'Home.html';
        }, 1000);

    } catch (error) {
        erreurDiv.textContent = 'Unable to contact the server';
    }
});