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


// Silent service clips load only in view and pause in background tabs.
document.querySelectorAll('.service-video').forEach((video) => {
  let visible = false;
  let failed = false;
  function sync() {
    if (!visible || document.hidden || motionPreference.matches || failed) {
      video.pause();
      return;
    }
    if (!video.src) video.src = video.dataset.src;
    video.play().catch(() => {});
  }
  video.addEventListener('error', () => {
    failed = true;
    video.removeAttribute('src');
    video.load();
  });
  document.addEventListener('visibilitychange', sync);
  motionPreference.addEventListener('change', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.2 }).observe(video);
  }
});
