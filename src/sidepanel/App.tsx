import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db';
import { deleteCompany, roleTitlesByCompany } from '../db/repo';
import { matchByPage } from '../lib/match';
import { parsePageContext } from '../lib/pageContext';
import { mergeFacts } from '../lib/pageFacts';
import { detectPageKind, PAGE_KIND_LABELS } from '../lib/pageKind';
import { parseJobTitle } from '../lib/pageTitle';
import { CompanyForm } from './components/CompanyForm';
import { CompanyPicker } from './components/CompanyPicker';
import { CompanyView } from './components/CompanyView';
import { NoMatchView } from './components/NoMatchView';
import { RepairBanner } from './components/RepairBanner';
import { defaultPlatform, PLATFORM_LABELS } from './format';
import { useActiveTab } from './useActiveTab';
import { ANY_SITE, usePageFacts } from './usePageFacts';
import { useAtsJob } from './useAtsJob';

type Tab = 'page' | 'companies';

export function App() {
  const tab = useActiveTab();
  const companies = useLiveQuery(() => db.companies.toArray(), []);
  const roles = useLiveQuery(() => roleTitlesByCompany(), []);
  const [view, setView] = useState<Tab>('page');
  /** A company opened explicitly (from a list), overriding the page match. */
  const [openedId, setOpenedId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const readAnySite = useReadAnySite();
  const scraped = usePageFacts(tab.id, tab.url, tab.title, readAnySite);
  const pageCtx = tab.url ? parsePageContext(tab.url) : undefined;
  const fromBoard = useAtsJob(tab.url, scraped?.ats?.token ?? pageCtx?.ats?.token, pageCtx?.domain);

  // Navigating to another page goes back to that page's context.
  useEffect(() => {
    setOpenedId(null);
    setView('page');
  }, [tab.url]);

  if (!companies) return <main className="app muted">Loading…</main>;

  const fromTitle = parseJobTitle(tab.title, detectPageKind(pageCtx) === 'job');
  // Weakest first: the tab title, then what the page itself says, then the job board's own record.
  const facts = mergeFacts({ companyName: fromTitle.company, roleTitle: fromTitle.role, location: fromTitle.location }, scraped, fromBoard);
  // Identifiers read off the page (e.g. the YC slug on a WaaS job page) count for matching too.
  // In Gmail, the other person's work email domain says which company it is.
  const ctx = pageCtx && {
    ...pageCtx,
    ycSlug: pageCtx.ycSlug ?? facts.ycSlug,
    ats: pageCtx.ats ?? facts.ats,
    domain: pageCtx.domain ?? (pageCtx.site === 'gmail' ? facts.domain : undefined),
  };
  const kind = detectPageKind(ctx);
  const platform = defaultPlatform(ctx);
  // "Job page · Gem"; profile and email labels already say where they are.
  const kindLabel =
    PAGE_KIND_LABELS[kind] + (kind === 'profile' || kind === 'email' || platform === 'other' ? '' : ` · ${PLATFORM_LABELS[platform]}`);
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
        kind={view === 'page' ? kind : undefined}
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
        <RepairBanner />
        <CompanyPicker companies={companies} roles={roles} onPick={(c) => open(c.id)} onDelete={(c) => void deleteCompany(c.id)} />
      </div>
    );
  } else if (matched) {
    content = (
      <CompanyView
        key={matched.id}
        company={matched}
        companies={companies}
        ctx={ctx}
        facts={facts}
        kind={kind}
        matchedByPage
        onDeleted={back}
        onEditInCompanies={() => {
          setView('companies');
          open(matched.id);
        }}
      />
    );
  } else {
    content = <NoMatchView key={tab.url} ctx={ctx} facts={facts} kind={kind} tabTitle={tab.title} companies={companies} onOpenCompany={open} />;
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
      {ctx && view === 'page' && <p className="page-kind">{kindLabel}</p>}
      {ctx?.site === 'other' && kind !== 'other' && view === 'page' && !readAnySite && !opened && (
        <div className="callout">
          <p className="grow">Let JobTrail read job details on company career sites? Only the page you're on, only while this panel is open.</p>
          <button className="primary btn-sm" onClick={() => void chrome.permissions.request({ origins: ANY_SITE })}>
            Allow
          </button>
        </div>
      )}
      {content}
    </main>
  );
}

/** Whether the user allowed reading company career sites (an optional permission). */
function useReadAnySite(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const check = () => void chrome.permissions.contains({ origins: ANY_SITE }).then(setAllowed, () => setAllowed(false));
    check();
    chrome.permissions.onAdded.addListener(check);
    chrome.permissions.onRemoved.addListener(check);
    return () => {
      chrome.permissions.onAdded.removeListener(check);
      chrome.permissions.onRemoved.removeListener(check);
    };
  }, []);
  return allowed;
}
