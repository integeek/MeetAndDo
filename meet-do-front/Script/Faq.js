async function loadFaq() {
  try {
    const res = await fetch('http://localhost:3000/faq');
    if (!res.ok) {
        throw new Error('Network error');
    }
    const items = await res.json();
    renderFaq(items);
  } catch (err) {
    document.getElementById('faq-container').innerHTML =
      '<p style="color:#888;font-size:14px;">Unable to load questions.</p>';
  }
}

function renderFaq(items) {
  const container = document.getElementById('faq-container');
  container.innerHTML = '';

  items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'faq-item';
    div.innerHTML = `
      <button class="faq-btn" aria-expanded="false">
        <span class="faq-question">${item.question}</span>
        <svg class="faq-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="faq-panel">
        <div class="faq-answer">${item.answer}</div>
      </div>
    `;

    div.querySelector('.faq-btn').addEventListener('click', () => {
      const isOpen = div.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        div.classList.add('open');
        div.querySelector('.faq-btn').setAttribute('aria-expanded', 'true');
      }
    });
    container.appendChild(div);
  });
}
loadFaq();

function openPopUp(id) {
    document.getElementById(id).style.display = "block";
}

function closePopUp(id) {
    document.getElementById(id).style.display = "none";
}

async function createFaq() {
  const question = document.getElementById('faq-question-input').value.trim();
  const answer = document.getElementById('faq-answer-input').value.trim();

  if (!question || !answer) {
    alert('Please fill in both fields.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/faq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });

    if (!res.ok) throw new Error('Network error');

    document.getElementById('faq-question-input').value = '';
    document.getElementById('faq-answer-input').value = '';
    closePopUp('edit-email-popup');
    loadFaq();
  } catch (err) {
    alert('Unable to add the question. Please try again.');
  }
}