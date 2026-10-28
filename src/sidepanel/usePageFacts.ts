import { useEffect, useState } from 'react';
import { matchesPattern } from '../lib/matchPattern';
import { parsePageContext } from '../lib/pageContext';
import { PAGE_CHANGED_MESSAGE, PAGE_FACTS_MESSAGE, type PageFacts } from '../lib/pageFacts';
import { readCompanySite } from './readCompanySite';

const RETRIES = 4;
const RETRY_MS = 700;
/** Company career sites, readable only after the user allows it (an optional permission). */
export const ANY_SITE = ['https://*/*'];

/**
 * Asks the tab's reader what it can read off the page, starting it in tabs opened before the
 * extension loaded. Company sites are read from the side panel once allowed.
 * Facts always belong to the current page: nothing carries over from the tab before.
 */
export function usePageFacts(tabId?: number, url?: string, title?: string, readAnySite = false): PageFacts | undefined {
  const key = `${tabId} ${url}`;
  const [state, setState] = useState<{ key: string; facts: PageFacts }>();
  // Bumped when this tab's reader says the page changed in place; reading starts over.
  const [changes, setChanges] = useState(0);

  useEffect(() => {
    const onChanged = (msg: unknown, sender: chrome.runtime.MessageSender) => {
      if ((msg as { type?: string } | null)?.type === PAGE_CHANGED_MESSAGE && sender.tab?.id === tabId) setChanges((n) => n + 1);
    };
    chrome.runtime.onMessage.addListener(onChanged);
    return () => chrome.runtime.onMessage.removeListener(onChanged);
  }, [tabId]);

  useEffect(() => {
    if (tabId === undefined || !url?.startsWith('http')) return;
    const companySite = parsePageContext(url)?.site === 'other';
    if (companySite && !readAnySite) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const retry = (attempt: number) => {
      if (!cancelled && attempt < RETRIES) timer = setTimeout(() => void ask(attempt + 1), RETRY_MS);
    };

    const ask = async (attempt: number) => {
      try {
        const res = companySite
          ? await readCompanySite(tabId)
          : ((await chrome.tabs.sendMessage(tabId, { type: PAGE_FACTS_MESSAGE })) as PageFacts | undefined);
        if (cancelled) return;
        setState({ key, facts: res ?? {} });
        // Single-page apps may still be rendering; try again while the page looks incomplete.
        if (!res?.companyName || !(res.roleTitle || res.personName)) retry(attempt);
      } catch {
        // No reader answered: still loading, or the tab was open before the extension loaded.
        // After one retry, start the reader in the tab ourselves; it loads once even if run twice.
        if (cancelled) return;
        if (attempt === 1 && !companySite) await startReader(tabId, url).catch(() => {});
        retry(attempt);
      }
    };
    void ask(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tabId, url, title, readAnySite, key, changes]);

  return state?.key === key ? state.facts : undefined;
}

/** Runs the page reader the manifest assigns to this URL, if any. */
async function startReader(tabId: number, url: string): Promise<void> {
  const entry = chrome.runtime.getManifest().content_scripts?.find((c) => c.matches?.some((m) => matchesPattern(m, url)));
  if (entry?.js?.length) await chrome.scripting.executeScript({ target: { tabId }, files: entry.js });
}
