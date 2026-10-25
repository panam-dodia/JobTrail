import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db';
import { roleTitlesByCompany } from '../db/repo';
import { matchByPage } from '../lib/match';
import { parsePageContext } from '../lib/pageContext';
import { mergeFacts } from '../lib/pageFacts';
import { parseJobTitle } from '../lib/pageTitle';
import { CompanyForm } from './components/CompanyForm';
import { CompanyPicker } from './components/CompanyPicker';
import { CompanyView } from './components/CompanyView';
import { NoMatchView } from './components/NoMatchView';
import { useActiveTab } from './useActiveTab';
import { usePageFacts } from './usePageFacts';

type Tab = 'page' | 'companies';

export function App() {
  const tab = useActiveTab();
  const companies = useLiveQuery(() => db.companies.toArray(), []);
  const roles = useLiveQuery(() => roleTitlesByCompany(), []);
  const [view, setView] = useState<Tab>('page');
  /** A company opened explicitly (from a list), overriding the page match. */
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const scraped = usePageFacts(tab.id, tab.url, tab.title);

  // Navigating to another page goes back to that page's context.
  useEffect(() => {
    setOpenedId(null);
    setView('page');
  }, [tab.url]);

  if (!companies) return <main className="app muted">Loading…</main>;

  const fromTitle = parseJobTitle(tab.title);
  const facts = mergeFacts({ companyName: fromTitle.company, roleTitle: fromTitle.role }, scraped);
  const pageCtx = tab.url ? parsePageContext(tab.url) : undefined;
  // Identifiers read off the page (e.g. the YC slug on a WaaS job page) count for matching too.
  const ctx = pageCtx && { ...pageCtx, ycSlug: pageCtx.ycSlug ?? facts.ycSlug, ats: pageCtx.ats ?? facts.ats };
  const matched = ctx ? matchByPage(ctx, companies) : undefined;
  const opened = openedId !== null ? companies.find((c) => c.id === openedId) : undefined;

  const open = (id: number) => {
    setOpenedId(id);
    setAdding(false);
  };
  const back = () => setOpenedId(null);

  let content;
  if (opened) {
    content = (
      <CompanyView
        key={opened.id}
        company={opened}
        companies={companies}
        ctx={view === 'page' ? ctx : undefined}
        facts={view === 'page' ? facts : undefined}
        onBack={back}
        onDeleted={back}
      />
    );
  } else if (view === 'companies') {
    content = adding ? (
      <CompanyForm companies={companies} onDone={open} onPickExisting={(c) => open(c.id)} onCancel={() => setAdding(false)} />
    ) : (
      <div className="stack">
        <button className="primary" onClick={() => setAdding(true)}>
          + Add company
        </button>
        <CompanyPicker companies={companies} roles={roles} onPick={(c) => open(c.id)} />
      </div>
    );
  } else if (matched) {
    content = <CompanyView key={matched.id} company={matched} companies={companies} ctx={ctx} facts={facts} onDeleted={back} />;
  } else {
    content = <NoMatchView key={tab.url} ctx={ctx} facts={facts} tabTitle={tab.title} companies={companies} onOpenCompany={open} />;
  }

  return (
    <main className="app">
      <nav className="tabs">
        {(['page', 'companies'] as const).map((t) => (
          <button
            key={t}
            className={view === t && !opened ? 'active' : ''}
            onClick={() => {
              setView(t);
              setOpenedId(null);
              setAdding(false);
            }}
          >
            {t === 'page' ? 'This page' : `Companies (${companies.length})`}
          </button>
        ))}
      </nav>
      {content}
    </main>
  );
}
