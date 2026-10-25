import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { linkPageToCompany, pageIdentifiers, recentActivity, unseenEvents } from '../../db/repo';
import type { Company } from '../../db/types';
import type { PageContext } from '../../lib/pageContext';
import { guessCompanyName } from '../format';
import { CompanyForm } from './CompanyForm';
import { CompanyPicker } from './CompanyPicker';
import { Timeline } from './Timeline';

interface Props {
  ctx?: PageContext;
  tabTitle?: string;
  companies: Company[];
  onOpenCompany: (id: number) => void;
}

type Mode = 'idle' | 'pick' | 'add';

export function NoMatchView({ ctx, tabTitle, companies, onOpenCompany }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [notice, setNotice] = useState<{ text: string; companyId: number } | null>(null);
  const recent = useLiveQuery(() => recentActivity(20), []);
  const unseen = useLiveQuery(() => unseenEvents(), []);
  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const hasIds = ctx ? Object.keys(pageIdentifiers(ctx)).length > 0 : false;

  async function chooseExisting(company: Company) {
    setMode('idle');
    if (ctx && hasIds) {
      const { conflicts } = await linkPageToCompany(company.id, ctx);
      if (conflicts.length) {
        // Stay here so the user sees why this page won't match next time.
        return setNotice({
          text: `${company.name} already has a different ${conflicts.join(', ')}, so this page wasn't linked. Edit the company to change it.`,
          companyId: company.id,
        });
      }
    }
    onOpenCompany(company.id);
  }

  return (
    <div className="stack">
      {ctx && (
        <section className="card">
          <p className="muted small">This page</p>
          <p className="host">{ctx.host}</p>
          {mode === 'idle' && (
            <>
              <p className="small">
                {hasIds
                  ? 'Not linked to a company yet.'
                  : "Pages on this site can't be matched automatically yet. Pick the company to log against it."}
              </p>
              <div className="row">
                <button className="primary" onClick={() => setMode('add')}>
                  Log this: new company
                </button>
                {companies.length > 0 && <button onClick={() => setMode('pick')}>Existing company…</button>}
              </div>
            </>
          )}
          {mode === 'pick' && (
            <>
              <CompanyPicker companies={companies} onPick={(c) => void chooseExisting(c)} />
              <button onClick={() => setMode('idle')}>Cancel</button>
            </>
          )}
        </section>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice.text}{' '}
          <button className="link" onClick={() => onOpenCompany(notice.companyId)}>
            Open company
          </button>{' '}
          <button className="link" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </p>
      )}
      {mode === 'add' && (
        <CompanyForm
          companies={companies}
          initial={{ name: guessCompanyName(ctx, tabTitle), ...(ctx ? pageIdentifiers(ctx) : {}) }}
          onDone={(id) => {
            setMode('idle');
            onOpenCompany(id);
          }}
          onPickExisting={(c) => void chooseExisting(c)}
          onCancel={() => setMode('idle')}
        />
      )}

      {!!unseen?.length && (
        <section>
          <h3>New roles</h3>
          <Timeline items={unseen} companiesById={companiesById} onOpenCompany={onOpenCompany} />
        </section>
      )}
      <section>
        <h3>Recent activity</h3>
        {recent ? (
          <Timeline items={recent} companiesById={companiesById} onOpenCompany={onOpenCompany} empty="Nothing logged yet." />
        ) : (
          <p className="muted">Loading…</p>
        )}
      </section>
    </div>
  );
}
