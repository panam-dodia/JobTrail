import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db';
import {
  APPLICATION_STATUSES,
  OUTREACH_CHANNELS,
  OUTREACH_STATUSES,
  PLATFORMS,
  type Application,
  type ApplicationStatus,
  type Outreach,
  type OutreachChannel,
  type OutreachStatus,
  type Platform,
  type Role,
} from '../../db/types';
import { displayName } from '../../lib/companyName';
import { roleFromNote } from '../../lib/noteRole';
import type { PageContext } from '../../lib/pageContext';
import { ApplicationForm, OutreachForm } from './LogForms';
import { ACTIVITY_CHANNELS, activity, type ActivityChannel, type ActivityEntry } from '../../lib/timeline';
import { APPLIED_VIA_LABELS, CHANNEL_LABELS, PLATFORM_LABELS, fmtDate, fromDateInput, label, toDateInput } from '../format';

const CHANNEL_TITLES: Record<ActivityChannel, string> = {
  yc: 'YC message',
  linkedin: 'LinkedIn',
  email: 'Email',
  applied: 'Applied',
};

const capitalize = (s: string) => s.replace(/^\w/, (c) => c.toUpperCase());

/** Status wording per channel: a LinkedIn connection that's "accepted" reads "Connected". */
export function outreachStatusLabel(o: Pick<Outreach, 'channel'>, status: OutreachStatus): string {
  if (o.channel === 'linkedin_connection') {
    return { sent: 'Request sent', accepted: 'Connected', replied: 'Replied', no_response: 'No response' }[status];
  }
  if (o.channel === 'linkedin_message' && status === 'sent') return 'Messaged';
  return capitalize(label(status));
}

interface Props {
  companyId: number;
  outreach: Outreach[];
  applications: Application[];
  roles: Role[];
  ctx?: PageContext;
  /** The job open in the tab, suggested when logging an application. */
  pageRole?: string;
}

const CHANNEL_KINDS: Record<Exclude<ActivityChannel, 'applied'>, OutreachChannel[]> = {
  yc: ['yc_message'],
  linkedin: ['linkedin_connection', 'linkedin_message'],
  email: ['email'],
};

/** One row per channel: was it done, by whom, when, and where it stands. Each row can log more. */
export function Activity({ companyId, outreach, applications, roles, ctx, pageRole }: Props) {
  const byChannel = activity(outreach, applications, roles);
  const [adding, setAdding] = useState<ActivityChannel | null>(null);
  const done = () => setAdding(null);
  return (
    <section className="section">
      <h3 className="section-title">Activity</h3>
      <dl className="activity">
        {ACTIVITY_CHANNELS.map((ch) => (
          <div key={ch} className="activity-row">
            <dt>
              {CHANNEL_TITLES[ch]}
              {adding !== ch && (
                <button className="link add-btn" onClick={() => setAdding(ch)}>
                  + Add
                </button>
              )}
            </dt>
            <dd>
              {adding === ch &&
                (ch === 'applied' ? (
                  <ApplicationForm companyId={companyId} ctx={ctx} roles={roles} defaultRole={pageRole} onDone={done} />
                ) : (
                  <OutreachForm companyId={companyId} ctx={ctx} roles={roles} channels={CHANNEL_KINDS[ch]} onDone={done} />
                ))}
              {byChannel[ch].length ? (
                byChannel[ch].map((e) => <Entry key={`${e.kind}-${e.record.id}`} entry={e} roles={roles} />)
              ) : (
                adding !== ch && <span className="empty">Not yet</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Name on top; status, details and date underneath; notes last. Edits in place. */
function Entry({ entry, roles }: { entry: ActivityEntry; roles: Role[] }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return entry.kind === 'outreach' ? (
      <EditOutreach o={entry.record} role={entry.role} roles={roles} onClose={() => setEditing(false)} />
    ) : (
      <EditApplication a={entry.record} role={entry.role} onClose={() => setEditing(false)} />
    );
  }

  if (entry.kind === 'outreach') {
    const o = entry.record;
    const kind = o.channel === 'linkedin_message' ? 'Message' : o.channel === 'linkedin_connection' ? 'Connection request' : undefined;
    const about = entry.role?.title ?? o.roleTitle;
    return (
      <div className="entry">
        <div className="entry-line">
          <span className="entry-what">
            {o.profileUrl ? (
              <a href={o.profileUrl} target="_blank" rel="noreferrer">
                {o.personName}
              </a>
            ) : (
              o.personName
            )}
          </span>
          <EntryActions onEdit={() => setEditing(true)} onDelete={() => db.outreach.delete(o.id)} />
        </div>
        <div className="entry-meta">
          <StatusSelect
            value={o.status}
            options={OUTREACH_STATUSES}
            labelOf={(s) => outreachStatusLabel(o, s)}
            onChange={(s) => db.outreach.update(o.id, { status: s })}
          />
          <span>{[o.personTitle, kind, about && `re: ${about}`, fmtDate(o.sentAt)].filter(Boolean).join(' · ')}</span>
        </div>
        {o.notes && <p className="entry-notes">{o.notes}</p>}
      </div>
    );
  }

  const a = entry.record;
  const foundOn = entry.role && entry.role.source !== a.platform ? PLATFORM_LABELS[entry.role.source] : undefined;
  return (
    <div className="entry">
      <div className="entry-line">
        <span className="entry-what">{entry.role?.title ?? a.roleTitle ?? 'Unspecified role'}</span>
        <EntryActions onEdit={() => setEditing(true)} onDelete={() => db.applications.delete(a.id)} />
      </div>
      <div className="entry-meta">
        <StatusSelect
          value={a.status}
          options={APPLICATION_STATUSES}
          labelOf={capitalize}
          onChange={(s) => db.applications.update(a.id, { status: s })}
        />
        <span>
          via {APPLIED_VIA_LABELS[a.platform]}
          {foundOn && <> · found on {foundOn}</>} · {fmtDate(a.appliedAt)}
        </span>
      </div>
      {a.notes && <p className="entry-notes">{a.notes}</p>}
    </div>
  );
}

// Keep the original time when the day didn't change, so same-day order holds.
const keepTime = (original: number, date: string) => (date === toDateInput(original) ? original : fromDateInput(date));

function EditOutreach({ o, role, roles, onClose }: { o: Outreach; role?: Role; roles: Role[]; onClose: () => void }) {
  const originalRole = role?.title ?? o.roleTitle ?? '';
  const [roleTitle, setRoleTitle] = useState(originalRole);
  const [personName, setPersonName] = useState(o.personName);
  const [personTitle, setPersonTitle] = useState(o.personTitle ?? '');
  const [channel, setChannel] = useState<OutreachChannel>(o.channel);
  const [date, setDate] = useState(toDateInput(o.sentAt));
  const [status, setStatus] = useState<OutreachStatus>(o.status);
  const [notes, setNotes] = useState(o.notes);
  const [companyId, setCompanyId] = useState(o.companyId);
  return (
    <form
      className="form entry-edit"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!personName.trim()) return;
        const title = roleTitle.trim();
        const moved = companyId !== o.companyId;
        await db.outreach.update(o.id, {
          // A renamed role, or one at another company, no longer points at the saved one;
          // with no role, the notes may name one.
          ...((title !== originalRole || moved) && { roleTitle: title || undefined, roleId: undefined }),
          ...(!title && !moved && roleFromNote(notes, roles)),
          companyId,
          personName: personName.trim(),
          personTitle: personTitle.trim() || undefined,
          channel,
          sentAt: keepTime(o.sentAt, date),
          status,
          notes: notes.trim(),
        });
        onClose();
      }}
    >
      <div className="row">
        <label>
          Person
          <input value={personName} onChange={(e) => setPersonName(e.target.value)} autoFocus />
        </label>
        <label>
          Title
          <input value={personTitle} onChange={(e) => setPersonTitle(e.target.value)} />
        </label>
      </div>
      <div className="row">
        <label>
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
      <CompanySelect value={companyId} onChange={setCompanyId} />
      <label>
        About role <span className="muted">(blank: read from the notes)</span>
        <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
      </label>
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
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <EditButtons onCancel={onClose} />
    </form>
  );
}

function EditApplication({ a, role, onClose }: { a: Application; role?: Role; onClose: () => void }) {
  const original = role?.title ?? a.roleTitle ?? '';
  const [roleTitle, setRoleTitle] = useState(original);
  const [platform, setPlatform] = useState<Platform>(a.platform);
  const [date, setDate] = useState(toDateInput(a.appliedAt));
  const [status, setStatus] = useState<ApplicationStatus>(a.status);
  const [notes, setNotes] = useState(a.notes);
  const [companyId, setCompanyId] = useState(a.companyId);
  return (
    <form
      className="form entry-edit"
      onSubmit={async (e) => {
        e.preventDefault();
        const title = roleTitle.trim();
        const moved = companyId !== a.companyId;
        await db.applications.update(a.id, {
          // A renamed role, or one at another company, no longer points at the saved one.
          ...((title !== original || moved) && { roleTitle: title || undefined, roleId: undefined }),
          companyId,
          platform,
          appliedAt: keepTime(a.appliedAt, date),
          status,
          notes: notes.trim(),
        });
        onClose();
      }}
    >
      <label>
        Role
        <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} autoFocus />
      </label>
      <CompanySelect value={companyId} onChange={setCompanyId} />
      <div className="row">
        <label>
          Applied via
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
      <EditButtons onCancel={onClose} />
    </form>
  );
}

/** Moves an entry to another company, e.g. when it was filed under the wrong one. */
function CompanySelect({ value, onChange }: { value: number; onChange: (id: number) => void }) {
  const companies = useLiveQuery(() => db.companies.orderBy('name').toArray(), []);
  return (
    <label>
      Company
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {(companies ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {displayName(c)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EditButtons({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="row">
      <button type="submit" className="primary btn-sm">
        Save
      </button>
      <button type="button" className="btn-sm" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export function StatusSelect<S extends string>(props: { value: S; options: S[]; labelOf: (s: S) => string; onChange: (s: S) => unknown }) {
  return (
    <select
      className={`status status-${props.value}`}
      value={props.value}
      aria-label="Status"
      onChange={(e) => void props.onChange(e.target.value as S)}
    >
      {props.options.map((s) => (
        <option key={s} value={s}>
          {props.labelOf(s)}
        </option>
      ))}
    </select>
  );
}

/** Edit and delete; delete asks first. */
export function EntryActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => unknown }) {
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <span className="confirm">
      <button className="btn-danger btn-xs" onClick={() => void onDelete()}>
        Delete
      </button>
      <button className="btn-ghost btn-xs" onClick={() => setConfirming(false)}>
        Keep
      </button>
    </span>
  ) : (
    <span className="entry-actions">
      <button className="icon-btn edit" aria-label="Edit entry" title="Edit" onClick={onEdit}>
        ✎
      </button>
      <button className="icon-btn" aria-label="Delete entry" title="Delete" onClick={() => setConfirming(true)}>
        ×
      </button>
    </span>
  );
}
