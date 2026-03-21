const adresseInput = document.getElementById('adresse');
const suggestionsContainer = document.getElementById('suggestions');

adresseInput.addEventListener('input', async () => {
    const query = adresseInput.value;

    if (query.length < 3) {
        suggestionsContainer.innerHTML = '';
        return;
    }

    const response = await fetch(`https://api.locationiq.com/v1/autocomplete?key=pk.d1e3a3fe1d9a93351d306e093bc54eb2
&q=${encodeURIComponent(query)}&limit=5&format=json`);
    const data = await response.json();

    suggestionsContainer.innerHTML = '';

    data.forEach(location => {
        const li = document.createElement('li');
        li.textContent = location.display_name;
        li.addEventListener('click', () => {
            adresseInput.value = location.display_name;
            suggestionsContainer.innerHTML = '';
        });
        suggestionsContainer.appendChild(li);
    });
});
