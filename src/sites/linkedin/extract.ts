import { roleFromNote } from '../../lib/noteRole';
import type { PageFacts } from '../../lib/pageFacts';
import { LINKEDIN } from './selectors';

const clean = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Reads the open job (or company page) off LinkedIn. Never throws; returns whatever it could find. */
export function extractLinkedIn(doc: Document, href: string): PageFacts {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return {};
  }

  if (LINKEDIN.companyPagePath.test(url.pathname)) {
    const name = clean(doc.querySelector('h1')?.textContent);
    return name ? { companyName: name } : {};
  }
  const profileSlug = url.pathname.match(LINKEDIN.profilePath)?.[1];
  if (profileSlug) return extractProfile(doc, `https://www.linkedin.com/in/${profileSlug}/`);
  if (LINKEDIN.messagingPath.test(url.pathname)) return extractMessaging(doc);

  const job = findJobHeader(doc);
  if (!job) return {};

  // On search pages the URL changes before the details panel does. If the panel still shows
  // another job, say nothing; the side panel asks again shortly.
  const wanted = url.searchParams.get(LINKEDIN.jobIdParam) ?? url.pathname.match(LINKEDIN.jobViewPath)?.[1];
  const shown = Array.from(job.title.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href')?.match(LINKEDIN.jobViewPath)?.[1])
    .filter(Boolean);
  if (wanted && shown.length && !shown.includes(wanted)) return {};

  const facts: PageFacts = { roleTitle: clean(job.title.textContent), companyName: job.company };
  const location = findLocation(job.header, job.title);
  if (location) facts.location = location;
  return facts;
}

interface JobHeader {
  title: Element;
  header: Element;
  company: string;
}

/** The job title plus the nearest enclosing block that also names the company. */
function findJobHeader(doc: Document): JobHeader | undefined {
  for (const selector of LINKEDIN.jobTitle) {
    for (const title of Array.from(doc.querySelectorAll(selector))) {
      const text = clean(title.textContent);
      if (!text || text.length > LINKEDIN.maxTitleLength) continue;
      let header: Element | null = title.parentElement;
      for (let depth = 0; header && depth < LINKEDIN.headerDepth; depth++, header = header.parentElement) {
        const link = Array.from(header.querySelectorAll(LINKEDIN.companyLink)).find(
          (a) => !title.contains(a) && clean(a.textContent),
        );
        if (link) return { title, header, company: clean(link.textContent) };
      }
    }
  }
  return undefined;
}

function findLocation(header: Element, skip?: Element): string | undefined {
  // Text pieces, not elements: a block can hold the company and location together.
  const doc = header.ownerDocument;
  const walker = doc.createTreeWalker(header, 4 /* NodeFilter.SHOW_TEXT */);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (skip?.contains(node)) continue;
    const piece = clean(clean(node.textContent).split(LINKEDIN.separator)[0]);
    if (piece && piece.length <= LINKEDIN.maxLocationLength && LINKEDIN.location.some((p) => p.test(piece))) return piece;
  }
  return undefined;
}

const firstText = (root: ParentNode, selectors: string[]) => {
  for (const s of selectors) {
    const text = clean(root.querySelector(s)?.textContent);
    if (text && text.length <= LINKEDIN.maxNameLength * 3) return text;
  }
  return '';
};

/** "Shiboleth.ai (YC W24) - Hiring in SF!" -> "Shiboleth.ai". */
const companyOnly = (s: string) => clean(s.split(/\s[-–—]\s/)[0]?.replace(LINKEDIN.profile.ycBatch, ''));

/**
 * "Founding Engineer at AssemblyAI | ex-Google" -> title and company.
 * "YC W24 | Shiboleth.ai | Building Trusted AI" -> company only: a part counts as a title only
 * when it has a job word, so taglines and batches aren't taken for one.
 */
export function splitHeadline(headline: string): { title?: string; company?: string } {
  const P = LINKEDIN.profile;
  const parts = headline
    .split(/\s[|•·]\s/)
    .map(clean)
    .filter((p) => p && !P.batchOnly.test(p));
  const m = parts[0]?.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (m) return { title: clean(m[1]), company: companyOnly(m[2] ?? '') };
  const title = parts.find((p) => P.jobWord.test(p));
  const company = parts.find((p) => P.companyLike.test(p));
  return { ...(title && { title }), ...(company && { company: companyOnly(company) }) };
}

function personFacts(name: string, headline: string, company?: string): PageFacts {
  if (!name || name.length > LINKEDIN.maxNameLength) return {};
  const parts = splitHeadline(headline);
  const facts: PageFacts = { personName: name };
  if (parts.title) facts.personTitle = parts.title;
  const co = company || parts.company;
  if (co) facts.companyName = co;
  return facts;
}

function extractProfile(doc: Document, profileUrl: string): PageFacts {
  const P = LINKEDIN.profile;
  const fromTitle = clean(doc.title.match(P.titleName)?.[1]);
  const nameEl =
    Array.from(doc.querySelectorAll(P.nameTags)).find((el) => fromTitle && clean(el.textContent) === fromTitle) ??
    (fromTitle ? undefined : (doc.querySelector('main h1') ?? doc.querySelector('h1') ?? undefined));
  const name = fromTitle || clean(nameEl?.textContent);
  // Only look inside the profile's own header: the sidebar has other people's Connect buttons.
  const header = (nameEl && profileHeader(nameEl)) ?? doc.querySelector('main') ?? doc.body;

  const label = header.querySelector(P.currentCompany)?.getAttribute('aria-label') ?? '';
  const company = clean(label.match(P.currentCompanyLabel)?.[1]) || topCardCompany(nameEl);
  const headline = firstText(header, P.headline) || headlineAfter(header, name, nameEl);
  const facts = personFacts(name, headline, company);
  if (!facts.personName) return facts;

  const location = findLocation(header, nameEl);
  return { ...facts, ...(location && { location }), profileUrl, connection: connectionState(header) };
}

/** The first company link in the profile's own top card ("Shiboleth.ai (YC W24)"), not the sidebar's. */
function topCardCompany(nameEl?: Element): string {
  const card = nameEl?.closest(LINKEDIN.profile.topCard);
  if (!card) return '';
  for (const a of Array.from(card.querySelectorAll(LINKEDIN.companyLink))) {
    const text = companyOnly(clean(a.textContent));
    if (text && text.length <= LINKEDIN.maxNameLength) return text;
  }
  return '';
}

/** The nearest block around the name that also holds the profile's action buttons. */
function profileHeader(nameEl: Element): Element | undefined {
  let el: Element | null = nameEl.parentElement;
  for (let depth = 0; el && depth < LINKEDIN.headerDepth + 4; depth++, el = el.parentElement) {
    const buttons = Array.from(el.querySelectorAll('button, a'));
    if (buttons.some((b) => LINKEDIN.profile.actionButton.test(clean(b.getAttribute('aria-label') || b.textContent)))) return el;
  }
  return undefined;
}

/** The first longer line after the name, skipping pronouns, "· 1st" and the location. */
function headlineAfter(header: Element, name: string, nameEl?: Element): string {
  const walker = header.ownerDocument.createTreeWalker(header, 4 /* NodeFilter.SHOW_TEXT */);
  let pastName = !nameEl;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (nameEl?.contains(node)) {
      pastName = true;
      continue;
    }
    const text = clean(node.textContent);
    if (!pastName || text.length < LINKEDIN.profile.minHeadlineLength || text.includes(name)) continue;
    if (LINKEDIN.location.some((p) => p.test(text))) continue;
    return text;
  }
  return '';
}

function connectionState(header: Element): PageFacts['connection'] {
  const P = LINKEDIN.profile;
  const controls = Array.from(header.querySelectorAll('button, a')).map((b) => clean(b.getAttribute('aria-label') || b.textContent));
  if (controls.some((t) => P.pending.test(t))) return 'pending';
  const texts = Array.from(header.querySelectorAll('span, div')).filter((e) => !e.children.length).map((e) => clean(e.textContent));
  if (texts.some((t) => P.firstDegree.test(t))) return 'connected';
  return 'none';
}

function extractMessaging(doc: Document): PageFacts {
  const facts = personFacts(firstText(doc, LINKEDIN.messaging.name), firstText(doc, LINKEDIN.messaging.headline));
  // The role the conversation is about ("…a strong fit for the MTS role"), newest message first.
  for (const s of LINKEDIN.messaging.body) {
    const texts = Array.from(doc.querySelectorAll(s)).map((el) => clean(el.textContent)).filter(Boolean).reverse();
    const role = texts.map((t) => roleFromNote(t).roleTitle).find(Boolean);
    if (role) {
      facts.roleTitle = role;
      break;
    }
  }
  for (const s of LINKEDIN.messaging.profileLink) {
    const href = doc.querySelector(s)?.getAttribute('href');
    const slug = href?.match(/\/in\/([^/?#]+)/)?.[1];
    if (slug && facts.personName) return { ...facts, profileUrl: `https://www.linkedin.com/in/${slug}/` };
  }
  return facts;
}
