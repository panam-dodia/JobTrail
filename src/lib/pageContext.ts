import type { AtsRef, JobBoard } from '../db/types';

export type Site = 'waas' | 'yc' | 'linkedin' | 'glassdoor' | 'gmail' | JobBoard | 'other';

/**
 * Hosts of hiring tools that serve many companies' job pages, and where the company's token is:
 * the first path segment (jobs.gem.com/ultra/...) or the subdomain (ultra.bamboohr.com).
 * These hosts are never a company's own domain.
 */
export const BOARD_HOSTS: { type: JobBoard; hosts: string[]; token: 'path' | 'subdomain'; skip?: string[] }[] = [
  { type: 'lever', hosts: ['jobs.lever.co', 'jobs.eu.lever.co'], token: 'path' },
  { type: 'ashby', hosts: ['jobs.ashbyhq.com'], token: 'path' },
  { type: 'gem', hosts: ['jobs.gem.com'], token: 'path' },
  { type: 'workable', hosts: ['apply.workable.com'], token: 'path' },
  { type: 'rippling', hosts: ['ats.rippling.com'], token: 'path' },
  { type: 'smartrecruiters', hosts: ['jobs.smartrecruiters.com', 'careers.smartrecruiters.com'], token: 'path' },
  { type: 'bamboohr', hosts: ['bamboohr.com'], token: 'subdomain' },
  { type: 'recruitee', hosts: ['recruitee.com'], token: 'subdomain' },
  { type: 'breezy', hosts: ['breezy.hr'], token: 'subdomain' },
  { type: 'teamtailor', hosts: ['teamtailor.com'], token: 'subdomain' },
  // app.dover.com/apply/<company>/<id>, app.dover.com/jobs/<company>
  { type: 'dover', hosts: ['app.dover.com'], token: 'path', skip: ['apply', 'jobs'] },
];
const NOT_COMPANY_SUBDOMAINS = new Set(['www', 'app', 'api', 'help', 'support', 'jobs', 'careers']);

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

function findBoard(host: string, pathname: string): { type: JobBoard; token?: string } | undefined {
  for (const board of BOARD_HOSTS) {
    for (const h of board.hosts) {
      if (board.token === 'path' && host === h) {
        const parts = pathname.split('/').filter(Boolean).map((p) => decodeURIComponent(p).toLowerCase());
        return { type: board.type, token: parts.find((p) => !board.skip?.includes(p)) };
      }
      if (board.token === 'subdomain' && hostIs(host, h)) {
        const sub = host === h ? undefined : host.slice(0, -h.length - 1).split('.').pop();
        return { type: board.type, token: sub && !NOT_COMPANY_SUBDOMAINS.has(sub) ? sub : undefined };
      }
    }
  }
  return undefined;
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
  if (host === 'mail.google.com') return { ...base, site: 'gmail' };

  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
    // Embedded boards use /embed/job_board?for=<token>.
    const token = parts[0] === 'embed' ? url.searchParams.get('for')?.toLowerCase() : parts[0];
    return { ...base, site: 'greenhouse', ats: token ? { type: 'greenhouse', token } : undefined };
  }
  const board = findBoard(host, url.pathname);
  if (board) return { ...base, site: board.type, ats: board.token ? { type: board.type, token: board.token } : undefined };

  return { ...base, site: 'other', domain: host.replace(/^www\./, '') };
}
