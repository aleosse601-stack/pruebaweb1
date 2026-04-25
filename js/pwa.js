(() => {
  const swPath = './service-worker.js';

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(swPath)
        .then(() => {
          document.documentElement.classList.add('pwa-ready');
        })
        .catch(() => {
          document.documentElement.classList.add('pwa-unavailable');
        });
    });
  }
})();
