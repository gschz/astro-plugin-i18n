import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
  name?: string;
};

function rewriteAstroComponentImports(source: string, packageName: string): string {
  return source
    .replaceAll(/from\s+['"]\.\.\/core\/[a-zA-Z0-9_-]+['"]/g, `from '${packageName}'`)
    .replaceAll(/from\s+['"]\.\.\/types['"]/g, `from '${packageName}'`);
}

function collectFilesByExtension(rootPath: string, extension: string): string[] {
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

function normalizeSourceMapComment(source: string): string {
  const sourceMapMatches = source.match(/^\/\/# sourceMappingURL=.*$/gm);

  if (!sourceMapMatches || sourceMapMatches.length <= 1) {
    return source;
  }

  const lastSourceMapComment = sourceMapMatches.at(-1);
  const withoutSourceMapComments = source.replaceAll(/^\/\/# sourceMappingURL=.*$(\r?\n)?/gm, '');

  return `${withoutSourceMapComments.trimEnd()}\n${lastSourceMapComment}\n`;
}

function normalizeDistJavaScriptSourceMaps(distPath: string): number {
  if (!fs.existsSync(distPath)) {
    return 0;
  }

  let updatedFiles = 0;
  const pendingPaths = [distPath];

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

    if (!currentPath.endsWith('.js')) {
      continue;
    }

    const source = fs.readFileSync(currentPath, 'utf-8');
    const normalized = normalizeSourceMapComment(source);

    if (normalized !== source) {
      fs.writeFileSync(currentPath, normalized, 'utf-8');
      updatedFiles += 1;
    }
  }

  return updatedFiles;
}

function getPackageName(): string {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(raw) as PackageJson;

    if (pkg.name && pkg.name.trim().length > 0) {
      return pkg.name;
    }
  } catch {
    // Fallback al nombre esperado si package.json no existe o es inválido.
  }

  return '@gschz/astro-plugin-i18n';
}

const packageName = getPackageName();
const distPath = path.resolve(process.cwd(), 'dist');
const componentsPath = path.join(distPath, 'components');

const astroComponentPaths = collectFilesByExtension(componentsPath, '.astro');

if (astroComponentPaths.length === 0) {
  console.warn(`[fix-astro-imports] No Astro components found in: ${componentsPath}`);
  process.exit(0);
}

let updatedAstroFiles = 0;

for (const componentPath of astroComponentPaths) {
  const source = fs.readFileSync(componentPath, 'utf-8');
  const updated = rewriteAstroComponentImports(source, packageName);

  if (updated !== source) {
    fs.writeFileSync(componentPath, updated, 'utf-8');
    updatedAstroFiles += 1;
  }
}

if (updatedAstroFiles > 0) {
  console.info(`[fix-astro-imports] Updated imports in ${updatedAstroFiles} Astro component file(s).`);
} else {
  console.info('[fix-astro-imports] No Astro import changes required.');
}

const normalizedJsFiles = normalizeDistJavaScriptSourceMaps(distPath);

if (normalizedJsFiles > 0) {
  console.info(
    `[fix-astro-imports] Normalized duplicated sourceMappingURL comments in ${normalizedJsFiles} JS file(s).`,
  );
}
