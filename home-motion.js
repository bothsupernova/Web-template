// Posters remain visible when autoplay is unavailable or reduced motion is enabled.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const film = document.querySelector('.hero-film');
if (film) {
  function syncHero() {
    if (motionPreference.matches || document.hidden) {
      film.pause();
      return;
    }
    if (!film.src) film.src = film.dataset.src;
    film.play().catch(() => {});
  }
  film.addEventListener('playing', () => film.classList.add('has-frame'));
  film.addEventListener('error', () => film.classList.remove('has-frame'));
  document.addEventListener('visibilitychange', syncHero);
  motionPreference.addEventListener('change', syncHero);
  syncHero();
}

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
