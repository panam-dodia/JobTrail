import { useState } from 'react';
import { createCompany, updateCompany } from '../../db/repo';
import type { AtsType, Company, Sponsorship } from '../../db/types';
import { matchByName } from '../../lib/match';
import { normalizeDomain } from '../../lib/normalize';

interface Props {
  companies: Company[];
  /** Present when editing; absent when adding. */
  company?: Company;
  initial?: Partial<Company>;
  onDone: (companyId: number) => void;
  /** Called when the user says the new company is one they already track. */
  onPickExisting?: (company: Company) => void;
  onCancel: () => void;
}

const ATS_TYPES: AtsType[] = ['greenhouse', 'lever', 'ashby', 'other'];

export function CompanyForm({ companies, company, initial, onDone, onPickExisting, onCancel }: Props) {
  const base = company ?? initial ?? {};
  const [name, setName] = useState(base.name ?? '');
  const [aliases, setAliases] = useState((base.aliases ?? []).join(', '));
  const [domain, setDomain] = useState(base.domain ?? '');
  const [ycSlug, setYcSlug] = useState(base.ycSlug ?? '');
  const [atsType, setAtsType] = useState<AtsType>(base.ats?.type ?? 'greenhouse');
  const [atsToken, setAtsToken] = useState(base.ats?.token ?? '');
  const [sponsorship, setSponsorship] = useState<Sponsorship>(base.sponsorship ?? 'unknown');
  const [possibleDupes, setPossibleDupes] = useState<Company[] | null>(null);
  const [error, setError] = useState('');

  async function save(skipDupeCheck = false) {
    const trimmed = name.trim();
    if (!trimmed) return setError('Name is required.');
    const normDomain = domain.trim() ? normalizeDomain(domain) : undefined;
    if (domain.trim() && !normDomain) return setError('Domain should look like acme.com.');

    if (!company && !skipDupeCheck) {
      const { exact, candidates } = matchByName(trimmed, companies);
      if (exact.length || candidates.length) return setPossibleDupes([...exact, ...candidates]);
    }

    const fields = {
      name: trimmed,
      aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
      domain: normDomain,
      ycSlug: ycSlug.trim().toLowerCase() || undefined,
      ats: atsToken.trim() ? { type: atsType, token: atsToken.trim().toLowerCase() } : undefined,
      sponsorship,
    };
    if (company) {
      await updateCompany(company.id, fields);
      onDone(company.id);
    } else {
      onDone(await createCompany(fields));
    }
  }

  if (possibleDupes) {
    return (
      <div className="card ask">
        <p>
          <strong>Is “{name.trim()}” one of these?</strong>
        </p>
        <ul className="plain">
          {possibleDupes.map((c) => (
            <li key={c.id} className="row">
              <span>
                {c.name} {c.domain && <span className="muted">· {c.domain}</span>}
              </span>
              <button onClick={() => onPickExisting?.(c)}>Yes, use this</button>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="primary" onClick={() => void save(true)}>
            No, add as new company
          </button>
          <button onClick={() => setPossibleDupes(null)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="card form"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>{company ? 'Edit company' : 'Add company'}</h3>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </label>
      <label>
        Other names <span className="muted">(comma-separated)</span>
        <input value={aliases} onChange={(e) => setAliases(e.target.value)} />
      </label>
      <label>
        Website domain
        <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
      </label>
      <label>
        YC slug <span className="muted">(ycombinator.com/companies/…)</span>
        <input value={ycSlug} onChange={(e) => setYcSlug(e.target.value)} />
      </label>
      <div className="row">
        <label>
          Job board
          <select value={atsType} onChange={(e) => setAtsType(e.target.value as AtsType)}>
            {ATS_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grow">
          Board token
          <input value={atsToken} onChange={(e) => setAtsToken(e.target.value)} placeholder="acme" />
        </label>
      </div>
      <label>
        Visa sponsorship
        <select value={sponsorship} onChange={(e) => setSponsorship(e.target.value as Sponsorship)}>
          <option value="unknown">unknown</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit" className="primary">
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
