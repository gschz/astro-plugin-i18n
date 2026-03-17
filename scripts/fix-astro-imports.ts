import fs from 'node:fs';
import path from 'node:path';

type PackageJson = {
  name?: string;
};

function rewriteAstroComponentImports(source: string, packageName: string): string {
  return source
    .replace(/from\s+['"]\.\.\/core\/translate['"]/g, `from '${packageName}'`)
    .replace(/from\s+['"]\.\.\/core\/language['"]/g, `from '${packageName}'`)
    .replace(/from\s+['"]\.\.\/types['"]/g, `from '${packageName}'`);
}

function normalizeSourceMapComment(source: string): string {
  const sourceMapMatches = source.match(/^\/\/# sourceMappingURL=.*$/gm);

  if (!sourceMapMatches || sourceMapMatches.length <= 1) {
    return source;
  }

  const lastSourceMapComment = sourceMapMatches[sourceMapMatches.length - 1];
  const withoutSourceMapComments = source.replace(/^\/\/# sourceMappingURL=.*$(\r?\n)?/gm, '');

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

const componentPath = path.resolve(process.cwd(), 'dist/components/I18nText.astro');

if (!fs.existsSync(componentPath)) {
  console.warn(`[fix-astro-imports] File not found: ${componentPath}`);
  process.exit(0);
}

const source = fs.readFileSync(componentPath, 'utf-8');
const updated = rewriteAstroComponentImports(source, packageName);

if (updated !== source) {
  fs.writeFileSync(componentPath, updated, 'utf-8');
  console.info('[fix-astro-imports] Updated Astro component imports.');
} else {
  console.info('[fix-astro-imports] No import changes required.');
}

const normalizedJsFiles = normalizeDistJavaScriptSourceMaps(path.resolve(process.cwd(), 'dist'));

if (normalizedJsFiles > 0) {
  console.info(
    `[fix-astro-imports] Normalized duplicated sourceMappingURL comments in ${normalizedJsFiles} JS file(s).`,
  );
}
