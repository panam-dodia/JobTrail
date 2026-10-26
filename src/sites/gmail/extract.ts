import type { PageFacts } from '../../lib/pageFacts';
import { GMAIL } from './selectors';

const clean = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface Person {
  email: string;
  name?: string;
}

/**
 * Reads who an open email or draft is with, and its subject. Your own address is skipped.
 * Read-only and local; never throws.
 */
export function extractGmail(doc: Document): PageFacts {
  const own = doc.title.match(GMAIL.ownEmail)?.[1]?.toLowerCase();
  // A draft being written beats the conversation behind it; the newest draft is last.
  const drafts = Array.from(doc.querySelectorAll(GMAIL.compose)).reverse();
  for (const draft of drafts) {
    const person = firstOther(Array.from(draft.querySelectorAll(GMAIL.composeRecipients)), own);
    if (person) return toFacts(person, (draft.querySelector(GMAIL.composeSubject) as HTMLInputElement | null)?.value);
  }
  const person = firstOther(Array.from(doc.querySelectorAll(GMAIL.participants)), own);
  return person ? toFacts(person, doc.querySelector(GMAIL.threadSubject)?.textContent) : {};
}

function firstOther(els: Element[], own?: string): Person | undefined {
  for (const el of els) {
    const email = clean(el.getAttribute('email') ?? el.getAttribute('data-hovercard-id')).toLowerCase();
    if (!email.includes('@') || email === own) continue;
    const name = clean(el.getAttribute('name') ?? el.textContent);
    return { email, ...(name && !name.includes('@') && { name }) };
  }
  return undefined;
}

function toFacts(person: Person, subject?: string | null): PageFacts {
  const facts: PageFacts = { personEmail: person.email };
  if (person.name) facts.personName = person.name;
  const s = clean(subject);
  if (s) facts.emailSubject = s;
  const domain = person.email.split('@')[1];
  if (domain && !GMAIL.freeDomains.includes(domain)) {
    facts.domain = domain;
    facts.companyName = titleCase(domain.split('.')[0] ?? '');
  }
  return facts;
}
