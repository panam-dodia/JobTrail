import { useState } from 'react';
import type { Company } from '../../db/types';
import { compactKey } from '../../lib/normalize';

interface Props {
  companies: Company[];
  onPick: (company: Company) => void;
  placeholder?: string;
}

/** Search box over tracked companies, matching on normalized name and aliases. */
export function CompanyPicker({ companies, onPick, placeholder = 'Search companies…' }: Props) {
  const [query, setQuery] = useState('');
  const q = compactKey(query);
  const results = q
    ? companies.filter((c) => [c.name, ...c.aliases].some((n) => compactKey(n).includes(q)))
    : companies;
  const sorted = [...results].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="picker">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} type="search" />
      <ul className="plain list">
        {sorted.map((c) => (
          <li key={c.id}>
            <button className="list-item" onClick={() => onPick(c)}>
              <span className="grow">
                {c.watching && <span title="Watching">★ </span>}
                {c.name}
              </span>
              <span className="muted">{c.domain ?? c.ycSlug ?? ''}</span>
            </button>
          </li>
        ))}
        {!sorted.length && <li className="muted">No matches.</li>}
      </ul>
    </div>
  );
}
