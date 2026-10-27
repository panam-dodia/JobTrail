import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { CapturedOutreach } from '../lib/messages';
import { logCapturedOutreach, undoCapture } from './capture';
import { db } from './index';
import { addOutreach, createCompany, saveRole } from './repo';

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

const felix = (over: Partial<CapturedOutreach> = {}): CapturedOutreach => ({
  personName: 'Felix Eckert',
  personTitle: 'Co-Founder',
  profileUrl: 'https://www.linkedin.com/in/eckert-felix/',
  companyName: 'CloudCruise (YC W24)',
  channel: 'linkedin_connection',
  note: 'Hi Felix, I feel I’m a strong fit for the MTS role.',
  ...over,
});

describe('logCapturedOutreach', () => {
  it('files it under the same company, despite the YC batch in the name, with the role from the note', async () => {
    const id = await createCompany({ name: 'CloudCruise' });
    const r = await logCapturedOutreach(felix());
    expect(r).toMatchObject({ status: 'logged', companyName: 'CloudCruise' });
    expect(await db.outreach.toArray()).toEqual([
      expect.objectContaining({ companyId: id, personName: 'Felix Eckert', status: 'sent', roleTitle: 'MTS', notes: felix().note }),
    ]);
  });

  it('links a saved role', async () => {
    const id = await createCompany({ name: 'CloudCruise' });
    const roleId = await saveRole(id, { title: 'MTS', url: '', source: 'yc' });
    await logCapturedOutreach(felix());
    expect((await db.outreach.toArray())[0]).toMatchObject({ roleId });
  });

  it('asks before adding a company it does not know, and when one only looks similar', async () => {
    expect(await logCapturedOutreach(felix())).toEqual({ status: 'new_company', companyName: 'CloudCruise (YC W24)' });
    expect(await db.companies.count()).toBe(0);
    expect(await logCapturedOutreach(felix(), true)).toMatchObject({ status: 'logged' });
    expect((await db.companies.toArray()).map((c) => c.name)).toEqual(['CloudCruise (YC W24)']);

    await createCompany({ name: 'Basis' });
    expect(await logCapturedOutreach(felix({ profileUrl: 'https://www.linkedin.com/in/x/', companyName: 'Basis Health' }))).toEqual({ status: 'unclear' });
  });

  it('updates the same request instead of adding another, and undo restores it', async () => {
    const id = await createCompany({ name: 'CloudCruise' });
    const existing = await addOutreach({ companyId: id, personName: 'Felix', profileUrl: felix().profileUrl, channel: 'linkedin_connection', sentAt: 1, status: 'sent', notes: 'typed' });
    const r = await logCapturedOutreach(felix());
    expect(await db.outreach.count()).toBe(1);
    expect(await db.outreach.get(existing)).toMatchObject({ personName: 'Felix Eckert', roleTitle: 'MTS' });
    if (r.status !== 'logged') throw new Error();
    await undoCapture(r.undo);
    expect(await db.outreach.get(existing)).toMatchObject({ personName: 'Felix', notes: 'typed', sentAt: 1 });
  });

  it('undo removes a new entry', async () => {
    const r = await logCapturedOutreach(felix(), true);
    if (r.status !== 'logged') throw new Error();
    await undoCapture(r.undo);
    expect(await db.outreach.count()).toBe(0);
  });
});
