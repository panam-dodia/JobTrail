import type { AtsRef } from '../db/types';
import type { PageFacts } from './pageFacts';

// Company career pages often embed a job board and name the job in the address:
// magicpatterns.com/careers/x?ashby_jid=<id>, acme.com/jobs?gh_jid=<id>. The board's public API
// (the only remote calls JobTrail makes) then gives the exact title and location.

export interface JobRef {
  type: 'ashby' | 'greenhouse';
  jobId: string;
}

const PARAMS: [string, JobRef['type']][] = [
  ['ashby_jid', 'ashby'],
  ['gh_jid', 'greenhouse'],
];

export function jobRefFromUrl(url: string): JobRef | undefined {
  try {
    const params = new URL(url).searchParams;
    for (const [param, type] of PARAMS) {
      const jobId = params.get(param)?.trim();
      if (jobId) return { type, jobId };
    }
  } catch {
    // Not a URL.
  }
  return undefined;
}

/** Board tokens to try: one read off the page first, then guesses from the domain ("magicpatterns.com"). */
export function tokenGuesses(known?: string, domain?: string): string[] {
  const labels = (domain ?? '').toLowerCase().split('.').filter((l) => !['www', 'careers', 'jobs', 'join'].includes(l));
  const base = labels[0];
  return [...new Set([known, base, base?.replace(/-/g, '')].filter((t): t is string => !!t))];
}

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function fromAshbyBoard(data: unknown, jobId: string): PageFacts | undefined {
  const jobs = (data as { jobs?: Json[] } | null)?.jobs;
  const job = Array.isArray(jobs) ? jobs.find((j) => str(j.id) === jobId) : undefined;
  if (!job || !str(job.title)) return undefined;
  const location = [str(job.location), job.isRemote === true && !/remote/i.test(str(job.location)) ? 'Remote' : '']
    .filter(Boolean)
    .join(' / ');
  return { roleTitle: str(job.title), ...(location && { location }) };
}

export function fromGreenhouseJob(data: unknown): PageFacts | undefined {
  const job = data as Json | null;
  if (!job || !str(job.title)) return undefined;
  const location = str((job.location as Json | undefined)?.name);
  const company = str(job.company_name);
  return { roleTitle: str(job.title), ...(location && { location }), ...(company && { companyName: company }) };
}

const cache = new Map<string, Promise<PageFacts>>();

/** Looks the job up on its board, trying each token guess. Empty when it can't be found. */
export function lookUpJob(ref: JobRef, tokens: string[]): Promise<PageFacts> {
  const key = `${ref.type}:${ref.jobId}:${tokens.join(',')}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = (async () => {
      for (const token of tokens) {
        try {
          const facts = ref.type === 'ashby' ? await ashby(token, ref.jobId) : await greenhouse(token, ref.jobId);
          if (facts) return { ...facts, ats: { type: ref.type, token } satisfies AtsRef };
        } catch {
          // Wrong guess or offline; try the next one.
        }
      }
      cache.delete(key); // Not found (or offline): try again next time.
      return {};
    })();
    cache.set(key, hit);
  }
  return hit;
}

async function ashby(token: string, jobId: string) {
  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`);
  return res.ok ? fromAshbyBoard(await res.json(), jobId) : undefined;
}

async function greenhouse(token: string, jobId: string) {
  const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${encodeURIComponent(jobId)}`);
  return res.ok ? fromGreenhouseJob(await res.json()) : undefined;
}
