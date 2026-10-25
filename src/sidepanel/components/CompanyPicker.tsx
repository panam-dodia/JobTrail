import { useState } from 'react';
import type { Company } from '../../db/types';
import { compactKey } from '../../lib/normalize';

interface Props {
  companies: Company[];
  /** Role titles to list under each company. */
  roles?: Map<number, string[]>;
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
    ? companies.filter((c) => [c.name, ...c.aliases, ...(roles?.get(c.id) ?? [])].some((n) => compactKey(n).includes(q)))
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
                    {c.name}
                  </span>
                  {titles.length > 0 && (
                    <span className="role-list">
                      {titles.map((t) => (
                        <span key={t} className="role">
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="muted">{c.domain ?? c.ycSlug ?? ''}</span>
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
