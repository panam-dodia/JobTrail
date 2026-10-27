import { describe, expect, it } from 'vitest';
import { matchesPattern } from './matchPattern';

describe('matchesPattern', () => {
  it('matches hosts, subdomains and paths like Chrome', () => {
    expect(matchesPattern('https://mail.google.com/*', 'https://mail.google.com/mail/u/0/#inbox/abc')).toBe(true);
    expect(matchesPattern('https://*.bamboohr.com/*', 'https://acme.bamboohr.com/careers/12')).toBe(true);
    expect(matchesPattern('https://*.bamboohr.com/*', 'https://bamboohr.com/')).toBe(true);
    expect(matchesPattern('https://*.bamboohr.com/*', 'https://evilbamboohr.com/')).toBe(false);
    expect(matchesPattern('https://www.linkedin.com/*', 'http://www.linkedin.com/in/x')).toBe(false);
    expect(matchesPattern('https://www.linkedin.com/*', 'https://www.linkedin.com.evil.io/')).toBe(false);
    expect(matchesPattern('https://www.linkedin.com/in/*', 'https://www.linkedin.com/jobs/')).toBe(false);
  });
});
