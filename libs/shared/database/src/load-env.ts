import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

let loaded = false;

/** Loads `.env` from workspace root when services start. */
export function loadEnv(): void {
  if (loaded) {
    return;
  }

  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../../../.env'),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
      loaded = true;
      return;
    }
  }

  loaded = true;
}
