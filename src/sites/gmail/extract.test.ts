// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { extractGmail } from './extract';

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

  it('returns nothing in the inbox list', () => {
    expect(extractGmail(page('<table><tr><td>Some email</td></tr></table>'))).toEqual({});
  });
});
