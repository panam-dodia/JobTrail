// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { extractJobBoard } from './extract';

function page(html: string): Document {
  document.head.innerHTML = '';
  document.body.innerHTML = html;
  return document;
}

const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('extractJobBoard', () => {
  it('reads company, role and location from JobPosting data', () => {
    const html = ld({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Product Engineer',
      hiringOrganization: { '@type': 'Organization', name: 'Ultra' },
      jobLocation: { '@type': 'Place', address: { addressLocality: 'Brooklyn', addressRegion: 'NY', addressCountry: 'US' } },
    });
    expect(extractJobBoard(page(`${html}<h1>Product Engineer</h1>`))).toEqual({
      companyName: 'Ultra',
      roleTitle: 'Product Engineer',
      location: 'Brooklyn, NY',
    });
  });

  it('handles @graph, several locations and remote', () => {
    const html = ld({
      '@graph': [
        { '@type': 'WebPage' },
        {
          '@type': 'JobPosting',
          title: 'Backend Engineer',
          hiringOrganization: 'Acme',
          jobLocation: [
            { address: { addressLocality: 'Berlin', addressCountry: { name: 'Germany' } } },
            { address: { addressCountry: 'United Kingdom' } },
          ],
          jobLocationType: 'TELECOMMUTE',
        },
      ],
    });
    expect(extractJobBoard(page(html))).toEqual({
      companyName: 'Acme',
      roleTitle: 'Backend Engineer',
      location: 'Berlin / United Kingdom / Remote',
    });
  });

  it('falls back to the heading and a company site name', () => {
    const doc = page('<main><h1> Product Engineer </h1></main>');
    doc.head.innerHTML = '<meta property="og:site_name" content="Ultra">';
    expect(extractJobBoard(doc)).toEqual({ companyName: 'Ultra', roleTitle: 'Product Engineer' });
  });

  it('ignores a site name that is the hiring tool', () => {
    const doc = page('<h1>Product Engineer</h1>');
    doc.head.innerHTML = '<meta property="og:site_name" content="Gem">';
    expect(extractJobBoard(doc)).toEqual({ roleTitle: 'Product Engineer' });
  });

  it('survives broken JSON', () => {
    expect(extractJobBoard(page('<script type="application/ld+json">{oops</script>'))).toEqual({});
  });
});
