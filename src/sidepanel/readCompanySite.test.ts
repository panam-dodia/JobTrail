// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { readCompanyHtml } from './readCompanySite';

describe('readCompanyHtml', () => {
  it('reads the job heading, site name and an embedded Ashby board', () => {
    const doc = new DOMParser().parseFromString(
      `<html><head><meta property="og:site_name" content="Magic Patterns"></head><body>
        <h1>Applied AI Engineer</h1>
        <script src="https://jobs.ashbyhq.com/magicpatterns/embed?version=2"></script></body></html>`,
      'text/html',
    );
    expect(readCompanyHtml(doc)).toEqual({
      roleTitle: 'Applied AI Engineer',
      companyName: 'Magic Patterns',
      ats: { type: 'ashby', token: 'magicpatterns' },
    });
  });
});
