import config from '../apps/desktop/vite.config.ts';

export default {
  ...config,
  plugins: [...config.plugins, {
    name: 'synthetic-acceptance-label',
    transformIndexHtml(html) {
      const scenario = process.env.JOBSCOUT_ACCEPTANCE_SCENARIO === 'failure' ? 'failure' : 'complete';
      return html.replace('<title>JobScout — Your next chapter</title>', '<title>Synthetic acceptance — JobScout</title>')
        .replace('<body>', `<body><aside style="padding:8px 16px;background:#172d24;color:#fff;font:14px system-ui;text-align:center">Synthetic acceptance · ${scenario} · No live search · Disposable storage</aside>`);
    },
  }],
  server: { ...config.server, port: 1421 },
};
