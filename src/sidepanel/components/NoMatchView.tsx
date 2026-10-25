import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { linkPageToCompany, pageIdentifiers, recentActivity, saveRole, unseenEvents } from '../../db/repo';
import type { Company } from '../../db/types';
import { matchByName } from '../../lib/match';
import type { PageContext } from '../../lib/pageContext';
import type { PageFacts } from '../../lib/pageFacts';
import { guessCompanyName, roleSource } from '../format';
import { CompanyForm } from './CompanyForm';
import { CompanyPicker } from './CompanyPicker';
import { Timeline } from './Timeline';

interface Props {
  ctx?: PageContext;
  facts: PageFacts;
  tabTitle?: string;
  companies: Company[];
  onOpenCompany: (id: number) => void;
}

type Mode = 'idle' | 'pick' | 'add';

export function NoMatchView({ ctx, facts, tabTitle, companies, onOpenCompany }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [notice, setNotice] = useState<{ text: string; companyId: number } | null>(null);
  const recent = useLiveQuery(() => recentActivity(20), []);
  const unseen = useLiveQuery(() => unseenEvents(), []);
  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const hasIds = ctx ? Object.keys(pageIdentifiers(ctx)).length > 0 : false;
  const guess = { company: facts.companyName, role: facts.roleTitle };
  const byName = guess.company ? matchByName(guess.company, companies) : { exact: [], candidates: [] };
  const suggestions = [...byName.exact, ...byName.candidates];

  /** Files the role from this page's title under the company. */
  async function rememberRole(companyId: number) {
    if (ctx && guess.role) await saveRole(companyId, { title: guess.role, url: ctx.url, source: roleSource(ctx) });
  }

  async function chooseExisting(company: Company) {
    setMode('idle');
    await rememberRole(company.id);
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
          {guess.role && (
            <p>
              Role: <strong>{guess.role}</strong>
            </p>
          )}
          {mode === 'idle' && suggestions.length > 0 && (
            <div className="ask-inline">
              <p>
                This looks like <strong>{guess.company}</strong>. Is it one you're tracking?
              </p>
              <div className="row">
                {suggestions.map((c) => (
                  <button key={c.id} className="primary" onClick={() => void chooseExisting(c)}>
                    Yes, {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
          initial={{
            name: facts.companyName ?? guessCompanyName(ctx, tabTitle),
            ...(ctx ? pageIdentifiers(ctx) : {}),
            ...(facts.domain && { domain: facts.domain }),
            ...(facts.sponsorship && { sponsorship: facts.sponsorship }),
          }}
          onDone={async (id) => {
            setMode('idle');
            await rememberRole(id);
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
