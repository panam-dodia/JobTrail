import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState, type ReactNode } from 'react';
import { db } from '../../db';
import { addNote, companyTimeline, deleteCompany, saveRole, updateCompany } from '../../db/repo';
import type { Application, Company, Note, Outreach, Sponsorship } from '../../db/types';
import { displayName } from '../../lib/companyName';
import type { PageContext } from '../../lib/pageContext';
import type { PageFacts } from '../../lib/pageFacts';
import { isPersonKind, type PageKind } from '../../lib/pageKind';
import { PLATFORM_LABELS, fmtDate, roleSource } from '../format';
import { Activity } from './Activity';
import { CompanyForm } from './CompanyForm';
import { ApplicationForm, OutreachForm } from './LogForms';
import { PersonPanel } from './PersonPanel';

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
}

type Panel = 'none' | 'application' | 'outreach' | 'edit';

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function CompanyView({ company, companies, ctx, facts, matchedByPage, kind, onBack, onDeleted }: Props) {
  const items = useLiveQuery(() => companyTimeline(company.id), [company.id]);
  const roles = useLiveQuery(() => db.roles.where('companyId').equals(company.id).reverse().sortBy('firstSeen'), [company.id]);
  const [panel, setPanel] = useState<Panel>('none');
  const outreach = (items ?? []).filter((i) => i.kind === 'outreach').map((i) => i.record as Outreach);
  const applications = (items ?? []).filter((i) => i.kind === 'application').map((i) => i.record as Application);
  const notes = (items ?? []).filter((i) => i.kind === 'note').map((i) => i.record as Note);
  const pageRole = ctx ? facts?.roleTitle : undefined;
  const pageRoleSaved = !pageRole || (roles ?? []).some((r) => r.url === ctx?.url || sameTitle(r.title, pageRole));
  const applied = (roleId: number, title: string) =>
    applications.some((a) => a.roleId === roleId || (a.roleTitle && sameTitle(a.roleTitle, title)));
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
          <button className="btn-ghost btn-sm" onClick={() => setPanel('edit')}>
            Edit
          </button>
        </div>
        <div className="meta-row">
          {company.location && <span className="meta">{company.location}</span>}
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

      {panel === 'none' && (
        <DeleteBar
          name={company.name}
          onDelete={async () => {
            await deleteCompany(company.id);
            onDeleted();
          }}
        >
          <button onClick={() => setPanel('application')}>+ Application</button>
          <button onClick={() => setPanel('outreach')}>+ Outreach</button>
        </DeleteBar>
      )}
      {panel === 'application' && (
        <ApplicationForm companyId={company.id} ctx={ctx} defaultRole={pageRole} onDone={() => setPanel('none')} />
      )}
      {panel === 'outreach' && <OutreachForm companyId={company.id} ctx={ctx} onDone={() => setPanel('none')} />}

      {fillLabels.length > 0 && (
        <div className="callout">
          <p className="grow">From this page: {fillLabels.join(', ')}</p>
          <button className="primary btn-sm" onClick={() => updateCompany(company.id, fill)}>
            Fill in
          </button>
        </div>
      )}

      {person && <PersonPanel facts={person} ctx={ctx} companies={companies} company={company} onLogged={() => undefined} />}

      <Activity outreach={outreach} applications={applications} roles={roles ?? []} />

      <section className="section">
        <h3 className="section-title">Roles</h3>
        {ctx && pageRole && !pageRoleSaved && (
          <div className="callout">
            <p className="grow">
              On this page: <strong>{pageRole}</strong>
            </p>
            <button
              className="primary btn-sm"
              onClick={() => saveRole(company.id, { title: pageRole, url: ctx.url, source: roleSource(ctx) })}
            >
              Save role
            </button>
          </div>
        )}
        {roles?.length ? (
          <ul className="list">
            {roles.map((r) => (
              <li key={r.id} className="list-row">
                {r.url ? (
                  <a className="grow" href={r.url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>
                ) : (
                  <span className="grow">{r.title}</span>
                )}
                {applied(r.id, r.title) && <span className="tag tag-green">Applied</span>}
                <span className="muted small">{PLATFORM_LABELS[r.source]}</span>
              </li>
            ))}
          </ul>
        ) : (
          !pageRole && <p className="empty">No roles saved yet.</p>
        )}
      </section>

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

/** The page's actions, with a Delete that asks before removing the company and everything logged for it. */
function DeleteBar({ name, onDelete, children }: { name: string; onDelete: () => void; children: ReactNode }) {
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
      {children}
      <button className="btn-ghost danger-text" onClick={() => setConfirming(true)}>
        Delete
      </button>
    </div>
  );
}
