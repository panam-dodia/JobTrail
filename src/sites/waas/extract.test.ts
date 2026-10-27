// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { extractWaas } from './extract';

function page(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

// Shaped like a WaaS job page: breadcrumb, header, tag row, description.
const JOB_PAGE = `
  <nav><a href="/companies">Companies</a> / <a href="/companies/stoa">Stoa (S26)</a> / <a href="/companies/stoa/jobs">Jobs</a></nav>
  <h1>Marketing at <a href="/companies/stoa">Stoa</a> <span>(S26)</span></h1>
  <div class="tags">
    <div><span>San Francisco, CA, US / Remote</span></div>
    <div><span>Full-time</span></div>
    <div><svg></svg><span>US citizenship/visa not required</span></div>
  </div>
  <section><p>You will shape Stoa's public voice across LinkedIn, X, email and press.</p></section>
  <aside>
    <a href="https://stoa.com/">stoa.com</a>
    <a href="https://www.linkedin.com/company/stoa">linkedin.com/company/stoa</a>
    <a href="https://twitter.com/stoa">twitter.com</a>
  </aside>
`;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('extractWaas', () => {
  it('reads company, slug, website and sponsorship from a job page', () => {
    expect(extractWaas(page(JOB_PAGE))).toEqual({
      companyName: 'Stoa',
      ycSlug: 'stoa',
      domain: 'stoa.com',
      sponsorship: 'yes',
      location: 'San Francisco, CA, US / Remote',
    });
  });

  it('reads "US citizen/visa only" as no sponsorship', () => {
    expect(extractWaas(page('<span>US citizen/visa only</span>')).sponsorship).toBe('no');
  });

  it('ignores visa wording inside long description text', () => {
    const prose = '<p>We are a small team and unfortunately we are not able to say whether we will sponsor visas for this role yet.</p>';
    expect(extractWaas(page(prose)).sponsorship).toBeUndefined();
  });

  it('reads a remote-only location tag', () => {
    expect(extractWaas(page('<div><span>Remote (US)</span><span>Full-time</span></div>')).location).toBe('Remote (US)');
  });

  it('lists the jobs on a company page, named by their title links', () => {
    const html = `
      <h1>CloudCruise <span>(W24)</span></h1>
      <h2>Jobs at CloudCruise</h2>
      <div><a href="/jobs/81234">Member of Technical Staff</a><span>San Francisco, CA, US</span><a href="/jobs/81234">View job</a></div>
      <div><a href="/jobs/81240">View job</a><a href="/jobs/81240">Founding Designer</a></div>`;
    const listed = extractWaas(page(html)).listedRoles?.map((r) => ({ ...r, url: new URL(r.url).pathname }));
    expect(listed).toEqual([
      { title: 'Member of Technical Staff', url: '/jobs/81234' },
      { title: 'Founding Designer', url: '/jobs/81240' },
    ]);
  });

  it('picks up an ATS board link', () => {
    const facts = extractWaas(page('<a href="https://jobs.ashbyhq.com/stoa/123">Apply on our site</a>'));
    expect(facts.ats).toEqual({ type: 'ashby', token: 'stoa' });
  });

  it('returns nothing on an unrelated page', () => {
    expect(extractWaas(page('<p>hello</p><a href="https://github.com/x">github.com/x</a>'))).toEqual({});
  });
});
