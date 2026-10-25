import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { parsePageContext } from '../lib/pageContext';
import { db } from './index';
import { addApplication, addNote, companyTimeline, createCompany, deleteCompany, linkPageToCompany } from './repo';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

function ctx(url: string) {
  const c = parsePageContext(url);
  if (!c) throw new Error(url);
  return c;
}

describe('createCompany', () => {
  it('fills defaults', async () => {
    const id = await createCompany({ name: '  Acme ' });
    expect(await db.companies.get(id)).toMatchObject({ name: 'Acme', aliases: [], sponsorship: 'unknown', watching: false });
  });
});

describe('linkPageToCompany', () => {
  it('adds missing identifiers', async () => {
    const id = await createCompany({ name: 'Acme', domain: 'acme.com' });
    const r = await linkPageToCompany(id, ctx('https://www.workatastartup.com/companies/acme'));
    expect(r).toEqual({ linked: true, conflicts: [] });
    expect((await db.companies.get(id))?.ycSlug).toBe('acme');
  });

  it('never overwrites an existing identifier', async () => {
    const id = await createCompany({ name: 'Acme', domain: 'acme.com' });
    const r = await linkPageToCompany(id, ctx('https://acme.io/jobs'));
    expect(r.linked).toBe(false);
    expect(r.conflicts).toEqual(['domain (acme.com)']);
    expect((await db.companies.get(id))?.domain).toBe('acme.com');
  });
});

describe('deleteCompany', () => {
  it('removes the company and its history', async () => {
    const id = await createCompany({ name: 'Acme' });
    const other = await createCompany({ name: 'Globex' });
    await addApplication({ companyId: id, platform: 'yc', appliedAt: 1, status: 'applied', notes: '' });
    await addNote(id, 'n');
    await addNote(other, 'keep');
    await deleteCompany(id);
    expect(await db.companies.count()).toBe(1);
    expect(await companyTimeline(id)).toEqual([]);
    expect(await companyTimeline(other)).toHaveLength(1);
  });
});
