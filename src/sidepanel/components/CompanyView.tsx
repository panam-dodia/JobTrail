import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { addNote, companyTimeline, deleteCompany, updateCompany } from '../../db/repo';
import type { Company, Outreach, Sponsorship } from '../../db/types';
import type { PageContext } from '../../lib/pageContext';
import { glance } from '../../lib/timeline';
import { CompanyForm } from './CompanyForm';
import { ApplicationForm, OutreachForm } from './LogForms';
import { Timeline } from './Timeline';

interface Props {
  company: Company;
  companies: Company[];
  ctx?: PageContext;
  onBack?: () => void;
  onDeleted: () => void;
}

type Panel = 'none' | 'application' | 'outreach' | 'edit';

export function CompanyView({ company, companies, ctx, onBack, onDeleted }: Props) {
  const items = useLiveQuery(() => companyTimeline(company.id), [company.id]);
  const [panel, setPanel] = useState<Panel>('none');
  const outreach = (items ?? []).filter((i) => i.kind === 'outreach').map((i) => i.record as Outreach);
  const g = glance(outreach);

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
      {panel === 'application' && <ApplicationForm companyId={company.id} ctx={ctx} onDone={() => setPanel('none')} />}
      {panel === 'outreach' && <OutreachForm companyId={company.id} ctx={ctx} onDone={() => setPanel('none')} />}

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
