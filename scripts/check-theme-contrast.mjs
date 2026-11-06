// Offline opaque semantic-token audit; does not certify rendered glass pixels.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function contrast(foreground, background) {
  const luminance = color => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Expected an opaque six-digit RGB color.');
    const rgb = color.slice(1).match(/../g).map(x => parseInt(x, 16) / 255)
      .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

export function audit(css) {
  return [':root', ':root[data-theme="dark"]'].flatMap(selector => {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`Missing theme: ${selector}`);
    const block = css.slice(start, css.indexOf('}', start));
    const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/gi)].map(x => [x[1], x[2]]));
    const pairs = ['canvas', 'surface', 'card', 'hover', 'selected'].flatMap(bg =>
      ['ink', 'muted', 'accent', 'good', 'warning'].map(fg => [fg, bg, 4.5]));
    pairs.push(['button-ink', 'button', 4.5], ['button-ink', 'button-hover', 4.5],
      ['error-ink', 'error-bg', 4.5], ['canvas', 'accent', 4.5]);
    for (const background of ['canvas', 'surface', 'card']) {
      pairs.push(['control-line', background, 3], ['accent', background, 3]);
    }
    return pairs.map(([fg, bg, minimum]) => {
      const ratio = contrast(tokens[fg], tokens[bg]);
      return { theme: selector === ':root' ? 'light' : 'dark', foreground: fg, background: bg,
        ratio: Number(ratio.toFixed(3)), minimum, passed: ratio >= minimum };
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = readFileSync(new URL('../apps/desktop/src/styles.css', import.meta.url), 'utf8');
  const checks = audit(css);
  console.log(JSON.stringify({ scope: 'Source opaque text pairs at 4.5:1; field boundaries and focus against canvas/surface/card at 3:1. Excludes glass compositing, disabled controls, native widgets and full WCAG conformance.', checks }, null, 2));
  process.exitCode = checks.every(x => x.passed) ? 0 : 1;
}
