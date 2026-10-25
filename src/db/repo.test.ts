import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { parsePageContext } from '../lib/pageContext';
import { db } from './index';
import { addApplication, addNote, companyTimeline, createCompany, deleteCompany, findRole, linkPageToCompany, roleTitlesByCompany, saveRole, applyRepairs } from './repo';
import { planRepairs } from '../lib/repair';

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

describe('saveRole', () => {
  it('adds a role once and refreshes it when seen again', async () => {
    const id = await createCompany({ name: 'Stoa' });
    const role = { title: 'Member of Technical Staff', url: 'https://x/jobs/1', source: 'yc' as const };
    const first = await saveRole(id, role);
    const again = await saveRole(id, { ...role, title: 'member of technical staff' });
    expect(again).toBe(first);
    expect(await db.roles.count()).toBe(1);
  });

  it('keeps different roles and companies apart', async () => {
    const stoa = await createCompany({ name: 'Stoa' });
    const other = await createCompany({ name: 'David AI' });
    await saveRole(stoa, { title: 'MTS', url: 'u1', source: 'yc' });
    await saveRole(stoa, { title: 'Trader', url: 'u2', source: 'yc' });
    await saveRole(other, { title: 'MTS', url: 'u3', source: 'yc' });
    expect(await db.roles.where('companyId').equals(stoa).count()).toBe(2);
    expect((await findRole(stoa, undefined, 'u2'))?.title).toBe('Trader');
    expect(await findRole(other, 'Trader')).toBeUndefined();
  });
});

describe('roleTitlesByCompany', () => {
  it('groups saved roles and typed application titles per company without duplicates', async () => {
    const stoa = await createCompany({ name: 'Stoa' });
    const roleId = await saveRole(stoa, { title: 'MTS', url: 'u1', source: 'yc' });
    await addApplication({ companyId: stoa, roleId, platform: 'yc', appliedAt: 1, status: 'applied', notes: '' });
    await addApplication({ companyId: stoa, roleTitle: 'Trader', platform: 'yc', appliedAt: 1, status: 'applied', notes: '' });
    await addApplication({ companyId: stoa, roleTitle: 'mts', platform: 'yc', appliedAt: 0, status: 'applied', notes: '' });
    const map = await roleTitlesByCompany();
    expect(map.get(stoa)).toEqual(['MTS', 'Trader']);
  });
});

describe('applyRepairs', () => {
  it('turns the old broken entries into Stoa and David AI with their roles and history', async () => {
    const mts = await createCompany({ name: 'Member of Technical Staff at Stoa' });
    await createCompany({ name: 'Product Engineer, Full Stack at David AI' });
    const trader = await createCompany({ name: 'Trader, Compute Markets at Stoa' });
    const startup = await createCompany({ name: 'a Startup', ycSlug: 'stoa', sponsorship: 'yes' });
    await saveRole(startup, { title: "Marketing at Stoa | Y Combinator's Work", url: 'https://w/jobs/1', source: 'yc' });
    await addNote(trader, 'keep me');

    await applyRepairs(planRepairs(await db.companies.toArray(), await db.roles.toArray()));

    const companies = await db.companies.orderBy('name').toArray();
    expect(companies.map((c) => c.name)).toEqual(['David AI', 'Stoa']);
    const stoa = companies[1]!;
    expect(stoa.id).toBe(mts);
    expect(stoa).toMatchObject({ ycSlug: 'stoa', sponsorship: 'yes' });
    expect((await roleTitlesByCompany()).get(stoa.id)?.sort()).toEqual(['Marketing', 'Member of Technical Staff', 'Trader, Compute Markets']);
    expect(await db.notes.where('companyId').equals(stoa.id).count()).toBe(1);
  });

  it('collapses duplicate roles when merging', async () => {
    const a = await createCompany({ name: 'Marketing at Stoa' });
    const b = await createCompany({ name: 'Stoa' });
    const roleId = await saveRole(b, { title: 'Marketing', url: 'u', source: 'yc' });
    await addApplication({ companyId: a, platform: 'yc', appliedAt: 1, status: 'applied', notes: '' });
    await applyRepairs(planRepairs(await db.companies.toArray(), await db.roles.toArray()));
    expect(await db.companies.count()).toBe(1);
    expect(await db.roles.count()).toBe(1);
    expect((await findRole(b, 'Marketing'))?.id).toBe(roleId);
    expect(await db.applications.where('companyId').equals(b).count()).toBe(1);
  });
});
