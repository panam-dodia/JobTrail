import { describe, expect, it } from 'vitest';
import { compactKey, normalizeDomain, normalizeName } from './normalize';

describe('normalizeName', () => {
  it.each([
    ['Acme', 'acme'],
    ['Acme, Inc.', 'acme'],
    ['Acme Labs', 'acme'],
    ['Acme Labs Inc', 'acme'],
    ['Scale AI', 'scale'],
    ['Acme HQ', 'acme'],
    ['Acme LLC', 'acme'],
    ['  Hugging   Face  ', 'hugging face'],
    ['Character.ai', 'character'],
    ["Moody's", 'moodys'],
    ['Café Labs', 'cafe'],
    ['AT&T', 'at t'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeName(input)).toBe(expected);
  });

  it('never strips the only word', () => {
    expect(normalizeName('Labs')).toBe('labs');
    expect(normalizeName('AI Labs')).toBe('ai');
  });

  it('only strips suffixes at the end', () => {
    expect(normalizeName('AI21 Labs')).toBe('ai21');
    expect(normalizeName('Labs of Acme')).toBe('labs of acme');
  });

  it('returns empty for punctuation-only input', () => {
    expect(normalizeName(' -- ')).toBe('');
  });
});

describe('compactKey', () => {
  it('ignores spacing differences', () => {
    expect(compactKey('Air Table')).toBe(compactKey('Airtable'));
  });
});

describe('normalizeDomain', () => {
  it.each([
    ['stripe.com', 'stripe.com'],
    ['https://www.Stripe.com/jobs', 'stripe.com'],
    ['careers.stripe.com', 'careers.stripe.com'],
    ['  www.acme.io ', 'acme.io'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it('rejects junk', () => {
    expect(normalizeDomain('')).toBeUndefined();
    expect(normalizeDomain('localhost')).toBeUndefined();
    expect(normalizeDomain('not a domain')).toBeUndefined();
  });
});
