import { describe, expect, it } from 'vitest';
import { parseJobTitle } from './pageTitle';

describe('parseJobTitle', () => {
  it.each([
    ['Member of Technical Staff at Stoa', 'Stoa', 'Member of Technical Staff'],
    ['Member of Technical Staff at Stoa | Y Combinator', 'Stoa', 'Member of Technical Staff'],
    ['Product Engineer, Full Stack at David AI | Work at a Startup', 'David AI', 'Product Engineer, Full Stack'],
    ['Trader, Compute Markets at Stoa (YC S24)', 'Stoa', 'Trader, Compute Markets'],
    ['Job Application for Backend Engineer at Acme', 'Acme', 'Backend Engineer'],
    ['Founding Engineer @ Acme', 'Acme', 'Founding Engineer'],
    ['Acme hiring Software Engineer in San Francisco, CA | LinkedIn', 'Acme', 'Software Engineer'],
  ])('%s', (title, company, role) => {
    expect(parseJobTitle(title)).toEqual({ company, role });
  });

  it('uses the last " at " so role titles can contain it', () => {
    expect(parseJobTitle('Engineer at Large at Acme')).toEqual({ company: 'Acme', role: 'Engineer at Large' });
  });

  it('treats "Careers at X" as a company with no role', () => {
    expect(parseJobTitle('Careers at Stripe')).toEqual({ company: 'Stripe' });
    expect(parseJobTitle('Jobs at Acme | Y Combinator')).toEqual({ company: 'Acme' });
  });

  it('returns nothing for titles without a pattern', () => {
    expect(parseJobTitle('Stripe | Payments infrastructure')).toEqual({});
    expect(parseJobTitle('')).toEqual({});
    expect(parseJobTitle(undefined)).toEqual({});
  });
});
