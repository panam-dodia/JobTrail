import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { linkPageToCompany, pageIdentifiers, saveRole, unseenEvents } from '../../db/repo';
import type { Company } from '../../db/types';
import { matchByName } from '../../lib/match';
import type { PageContext } from '../../lib/pageContext';
import type { PageFacts } from '../../lib/pageFacts';
import { isPersonKind, type PageKind } from '../../lib/pageKind';
import { guessCompanyName, roleSource } from '../format';
import { CompanyForm, type PageRole } from './CompanyForm';
import { CompanyPicker } from './CompanyPicker';
import { PersonPanel } from './PersonPanel';
import { RepairBanner } from './RepairBanner';
import { Timeline } from './Timeline';

interface Props {
  ctx?: PageContext;
  facts: PageFacts;
  kind: PageKind;
  tabTitle?: string;
  companies: Company[];
  onOpenCompany: (id: number) => void;
}

type Mode = 'idle' | 'pick';

export function NoMatchView({ ctx, facts, kind, tabTitle, companies, onOpenCompany }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [notice, setNotice] = useState<{ text: string; companyId: number } | null>(null);
  const unseen = useLiveQuery(() => unseenEvents(), []);
  const companiesById = new Map(companies.map((c) => [c.id, c]));
  const hasIds = ctx ? Object.keys(pageIdentifiers(ctx)).length > 0 : false;
  const guess = { company: facts.companyName, role: facts.roleTitle };
  const byName = guess.company ? matchByName(guess.company, companies) : { exact: [], candidates: [] };
  const suggestions = [...byName.exact, ...byName.candidates];

  // On a profile, message thread or email, the person is what gets logged.
  const personPage = isPersonKind(kind);
  const source = roleSource(ctx);
  const pageRole = guess.role ? { title: guess.role, source } : undefined;

  /** Files the role from this page under the company. */
  async function rememberRole(companyId: number, role?: PageRole) {
    if (ctx && role) await saveRole(companyId, { ...role, url: ctx.url });
  }

  async function chooseExisting(company: Company, role = pageRole) {
    setMode('idle');
    await rememberRole(company.id, role);
    if (ctx && hasIds) {
      const { conflicts } = await linkPageToCompany(company.id, ctx);
      if (conflicts.length) {
        // Stay here so the user sees why this page won't match next time.
        return setNotice({
          text: `${company.name} already has a different ${conflicts.join(', ')}, so this page wasn't linked to it.`,
          companyId: company.id,
        });
      }
    }
    onOpenCompany(company.id);
  }

  return (
    <div className="stack">
      <RepairBanner />
      {ctx && personPage &&
        (facts.personName ? (
          <PersonPanel facts={facts} ctx={ctx} companies={companies} onLogged={onOpenCompany} onOpenCompany={onOpenCompany} />
        ) : (
          <section className="card">
            <p className="muted small">
              {kind === 'email' ? 'Open an email or draft to log outreach.' : 'Open a profile or conversation to log outreach.'}
            </p>
          </section>
        ))}
      {ctx && !personPage && (
        <section className="card">
          <p className="muted small">This page</p>
          <p className="host">{ctx.host}</p>
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
              <p className="muted small">
                {hasIds
                  ? 'Not linked to a company yet. Check the details and log it, or pick a company you already track.'
                  : "Pages on this site can't be matched automatically yet. Check the details and log it, or pick a company you already track."}
              </p>
              <CompanyForm
                embedded
                title="Details from this page"
                submitLabel="Log this"
                companies={companies}
                role={guess.role ?? ''}
                source={source}
                initial={{
                  // A tab title like "Feed | LinkedIn" is no company name; only guess when the page names one.
                  name: facts.companyName ?? (hasIds || ctx.domain ? guessCompanyName(ctx, tabTitle) : ''),
                  ...pageIdentifiers(ctx),
                  ...(facts.domain && { domain: facts.domain }),
                  ...(facts.location && { location: facts.location }),
                  ...(facts.sponsorship && { sponsorship: facts.sponsorship }),
                }}
                actions={companies.length > 0 && <button type="button" onClick={() => setMode('pick')}>Existing company…</button>}
                onDone={async (id, role) => {
                  await rememberRole(id, role);
                  onOpenCompany(id);
                }}
                onPickExisting={(c, role) => void chooseExisting(c, role)}
              />
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

      {!!unseen?.length && (
        <section className="section">
          <h3 className="section-title">New roles</h3>
          <Timeline items={unseen} companiesById={companiesById} onOpenCompany={onOpenCompany} />
        </section>
      )}
    </div>
  );
}
