import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequest, setOptions } from '../src/middleware-entrypoint';

function expectResponse(value: void | Response): Response {
  expect(value).toBeInstanceOf(Response);
  return value as Response;
}

describe('middleware entrypoint', () => {
  beforeEach(() => {
    setOptions(null);
  });

  it('inyecta config i18n en locals y continua con next', async () => {
    setOptions({ defaultLang: 'es', supportedLangs: ['es', 'en'] });

    const next = vi.fn(async () => new Response('ok', { status: 200 }));
    const context = {
      locals: {},
    } as any;

    const response = expectResponse(await onRequest(context, next));

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(context.locals.i18n.config.defaultLang).toBe('es');
    expect(context.locals.i18n.config.supportedLangs).toEqual(['es', 'en']);
  });

  it('tolera ausencia de opciones y locals no objeto', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const next = vi.fn(async () => new Response('ok', { status: 200 }));

    const response = expectResponse(await onRequest({ locals: null } as any, next));

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });
});
