import type { PageContext } from './pageContext';

export type PageKind = 'job' | 'company' | 'profile' | 'messages' | 'email' | 'other';

export const PAGE_KIND_LABELS: Record<PageKind, string> = {
  job: 'Job page',
  company: 'Company page',
  profile: 'LinkedIn profile',
  messages: 'Messages',
  email: 'Email',
  other: 'Page',
};

/** Pages about a person rather than a job, where outreach is what you'd log. */
export const isPersonKind = (k: PageKind) => k === 'profile' || k === 'messages' || k === 'email';

const MESSAGES_PATH = /messag|inbox|conversation/;
// Last path parts that are listings, not a single job: ats.rippling.com/acme/jobs.
const LISTING_PARTS = new Set(['jobs', 'careers', 'openings', 'positions']);

/** What kind of page this is, from its address alone. */
export function detectPageKind(ctx?: PageContext): PageKind {
  if (!ctx) return 'other';
  let url: URL;
  try {
    url = new URL(ctx.url);
  } catch {
    return 'other';
  }
  const path = url.pathname.toLowerCase();
  const parts = path.split('/').filter(Boolean);

  switch (ctx.site) {
    case 'gmail':
      return 'email';
    case 'linkedin':
      if (path.startsWith('/jobs/view/') || url.searchParams.has('currentJobId')) return 'job';
      if (path.startsWith('/company/')) return 'company';
      if (path.startsWith('/in/')) return 'profile';
      if (path.startsWith('/messaging')) return 'messages';
      return 'other';
    case 'waas':
    case 'yc':
      if (parts[0] === 'jobs' && parts[1]) return 'job';
      if (parts[0] === 'companies' && parts[2] === 'jobs' && parts[3]) return 'job';
      if (parts[0] === 'companies' && parts[1]) return 'company';
      return MESSAGES_PATH.test(path) ? 'messages' : 'other';
    case 'glassdoor':
      if (/^\/(job-listing|job)\b/.test(path)) return 'job';
      if (/^\/(overview|reviews)\b/.test(path)) return 'company';
      return 'other';
    case 'other':
      return 'other';
    default: {
      // Hosted job boards: a single job sits below the company's board (jobs.gem.com/ultra/<id>,
      // app.dover.com/apply/acme/<id>); the board itself is a listing. Embedded Greenhouse jobs carry ?gh_jid=.
      if (!ctx.ats) return 'other';
      if (url.searchParams.has('gh_jid')) return 'job';
      const at = parts.indexOf(ctx.ats.token);
      // Subdomain boards (acme.bamboohr.com/careers/12) have the company in the host, not the path.
      const below = at >= 0 ? parts.slice(at + 1) : parts.slice(1);
      const last = below[below.length - 1];
      return last && !LISTING_PARTS.has(last) ? 'job' : 'company';
    }
  }
}
