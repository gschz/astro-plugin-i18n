import fs from 'node:fs';
import { rm } from 'node:fs/promises';

if (!fs.existsSync('dist')) {
  console.log('[rm] dist not found, skipping removal');
  process.exit(0);
}
await rm('dist', { recursive: true, force: true });
