// Apply the saved appearance before the interface paints; no inline CSP exception.
(() => {
  let preference = 'system';
  try { preference = localStorage.getItem('jobscout.appearance') || 'system'; } catch {}
  document.documentElement.dataset.theme = preference === 'light' || preference === 'dark'
    ? preference : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  for (const [key, attribute] of [['jobscout.reduce-transparency', 'reduceTransparency'], ['jobscout.reduce-motion', 'reduceMotion']]) {
    let reduce = false;
    try { reduce = localStorage.getItem(key) === 'true'; } catch {}
    document.documentElement.dataset[attribute] = String(reduce);
  }
})();
