import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createCompany, updateCompany } from '../../db/repo';
import { ROLE_SOURCES, type Company, type RoleSource, type Sponsorship } from '../../db/types';
import { displayName, splitNames } from '../../lib/companyName';
import { matchByName } from '../../lib/match';
import { normalizeDomain } from '../../lib/normalize';
import { PLATFORM_LABELS } from '../format';

/** The role on the page and where it was found. */
export interface PageRole {
  title: string;
  source: RoleSource;
}

interface Props {
  companies: Company[];
  /** Present when editing; absent when adding. */
  company?: Company;
  /**
   * Prefill for a new company. May change while the form is open (page facts arrive late); blanks get filled.
   * Its domain, YC slug and job board aren't shown but are saved with the company, for matching pages later.
   */
  initial?: Partial<Company>;
  /** Shows role and platform fields, prefilled with these; the result goes to onDone/onPickExisting. */
  role?: string;
  source?: RoleSource;
  title?: string;
  submitLabel?: string;
  /** Renders without its own card, for use inside another card. */
  embedded?: boolean;
  /** Extra buttons next to Save. */
  actions?: ReactNode;
  onDone: (companyId: number, role?: PageRole) => void;
  /** Called when the user says the new company is one they already track. */
  onPickExisting?: (company: Company, role?: PageRole) => void;
  onCancel?: () => void;
}

export function CompanyForm(props: Props) {
  const { companies, company, initial, role, source, title, submitLabel, embedded, actions, onDone, onPickExisting, onCancel } = props;
  const base = company ?? initial ?? {};
  const [name, setName] = useState(base.name ? displayName({ name: base.name, aliases: base.aliases ?? [] }) : '');
  const [location, setLocation] = useState(base.location ?? '');
  const [sponsorship, setSponsorship] = useState<Sponsorship>(base.sponsorship ?? 'unknown');
  const [roleTitle, setRoleTitle] = useState(role ?? '');
  const [platform, setPlatform] = useState<RoleSource>(source ?? 'careers_page');
  const pageRole = (): PageRole | undefined => (roleTitle.trim() ? { title: roleTitle.trim(), source: platform } : undefined);
  const [possibleDupes, setPossibleDupes] = useState<Company[] | null>(null);
  const [error, setError] = useState('');

  // Fields follow the page as its facts come in or change (e.g. picking another job in LinkedIn's
  // list), until the user types in them.
  const touched = useRef(new Set<string>());
  const typed = <T,>(field: string, set: (v: T) => void) => (v: T) => {
    touched.current.add(field);
    set(v);
  };
  const live = company ? '' : JSON.stringify([initial, role, source]);
  useEffect(() => {
    if (!live || !initial) return;
    const follow = <T,>(field: string, set: (v: T) => void, v: T | undefined) => {
      if (v && !touched.current.has(field)) set(v);
    };
    follow('name', setName, initial.name);
    follow('location', setLocation, initial.location);
    follow('role', setRoleTitle, role);
    follow('sponsorship', setSponsorship, initial.sponsorship);
    follow('platform', setPlatform, source);
    // Only re-run when the prefill itself changes.
  }, [live]);

  async function save(skipDupeCheck = false) {
    const names = splitNames(name);
    if (!names) return setError('Name is required.');

    if (!company && !skipDupeCheck) {
      const { exact, candidates } = matchByName(names.name, companies);
      if (exact.length || candidates.length) return setPossibleDupes([...exact, ...candidates]);
    }

    const fields = { ...names, location: location.trim() || undefined, sponsorship };
    if (company) {
      // Hidden identifiers are left as they are.
      await updateCompany(company.id, fields);
      onDone(company.id);
    } else {
      const id = await createCompany({
        ...fields,
        domain: initial?.domain ? normalizeDomain(initial.domain) : undefined,
        ycSlug: initial?.ycSlug,
        ats: initial?.ats,
      });
      onDone(id, pageRole());
    }
  }

  if (possibleDupes) {
    return (
      <div className="card ask">
        <p>
          <strong>Is “{splitNames(name)?.name}” one of these?</strong>
        </p>
        <ul className="plain">
          {possibleDupes.map((c) => (
            <li key={c.id} className="row">
              <span>
                {displayName(c)} {c.location && <span className="muted">· {c.location}</span>}
              </span>
              <button onClick={() => onPickExisting?.(c, pageRole())}>Yes, use this</button>
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
      className={embedded ? 'form' : 'card form'}
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h3>{title ?? (company ? 'Edit company' : 'Add company')}</h3>
      <label>
        Name <span className="muted">(other names after a slash: abc / abc labs)</span>
        <input value={name} onChange={(e) => typed('name', setName)(e.target.value)} autoFocus={!embedded} />
      </label>
      {role !== undefined && (
        <label>
          Role
          <input value={roleTitle} onChange={(e) => typed('role', setRoleTitle)(e.target.value)} placeholder="Optional" />
        </label>
      )}
      {role !== undefined && (
        <label>
          Platform <span className="muted">(where you found it)</span>
          <select value={platform} onChange={(e) => typed('platform', setPlatform)(e.target.value as RoleSource)}>
            {ROLE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {PLATFORM_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Location
        <input value={location} onChange={(e) => typed('location', setLocation)(e.target.value)} placeholder="San Francisco, CA / Remote" />
      </label>
      <label>
        Visa sponsorship
        <select value={sponsorship} onChange={(e) => typed('sponsorship', setSponsorship)(e.target.value as Sponsorship)}>
          <option value="unknown">unknown</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button type="submit" className="primary">
          {submitLabel ?? 'Save'}
        </button>
        {actions}
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
