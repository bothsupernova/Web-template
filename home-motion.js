// Leave the hero photograph visible until the film has a playable frame.
const film = document.querySelector('.hero-film');
const toggle = document.querySelector('.film-toggle');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

function playFilm() {
  if (!film.src) film.src = film.dataset.src;
  film.play().catch(() => { toggle.textContent = 'Play video'; });
}

film.addEventListener('playing', () => {
  film.classList.add('has-frame');
  toggle.textContent = 'Pause video';
});
film.addEventListener('pause', () => { toggle.textContent = 'Play video'; });
film.addEventListener('error', () => {
  film.classList.remove('has-frame');
  toggle.hidden = true;
});
toggle.hidden = false;
toggle.addEventListener('click', () => {
  if (film.paused) playFilm();
  else film.pause();
});

if (!motionPreference.matches) playFilm();
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) film.pause();
});

// Reveal each detail once as it enters view. Content is visible even without JS.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('rise-into-view');
      observer.unobserve(entry.target);
    }
  });
  document.querySelectorAll('.scene-card')
    .forEach((detail) => observer.observe(detail));
}
