import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Some bundled Python runtimes patch ssl.py to load additional trust-policy
// data relative to __file__. Preserve that policy in the frozen runtime.
export function sslRuntimeDataArgs(sslModule) {
  const filename = 'codex-rejected-cas.pem';
  if (!readFileSync(sslModule, 'utf8').includes(filename)) return [];
  const certificate = path.join(path.dirname(sslModule), filename);
  if (!existsSync(certificate) || !statSync(certificate).isFile() || !statSync(certificate).size) {
    throw new Error('The build Python ssl module requires missing runtime certificate-policy data.');
  }
  return ['--add-data', `${certificate}:.`];
}
