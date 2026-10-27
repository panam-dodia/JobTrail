import { useEffect, useState } from 'react';
import { matchesPattern } from '../lib/matchPattern';
import { PAGE_FACTS_MESSAGE, type PageFacts } from '../lib/pageFacts';

const RETRIES = 4;
const RETRY_MS = 700;

/**
 * Asks the tab's content script what it can read off the page, starting it in tabs opened before the
 * extension loaded. Sites without a content script just return nothing.
 */
export function usePageFacts(tabId?: number, url?: string, title?: string): PageFacts | undefined {
  const [facts, setFacts] = useState<PageFacts>();

  useEffect(() => {
    setFacts(undefined);
    if (tabId === undefined || !url?.startsWith('http')) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const retry = (attempt: number) => {
      if (attempt < RETRIES) timer = setTimeout(() => void ask(attempt + 1), RETRY_MS);
    };

    const ask = async (attempt: number) => {
      try {
        const res = (await chrome.tabs.sendMessage(tabId, { type: PAGE_FACTS_MESSAGE })) as PageFacts | undefined;
        if (cancelled) return;
        setFacts(res ?? {});
        // Single-page apps may still be rendering; try again if the page looked empty.
        if (!res?.companyName) retry(attempt);
      } catch {
        // No reader answered: still loading, or the tab was open before the extension loaded.
        // After one retry, start the reader in the tab ourselves; it loads once even if run twice.
        if (cancelled) return;
        if (attempt === 1) await startReader(tabId, url).catch(() => {});
        retry(attempt);
      }
    };
    void ask(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tabId, url, title]);

  return facts;
}

/** Runs the page reader the manifest assigns to this URL, if any. */
async function startReader(tabId: number, url: string): Promise<void> {
  const entry = chrome.runtime.getManifest().content_scripts?.find((c) => c.matches?.some((m) => matchesPattern(m, url)));
  if (entry?.js?.length) await chrome.scripting.executeScript({ target: { tabId }, files: entry.js });
}
