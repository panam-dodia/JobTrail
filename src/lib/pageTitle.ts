export interface TitleGuess {
  company?: string;
  role?: string;
}

// " - LinkedIn" etc. appended by job sites with a dash; " | <site>" is cut off wholesale.
const SITE_SUFFIX = /\s+[·–—-]\s+(y combinator|work at a startup|linkedin|glassdoor[^-]*|greenhouse|lever|ashby)\s*$/i;
/** "Stoa (S26)", "Stoa (YC W24)". */
export const YC_BATCH = /\s*\((?:yc )?[swfx]\d{2,4}\)\s*$/i;
// "Careers at Stripe" names a company, not a role.
const GENERIC_ROLE = /^(careers?|jobs?|open (roles|positions)|join us|work (with|at) us|life|working)$/i;

/**
 * Pulls the company and role out of a job page title, e.g.
 * "Marketing at Stoa | Y Combinator's Work at a Startup" -> { company: 'Stoa', role: 'Marketing' }.
 * Only a guess for prefilling fields; the user confirms before anything is saved.
 */
export function parseJobTitle(raw?: string): TitleGuess {
  if (!raw) return {};
  // Site names come after the first " | " and can contain " at " themselves ("Work at a Startup").
  let t = (raw.replace(/\s+/g, ' ').split(' | ')[0] ?? '').trim();
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
  const c = company?.replace(YC_BATCH, '').trim();
  if (!c) return {};
  const r = role?.trim();
  return { company: c, ...(r && !GENERIC_ROLE.test(r) && { role: r }) };
}
