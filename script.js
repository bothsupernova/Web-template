// Replace these preview messages when booking and payments are connected.
const previewMessages = {
  booking: {
    title: 'Your moment is coming.',
    description: 'Online booking is not connected yet. No appointment has been made.',
  },
  relaxation: {
    title: 'Signature Relaxation',
    description: 'A sample 60-minute massage with gentle, flowing movements. Final services and prices will be confirmed by the spa.',
  },
  deep: {
    title: 'Deep Tissue',
    description: 'A sample 60-minute focused massage, with pressure tailored to your comfort.',
  },
  couples: {
    title: 'Time for Two',
    description: 'A sample side-by-side massage experience for two guests. Availability will be confirmed before launch.',
  },
  membership: {
    title: 'A regular moment for you.',
    description: 'Membership plans, pricing, and benefits are coming soon.',
  },
  gifts: {
    title: 'Give the gift of stillness.',
    description: 'Gift card purchasing is not available in this preview. No payments are collected.',
  },
};

const previewDialog = document.querySelector('dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogDescription = document.querySelector('#dialog-copy');

function openPreviewDialog(messageKey) {
  const message = previewMessages[messageKey];
  if (!message) return;

  dialogTitle.textContent = message.title;
  dialogDescription.textContent = message.description;
  previewDialog.showModal();
}

document.querySelectorAll('[data-dialog]').forEach((button) => {
  button.addEventListener('click', () => {
    openPreviewDialog(button.dataset.dialog);
  });
});

document.querySelectorAll('.close, #done').forEach((button) => {
  button.addEventListener('click', () => previewDialog.close());
});

// Keep mobile navigation visibility and its accessible state in sync.
const menuButton = document.querySelector('.menu');
const mainNavigation = document.querySelector('header nav');

function setMenuOpen(isOpen) {
  mainNavigation.classList.toggle('open', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
}

menuButton.addEventListener('click', () => {
  setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
});

mainNavigation.querySelectorAll('a, button').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenuOpen(false);
});

// Indicate the selected section in the secondary navigation.
const sectionLinks = document.querySelectorAll('.tabs a');
sectionLinks[0].setAttribute('aria-current', 'location');
sectionLinks.forEach((link) => {
  link.addEventListener('click', () => {
    sectionLinks.forEach((item) => item.removeAttribute('aria-current'));
    link.setAttribute('aria-current', 'location');
  });
});
