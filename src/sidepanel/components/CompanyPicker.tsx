import { useState } from 'react';
import type { Company } from '../../db/types';
import { displayName } from '../../lib/companyName';
import type { RoleTitle } from '../../db/repo';
import { fmtDateTime, PLATFORM_LABELS } from '../format';
import { compactKey } from '../../lib/normalize';

interface Props {
  companies: Company[];
  /** Role titles to list under each company. */
  roles?: Map<number, RoleTitle[]>;
  onPick: (company: Company) => void;
  /** When set, each row gets a delete button (with a confirm step). */
  onDelete?: (company: Company) => void;
  placeholder?: string;
}

/** Search box over tracked companies, matching on name, aliases, and role titles. */
export function CompanyPicker({ companies, roles, onPick, onDelete, placeholder = 'Search companies or roles…' }: Props) {
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState<number | null>(null);
  const q = compactKey(query);
  const results = q
    ? companies.filter((c) => [c.name, ...c.aliases, ...(roles?.get(c.id) ?? []).map((r) => r.title)].some((n) => compactKey(n).includes(q)))
    : companies;
  const sorted = [...results].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="picker">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} type="search" />
      <ul className="plain list">
        {sorted.map((c) => {
          const titles = roles?.get(c.id) ?? [];
          return (
            <li key={c.id} className="picker-row">
              <button className="list-item" onClick={() => onPick(c)}>
                <span className="company-cell">
                  <span className="company-name">
                    {c.watching && <span title="Watching">★ </span>}
                    {displayName(c)}
                  </span>
                  {titles.length > 0 && (
                    <span className="role-list">
                      {titles.map((r) => (
                        <span key={r.title} className="role">
                          {r.title} <span className="muted small">· {PLATFORM_LABELS[r.platform]}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="muted small" title="Added">{fmtDateTime(c.createdAt)}</span>
              </button>
              {onDelete &&
                (confirming === c.id ? (
                  <span className="row-actions">
                    <button className="danger" onClick={() => onDelete(c)}>
                      Delete {c.name} and its history
                    </button>
                    <button onClick={() => setConfirming(null)}>Keep</button>
                  </span>
                ) : (
                  <button className="icon-button" aria-label={`Delete ${c.name}`} title="Delete" onClick={() => setConfirming(c.id)}>
                    ✕
                  </button>
                ))}
            </li>
          );
        })}
        {!sorted.length && <li className="muted">No matches.</li>}
      </ul>
    </div>
  );
}
