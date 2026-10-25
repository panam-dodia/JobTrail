import { useState } from 'react';
import { db } from '../../db';
import { APPLICATION_STATUSES, OUTREACH_STATUSES, type ApplicationStatus, type Company, type OutreachStatus } from '../../db/types';
import type { TimelineItem } from '../../lib/timeline';
import { CHANNEL_LABELS, PLATFORM_LABELS, fmtDate, label } from '../format';

interface Props {
  items: TimelineItem[];
  /** When set, each item shows which company it belongs to (for cross-company lists). */
  companiesById?: Map<number, Company>;
  onOpenCompany?: (id: number) => void;
  empty?: string;
}

export function Timeline({ items, companiesById, onOpenCompany, empty = 'Nothing logged yet.' }: Props) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ul className="timeline">
      {items.map((item) => (
        <li key={`${item.kind}-${item.record.id}`} className={`item ${item.kind}`}>
          <div className="meta">
            <span className="kind">{kindLabel(item)}</span>
            <span className="muted">{fmtDate(item.at)}</span>
            {companiesById && (
              <button className="link" onClick={() => onOpenCompany?.(item.record.companyId)}>
                {companiesById.get(item.record.companyId)?.name ?? 'Unknown'}
              </button>
            )}
          </div>
          <ItemBody item={item} />
        </li>
      ))}
    </ul>
  );
}

function kindLabel(item: TimelineItem): string {
  switch (item.kind) {
    case 'application':
      return 'Applied';
    case 'outreach':
      return CHANNEL_LABELS[item.record.channel];
    case 'note':
      return 'Note';
    case 'event':
      return item.record.type === 'new_role' ? 'New role' : 'Role closed';
  }
}

function ItemBody({ item }: { item: TimelineItem }) {
  switch (item.kind) {
    case 'application': {
      const a = item.record;
      return (
        <>
          <div className="row">
            <span className="grow">
              {a.roleTitle || 'Unspecified role'} <span className="muted">via {PLATFORM_LABELS[a.platform]}</span>
            </span>
            <select
              value={a.status}
              aria-label="Application status"
              onChange={(e) => db.applications.update(a.id, { status: e.target.value as ApplicationStatus })}
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {a.notes && <p className="body">{a.notes}</p>}
          <DeleteButton onDelete={() => db.applications.delete(a.id)} />
        </>
      );
    }
    case 'outreach': {
      const o = item.record;
      return (
        <>
          <div className="row">
            <span className="grow">
              {o.profileUrl ? (
                <a href={o.profileUrl} target="_blank" rel="noreferrer">
                  {o.personName}
                </a>
              ) : (
                o.personName
              )}
              {o.personTitle && <span className="muted"> · {o.personTitle}</span>}
            </span>
            <select
              value={o.status}
              aria-label="Outreach status"
              onChange={(e) => db.outreach.update(o.id, { status: e.target.value as OutreachStatus })}
            >
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </div>
          {o.notes && <p className="body">{o.notes}</p>}
          <DeleteButton onDelete={() => db.outreach.delete(o.id)} />
        </>
      );
    }
    case 'note':
      return (
        <>
          <p className="body">{item.record.text}</p>
          <DeleteButton onDelete={() => db.notes.delete(item.record.id)} />
        </>
      );
    case 'event': {
      const e = item.record;
      return (
        <div className="row">
          <span className="grow">
            {item.role ? (
              <a href={item.role.url} target="_blank" rel="noreferrer">
                {item.role.title}
              </a>
            ) : (
              'Unknown role'
            )}
          </span>
          {!e.seen && <button onClick={() => db.events.update(e.id, { seen: true })}>Mark seen</button>}
        </div>
      );
    }
  }
}

function DeleteButton({ onDelete }: { onDelete: () => unknown }) {
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <span className="actions">
      <button className="danger" onClick={() => void onDelete()}>
        Delete
      </button>
      <button onClick={() => setConfirming(false)}>Keep</button>
    </span>
  ) : (
    <span className="actions">
      <button className="link subtle" onClick={() => setConfirming(true)}>
        Delete…
      </button>
    </span>
  );
}
