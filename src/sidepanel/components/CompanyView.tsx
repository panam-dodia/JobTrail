import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../../db';
import { addNote, companyTimeline, deleteCompany, updateCompany } from '../../db/repo';
import type { Application, Company, Note, Outreach, Sponsorship } from '../../db/types';
import { displayName } from '../../lib/companyName';
import type { PageContext } from '../../lib/pageContext';
import type { PageFacts } from '../../lib/pageFacts';
import { isPersonKind, type PageKind } from '../../lib/pageKind';
import { fmtDate } from '../format';
import { Activity } from './Activity';
import { CompanyForm } from './CompanyForm';
import { PersonPanel } from './PersonPanel';
import { Roles } from './Roles';

interface Props {
  company: Company;
  companies: Company[];
  ctx?: PageContext;
  facts?: PageFacts;
  /**
   * The page matched this company, so its hidden identifiers (website, YC slug, job board) are
   * quietly completed from the page. Off when the company was opened by hand from a list.
   */
  matchedByPage?: boolean;
  /** On a profile, message thread or email, the person is shown with a ready-to-log outreach form. */
  kind?: PageKind;
  onBack?: () => void;
  onDeleted: () => void;
  /** Opens this company in the Companies tab, where everything about it can be edited. */
  onEditInCompanies?: () => void;
}

type Panel = 'none' | 'edit';

export function CompanyView({ company, companies, ctx, facts, matchedByPage, kind, onBack, onDeleted, onEditInCompanies }: Props) {
  const items = useLiveQuery(() => companyTimeline(company.id), [company.id]);
  const roles = useLiveQuery(() => db.roles.where('companyId').equals(company.id).reverse().sortBy('firstSeen'), [company.id]);
  const [panel, setPanel] = useState<Panel>('none');
  const outreach = (items ?? []).filter((i) => i.kind === 'outreach').map((i) => i.record as Outreach);
  const applications = (items ?? []).filter((i) => i.kind === 'application').map((i) => i.record as Application);
  const notes = (items ?? []).filter((i) => i.kind === 'note').map((i) => i.record as Note);
  const pageRole = ctx ? facts?.roleTitle : undefined;
  const pageRoles = [
    ...(ctx && pageRole ? [{ title: pageRole, url: ctx.url }] : []),
    ...(ctx && kind === 'company' ? (facts?.listedRoles ?? []) : []),
  ];
  // On the page's own company, details are only filled in here; editing happens in the Companies tab.
  const compact = !!matchedByPage;
  // Details on the page that this company is still missing. Never overwrites what's already set.
  const fill: Partial<Company> = {
    ...(facts?.sponsorship && company.sponsorship === 'unknown' && { sponsorship: facts.sponsorship }),
    // On a profile the location is the person's, not the company's.
    ...(facts?.location && !company.location && !(kind && isPersonKind(kind)) && { location: facts.location }),
  };
  const fillLabels = [
    fill.sponsorship && `visa sponsorship: ${fill.sponsorship}`,
    fill.location && `location: ${fill.location}`,
  ].filter(Boolean);

  // Identifiers aren't shown, so there's nothing to confirm; only blanks are filled.
  const hidden: Partial<Company> = matchedByPage
    ? {
        ...(facts?.domain && !company.domain && { domain: facts.domain }),
        ...(ctx?.ycSlug && !company.ycSlug && { ycSlug: ctx.ycSlug }),
        ...(ctx?.ats && !company.ats && { ats: ctx.ats }),
      }
    : {};
  const hiddenKey = JSON.stringify(hidden);
  useEffect(() => {
    if (hiddenKey !== '{}') void updateCompany(company.id, JSON.parse(hiddenKey) as Partial<Company>);
  }, [company.id, hiddenKey]);

  const person = kind && isPersonKind(kind) && facts?.personName ? facts : undefined;

  if (panel === 'edit') {
    return (
      <CompanyForm
        companies={companies}
        company={company}
        onDone={() => setPanel('none')}
        onCancel={() => setPanel('none')}
      />
    );
  }

  return (
    <div className="stack">
      <header className="company-header">
        {onBack && (
          <button className="link back" onClick={onBack}>
            ← Back
          </button>
        )}
        <div className="title-row">
          <h2>{displayName(company)}</h2>
          {!compact && (
            <button className="btn-ghost btn-sm" onClick={() => setPanel('edit')}>
              Edit
            </button>
          )}
        </div>
        <div className="meta-row">
          {company.location && <span className="meta">{company.location}</span>}
          {compact ? (
            company.sponsorship !== 'unknown' && (
              <span className={`meta pill-static sponsor-${company.sponsorship}`}>
                {company.sponsorship === 'yes' ? 'Sponsors visas' : 'No sponsorship'}
              </span>
            )
          ) : (
          <label className="meta">
            Visa
            <select
              value={company.sponsorship}
              className={`pill sponsor-${company.sponsorship}`}
              onChange={(e) => updateCompany(company.id, { sponsorship: e.target.value as Sponsorship })}
            >
              <option value="unknown">Unknown</option>
              <option value="yes">Sponsors</option>
              <option value="no">No sponsorship</option>
            </select>
          </label>
          )}
          <label className="meta">
            <input
              type="checkbox"
              checked={company.watching}
              onChange={(e) => updateCompany(company.id, { watching: e.target.checked })}
            />
            Watching
          </label>
        </div>
        {company.watching && !company.ats && (
          <p className="hint">New-role alerts start once JobTrail has seen this company's job board (visit their careers page).</p>
        )}
      </header>

      {!compact && (
        <DeleteBar
          name={company.name}
          onDelete={async () => {
            await deleteCompany(company.id);
            onDeleted();
          }}
        />
      )}

      {compact && (
        <MissingDetails key={company.id} company={company} suggested={fill} onEditInCompanies={onEditInCompanies} />
      )}
      {!compact && fillLabels.length > 0 && (
        <div className="callout">
          <p className="grow">From this page: {fillLabels.join(', ')}</p>
          <button className="primary btn-sm" onClick={() => updateCompany(company.id, fill)}>
            Fill in
          </button>
        </div>
      )}

      {person && <PersonPanel facts={person} ctx={ctx} companies={companies} company={company} onLogged={() => undefined} />}

      <Activity
        companyId={company.id}
        outreach={outreach}
        applications={applications}
        roles={roles ?? []}
        ctx={ctx}
        pageRole={pageRole}
      />

      <Roles companyId={company.id} roles={roles ?? []} applications={applications} ctx={ctx} pageRoles={pageRoles} />

      <section className="section">
        <h3 className="section-title">Notes</h3>
        <QuickNote companyId={company.id} />
        {notes.length > 0 && (
          <ul className="list">
            {notes.map((n) => (
              <li key={n.id} className="list-row note">
                <span className="grow">{n.text}</span>
                <span className="muted small">{fmtDate(n.createdAt)}</span>
                <button className="icon-btn" aria-label="Delete note" title="Delete" onClick={() => db.notes.delete(n.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuickNote({ companyId }: { companyId: number }) {
  const [text, setText] = useState('');
  const save = async () => {
    if (!text.trim()) return;
    await addNote(companyId, text);
    setText('');
  };
  return (
    <form
      className="quick-note"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <textarea
        value={text}
        rows={2}
        placeholder="Quick note… (Ctrl+Enter to save)"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            void save();
          }
        }}
      />
      <button type="submit" disabled={!text.trim()}>
        Add note
      </button>
    </form>
  );
}

/** Delete, which asks before removing the company and everything logged for it. */
function DeleteBar({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="toolbar confirm-bar">
        <span className="grow">Delete {name} and everything logged for it?</span>
        <button className="danger btn-sm" onClick={onDelete}>
          Delete
        </button>
        <button className="btn-sm" onClick={() => setConfirming(false)}>
          Keep
        </button>
      </div>
    );
  }
  return (
    <div className="toolbar">
      <button className="btn-ghost danger-text" onClick={() => setConfirming(true)}>
        Delete company
      </button>
    </div>
  );
}

/**
 * The company details still blank (location, visa), filled from the page where it can, to save here.
 * Once none are blank, says so and points to the Companies tab for edits.
 */
function MissingDetails({ company, suggested, onEditInCompanies }: { company: Company; suggested: Partial<Company>; onEditInCompanies?: () => void }) {
  const needsLocation = !company.location;
  const needsVisa = company.sponsorship === 'unknown';
  const [location, setLocation] = useState(suggested.location ?? '');
  const [visa, setVisa] = useState<Sponsorship>(suggested.sponsorship ?? 'unknown');
  // Follow the page until typed in, like the other forms.
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched) return;
    if (suggested.location) setLocation(suggested.location);
    if (suggested.sponsorship) setVisa(suggested.sponsorship);
  }, [suggested.location, suggested.sponsorship, touched]);

  if (!needsLocation && !needsVisa) {
    return (
      <p className="all-saved">
        <span className="ok">✓</span>
        <span className="grow">All details saved.</span>
        {onEditInCompanies && (
          <button className="link small" onClick={onEditInCompanies}>
            Edit in Companies →
          </button>
        )}
      </p>
    );
  }
  const changes: Partial<Company> = {
    ...(needsLocation && location.trim() && { location: location.trim() }),
    ...(needsVisa && visa !== 'unknown' && { sponsorship: visa }),
  };
  return (
    <form
      className="missing form"
      onSubmit={(e) => {
        e.preventDefault();
        void updateCompany(company.id, changes);
      }}
    >
      <p className="small muted">Missing details{Object.keys(suggested).length ? ', filled from this page where possible' : ''}:</p>
      <div className="row">
        {needsLocation && (
          <label className="grow">
            Location
            <input
              value={location}
              onChange={(e) => {
                setTouched(true);
                setLocation(e.target.value);
              }}
              placeholder="San Francisco, CA"
            />
          </label>
        )}
        {needsVisa && (
          <label className="grow">
            Visa
            <select
              value={visa}
              onChange={(e) => {
                setTouched(true);
                setVisa(e.target.value as Sponsorship);
              }}
            >
              <option value="unknown">Unknown</option>
              <option value="yes">Sponsors</option>
              <option value="no">No sponsorship</option>
            </select>
          </label>
        )}
      </div>
      <div className="row">
        <button type="submit" className="primary btn-sm" disabled={!Object.keys(changes).length}>
          Save details
        </button>
      </div>
    </form>
  );
}
