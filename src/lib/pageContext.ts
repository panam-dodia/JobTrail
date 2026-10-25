import type { AtsRef } from '../db/types';

export type Site = 'waas' | 'yc' | 'linkedin' | 'glassdoor' | 'greenhouse' | 'lever' | 'ashby' | 'other';

export interface PageContext {
  url: string;
  host: string;
  site: Site;
  /** Set only for company-owned hosts; platform hosts never match by domain. */
  domain?: string;
  ycSlug?: string;
  ats?: AtsRef;
}

// ycombinator.com/companies/<x> paths that are directory pages, not companies.
const YC_RESERVED = new Set(['industry', 'location', 'batch', 'tags', 'founders', 'black-founders', 'hispanic-latino-founders', 'women-founders', 'export']);

function hostIs(host: string, base: string): boolean {
  return host === base || host.endsWith(`.${base}`);
}

function firstSegment(pathname: string): string | undefined {
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg ? decodeURIComponent(seg).toLowerCase() : undefined;
}

export function parsePageContext(rawUrl: string): PageContext | undefined {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p).toLowerCase());
  const base = { url: rawUrl, host };

  if (hostIs(host, 'workatastartup.com')) {
    const ycSlug = parts[0] === 'companies' ? parts[1] : undefined;
    return { ...base, site: 'waas', ycSlug };
  }
  if (hostIs(host, 'ycombinator.com')) {
    const slug = parts[0] === 'companies' ? parts[1] : undefined;
    return { ...base, site: 'yc', ycSlug: slug && !YC_RESERVED.has(slug) ? slug : undefined };
  }
  if (hostIs(host, 'linkedin.com')) return { ...base, site: 'linkedin' };
  if (hostIs(host, 'glassdoor.com')) return { ...base, site: 'glassdoor' };

  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
    // Embedded boards use /embed/job_board?for=<token>.
    const token = parts[0] === 'embed' ? url.searchParams.get('for')?.toLowerCase() : parts[0];
    return { ...base, site: 'greenhouse', ats: token ? { type: 'greenhouse', token } : undefined };
  }
  if (host === 'jobs.lever.co' || host === 'jobs.eu.lever.co') {
    const token = firstSegment(url.pathname);
    return { ...base, site: 'lever', ats: token ? { type: 'lever', token } : undefined };
  }
  if (host === 'jobs.ashbyhq.com') {
    const token = firstSegment(url.pathname);
    return { ...base, site: 'ashby', ats: token ? { type: 'ashby', token } : undefined };
  }

  return { ...base, site: 'other', domain: host.replace(/^www\./, '') };
}
