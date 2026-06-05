import { rm } from 'node:fs/promises';
import fs from 'node:fs';

if (!fs.existsSync('dist')) {
  console.log('[rm] dist not found, skipping removal');
  process.exit(0);
}
await rm('dist', { recursive: true, force: true });
