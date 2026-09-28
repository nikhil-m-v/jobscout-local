import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function pythonExecutable() {
  if (process.env.JOBSCOUT_PYTHON) return process.env.JOBSCOUT_PYTHON;
  const local = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  if (!existsSync(local)) throw new Error('Create .venv and install the engine dependencies first. See README.md.');
  return local;
}
