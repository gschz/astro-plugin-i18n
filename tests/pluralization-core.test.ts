import { describe, expect, it } from 'vitest';
import { getPluralCategory } from '~/core/pluralization';

describe('pluralization core', () => {
  it('getPluralCategory con lang invalido retorna other', () => {
    const result = getPluralCategory(1, null as unknown as string);

    expect(result).toBe('other');
  });
});
