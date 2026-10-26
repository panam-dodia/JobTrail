import { useState } from 'react';
import { addApplication, addOutreach, findRole } from '../../db/repo';
import {
  APPLICATION_STATUSES,
  OUTREACH_CHANNELS,
  OUTREACH_STATUSES,
  PLATFORMS,
  type ApplicationStatus,
  type OutreachChannel,
  type OutreachStatus,
  type Platform,
} from '../../db/types';
import type { PageContext } from '../../lib/pageContext';
import type { PageFacts } from '../../lib/pageFacts';
import { CHANNEL_LABELS, APPLIED_VIA_LABELS, defaultChannel, defaultPlatform, fromDateInput, label, toDateInput } from '../format';

interface Props {
  companyId: number;
  ctx?: PageContext;
  onDone: () => void;
}

export function ApplicationForm({ companyId, ctx, defaultRole, onDone }: Props & { defaultRole?: string }) {
  const [roleTitle, setRoleTitle] = useState(defaultRole ?? '');
  const [platform, setPlatform] = useState<Platform>(defaultPlatform(ctx));
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [notes, setNotes] = useState('');

  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        const title = roleTitle.trim();
        // Link to a saved role with the same title, if there is one.
        const role = title ? await findRole(companyId, title) : undefined;
        await addApplication({
          companyId,
          roleId: role?.id,
          roleTitle: title || undefined,
          platform,
          appliedAt: fromDateInput(date),
          status,
          notes: notes.trim(),
        });
        onDone();
      }}
    >
      <h3>Log application</h3>
      <label>
        Role
        <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Backend Engineer" autoFocus />
      </label>
      <div className="row">
        <label className="grow">
          Where
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {APPLIED_VIA_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as ApplicationStatus)}>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <div className="row">
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Prefills from the person on the page (LinkedIn profile, message thread, email). */
export function OutreachForm({ companyId, ctx, person, onDone }: Props & { person?: PageFacts }) {
  const [personName, setPersonName] = useState(person?.personName ?? '');
  const [personTitle, setPersonTitle] = useState(person?.personTitle ?? '');
  const [profileUrl, setProfileUrl] = useState(
    person?.profileUrl ??
      (person?.personEmail ? `mailto:${person.personEmail}` : ctx?.site === 'linkedin' && ctx.url.includes('/in/') ? ctx.url : ''),
  );
  const [channel, setChannel] = useState<OutreachChannel>(defaultChannel(ctx));
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [status, setStatus] = useState<OutreachStatus>('sent');
  const [notes, setNotes] = useState(person?.emailSubject ? `Subject: ${person.emailSubject}` : '');
  const [error, setError] = useState('');

  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!personName.trim()) return setError('Who did you reach out to?');
        await addOutreach({
          companyId,
          personName: personName.trim(),
          personTitle: personTitle.trim() || undefined,
          profileUrl: profileUrl.trim() || undefined,
          channel,
          sentAt: fromDateInput(date),
          status,
          notes: notes.trim(),
        });
        onDone();
      }}
    >
      <h3>Log outreach</h3>
      <div className="row">
        <label className="grow">
          Person
          <input value={personName} onChange={(e) => setPersonName(e.target.value)} autoFocus />
        </label>
        <label className="grow">
          Title
          <input value={personTitle} onChange={(e) => setPersonTitle(e.target.value)} placeholder="CTO" />
        </label>
      </div>
      <label>
        Profile URL
        <input value={profileUrl} onChange={(e) => setProfileUrl(e.target.value)} />
      </label>
      <div className="row">
        <label className="grow">
          Channel
          <select value={channel} onChange={(e) => setChannel(e.target.value as OutreachChannel)}>
            {OUTREACH_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as OutreachStatus)}>
          {OUTREACH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}
