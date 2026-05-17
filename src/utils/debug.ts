/**
 * Helper de logging de debug para @gschz/astro-plugin-i18n.
 *
 * Solo emite mensajes cuando la variable de entorno `ASTRO_I18N_DEBUG` está
 * definida y es distinta de `"false"` o `"0"`.
 */

function isDebugEnabled(): boolean {
  if (typeof process === 'undefined') {
    return false;
  }

  const value = process.env['ASTRO_I18N_DEBUG'];

  return value !== undefined && value !== 'false' && value !== '0' && value !== '';
}

export function debugLog(message: string, ...args: unknown[]): void {
  if (!isDebugEnabled()) {
    return;
  }

  console.debug(`[i18n:debug] ${message}`, ...args);
}
