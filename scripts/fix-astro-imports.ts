import fs from 'node:fs';
import path from 'node:path';

const packageName = '@gschz/astro-plugin-i18n';

function rewriteAstroComponentImports(source: string): string {
  return source
    .replaceAll(
      /from\s+['"]\.\.\/core\/[a-zA-Z0-9_-]+['"]/g,
      `from '${packageName}'`,
    )
    .replaceAll(/from\s+['"]\.\.\/types['"]/g, `from '${packageName}'`);
}

function collectFilesByExtension(
  rootPath: string,
  extension: string,
): string[] {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const files: string[] = [];
  const pendingPaths = [rootPath];

  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop();

    if (!currentPath) {
      continue;
    }

    const stat = fs.statSync(currentPath);

    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(currentPath)) {
        pendingPaths.push(path.join(currentPath, entry));
      }
      continue;
    }

    if (currentPath.endsWith(extension)) {
      files.push(currentPath);
    }
  }

  return files;
}

const componentsPath = path.resolve(process.cwd(), 'dist/components');

const astroComponentPaths = collectFilesByExtension(componentsPath, '.astro');

if (astroComponentPaths.length === 0) {
  console.warn(
    `[fix-astro-imports] No Astro components found in: ${componentsPath}`,
  );
  process.exit(0);
}

let updatedAstroFiles = 0;

for (const componentPath of astroComponentPaths) {
  const source = fs.readFileSync(componentPath, 'utf-8');
  const updated = rewriteAstroComponentImports(source);

  if (updated !== source) {
    fs.writeFileSync(componentPath, updated, 'utf-8');
    updatedAstroFiles += 1;
  }
}

if (updatedAstroFiles > 0) {
  console.info(
    `[fix-astro-imports] Updated imports in ${updatedAstroFiles} Astro component file(s).`,
  );
} else {
  console.info('[fix-astro-imports] No Astro import changes required.');
}
