import { describe, expect, it } from 'vitest';
import { parsePageContext } from './pageContext';
import { detectPageKind } from './pageKind';

const kind = (url: string) => detectPageKind(parsePageContext(url));

describe('detectPageKind', () => {
  it.each([
    ['https://www.linkedin.com/jobs/view/4480697501/', 'job'],
    ['https://www.linkedin.com/jobs/search-results/?currentJobId=4480697501&keywords=jobs', 'job'],
    ['https://www.linkedin.com/company/assemblyai/', 'company'],
    ['https://www.linkedin.com/in/dylanfox/', 'profile'],
    ['https://www.linkedin.com/messaging/thread/2-abc/', 'messages'],
    ['https://www.linkedin.com/feed/', 'other'],
    ['https://www.workatastartup.com/jobs/118387', 'job'],
    ['https://www.workatastartup.com/companies/stoa', 'company'],
    ['https://www.ycombinator.com/companies/stoa/jobs/abc-engineer', 'job'],
    ['https://www.ycombinator.com/companies/stoa', 'company'],
    ['https://jobs.gem.com/ultra/am9pcG9zdDql3_hO0', 'job'],
    ['https://jobs.gem.com/ultra', 'company'],
    ['https://boards.greenhouse.io/acme/jobs/123', 'job'],
    ['https://boards.greenhouse.io/acme', 'company'],
    ['https://ats.rippling.com/acme/jobs', 'company'],
    ['https://app.dover.com/apply/acme/3f2a9c', 'job'],
    ['https://app.dover.com/jobs/acme', 'company'],
    ['https://acme.bamboohr.com/careers/12', 'job'],
    ['https://acme.bamboohr.com/careers', 'company'],
    ['https://www.glassdoor.com/job-listing/engineer-acme-JV_123.htm', 'job'],
    ['https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE1.htm', 'company'],
    ['https://mail.google.com/mail/u/0/#inbox/FMfcgz', 'email'],
    ['https://www.acme.com/careers', 'company'],
    ['https://www.acme.com/pricing', 'other'],
  ])('%s is a %s page', (url, expected) => {
    expect(kind(url)).toBe(expected);
  });
});

describe('detectPageKind on company sites', () => {
  it('finds job and careers pages', () => {
    const kind = (u: string) => detectPageKind(parsePageContext(u));
    expect(kind('https://www.magicpatterns.com/careers/applied-ai-engineer?ashby_jid=7e40')).toBe('job');
    expect(kind('https://acme.com/about?gh_jid=123')).toBe('job');
    expect(kind('https://acme.com/careers')).toBe('company');
    expect(kind('https://acme.com/pricing')).toBe('other');
  });
});
