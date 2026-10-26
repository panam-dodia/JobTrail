// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { companyFromDomain, extractGmail } from './extract';

function page(html: string, title = 'Inbox (3) - me@gmail.com - Gmail'): Document {
  document.title = title;
  document.body.innerHTML = html;
  return document;
}

// Shaped like an open conversation: I wrote, they replied.
const THREAD = `
  <h2 class="hP">Following up on Forward Deployed Engineer</h2>
  <div><span class="gD" email="me@gmail.com" name="Panam">Panam</span> to <span class="g2" email="dylan@assemblyai.com" name="Dylan Fox">Dylan</span></div>
  <div><span class="gD" email="dylan@assemblyai.com" name="Dylan Fox">Dylan Fox</span> to <span class="g2" email="me@gmail.com">me</span></div>
`;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('extractGmail', () => {
  it('reads the other person, subject and company domain from a conversation', () => {
    expect(extractGmail(page(THREAD))).toEqual({
      personName: 'Dylan Fox',
      personEmail: 'dylan@assemblyai.com',
      emailSubject: 'Following up on Forward Deployed Engineer',
      domain: 'assemblyai.com',
      companyName: 'Assemblyai',
    });
  });

  it('prefers a draft being written', () => {
    const html = `${THREAD}
      <div role="dialog">
        <div data-hovercard-id="max@ultra.ai"><span>Max Friefeld</span></div>
        <input name="subjectbox" value="Product Engineer role">
      </div>`;
    expect(extractGmail(page(html))).toMatchObject({
      personName: 'Max Friefeld',
      personEmail: 'max@ultra.ai',
      emailSubject: 'Product Engineer role',
      domain: 'ultra.ai',
    });
  });

  it('gives no company for personal addresses', () => {
    const html = '<span class="gD" email="friend@gmail.com" name="A Friend">A Friend</span>';
    expect(extractGmail(page(html))).toEqual({ personName: 'A Friend', personEmail: 'friend@gmail.com' });
  });

  it('reads a sent email whose recipient shows only as an address', () => {
    // Like Gmail's "to alexis@withbasis.co" line on a message you sent.
    const html = `
      <h2 class="hP">Founding Software Engineer: Panam Dodia</h2>
      <span class="gD" email="panamdodia945@gmail.com" name="Panam Dodia">Panam Dodia</span>
      <span class="hb">to <span class="g2" email="alexis@withbasis.co" name="alexis@withbasis.co">alexis@withbasis.co</span></span>`;
    expect(extractGmail(page(html, 'Founding Software Engineer: Panam Dodia - panamdodia945@gmail.com - Gmail'))).toEqual({
      personName: 'Alexis',
      personEmail: 'alexis@withbasis.co',
      emailSubject: 'Founding Software Engineer: Panam Dodia',
      domain: 'withbasis.co',
      companyName: 'Basis',
    });
  });

  it('cleans marketing words off company domains, but only safely', () => {
    expect(companyFromDomain('withbasis.co')).toBe('basis');
    expect(companyFromDomain('getacme.com')).toBe('acme');
    expect(companyFromDomain('acmehq.com')).toBe('acme');
    expect(companyFromDomain('getty.com')).toBe('getty');
    expect(companyFromDomain('openai.com')).toBe('openai');
    expect(companyFromDomain('google.com')).toBe('google');
  });

  it('returns nothing in the inbox list', () => {
    expect(extractGmail(page('<table><tr><td>Some email</td></tr></table>'))).toEqual({});
  });
});
