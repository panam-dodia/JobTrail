import type { Sponsorship } from '../../db/types';

// Everything WaaS-specific that may break when the site changes lives here.
// Matching is by link targets and visible text, not CSS classes.
export const WAAS = {
  /** A link to the company's own page, e.g. the "Stoa (S26)" breadcrumb. */
  companyPath: /^\/companies\/([a-z0-9][a-z0-9-]*)\/?$/i,
  companyHosts: ['workatastartup.com', 'ycombinator.com'],

  /** Short labels describing visa requirements, checked in order. */
  sponsorship: [
    { pattern: /us citizens?(hip)?\s*\/\s*visa only/i, value: 'no' },
    { pattern: /only us citizens/i, value: 'no' },
    { pattern: /us citizens?(hip)?\s*\/\s*visa not required/i, value: 'yes' },
    { pattern: /will sponsor/i, value: 'yes' },
  ] satisfies { pattern: RegExp; value: Sponsorship }[],
  /** Labels are short; longer text is job description prose and is ignored. */
  maxLabelLength: 60,
  labelSelector: 'span, div, li, p, a',

  /** External links that are never the company's own website. */
  notWebsiteHosts: [
    'workatastartup.com', 'ycombinator.com', 'linkedin.com', 'twitter.com', 'x.com', 'github.com', 'facebook.com',
    'instagram.com', 'youtube.com', 'crunchbase.com', 'google.com', 'apple.com', 'medium.com', 'substack.com',
  ],
};
