import { describe, expect, it } from 'vitest';
import { displayName, splitNames } from './companyName';

describe('company names', () => {
  it('shows other names after a slash', () => {
    expect(displayName({ name: 'Stoa', aliases: ['Stoa Labs'] })).toBe('Stoa / Stoa Labs');
    expect(displayName({ name: 'Stoa', aliases: [] })).toBe('Stoa');
  });

  it('reads the main name and other names back', () => {
    expect(splitNames(' Stoa /  Stoa Labs / ')).toEqual({ name: 'Stoa', aliases: ['Stoa Labs'] });
    expect(splitNames('Stoa / stoa')).toEqual({ name: 'Stoa', aliases: [] });
    expect(splitNames(' / ')).toBeUndefined();
  });
});
