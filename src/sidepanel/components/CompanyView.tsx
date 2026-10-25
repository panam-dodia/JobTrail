import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db';
import { addNote, companyTimeline, deleteCompany, saveRole, updateCompany } from '../../db/repo';
import type { Application, Company, Outreach, Sponsorship } from '../../db/types';
import type { PageContext } from '../../lib/pageContext';
import type { PageFacts } from '../../lib/pageFacts';
import { glance } from '../../lib/timeline';
import { roleSource } from '../format';
import { CompanyForm } from './CompanyForm';
import { ApplicationForm, OutreachForm } from './LogForms';
import { Timeline } from './Timeline';

interface Props {
  company: Company;
  companies: Company[];
  ctx?: PageContext;
  facts?: PageFacts;
  onBack?: () => void;
  onDeleted: () => void;
}

type Panel = 'none' | 'application' | 'outreach' | 'edit';

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function CompanyView({ company, companies, ctx, facts, onBack, onDeleted }: Props) {
  const items = useLiveQuery(() => companyTimeline(company.id), [company.id]);
  const roles = useLiveQuery(() => db.roles.where('companyId').equals(company.id).reverse().sortBy('firstSeen'), [company.id]);
  const [panel, setPanel] = useState<Panel>('none');
  const outreach = (items ?? []).filter((i) => i.kind === 'outreach').map((i) => i.record as Outreach);
  const applications = (items ?? []).filter((i) => i.kind === 'application').map((i) => i.record as Application);
  const g = glance(outreach);
  const pageRole = ctx ? facts?.roleTitle : undefined;
  const pageRoleSaved = !pageRole || (roles ?? []).some((r) => r.url === ctx?.url || sameTitle(r.title, pageRole));
  const applied = (roleId: number, title: string) =>
    applications.some((a) => a.roleId === roleId || (a.roleTitle && sameTitle(a.roleTitle, title)));
  // Details on the page that this company is still missing. Never overwrites what's already set.
  const fill: Partial<Company> = {
    ...(facts?.sponsorship && company.sponsorship === 'unknown' && { sponsorship: facts.sponsorship }),
    ...(facts?.domain && !company.domain && { domain: facts.domain }),
    ...(facts?.ycSlug && !company.ycSlug && { ycSlug: facts.ycSlug }),
    ...(facts?.ats && !company.ats && { ats: facts.ats }),
  };
  const fillLabels = [
    fill.sponsorship && `visa sponsorship: ${fill.sponsorship}`,
    fill.domain && `website: ${fill.domain}`,
    fill.ycSlug && `YC slug: ${fill.ycSlug}`,
    fill.ats && `job board: ${fill.ats.type}/${fill.ats.token}`,
  ].filter(Boolean);

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
          <button className="link" onClick={onBack}>
            ← Back
          </button>
        )}
        <div className="row">
          <h2 className="grow">{company.name}</h2>
          <button onClick={() => setPanel('edit')}>Edit</button>
        </div>
        <p className="muted ids">
          {[company.domain, company.ycSlug && `YC: ${company.ycSlug}`, company.ats && `${company.ats.type}: ${company.ats.token}`]
            .filter(Boolean)
            .join(' · ') || 'No identifiers yet. Edit to add a domain, YC slug or job board.'}
        </p>
        <div className="row">
          <label className="inline">
            Sponsorship
            <select
              value={company.sponsorship}
              className={`sponsor-${company.sponsorship}`}
              onChange={(e) => updateCompany(company.id, { sponsorship: e.target.value as Sponsorship })}
            >
              <option value="unknown">unknown</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={company.watching}
              onChange={(e) => updateCompany(company.id, { watching: e.target.checked })}
            />
            Watching
          </label>
        </div>
        {company.watching && !company.ats && (
          <p className="muted small">Add a job board token to get new-role alerts for this company.</p>
        )}
      </header>

      {fillLabels.length > 0 && (
        <div className="ask-inline">
          <p>From this page: {fillLabels.join(', ')}</p>
          <div className="row">
            <button className="primary" onClick={() => updateCompany(company.id, fill)}>
              Fill in
            </button>
          </div>
        </div>
      )}

      <div className="glance">
        <span className={g.ycMessaged ? 'chip yes' : 'chip'}>YC message sent: {g.ycMessaged ? 'yes' : 'no'}</span>
        <span className={g.emailed ? 'chip yes' : 'chip'}>Emailed: {g.emailed ? 'yes' : 'no'}</span>
      </div>

      <QuickNote companyId={company.id} />

      {panel === 'none' && (
        <div className="row">
          <button className="primary" onClick={() => setPanel('application')}>
            + Application
          </button>
          <button className="primary" onClick={() => setPanel('outreach')}>
            + Outreach
          </button>
        </div>
      )}
      {panel === 'application' && (
        <ApplicationForm companyId={company.id} ctx={ctx} defaultRole={pageRole} onDone={() => setPanel('none')} />
      )}
      {panel === 'outreach' && <OutreachForm companyId={company.id} ctx={ctx} onDone={() => setPanel('none')} />}

      <section>
        <h3>Roles</h3>
        {ctx && pageRole && !pageRoleSaved && (
          <div className="ask-inline">
            <p>
              Role on this page: <strong>{pageRole}</strong>
            </p>
            <div className="row">
              <button
                className="primary"
                onClick={() => saveRole(company.id, { title: pageRole, url: ctx.url, source: roleSource(ctx) })}
              >
                Save role
              </button>
            </div>
          </div>
        )}
        {roles?.length ? (
          <ul className="roles">
            {roles.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.title}
                </a>
                {applied(r.id, r.title) && <span className="tag">applied</span>}
              </li>
            ))}
          </ul>
        ) : (
          !pageRole && <p className="muted">No roles saved yet.</p>
        )}
      </section>

      <section>
        <h3>History</h3>
        {items ? <Timeline items={items} /> : <p className="muted">Loading…</p>}
      </section>

      <DeleteCompany
        name={company.name}
        onDelete={async () => {
          await deleteCompany(company.id);
          onDeleted();
        }}
      />
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

function DeleteCompany({ name, onDelete }: { name: string; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <footer className="danger-zone">
      {confirming ? (
        <div className="row">
          <span className="grow">Delete {name} and all its history?</span>
          <button className="danger" onClick={onDelete}>
            Delete
          </button>
          <button onClick={() => setConfirming(false)}>Keep</button>
        </div>
      ) : (
        <button className="link subtle" onClick={() => setConfirming(true)}>
          Delete company…
        </button>
      )}
    </footer>
  );
}
