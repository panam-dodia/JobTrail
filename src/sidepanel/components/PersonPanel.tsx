import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { addOutreach, createCompany, findOutreachByPerson, linkPageToCompany, updateOutreach } from '../../db/repo';
import { OUTREACH_CHANNELS, OUTREACH_STATUSES, type Company, type OutreachChannel, type OutreachStatus } from '../../db/types';
import { displayName, splitNames } from '../../lib/companyName';
import { matchByName } from '../../lib/match';
import { draftKey } from '../../lib/messages';
import { roleFromNote } from '../../lib/noteRole';
import { db } from '../../db';
import type { PageContext } from '../../lib/pageContext';
import type { PageFacts } from '../../lib/pageFacts';
import { CHANNEL_LABELS, defaultChannel, fmtDate, label } from '../format';
import { StatusSelect, outreachStatusLabel } from './Activity';

interface Props {
  facts: PageFacts;
  ctx?: PageContext;
  companies: Company[];
  /** Set when the page already matched a company; the company field is hidden. */
  company?: Company;
  onLogged: (companyId: number) => void;
  /** Opens a company from the already-logged list. */
  onOpenCompany?: (companyId: number) => void;
}

const SHORT_CHANNEL = { linkedin_connection: 'Request', linkedin_message: 'Message', yc_message: 'YC message', email: 'Email' } as const;

const CONNECTION = {
  connected: { label: 'Connected', className: 'chip yes' },
  pending: { label: 'Request sent', className: 'chip pending' },
  none: { label: 'Not connected', className: 'chip' },
} as const;

/**
 * The person on a LinkedIn profile, message thread or email: what's already logged with them, and
 * a form, filled in from the page, that logs outreach under their company (created if new).
 */
export function PersonPanel({ facts, ctx, companies, company, onLogged, onOpenCompany }: Props) {
  const email = facts.personEmail;
  const contact = facts.profileUrl ?? (email ? `mailto:${email}` : undefined);
  const logged = useLiveQuery(() => findOutreachByPerson(facts.profileUrl, email), [facts.profileUrl, email]);
  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="card person">
      <div>
        <h2 className="person-name">{facts.personName}</h2>
        {facts.personTitle && <p className="muted">{facts.personTitle}</p>}
      </div>
      <div className="glance">
        {facts.connection && <span className={CONNECTION[facts.connection].className}>{CONNECTION[facts.connection].label}</span>}
        {email && <span className="chip">{email}</span>}
        {facts.location && <span className="chip">{facts.location}</span>}
      </div>

      {!!logged?.length && (
        <div className="section">
          <h3 className="section-title">Already logged</h3>
          <ul className="list">
            {logged.map((o) => {
              const co = companiesById.get(o.companyId);
              return (
                <li key={o.id} className="list-row">
                  <StatusSelect
                    value={o.status}
                    options={OUTREACH_STATUSES}
                    labelOf={(s) => outreachStatusLabel(o, s)}
                    onChange={(s) => updateOutreach(o.id, { status: s })}
                  />
                  <span className="grow small">
                    {SHORT_CHANNEL[o.channel]} <span className="muted">· {fmtDate(o.sentAt)}</span>
                  </span>
                  {co &&
                    (onOpenCompany ? (
                      <button className="link small" onClick={() => onOpenCompany(co.id)}>
                        {displayName(co)} →
                      </button>
                    ) : (
                      <span className="muted small">{displayName(co)}</span>
                    ))}
                </li>
              );
            })}
          </ul>
          {!showForm && (
            <button className="btn-ghost btn-sm add-another" onClick={() => setShowForm(true)}>
              + Log another
            </button>
          )}
        </div>
      )}

      {logged && (!logged.length || showForm) && (
        <PersonForm
          key={contact ?? facts.personName}
          facts={facts}
          ctx={ctx}
          contact={contact}
          companies={companies}
          company={company}
          onLogged={(id) => {
            setShowForm(false);
            onLogged(id);
          }}
        />
      )}
    </section>
  );
}

function PersonForm({ facts, ctx, contact, companies, company, onLogged }: Props & { contact?: string }) {
  const [name, setName] = useState(facts.personName ?? '');
  const [title, setTitle] = useState(facts.personTitle ?? '');
  const [companyName, setCompanyName] = useState(facts.companyName ?? '');
  const [channel, setChannel] = useState<OutreachChannel>(defaultChannel(ctx));
  const [status, setStatus] = useState<OutreachStatus>(facts.connection === 'connected' ? 'accepted' : 'sent');
  const [notes, setNotes] = useState(facts.emailSubject ? `Subject: ${facts.emailSubject}` : '');
  // A connection note captured on LinkedIn whose company wasn't certain waits here.
  const draft = facts.profileUrl ? draftKey(facts.profileUrl) : undefined;
  useEffect(() => {
    if (!draft) return;
    chrome.storage.session
      .get(draft)
      .then((got) => {
        const note = got[draft];
        if (typeof note === 'string' && note) setNotes((n) => n || note);
      })
      .catch(() => {});
  }, [draft]);
  const [possibleDupes, setPossibleDupes] = useState<Company[] | null>(null);
  const [error, setError] = useState('');

  // Same as the company form: fields follow the page until typed in.
  const touched = useRef(new Set<string>());
  const typed = <T,>(field: string, set: (v: T) => void) => (v: T) => {
    touched.current.add(field);
    set(v);
  };
  const live = JSON.stringify([facts.personName, facts.personTitle, facts.companyName, facts.connection]);
  useEffect(() => {
    const follow = <T,>(field: string, set: (v: T) => void, v: T | undefined) => {
      if (v && !touched.current.has(field)) set(v);
    };
    follow('name', setName, facts.personName);
    follow('title', setTitle, facts.personTitle);
    follow('company', setCompanyName, facts.companyName);
    if (facts.connection === 'connected') follow<OutreachStatus>('status', setStatus, 'accepted');
    // Only re-run when the page's facts change.
  }, [live]);

  async function save(companyId?: number) {
    if (!name.trim()) return setError('Name is required.');
    let id = companyId ?? company?.id;
    if (id === undefined) {
      const names = splitNames(companyName);
      if (!names) return setError('Which company is this for?');
      const { exact, candidates } = matchByName(names.name, companies);
      if (exact[0]) id = exact[0].id;
      else if (candidates.length) return setPossibleDupes(candidates);
      else id = await createCompany(names);
    }
    // An email's work domain identifies the company next time; never overwrites what's set.
    if (ctx?.domain && !company) await linkPageToCompany(id, ctx);
    await addOutreach({
      companyId: id,
      personName: name.trim(),
      personTitle: title.trim() || undefined,
      profileUrl: contact,
      channel,
      sentAt: Date.now(),
      status,
      notes: notes.trim(),
      ...roleFromNote(notes, await db.roles.where('companyId').equals(id).toArray()),
    });
    if (draft) await chrome.storage.session.remove(draft).catch(() => {});
    onLogged(id);
  }

  if (possibleDupes) {
    return (
      <div className="ask-inline">
        <p>
          <strong>Is “{splitNames(companyName)?.name}” one of these?</strong>
        </p>
        <ul className="plain">
          {possibleDupes.map((c) => (
            <li key={c.id} className="row">
              <span className="grow">{displayName(c)}</span>
              <button onClick={() => void save(c.id)}>Yes, use this</button>
            </li>
          ))}
        </ul>
        <div className="row">
          <button
            className="primary"
            onClick={async () => {
              const names = splitNames(companyName);
              if (names) await save(await createCompany(names));
            }}
          >
            No, add as new company
          </button>
          <button onClick={() => setPossibleDupes(null)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>Log outreach</h3>
      <label>
        Name
        <input value={name} onChange={(e) => typed('name', setName)(e.target.value)} />
      </label>
      <label>
        Role
        <input value={title} onChange={(e) => typed('title', setTitle)(e.target.value)} placeholder="CTO" />
      </label>
      {!company && (
        <label>
          Company <span className="muted">(other names after a slash: abc / abc labs)</span>
          <input value={companyName} onChange={(e) => typed('company', setCompanyName)(e.target.value)} />
        </label>
      )}
      <div className="row">
        <label className="grow">
          Channel
          <select value={channel} onChange={(e) => typed('channel', setChannel)(e.target.value as OutreachChannel)}>
            {OUTREACH_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          Status
          <select value={status} onChange={(e) => typed('status', setStatus)(e.target.value as OutreachStatus)}>
            {OUTREACH_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit" className="primary">
          Log this
        </button>
      </div>
    </form>
  );
}
