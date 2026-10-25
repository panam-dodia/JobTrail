import { describe, expect, it } from 'vitest';
import type { Company } from '../db/types';
import { matchByName, matchByPage } from './match';
import { parsePageContext } from './pageContext';

let nextId = 1;
function company(over: Partial<Company>): Company {
  return { id: nextId++, name: 'X', aliases: [], sponsorship: 'unknown', watching: false, createdAt: 0, ...over };
}

const acme = company({ name: 'Acme Labs', domain: 'acme.com', ycSlug: 'acme', ats: { type: 'greenhouse', token: 'acmelabs' } });
const acmeApp = company({ name: 'Acme App', domain: 'app.acme.com' });
const globex = company({ name: 'Globex', aliases: ['Globex Corporation'], domain: 'globex.io', ats: { type: 'lever', token: 'globex' } });
const all = [acme, acmeApp, globex];

function page(url: string) {
  const ctx = parsePageContext(url);
  if (!ctx) throw new Error(`bad url ${url}`);
  return matchByPage(ctx, all);
}

describe('matchByPage', () => {
  it('matches by domain, including subdomains', () => {
    expect(page('https://acme.com/')).toBe(acme);
    expect(page('https://www.acme.com/careers')).toBe(acme);
    expect(page('https://careers.acme.com/jobs')).toBe(acme);
  });

  it('prefers the most specific domain', () => {
    expect(page('https://app.acme.com/settings')).toBe(acmeApp);
  });

  it('does not match lookalike domains', () => {
    expect(page('https://notacme.com/')).toBeUndefined();
    expect(page('https://acme.com.evil.io/')).toBeUndefined();
  });

  it('matches by YC slug on WaaS and ycombinator.com', () => {
    expect(page('https://www.workatastartup.com/companies/acme')).toBe(acme);
    expect(page('https://www.ycombinator.com/companies/acme')).toBe(acme);
  });

  it('matches by ATS type and token', () => {
    expect(page('https://boards.greenhouse.io/acmelabs/jobs/1')).toBe(acme);
    expect(page('https://jobs.lever.co/globex/123')).toBe(globex);
    // Same token on a different ATS is a different board.
    expect(page('https://jobs.ashbyhq.com/globex')).toBeUndefined();
  });

  it('never matches LinkedIn or Glassdoor by domain', () => {
    expect(page('https://www.linkedin.com/company/acme')).toBeUndefined();
  });
});

describe('matchByName', () => {
  it('finds exact matches after normalization', () => {
    expect(matchByName('ACME, Inc.', all).exact).toEqual([acme]);
    expect(matchByName('acme', all).exact).toEqual([acme]);
  });

  it('matches aliases', () => {
    expect(matchByName('Globex Corporation', all).exact).toEqual([globex]);
  });

  it('flags spacing variants and prefixes as uncertain candidates', () => {
    const openAi = company({ name: 'OpenAI' });
    expect(matchByName('Open AI', [openAi])).toEqual({ exact: [], candidates: [openAi] });

    const r = matchByName('Acme Application', all);
    expect(r.exact).toEqual([]);
    expect(r.candidates).toEqual(expect.arrayContaining([acme, acmeApp]));
  });

  it('does not treat very short prefixes as candidates', () => {
    const ab = company({ name: 'AB' });
    expect(matchByName('Abacus', [ab]).candidates).toEqual([]);
  });

  it('returns nothing for unrelated or empty names', () => {
    expect(matchByName('Initech', all)).toEqual({ exact: [], candidates: [] });
    expect(matchByName('  ', all)).toEqual({ exact: [], candidates: [] });
  });
});
