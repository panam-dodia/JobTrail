export interface TitleGuess {
  company?: string;
  role?: string;
}

// " | Y Combinator", " - LinkedIn", etc. appended by the job sites.
const SITE_SUFFIX = /\s+[|·–—-]\s+(y combinator|work at a startup|linkedin|glassdoor[^|]*|greenhouse|lever|ashby)\s*$/i;
const YC_BATCH = /\s*\(yc [a-z]\d{2,4}\)\s*$/i;
// "Careers at Stripe" names a company, not a role.
const GENERIC_ROLE = /^(careers?|jobs?|open (roles|positions)|join us|work (with|at) us|life|working)$/i;

/**
 * Pulls the company and role out of a job page title, e.g.
 * "Member of Technical Staff at Stoa | Y Combinator" -> { company: 'Stoa', role: 'Member of Technical Staff' }.
 * Only a guess for prefilling fields; the user confirms before anything is saved.
 */
export function parseJobTitle(raw?: string): TitleGuess {
  if (!raw) return {};
  let t = raw.replace(/\s+/g, ' ').trim();
  for (let prev = ''; prev !== t; ) {
    prev = t;
    t = t.replace(SITE_SUFFIX, '').trim();
  }
  t = t.replace(/^job application for /i, '');

  const hiring = t.match(/^(.+?) hiring (.+?)(?: in .+)?$/i);
  if (hiring) return clean(hiring[2], hiring[1]);

  const lower = t.toLowerCase();
  const at = lower.lastIndexOf(' at ');
  const atSign = lower.lastIndexOf(' @ ');
  const i = Math.max(at, atSign);
  if (i > 0) return clean(t.slice(0, i), t.slice(i + (i === atSign ? 3 : 4)));
  return {};
}

function clean(role: string | undefined, company: string | undefined): TitleGuess {
  const c = company?.split(' | ')[0]?.replace(YC_BATCH, '').trim();
  if (!c) return {};
  const r = role?.trim();
  return { company: c, ...(r && !GENERIC_ROLE.test(r) && { role: r }) };
}
