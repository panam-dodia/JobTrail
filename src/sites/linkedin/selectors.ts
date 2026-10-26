// Everything LinkedIn-specific that may break when the site changes lives here.
// LinkedIn's class names change often, so each lookup has fallbacks ending in plain tags,
// and the rest is found by link targets and visible text.
export const LINKEDIN = {
  /** The job's title in the job details panel (search results or a job's own page). */
  jobTitle: [
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    '.top-card-layout__title',
    'main h1',
    'h1',
  ],
  maxTitleLength: 150,
  /** A link to a company's LinkedIn page; in the job header its text is the company name. */
  companyLink: 'a[href*="/company/"]',
  /** How many levels up from the title to look for the rest of the job header. */
  headerDepth: 8,
  /** Bits of the header line "San Francisco, CA · 2 days ago · 50 applicants" are split on this. */
  separator: '·',
  /** Location text: "San Francisco, CA", "London, England, United Kingdom", "Greater Boston Area", "Remote". */
  location: [
    /^[A-Z][\p{L} .'-]+, [A-Z]{2}\b/u,
    /^[A-Z][\p{L} .'-]+, [A-Z][\p{L} .'-]+, [A-Z][\p{L} ]+$/u,
    /^[A-Z][\p{L} .'-]+ (Metropolitan|Bay) Area\b/u,
    /^(United States|Remote)\b/,
  ],
  maxLocationLength: 80,
  /** Which job the URL points at: ?currentJobId=… on search pages, /jobs/view/<id> otherwise. */
  jobIdParam: 'currentJobId',
  jobViewPath: /\/jobs\/view\/(\d+)/,
  companyPagePath: /^\/company\/[^/]+/,

  profilePath: /^\/in\/([^/]+)/,
  profile: {
    name: ['main h1', 'h1'],
    /** The line under the name: "Founding Engineer at AssemblyAI | ex-Google". */
    headline: ['.text-body-medium.break-words', '[data-generated-suggestion-target]'],
    /** "Current company: AssemblyAI. Click to skip to experience card". */
    currentCompany: '[aria-label^="Current company"]',
    currentCompanyLabel: /^Current company:\s*(.+?)(?:\.\s*Click.*)?$/i,
    /** The tab title is the most stable place for the name: "(3) Lorenss Martinsons | LinkedIn". */
    titleName: /^(?:\(\d+\+?\)\s*)?(.+?)\s*\|\s*LinkedIn$/,
    nameTags: 'h1, h2',
    /** The profile's own buttons; the block holding them and the name is the profile header. */
    actionButton: /^(message|connect|pending|follow|following|more)\b/i,
    pending: /^pending\b/i,
    firstDegree: /(^|·\s*)1st$/,
    minHeadlineLength: 12,
  },

  messagingPath: /^\/messaging/,
  /** The open conversation's header. */
  messaging: {
    name: ['.msg-entity-lockup__entity-title', '.msg-thread__link-to-profile', '.msg-overlay-bubble-header__title'],
    headline: ['.msg-entity-lockup__entity-info'],
    profileLink: ['a.msg-thread__link-to-profile', '.msg-entity-lockup a[href*="/in/"]'],
  },
  maxNameLength: 80,
};
