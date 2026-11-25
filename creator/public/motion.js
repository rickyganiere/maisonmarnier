(() => {
  const nodes = document.querySelectorAll('[data-reveal]');
  if (!nodes.length) return;

  if (!('IntersectionObserver' in window)) {
    nodes.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );

  nodes.forEach((el) => io.observe(el));

  // Subtle hero orb parallax on pointer move (desktop).
  const orb = document.querySelector('.signal-orb');
  if (orb && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 8;
        const y = (e.clientY / window.innerHeight - 0.5) * 8;
        orb.style.transform = `translate(${x}px, ${y}px)`;
      },
      { passive: true },
    );
  }
})();
