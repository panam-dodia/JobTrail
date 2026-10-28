import type { PageFacts } from '../../lib/pageFacts';
import { roleFromNote } from '../../lib/noteRole';
import { GMAIL } from './selectors';

const clean = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();
const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface Person {
  email: string;
  name?: string;
}

/** What the email says: the texts newest first, and the greeting of the one you wrote. */
interface Body {
  texts: string[];
  greeting?: string;
}

/**
 * Reads who an open email or draft is with, its subject, and the role its text names.
 * Your own address is skipped. Read-only and local; never throws.
 */
export function extractGmail(doc: Document): PageFacts {
  const own = doc.title.match(GMAIL.ownEmail)?.[1]?.toLowerCase();
  // A draft being written beats the conversation behind it; the newest draft is last.
  const drafts = Array.from(doc.querySelectorAll(GMAIL.compose)).reverse();
  for (const draft of drafts) {
    const person = firstOther(Array.from(draft.querySelectorAll(GMAIL.composeRecipients)), own);
    if (!person) continue;
    const text = (draft.querySelector(GMAIL.composeBody) as HTMLElement | null)?.innerText ?? '';
    const body = { texts: [clean(text)].filter(Boolean), greeting: greetingOf(text) };
    return toFacts(person, (draft.querySelector(GMAIL.composeSubject) as HTMLInputElement | null)?.value, body);
  }
  const person = firstOther(Array.from(doc.querySelectorAll(GMAIL.participants)), own);
  return person ? toFacts(person, doc.querySelector(GMAIL.threadSubject)?.textContent, threadBody(doc, own)) : {};
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

function threadBody(doc: Document, own?: string): Body {
  const bodies = Array.from(doc.querySelectorAll(GMAIL.messageBody)) as HTMLElement[];
  // The greeting you wrote ("Hi Helios team,"), not theirs ("Hi Panam,"); else the first message's.
  const mine = bodies.find((b) => senderOf(b) === own) ?? bodies[0];
  return {
    texts: bodies.map((b) => clean(b.innerText ?? b.textContent)).filter(Boolean).reverse(),
    greeting: mine && greetingOf(mine.innerText ?? mine.textContent ?? ''),
  };
}

/** The sender of the message a body belongs to: the nearest block above it that names one. */
function senderOf(body: Element): string | undefined {
  for (let el = body.parentElement; el; el = el.parentElement) {
    const from = el.querySelector('span.gD[email]');
    if (from) return from.getAttribute('email')?.toLowerCase();
  }
  return undefined;
}

function greetingOf(text: string): string | undefined {
  const first = text.trimStart().split('\n')[0] ?? '';
  return clean(`${first}\n`.match(GMAIL.greeting)?.[1]) || undefined;
}

function toFacts(person: Person, subject?: string | null, body: Body = { texts: [] }): PageFacts {
  const [local = '', domain] = person.email.split('@');
  const facts: PageFacts = { personEmail: person.email };
  const s = clean(subject);
  if (s) facts.emailSubject = s;

  // "Hi Helios team," names the company better than the domain does.
  const team = body.greeting?.match(GMAIL.teamGreeting)?.[1];
  const fromGreeting = team && !GMAIL.genericTeam.test(team) ? team : undefined;
  if (domain && !GMAIL.freeDomains.includes(domain)) {
    facts.domain = domain;
    facts.companyName = fromGreeting ?? titleCase(companyFromDomain(domain));
  }

  const shared = GMAIL.sharedInbox.test(local);
  if (person.name && !(shared && person.name.toLowerCase() === local)) facts.personName = person.name;
  else if (shared) facts.personName = body.greeting && !GMAIL.noOneGreeting.test(body.greeting) ? body.greeting : `${facts.companyName ?? titleCase(local)} team`;
  // Gmail often shows a recipient only by address; "alexis.m@..." still reads as "Alexis M".
  else facts.personName = titleCase(local.replace(/[._+]+/g, ' '));

  // The role the email is about ("…the Founding Engineer role"), newest message first.
  const role = body.texts.map((t) => roleFromNote(t).roleTitle).find(Boolean);
  if (role) facts.roleTitle = role;
  return facts;
}

/** "withbasis.co" -> "basis", "acmehq.com" -> "acme", "heliosinc.ai" -> "helios". */
export function companyFromDomain(domain: string): string {
  let label = domain.split('.')[0] ?? '';
  const keep = (s: string) => (s.length >= GMAIL.minCompanyLength ? s : label);
  for (const p of GMAIL.domainPrefixes) if (label.startsWith(p)) label = keep(label.slice(p.length));
  for (const s of GMAIL.domainSuffixes) if (label.endsWith(s)) label = keep(label.slice(0, -s.length));
  return label;
}
