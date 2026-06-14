import fs from 'node:fs';
import path from 'node:path';

const srcComponents = 'src/components';
const distComponents = 'dist/components';

if (!fs.existsSync(srcComponents)) {
  console.log('[cp-astro] src/components not found, skipping copy');
  process.exit(0);
}

fs.mkdirSync(distComponents, { recursive: true });

function copyAstroFiles(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const srcPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      copyAstroFiles(srcPath);
    } else if (entry.name.endsWith('.astro')) {
      const relativePath = path.relative(srcComponents, srcPath);
      const destPath = path.join(distComponents, relativePath);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyAstroFiles(srcComponents);
console.log('[cp-astro] Astro components copied to dist/components');
