// @vitest-environment node

import { describe, expect, it } from 'vitest';

describe('SSR guards', () => {
  it('setupLanguage retorna undefined cuando document no existe', async () => {
    const { setupLanguage } = await import('~/core/language');
    const result = await setupLanguage();
    expect(result).toBeUndefined();
  });

  it('bootstrapClientI18n retorna undefined cuando document no existe', async () => {
    const { bootstrapClientI18n } = await import('~/core/language');
    const result = bootstrapClientI18n();
    expect(result).toBeUndefined();
  });

  it('renderDataI18n retorna undefined cuando document no existe', async () => {
    const { renderDataI18n } = await import('~/core/dom');
    const result = renderDataI18n();
    expect(result).toBeUndefined();
  });

  it('bindDataI18n retorna función no-op cuando document no existe', async () => {
    const { bindDataI18n } = await import('~/core/dom');
    const cleanup = bindDataI18n();
    expect(cleanup).toBeTypeOf('function');
    expect(cleanup()).toBeUndefined();
  });

  it('syncLanguageRoute retorna undefined cuando window no existe', async () => {
    const { syncLanguageRoute } = await import('~/core/language');
    const result = syncLanguageRoute('en');
    expect(result).toBeUndefined();
  });
});
