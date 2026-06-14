// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { getConfig, resetConfig } from '~/core/config';

describe('config debug', () => {
  it('checks if line 109 is reachable', () => {
    resetConfig();
    (globalThis as any).__ASTRO_I18N_RUNTIME_OPTIONS__ = '{"defaultLang":"de"}';

    const val = (globalThis as any).__ASTRO_I18N_RUNTIME_OPTIONS__;
    console.log('global value:', val, 'type:', typeof val);
    console.log('is string:', typeof val === 'string');

    const config = getConfig();
    console.log('config.defaultLang:', config.defaultLang);
    expect(config.defaultLang).toBe('de');

    delete (globalThis as any).__ASTRO_I18N_RUNTIME_OPTIONS__;
  });
});
