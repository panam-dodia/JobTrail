// Hosted job boards (Gem, Lever, Ashby, Workable, ...) share one reader. Most publish the job as
// schema.org JobPosting data for search engines, which doesn't depend on each site's layout.
export const JOBBOARD = {
  jsonLd: 'script[type="application/ld+json"]',
  /** Fallback for the role when there's no JobPosting data. */
  title: ['main h1', 'h1'],
  maxTitleLength: 150,
  /** og:site_name is sometimes the company, sometimes the hiring tool; ignore the latter. */
  siteName: 'meta[property="og:site_name"]',
  toolNames: /gem|greenhouse|lever|ashby|workable|rippling|smartrecruiters|bamboo|recruitee|breezy|teamtailor/i,
  maxLocations: 3,
};
