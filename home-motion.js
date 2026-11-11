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

// Each card keeps its own playback preference and only loads when visible.
document.querySelectorAll('.service-media').forEach((media) => {
  const video = media.querySelector('video');
  const button = media.querySelector('button');
  let visible = false;
  let userPaused = false;
  function play() {
    if (!video.src) video.src = video.dataset.src;
    video.play().catch(() => { button.textContent = 'Play video'; });
  }
  function sync() {
    if (visible && !document.hidden && !userPaused && !motionPreference.matches) play();
    else video.pause();
  }
  button.hidden = false;
  button.addEventListener('click', () => {
    userPaused = !video.paused;
    if (userPaused) video.pause();
    else play();
  });
  function updateButton() {
    const action = video.paused ? 'Play' : 'Pause';
    button.textContent = action + ' video';
    button.setAttribute('aria-label', action + ' ' + video.getAttribute('aria-label'));
  }
  video.addEventListener('play', updateButton);
  video.addEventListener('pause', updateButton);
  video.addEventListener('error', () => {
    userPaused = true;
    video.removeAttribute('src');
    video.load();
    button.hidden = true;
  });
  document.addEventListener('visibilitychange', sync);
  motionPreference.addEventListener('change', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: 0.2 }).observe(media);
  }
});
