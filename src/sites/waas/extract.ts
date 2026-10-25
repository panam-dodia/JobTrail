import { findAtsLink, type PageFacts } from '../../lib/pageFacts';
import { YC_BATCH } from '../../lib/pageTitle';
import { WAAS } from './selectors';

const hostIn = (host: string, list: string[]) => list.some((h) => host === h || host.endsWith(`.${h}`));

/** Reads company facts off a WaaS page. Never throws; returns whatever it could find. */
export function extractWaas(doc: Document): PageFacts {
  const facts: PageFacts = {};
  const base = doc.baseURI && doc.baseURI.startsWith('http') ? doc.baseURI : 'https://www.workatastartup.com/';
  const links: { url: URL; text: string; sameSite: boolean }[] = [];
  for (const a of Array.from(doc.querySelectorAll('a[href]'))) {
    try {
      const href = a.getAttribute('href') ?? '';
      const text = (a.textContent ?? '').replace(/\s+/g, ' ').trim();
      links.push({ url: new URL(href, base), text, sameSite: href.startsWith('/') && !href.startsWith('//') });
    } catch {
      // Ignore malformed hrefs.
    }
  }

  // Company: the most-linked /companies/<slug> page, named by its link text.
  const slugs = new Map<string, { count: number; name?: string }>();
  for (const { url, text, sameSite } of links) {
    const slug = sameSite || hostIn(url.hostname, WAAS.companyHosts) ? url.pathname.match(WAAS.companyPath)?.[1]?.toLowerCase() : undefined;
    if (!slug) continue;
    const entry = slugs.get(slug) ?? { count: 0 };
    entry.count++;
    const name = text.replace(YC_BATCH, '').trim();
    if (!entry.name && name && name.length <= 60) entry.name = name;
    slugs.set(slug, entry);
  }
  const top = [...slugs.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (top) {
    facts.ycSlug = top[0];
    if (top[1].name) facts.companyName = top[1].name;
  }

  facts.ats = findAtsLink(links.map((l) => l.url.href));

  // Website: an external link whose text is its own address, e.g. "stoa.com" -> https://stoa.com.
  for (const { url, text } of links) {
    const host = url.hostname.replace(/^www\./, '');
    if (!url.protocol.startsWith('http') || hostIn(host, WAAS.notWebsiteHosts)) continue;
    const shown = text.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (shown === host) {
      facts.domain = host;
      break;
    }
  }

  facts.sponsorship = findSponsorship(doc);
  if (!facts.ats) delete facts.ats;
  if (!facts.sponsorship) delete facts.sponsorship;
  return facts;
}

function findSponsorship(doc: Document): PageFacts['sponsorship'] {
  for (const el of Array.from(doc.querySelectorAll(WAAS.labelSelector))) {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!text || text.length > WAAS.maxLabelLength) continue;
    const hit = WAAS.sponsorship.find((s) => s.pattern.test(text));
    if (hit) return hit.value;
  }
  return undefined;
}
