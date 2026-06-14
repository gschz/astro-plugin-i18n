import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  delete process.env.ASTRO_I18N_DEBUG;
});

afterEach(() => {
  delete process.env.ASTRO_I18N_DEBUG;
});

describe('debugLog', () => {
  it('no emite mensaje cuando ASTRO_I18N_DEBUG no esta definido', async () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
      /* empty */
    });
    const { debugLog } = await import('~/utils/debug');

    debugLog('test message');

    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it('emite mensaje cuando ASTRO_I18N_DEBUG=1', async () => {
    process.env.ASTRO_I18N_DEBUG = '1';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
      /* empty */
    });
    const { debugLog } = await import('~/utils/debug');

    debugLog('test message');

    expect(debugSpy).toHaveBeenCalledWith('[i18n:debug] test message');
    debugSpy.mockRestore();
  });

  it('no emite mensaje cuando ASTRO_I18N_DEBUG=false', async () => {
    process.env.ASTRO_I18N_DEBUG = 'false';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
      /* empty */
    });
    const { debugLog } = await import('~/utils/debug');

    debugLog('test message');

    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it('no emite mensaje cuando ASTRO_I18N_DEBUG=0', async () => {
    process.env.ASTRO_I18N_DEBUG = '0';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
      /* empty */
    });
    const { debugLog } = await import('~/utils/debug');

    debugLog('test message');

    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it('emite mensaje con argumentos adicionales', async () => {
    process.env.ASTRO_I18N_DEBUG = 'true';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {
      /* empty */
    });
    const { debugLog } = await import('~/utils/debug');

    debugLog('test %s', 'arg1', { key: 'val' });

    expect(debugSpy).toHaveBeenCalledWith('[i18n:debug] test %s', 'arg1', {
      key: 'val',
    });
    debugSpy.mockRestore();
  });
});
