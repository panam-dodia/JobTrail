import type { Company } from '../db/types';
import { compactKey, normalizeName } from './normalize';
import type { PageContext } from './pageContext';

/** Domain match that also accepts subdomains: careers.stripe.com matches stripe.com. */
export function domainMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/**
 * Matches the page to a company using exact identifiers only (YC slug, ATS token, domain),
 * so the result is always certain. Prefers the most specific match.
 */
export function matchByPage(ctx: PageContext, companies: Company[]): Company | undefined {
  if (ctx.ycSlug) {
    const hit = companies.find((c) => c.ycSlug === ctx.ycSlug);
    if (hit) return hit;
  }
  if (ctx.ats) {
    const { type, token } = ctx.ats;
    const hit = companies.find((c) => c.ats?.type === type && c.ats.token === token);
    if (hit) return hit;
  }
  if (ctx.domain) {
    const host = ctx.domain;
    // Longest domain wins, so a company on app.acme.com beats one on acme.com.
    return companies
      .filter((c) => c.domain && domainMatches(host, c.domain))
      .sort((a, b) => b.domain!.length - a.domain!.length)[0];
  }
  return undefined;
}

export interface NameMatch {
  /** Same normalized name (or alias). */
  exact: Company[];
  /** Plausibly the same company; the user should be asked. */
  candidates: Company[];
}

const MIN_PREFIX = 3;

export function matchByName(name: string, companies: Company[]): NameMatch {
  const norm = normalizeName(name);
  const compact = compactKey(name);
  const exact: Company[] = [];
  const candidates: Company[] = [];
  if (!norm) return { exact, candidates };

  for (const c of companies) {
    const names = [c.name, ...c.aliases];
    if (names.some((n) => normalizeName(n) === norm)) {
      exact.push(c);
      continue;
    }
    const similar = names.some((n) => {
      const other = compactKey(n);
      if (!other) return false;
      if (other === compact) return true;
      const [short, long] = other.length < compact.length ? [other, compact] : [compact, other];
      return short.length >= MIN_PREFIX && long.startsWith(short);
    });
    if (similar) candidates.push(c);
  }
  return { exact, candidates };
}
