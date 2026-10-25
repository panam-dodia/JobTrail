import { useEffect, useState } from 'react';
import { PAGE_FACTS_MESSAGE, type PageFacts } from '../lib/pageFacts';

const RETRIES = 4;
const RETRY_MS = 700;

/**
 * Asks the tab's content script what it can read off the page. Sites without a content script
 * (or tabs opened before the extension loaded) just return nothing.
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
        // The content script may not have loaded yet, or this site has none.
        if (!cancelled) retry(attempt);
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
