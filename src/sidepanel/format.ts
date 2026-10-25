import type { OutreachChannel, Platform } from '../db/types';
import type { PageContext } from '../lib/pageContext';

export function fmtDate(ms: number): string {
  const d = new Date(ms);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function toDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today keeps the current time so same-day entries stay in order; other days use local noon. */
export function fromDateInput(value: string): number {
  if (value === toDateInput(Date.now())) return Date.now();
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return Date.now();
  return new Date(y, m - 1, d, 12).getTime();
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  yc: 'YC / WaaS',
  linkedin: 'LinkedIn',
  glassdoor: 'Glassdoor',
  careers_page: 'Careers page',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  email: 'Email',
  other: 'Other',
};

export const CHANNEL_LABELS: Record<OutreachChannel, string> = {
  linkedin_connection: 'LinkedIn connection',
  linkedin_message: 'LinkedIn message',
  yc_message: 'YC message',
  email: 'Email',
};

export const label = (s: string) => s.replace(/_/g, ' ');

export function defaultPlatform(ctx?: PageContext): Platform {
  switch (ctx?.site) {
    case 'waas':
    case 'yc':
      return 'yc';
    case 'linkedin':
    case 'glassdoor':
    case 'greenhouse':
    case 'lever':
    case 'ashby':
      return ctx.site;
    case 'other':
      return 'careers_page';
    default:
      return 'other';
  }
}

export function defaultChannel(ctx?: PageContext): OutreachChannel {
  if (ctx?.site === 'linkedin') return 'linkedin_connection';
  if (ctx?.site === 'waas' || ctx?.site === 'yc') return 'yc_message';
  return 'email';
}

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** A starting point for the company name field; the user always confirms it. */
export function guessCompanyName(ctx?: PageContext, tabTitle?: string): string {
  if (ctx?.ycSlug) return titleCase(ctx.ycSlug);
  if (ctx?.ats) return titleCase(ctx.ats.token);
  if (ctx?.domain) {
    const label = ctx.domain.split('.').find((p) => !['www', 'careers', 'jobs', 'apply'].includes(p));
    if (label) return titleCase(label);
  }
  return tabTitle?.split(/\s[|·–—-]\s|:/)[0]?.trim() ?? '';
}
