import { useEffect, useState } from 'react';
import { jobRefFromUrl, lookUpJob, tokenGuesses } from '../lib/atsJob';
import type { PageFacts } from '../lib/pageFacts';

/** The job named in the address (?ashby_jid=, ?gh_jid=), looked up on its board's public API. */
export function useAtsJob(url?: string, token?: string, domain?: string): PageFacts | undefined {
  const [state, setState] = useState<{ url: string; facts: PageFacts }>();
  const ref = url ? jobRefFromUrl(url) : undefined;
  const tokens = tokenGuesses(token, domain).join(',');

  useEffect(() => {
    if (!url || !ref) return;
    let cancelled = false;
    void lookUpJob(ref, tokens ? tokens.split(',') : []).then((facts) => {
      if (!cancelled) setState({ url, facts });
    });
    return () => {
      cancelled = true;
    };
    // ref is derived from url.
  }, [url, tokens]);

  return state && state.url === url ? state.facts : undefined;
}
