// Apply the saved appearance before the interface paints; no inline CSP exception.
(() => {
  let preference = 'system';
  try { preference = localStorage.getItem('jobscout.appearance') || 'system'; } catch {}
  document.documentElement.dataset.theme = preference === 'light' || preference === 'dark'
    ? preference : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
})();
