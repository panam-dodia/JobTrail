import { describe, expect, it } from 'vitest';
import { fromAshbyBoard, fromGreenhouseJob, jobRefFromUrl, tokenGuesses } from './atsJob';

describe('atsJob', () => {
  it('reads the job id from an embedded board address', () => {
    expect(jobRefFromUrl('https://www.magicpatterns.com/careers/applied-ai-engineer?ashby_jid=7e40dad3-f890')).toEqual({
      type: 'ashby',
      jobId: '7e40dad3-f890',
    });
    expect(jobRefFromUrl('https://acme.com/jobs?gh_jid=4012345')).toEqual({ type: 'greenhouse', jobId: '4012345' });
    expect(jobRefFromUrl('https://acme.com/jobs')).toBeUndefined();
  });

  it('guesses board tokens from the page, then the domain', () => {
    expect(tokenGuesses(undefined, 'magicpatterns.com')).toEqual(['magicpatterns']);
    expect(tokenGuesses('magic-patterns', 'careers.magic-patterns.io')).toEqual(['magic-patterns', 'magicpatterns']);
  });

  it('finds the job on an Ashby board', () => {
    const board = { jobs: [{ id: 'a', title: 'Designer' }, { id: '7e40', title: 'Applied AI Engineer', location: 'San Francisco', isRemote: false }] };
    expect(fromAshbyBoard(board, '7e40')).toEqual({ roleTitle: 'Applied AI Engineer', location: 'San Francisco' });
    expect(fromAshbyBoard(board, 'nope')).toBeUndefined();
  });

  it('reads a Greenhouse job', () => {
    expect(fromGreenhouseJob({ title: 'Backend Engineer', location: { name: 'Remote' }, company_name: 'Acme' })).toEqual({
      roleTitle: 'Backend Engineer',
      location: 'Remote',
      companyName: 'Acme',
    });
  });
});
