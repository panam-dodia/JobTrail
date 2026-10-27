import { useState } from 'react';
import { addApplication, addOutreach, findRole } from '../../db/repo';
import {
  APPLICATION_STATUSES,
  OUTREACH_STATUSES,
  PLATFORMS,
  type ApplicationStatus,
  type OutreachChannel,
  type OutreachStatus,
  type Platform,
  type Role,
} from '../../db/types';
import { roleFromNote } from '../../lib/noteRole';
import type { PageContext } from '../../lib/pageContext';
import { CHANNEL_LABELS, APPLIED_VIA_LABELS, defaultChannel, defaultPlatform, fromDateInput, toDateInput } from '../format';
import { EditButtons, outreachStatusLabel } from './Activity';

interface Props {
  companyId: number;
  ctx?: PageContext;
  /** The company's saved roles, offered as suggestions and linked when named. */
  roles: Role[];
  onDone: () => void;
}

const capitalize = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

export function ApplicationForm({ companyId, ctx, roles, defaultRole, onDone }: Props & { defaultRole?: string }) {
  const [roleTitle, setRoleTitle] = useState(defaultRole ?? '');
  const [platform, setPlatform] = useState<Platform>(defaultPlatform(ctx));
  const [platformPicked, setPlatformPicked] = useState(false);
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [notes, setNotes] = useState('');
  const listId = `roles-${companyId}`;

  return (
    <form
      className="form entry-edit"
      onSubmit={async (e) => {
        e.preventDefault();
        const title = roleTitle.trim();
        // Link to a saved role with the same title, if there is one.
        const role = title ? await findRole(companyId, title) : undefined;
        await addApplication({
          companyId,
          roleId: role?.id,
          roleTitle: title || undefined,
          // Off a page there's no platform to suggest; a saved role knows where it was found.
          platform: !platformPicked && !ctx && role ? role.source : platform,
          appliedAt: fromDateInput(date),
          status,
          notes: notes.trim(),
        });
        onDone();
      }}
    >
      <label>
        Role
        <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Backend Engineer" list={listId} autoFocus />
        <datalist id={listId}>
          {roles.map((r) => (
            <option key={r.id} value={r.title} />
          ))}
        </datalist>
      </label>
      <div className="row">
        <label className="grow">
          Applied via
          <select
            value={platform}
            onChange={(e) => {
              setPlatformPicked(true);
              setPlatform(e.target.value as Platform);
            }}
          >
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
            <option key={s} value={s}>
              {capitalize(s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <EditButtons onCancel={onDone} />
    </form>
  );
}

/** Outreach on one or more channels (a YC message, an email, or a LinkedIn request or message). */
export function OutreachForm({ companyId, ctx, roles, channels, onDone }: Props & { channels: OutreachChannel[] }) {
  const fromPage = defaultChannel(ctx);
  const [channel, setChannel] = useState<OutreachChannel>(channels.includes(fromPage) ? fromPage : channels[0]!);
  const [personName, setPersonName] = useState('');
  const [personTitle, setPersonTitle] = useState('');
  const [contact, setContact] = useState('');
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [status, setStatus] = useState<OutreachStatus>('sent');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const isEmail = channel === 'email';
  const isLinkedIn = channel.startsWith('linkedin');

  return (
    <form
      className="form entry-edit"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!personName.trim()) return setError('Who did you reach out to?');
        const c = contact.trim();
        await addOutreach({
          companyId,
          personName: personName.trim(),
          personTitle: personTitle.trim() || undefined,
          profileUrl: c ? (isEmail && !c.startsWith('mailto:') ? `mailto:${c}` : c) : undefined,
          channel,
          sentAt: fromDateInput(date),
          status,
          notes: notes.trim(),
          ...roleFromNote(notes, roles),
        });
        onDone();
      }}
    >
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
      {(isEmail || isLinkedIn) && (
        <label>
          {isEmail ? 'Email address' : 'Profile URL'} <span className="muted">(optional)</span>
          <input value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
      )}
      <div className="row">
        {channels.length > 1 && (
          <label className="grow">
            Type
            <select value={channel} onChange={(e) => setChannel(e.target.value as OutreachChannel)}>
              {channels.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="grow">
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value as OutreachStatus)}>
          {OUTREACH_STATUSES.map((s) => (
            <option key={s} value={s}>
              {outreachStatusLabel({ channel }, s)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Notes <span className="muted">(a role named here, e.g. "the MTS role", is linked)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      {error && <p className="error">{error}</p>}
      <EditButtons onCancel={onDone} />
    </form>
  );
}
