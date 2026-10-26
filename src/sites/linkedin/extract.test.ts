// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { extractLinkedIn } from './extract';

function page(html: string, title = ''): Document {
  document.title = title;
  document.body.innerHTML = html;
  return document;
}

const SEARCH_URL = 'https://www.linkedin.com/jobs/search-results/?currentJobId=4480697501&keywords=jobs';

// Shaped like a jobs search page: result list, details panel, messaging overlay.
const SEARCH_PAGE = `
  <ul class="jobs-list">
    <li><a href="/jobs/view/4480697501/">Forward Deployed Engineer, Triage (SF)</a>
      <a href="https://www.linkedin.com/company/assemblyai/">AssemblyAI</a><span>San Francisco, CA (Hybrid)</span></li>
    <li><a href="/jobs/view/4481003344/">GTM Recruiter</a>
      <a href="https://www.linkedin.com/company/assemblyai/">AssemblyAI</a><span>San Francisco, CA (Remote)</span></li>
  </ul>
  <div class="jobs-search__job-details">
    <div class="job-details-jobs-unified-top-card__container--two-pane">
      <div class="job-details-jobs-unified-top-card__company-name">
        <a href="https://www.linkedin.com/company/assemblyai/life/"><img alt="AssemblyAI logo"></a>
        <a href="https://www.linkedin.com/company/assemblyai/life/">AssemblyAI</a>
      </div>
      <div class="job-details-jobs-unified-top-card__job-title">
        <h1 class="t-24"><a href="/jobs/view/4480697501/?trk=x">Forward Deployed Engineer, Triage (SF)</a></h1>
      </div>
      <div class="job-details-jobs-unified-top-card__tertiary-description-container">
        <span class="tvm__text">San Francisco, CA</span><span> · </span><span>2 days ago</span><span> · </span><span>50 applicants</span>
      </div>
      <button>Hybrid</button><button>Full-time</button><button>Easy Apply</button>
    </div>
  </div>
  <aside class="msg-overlay"><a href="https://www.linkedin.com/company/orionq/">OrionQ Technologies</a></aside>
`;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('extractLinkedIn', () => {
  it('reads the selected job from a search page', () => {
    expect(extractLinkedIn(page(SEARCH_PAGE), SEARCH_URL)).toEqual({
      companyName: 'AssemblyAI',
      roleTitle: 'Forward Deployed Engineer, Triage (SF)',
      location: 'San Francisco, CA',
    });
  });

  it('says nothing while the details panel still shows a different job', () => {
    const url = SEARCH_URL.replace('4480697501', '4481003344');
    expect(extractLinkedIn(page(SEARCH_PAGE), url)).toEqual({});
  });

  it('reads a job page whose location shares a line with the date', () => {
    const html = `
      <main><div class="top-card">
        <h1>Software Engineer, Agent Experience</h1>
        <div><a href="https://www.linkedin.com/company/assemblyai">AssemblyAI</a> Austin, TX (Remote) · 1 week ago</div>
      </div></main>`;
    expect(extractLinkedIn(page(html), 'https://www.linkedin.com/jobs/view/4477026100/')).toEqual({
      companyName: 'AssemblyAI',
      roleTitle: 'Software Engineer, Agent Experience',
      location: 'Austin, TX (Remote)',
    });
  });

  it('reads the name off a company page', () => {
    expect(extractLinkedIn(page('<main><h1>AssemblyAI</h1></main>'), 'https://www.linkedin.com/company/assemblyai/jobs/')).toEqual({
      companyName: 'AssemblyAI',
    });
  });

  it('returns nothing on the feed', () => {
    expect(extractLinkedIn(page('<main><p>feed</p></main>'), 'https://www.linkedin.com/feed/')).toEqual({});
  });

  it('reads a profile: name, title and current company', () => {
    const html = `
      <main><section>
        <h1 class="text-heading-xlarge">Dylan Fox</h1>
        <div class="text-body-medium break-words">Founder & CEO at AssemblyAI | Voice AI</div>
        <ul><li><button aria-label="Current company: AssemblyAI. Click to skip to experience card">AssemblyAI</button></li></ul>
      </section></main>`;
    expect(extractLinkedIn(page(html), 'https://www.linkedin.com/in/dylanfox/details/?x=1')).toEqual({
      personName: 'Dylan Fox',
      personTitle: 'Founder & CEO',
      companyName: 'AssemblyAI',
      profileUrl: 'https://www.linkedin.com/in/dylanfox/',
      connection: 'none',
    });
  });

  it('reads a profile by its tab title when the markup has no known classes', () => {
    const html = `
      <main>
        <section>
          <div><h1>Lorenss Martinsons <svg></svg></h1> <span>He/Him</span> <span>· 1st</span></div>
          <div>Building AI data infrastructure - we're hiring! | Cognitive Science @ Yale</div>
          <div><span>San Francisco, California, United States</span> · <a href="#">Contact info</a></div>
          <ul>
            <li><button aria-label="Current company: HUD. Click to skip to experience card">HUD</button></li>
            <li><button aria-label="Education: Yale University. Click to skip to education card">Yale University</button></li>
          </ul>
          <button>Message</button><button>More</button>
        </section>
        <aside>
          <div><span>Jaiden</span><button aria-label="Invite Jaiden to connect">Connect</button></div>
          <div><span>Avi</span><button aria-label="Pending, click to withdraw invitation sent to Avi">Pending</button></div>
        </aside>
      </main>`;
    expect(extractLinkedIn(page(html, 'Lorenss Martinsons | LinkedIn'), 'https://www.linkedin.com/in/lorenss/')).toEqual({
      personName: 'Lorenss Martinsons',
      personTitle: "Building AI data infrastructure - we're hiring!",
      companyName: 'HUD',
      location: 'San Francisco, California, United States',
      profileUrl: 'https://www.linkedin.com/in/lorenss/',
      connection: 'connected',
    });
  });

  it('sees a pending connection request', () => {
    const html = `<main><section><h1>Sam Gutentag</h1><span>· 2nd</span><div>Head of Product at AssemblyAI</div>
      <button aria-label="Pending, click to withdraw invitation sent to Sam Gutentag">Pending</button></section></main>`;
    expect(extractLinkedIn(page(html, '(2) Sam Gutentag | LinkedIn'), 'https://www.linkedin.com/in/samg/')).toMatchObject({
      personName: 'Sam Gutentag',
      companyName: 'AssemblyAI',
      connection: 'pending',
    });
  });

  it('falls back to the headline for the company', () => {
    const html = '<main><h1>Max Friefeld</h1><div class="text-body-medium break-words">CEO @ Ultra</div></main>';
    expect(extractLinkedIn(page(html), 'https://www.linkedin.com/in/maxf/')).toMatchObject({
      personName: 'Max Friefeld',
      personTitle: 'CEO',
      companyName: 'Ultra',
    });
  });

  it('reads the person in an open message thread', () => {
    const html = `
      <div class="msg-entity-lockup">
        <a class="msg-thread__link-to-profile" href="https://www.linkedin.com/in/chrismarty?mini=true"><h2 class="msg-entity-lockup__entity-title">Chris Marty</h2></a>
        <div class="msg-entity-lockup__entity-info">Engineering Manager at AssemblyAI</div>
      </div>`;
    expect(extractLinkedIn(page(html), 'https://www.linkedin.com/messaging/thread/2-abc/')).toEqual({
      personName: 'Chris Marty',
      personTitle: 'Engineering Manager',
      companyName: 'AssemblyAI',
      profileUrl: 'https://www.linkedin.com/in/chrismarty/',
    });
  });
});
