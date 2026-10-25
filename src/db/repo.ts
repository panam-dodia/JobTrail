import type { PageContext } from '../lib/pageContext';
import { buildTimeline, type TimelineItem } from '../lib/timeline';
import { db } from './index';
import type { Application, Company, Outreach } from './types';

export type NewCompany = Pick<Company, 'name'> & Partial<Omit<Company, 'id' | 'name' | 'createdAt'>>;

export async function createCompany(input: NewCompany): Promise<number> {
  return db.companies.add({
    aliases: [],
    sponsorship: 'unknown',
    watching: false,
    ...input,
    name: input.name.trim(),
    createdAt: Date.now(),
  });
}

/** Identifiers from the page that would let it match this company next time. */
export function pageIdentifiers(ctx: PageContext): Partial<Pick<Company, 'domain' | 'ycSlug' | 'ats'>> {
  return {
    ...(ctx.domain && { domain: ctx.domain }),
    ...(ctx.ycSlug && { ycSlug: ctx.ycSlug }),
    ...(ctx.ats && { ats: ctx.ats }),
  };
}

export interface LinkResult {
  linked: boolean;
  /** Identifiers the company already has with a different value; left unchanged. */
  conflicts: string[];
}

/** Attaches the page's identifiers to an existing company without overwriting any it already has. */
export async function linkPageToCompany(companyId: number, ctx: PageContext): Promise<LinkResult> {
  const company = await db.companies.get(companyId);
  if (!company) return { linked: false, conflicts: [] };

  const ids = pageIdentifiers(ctx);
  const changes: Partial<Company> = {};
  const conflicts: string[] = [];
  if (ids.domain) {
    if (!company.domain) changes.domain = ids.domain;
    else if (company.domain !== ids.domain) conflicts.push(`domain (${company.domain})`);
  }
  if (ids.ycSlug) {
    if (!company.ycSlug) changes.ycSlug = ids.ycSlug;
    else if (company.ycSlug !== ids.ycSlug) conflicts.push(`YC slug (${company.ycSlug})`);
  }
  if (ids.ats) {
    if (!company.ats) changes.ats = ids.ats;
    else if (company.ats.type !== ids.ats.type || company.ats.token !== ids.ats.token) {
      conflicts.push(`ATS (${company.ats.type}: ${company.ats.token})`);
    }
  }
  if (Object.keys(changes).length) await db.companies.update(companyId, changes);
  return { linked: Object.keys(changes).length > 0, conflicts };
}

export function updateCompany(id: number, changes: Partial<Omit<Company, 'id'>>) {
  return db.companies.update(id, changes);
}

export async function deleteCompany(id: number): Promise<void> {
  await db.transaction('rw', [db.companies, db.roles, db.applications, db.outreach, db.notes, db.events], async () => {
    await Promise.all([
      db.roles.where('companyId').equals(id).delete(),
      db.applications.where('companyId').equals(id).delete(),
      db.outreach.where('companyId').equals(id).delete(),
      db.notes.where('companyId').equals(id).delete(),
      db.events.where('companyId').equals(id).delete(),
    ]);
    await db.companies.delete(id);
  });
}

export const addApplication = (a: Omit<Application, 'id'>) => db.applications.add(a);
export const addOutreach = (o: Omit<Outreach, 'id'>) => db.outreach.add(o);
export const addNote = (companyId: number, text: string) =>
  db.notes.add({ companyId, text: text.trim(), createdAt: Date.now() });

export async function companyTimeline(companyId: number): Promise<TimelineItem[]> {
  const [applications, outreach, notes, events, roles] = await Promise.all([
    db.applications.where('companyId').equals(companyId).toArray(),
    db.outreach.where('companyId').equals(companyId).toArray(),
    db.notes.where('companyId').equals(companyId).toArray(),
    db.events.where('companyId').equals(companyId).toArray(),
    db.roles.where('companyId').equals(companyId).toArray(),
  ]);
  return buildTimeline({ applications, outreach, notes, events, roles });
}

/** Latest activity across all companies (unseen role events are shown separately). */
export async function recentActivity(limit = 20): Promise<TimelineItem[]> {
  const [applications, outreach, notes] = await Promise.all([
    db.applications.orderBy('appliedAt').reverse().limit(limit).toArray(),
    db.outreach.orderBy('sentAt').reverse().limit(limit).toArray(),
    db.notes.orderBy('createdAt').reverse().limit(limit).toArray(),
  ]);
  return buildTimeline({ applications, outreach, notes, events: [] }).slice(0, limit);
}

export async function unseenEvents(): Promise<TimelineItem[]> {
  const events = await db.events.filter((e) => !e.seen).toArray();
  const roles = await db.roles.bulkGet(events.map((e) => e.roleId));
  return buildTimeline({ applications: [], outreach: [], notes: [], events, roles: roles.filter((r) => r !== undefined) });
}
