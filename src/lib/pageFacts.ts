import type { AtsRef, Sponsorship } from '../db/types';
import { parsePageContext } from './pageContext';

/** What a content script could read off the page. Every field is optional; missing means "didn't find it". */
export interface PageFacts {
  companyName?: string;
  roleTitle?: string;
  ycSlug?: string;
  domain?: string;
  ats?: AtsRef;
  sponsorship?: Sponsorship;
}

export const PAGE_FACTS_MESSAGE = 'jobtrail:page-facts';

/** First Greenhouse/Lever/Ashby board linked from the page, if any. */
export function findAtsLink(hrefs: string[]): AtsRef | undefined {
  for (const href of hrefs) {
    const ats = parsePageContext(href)?.ats;
    if (ats) return ats;
  }
  return undefined;
}

/** Copies only the fields that are set, so a later source can't blank out an earlier one. */
export function mergeFacts(...sources: (PageFacts | undefined)[]): PageFacts {
  const out: PageFacts = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src ?? {})) {
      if (v !== undefined && v !== '') (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}
