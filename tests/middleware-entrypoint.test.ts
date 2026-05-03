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

  it('inyecta config i18n en locals, resuelve idioma y continua con next', async () => {
    setOptions({ defaultLang: 'es', supportedLangs: ['es', 'en'] });

    const next = vi.fn(async () => new Response('ok', { status: 200 }));
    const context = {
      locals: {},
      url: new URL('https://example.dev/docs'),
      request: new Request('https://example.dev/docs'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as any;

    const response = expectResponse(await onRequest(context, next));

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(context.locals.i18n.config.defaultLang).toBe('es');
    expect(context.locals.i18n.config.supportedLangs).toEqual(['es', 'en']);
    expect(context.locals.i18n.lang).toBe('es');
  });

  it('prioriza el idioma en el segmento URL cuando es soportado', async () => {
    setOptions({ defaultLang: 'es', supportedLangs: ['es', 'en'] });

    const next = vi.fn(async () => new Response('ok', { status: 200 }));
    const context = {
      locals: {},
      url: new URL('https://example.dev/en/docs'),
      request: new Request('https://example.dev/en/docs'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as any;

    const response = expectResponse(await onRequest(context, next));

    expect(response.status).toBe(200);
    expect(context.locals.i18n.lang).toBe('en');
  });

  it('usa cookie i18n-lang cuando no hay prefijo en URL', async () => {
    setOptions({ defaultLang: 'es', supportedLangs: ['es', 'en'] });

    const next = vi.fn(async () => new Response('ok', { status: 200 }));
    const context = {
      locals: {},
      url: new URL('https://example.dev/docs'),
      request: new Request('https://example.dev/docs'),
      cookies: {
        get: vi.fn(() => ({ value: 'en' })),
      },
    } as any;

    const response = expectResponse(await onRequest(context, next));

    expect(response.status).toBe(200);
    expect(context.locals.i18n.lang).toBe('en');
  });

  it('usa Accept-Language cuando no hay URL ni cookie aplicable', async () => {
    setOptions({ defaultLang: 'es', supportedLangs: ['es', 'en', 'pt-BR'] });

    const next = vi.fn(async () => new Response('ok', { status: 200 }));
    const context = {
      locals: {},
      url: new URL('https://example.dev/docs'),
      request: new Request('https://example.dev/docs', {
        headers: {
          'accept-language': 'fr-CA,pt-BR;q=0.8,en;q=0.6',
        },
      }),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as any;

    const response = expectResponse(await onRequest(context, next));

    expect(response.status).toBe(200);
    expect(context.locals.i18n.lang).toBe('pt-BR');
  });

  it('redirige cuando strategy=prefix y la URL no trae idioma', async () => {
    setOptions({
      defaultLang: 'es',
      supportedLangs: ['es', 'en'],
      routing: {
        strategy: 'prefix',
      },
    });

    const next = vi.fn(async () => new Response('ok', { status: 200 }));
    const context = {
      locals: {},
      url: new URL('https://example.dev/docs'),
      request: new Request('https://example.dev/docs'),
      cookies: {
        get: vi.fn(() => undefined),
      },
    } as any;

    const response = expectResponse(await onRequest(context, next));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://example.dev/es/docs');
    expect(next).not.toHaveBeenCalled();
  });

  it('tolera ausencia de opciones y locals no objeto', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const next = vi.fn(async () => new Response('ok', { status: 200 }));

    const response = expectResponse(
      await onRequest(
        {
          locals: null,
          url: new URL('https://example.dev/docs'),
          request: new Request('https://example.dev/docs'),
          cookies: {
            get: vi.fn(() => undefined),
          },
        } as any,
        next,
      ),
    );

    expect(response.status).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalled();
  });
});
