import config from './acceptance-vite.config.mjs';

export default { ...config, server: { ...config.server, port: 1422, proxy: undefined } };
