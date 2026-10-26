import { describe, expect, it } from 'vitest';
import { parsePageContext } from './pageContext';

describe('parsePageContext', () => {
  it('reads the YC slug from WaaS company pages', () => {
    const ctx = parsePageContext('https://www.workatastartup.com/companies/acme/jobs');
    expect(ctx).toMatchObject({ site: 'waas', ycSlug: 'acme' });
    expect(ctx?.domain).toBeUndefined();
  });

  it('has no slug on WaaS pages that are not company pages', () => {
    expect(parsePageContext('https://www.workatastartup.com/jobs/12345')?.ycSlug).toBeUndefined();
  });

  it('reads the YC slug from ycombinator.com company pages', () => {
    expect(parsePageContext('https://www.ycombinator.com/companies/Acme')?.ycSlug).toBe('acme');
  });

  it('ignores YC directory pages', () => {
    expect(parsePageContext('https://www.ycombinator.com/companies/industry/fintech')?.ycSlug).toBeUndefined();
    expect(parsePageContext('https://www.ycombinator.com/companies')?.ycSlug).toBeUndefined();
  });

  it.each([
    ['https://boards.greenhouse.io/acme/jobs/123', 'greenhouse', 'acme'],
    ['https://job-boards.greenhouse.io/acme', 'greenhouse', 'acme'],
    ['https://boards.greenhouse.io/embed/job_board?for=Acme', 'greenhouse', 'acme'],
    ['https://jobs.lever.co/acme/abc-def', 'lever', 'acme'],
    ['https://jobs.eu.lever.co/acme', 'lever', 'acme'],
    ['https://jobs.ashbyhq.com/acme/123', 'ashby', 'acme'],
  ])('reads the ATS token from %s', (url, type, token) => {
    expect(parsePageContext(url)?.ats).toEqual({ type, token });
  });

  it.each([
    ['https://jobs.gem.com/ultra/am9pcG9zdDql3_hO0', 'gem', 'ultra'],
    ['https://apply.workable.com/acme/j/ABC123/', 'workable', 'acme'],
    ['https://ats.rippling.com/acme/jobs/123', 'rippling', 'acme'],
    ['https://jobs.smartrecruiters.com/Acme/7444', 'smartrecruiters', 'acme'],
    ['https://acme.bamboohr.com/careers/12', 'bamboohr', 'acme'],
    ['https://app.dover.com/apply/acme/3f2a9c', 'dover', 'acme'],
    ['https://app.dover.com/jobs/acme', 'dover', 'acme'],
    ['https://acme.recruitee.com/o/engineer', 'recruitee', 'acme'],
    ['https://acme.breezy.hr/p/123-engineer', 'breezy', 'acme'],
    ['https://career.acme.teamtailor.com/jobs/1', 'teamtailor', 'acme'],
  ])('reads the company from hosted job board %s', (url, type, token) => {
    expect(parsePageContext(url)).toMatchObject({ site: type, ats: { type, token } });
    expect(parsePageContext(url)?.domain).toBeUndefined();
  });

  it('has no company on a job board host itself', () => {
    expect(parsePageContext('https://www.bamboohr.com/pricing')?.ats).toBeUndefined();
  });

  it('does not give platform hosts a matchable domain', () => {
    for (const url of ['https://www.linkedin.com/company/acme', 'https://www.glassdoor.com/Overview/acme', 'https://jobs.lever.co/acme']) {
      expect(parsePageContext(url)?.domain).toBeUndefined();
    }
  });

  it('uses the host (minus www) as the domain for other sites', () => {
    expect(parsePageContext('https://www.acme.com/careers')).toMatchObject({ site: 'other', domain: 'acme.com' });
    expect(parsePageContext('https://careers.acme.com/')?.domain).toBe('careers.acme.com');
  });

  it('ignores non-web URLs', () => {
    expect(parsePageContext('chrome://extensions')).toBeUndefined();
    expect(parsePageContext('not a url')).toBeUndefined();
  });
});
