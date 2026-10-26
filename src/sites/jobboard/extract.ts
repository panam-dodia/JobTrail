import type { PageFacts } from '../../lib/pageFacts';
import { JOBBOARD } from './selectors';

type Json = Record<string, unknown>;

const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null;

/** Reads the job off a hosted job board page. Never throws; returns whatever it could find. */
export function extractJobBoard(doc: Document): PageFacts {
  const facts: PageFacts = {};
  const posting = findJobPosting(doc);
  if (posting) {
    const org = posting.hiringOrganization;
    const company = clean(isObj(org) ? org.name : org);
    const title = clean(posting.title);
    const location = jobLocation(posting);
    if (company) facts.companyName = company;
    if (title) facts.roleTitle = title;
    if (location) facts.location = location;
  }

  if (!facts.roleTitle) {
    for (const selector of JOBBOARD.title) {
      const text = clean(doc.querySelector(selector)?.textContent);
      if (text && text.length <= JOBBOARD.maxTitleLength) {
        facts.roleTitle = text;
        break;
      }
    }
  }
  if (!facts.companyName) {
    const site = clean(doc.querySelector(JOBBOARD.siteName)?.getAttribute('content'));
    if (site && !JOBBOARD.toolNames.test(site)) facts.companyName = site;
  }
  return facts;
}

function findJobPosting(doc: Document): Json | undefined {
  for (const script of Array.from(doc.querySelectorAll(JOBBOARD.jsonLd))) {
    let data: unknown;
    try {
      data = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }
    // A script may hold one object, a list, or an @graph of objects.
    const nodes = asList(data).flatMap((d) => (isObj(d) && Array.isArray(d['@graph']) ? d['@graph'] : [d]));
    const posting = nodes.find((n) => isObj(n) && asList(n['@type']).includes('JobPosting'));
    if (isObj(posting)) return posting;
  }
  return undefined;
}

/** "Brooklyn, NY", "Berlin, Germany / Remote". */
function jobLocation(posting: Json): string | undefined {
  const places = asList(posting.jobLocation).flatMap((loc) => {
    const addr = isObj(loc) ? loc.address : undefined;
    if (!isObj(addr)) return clean(addr) ? [clean(addr)] : [];
    const country = clean(isObj(addr.addressCountry) ? addr.addressCountry.name : addr.addressCountry);
    const parts = [clean(addr.addressLocality), clean(addr.addressRegion)].filter(Boolean);
    const place = (parts.length ? parts : [country]).filter(Boolean).join(', ');
    return place ? [place] : [];
  });
  const remote = asList(posting.jobLocationType).some((t) => clean(t).toUpperCase() === 'TELECOMMUTE');
  const all = [...new Set(places)].slice(0, JOBBOARD.maxLocations);
  if (remote) all.push('Remote');
  return all.join(' / ') || undefined;
}
