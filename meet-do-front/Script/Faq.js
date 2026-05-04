let currentEditId = null;

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

  items.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'faq-item';
    div.innerHTML = `
      <button class="faq-btn" aria-expanded="false">
        <span class="faq-question">${item.question}</span>
        <div class="faq-btn-actions">
          <span class="faq-btn-edit" title="Edit">
            <image class="icon icon-pen" src="../Assets/img/icon-pen.svg"></image>
          </span>
          <span class="faq-btn-delete" title="Delete">
            <image class="icon icon-trash" src="../Assets/img/icon-trash.svg"></image>
          </span>
          <svg class="faq-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </button>
      <div class="faq-panel">
        <div class="faq-answer text-truncate" title="${item.answer}">
          ${item.answer}
        </div>
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

    div.querySelector('.faq-btn-edit').addEventListener('click', (e) => {
      e.stopPropagation();
      currentEditId = item.id;
      document.getElementById('edit-faq-question-input').value = item.question;
      document.getElementById('edit-faq-answer-input').value = item.answer;
      openPopUp('edit-faq-popup');
    });

    div.querySelector('.faq-btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this question ?')) {
        deleteFaq(item.id);
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

    if (!res.ok) {
      throw new Error('Network error');
    } 
    document.getElementById('faq-question-input').value = '';
    document.getElementById('faq-answer-input').value = '';
    closePopUp('edit-email-popup');
    loadFaq();
  } catch (err) {
    alert('Unable to add the question. Please try again.');
  }
}

async function updateFaq() {
  const question = document.getElementById('edit-faq-question-input').value.trim();
  const answer = document.getElementById('edit-faq-answer-input').value.trim();

  if (!question || !answer) {
    alert('Please fill in both fields.');
    return;
  }

  try {
    const res = await fetch(`http://localhost:3000/faq/${currentEditId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });

    if (!res.ok) {
      throw new Error('Network error');
    }
    closePopUp('edit-faq-popup');
    currentEditId = null;
    loadFaq();
  } catch (err) {
    alert('Unable to edit the question. Please try again.');
  }
}

async function deleteFaq(id) {
  try {
    const res = await fetch(`http://localhost:3000/faq/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error('Network error');
    }
    loadFaq();
  } catch (err) {
    alert('Unable to delete the question. Please try again.');
  }
}