import { findAtsLink, type PageFacts } from '../lib/pageFacts';
import { extractJobBoard } from '../sites/jobboard/extract';

/**
 * Reads a company's own careers page (any site), once the user has allowed it. Only the page's HTML
 * is copied into the side panel and read there: structured job data, the heading, the site name,
 * and an embedded job board (Ashby, Greenhouse, Lever) if there is one. Nothing is sent anywhere.
 */
export async function readCompanySite(tabId: number): Promise<PageFacts> {
  const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: () => document.documentElement.outerHTML });
  const html = typeof res?.result === 'string' ? res.result : '';
  if (!html) return {};
  return readCompanyHtml(new DOMParser().parseFromString(html, 'text/html'));
}

export function readCompanyHtml(doc: Document): PageFacts {
  const facts = extractJobBoard(doc);
  // Embedded boards show up as an iframe or script from the board's host, with the company's token.
  const srcs = Array.from(doc.querySelectorAll('iframe[src], script[src], a[href]')).map(
    (el) => el.getAttribute('src') ?? el.getAttribute('href') ?? '',
  );
  const ats = findAtsLink(srcs.filter((s) => s.startsWith('http')));
  return ats ? { ...facts, ats } : facts;
}
