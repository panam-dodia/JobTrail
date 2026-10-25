import type { PageContext } from '../lib/pageContext';
import type { RepairPlan } from '../lib/repair';
import { buildTimeline, type TimelineItem } from '../lib/timeline';
import { db } from './index';
import type { Application, Company, Outreach, Role } from './types';

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

/** A company's role with the same URL or the same title, if one is already saved. */
export async function findRole(companyId: number, title?: string, url?: string): Promise<Role | undefined> {
  const key = title ? normalizeTitle(title) : undefined;
  const roles = await db.roles.where('companyId').equals(companyId).toArray();
  return roles.find((r) => r.url === url) ?? (key ? roles.find((r) => normalizeTitle(r.title) === key) : undefined);
}

const normalizeTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Saves a role under a company, or refreshes lastSeen if it's already there. */
export async function saveRole(companyId: number, role: Pick<Role, 'title' | 'url' | 'source'>): Promise<number> {
  const now = Date.now();
  const existing = await findRole(companyId, role.title, role.url);
  if (existing) {
    await db.roles.update(existing.id, { lastSeen: now, open: true });
    return existing.id;
  }
  return db.roles.add({ companyId, ...role, title: role.title.trim(), firstSeen: now, lastSeen: now, open: true });
}

/** Role titles per company, newest first: saved roles plus titles typed into applications. */
export async function roleTitlesByCompany(): Promise<Map<number, string[]>> {
  const [roles, applications] = await Promise.all([db.roles.toArray(), db.applications.toArray()]);
  const entries = [
    ...roles.map((r) => ({ companyId: r.companyId, title: r.title, at: r.firstSeen })),
    ...applications.flatMap((a) => (a.roleTitle && a.roleId === undefined ? [{ companyId: a.companyId, title: a.roleTitle, at: a.appliedAt }] : [])),
  ].sort((a, b) => b.at - a.at);

  const byCompany = new Map<number, string[]>();
  const seen = new Set<string>();
  for (const e of entries) {
    const key = `${e.companyId}:${normalizeTitle(e.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    byCompany.set(e.companyId, [...(byCompany.get(e.companyId) ?? []), e.title]);
  }
  return byCompany;
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

/** Applies a plan from planRepairs: renames, role fixes, then merges duplicates into one company. */
export async function applyRepairs(plan: RepairPlan): Promise<void> {
  const tables = [db.companies, db.roles, db.applications, db.outreach, db.notes, db.events];
  await db.transaction('rw', tables, async () => {
    const now = Date.now();
    for (const fix of plan.fixes) {
      await db.companies.update(fix.companyId, { name: fix.to });
      for (const r of fix.renameRoles) await db.roles.update(r.roleId, { title: r.title });
      for (const title of fix.addRoles) {
        await db.roles.add({ companyId: fix.companyId, title, url: '', source: 'careers_page', firstSeen: now, lastSeen: now, open: true });
      }
    }

    for (const merge of plan.merges) {
      const target = await db.companies.get(merge.into);
      if (!target) continue;
      // Keep any identifiers the merged entries had that the target lacks.
      const changes: Partial<Company> = {};
      for (const other of await db.companies.bulkGet(merge.from)) {
        if (!other) continue;
        changes.domain ??= target.domain ?? other.domain;
        changes.ycSlug ??= target.ycSlug ?? other.ycSlug;
        changes.ats ??= target.ats ?? other.ats;
        if (target.sponsorship === 'unknown' && other.sponsorship !== 'unknown') changes.sponsorship ??= other.sponsorship;
        changes.watching = (changes.watching ?? target.watching) || other.watching;
      }
      await db.companies.update(merge.into, changes);
      for (const table of [db.roles, db.applications, db.outreach, db.notes, db.events] as const) {
        await (table as typeof db.notes).where('companyId').anyOf(merge.from).modify({ companyId: merge.into });
      }
      await db.companies.bulkDelete(merge.from);
      await dedupeRoles(merge.into);
    }
  });
}

/** Collapses same-titled roles into the oldest one and repoints anything that referenced the others. */
async function dedupeRoles(companyId: number): Promise<void> {
  const roles = (await db.roles.where('companyId').equals(companyId).toArray()).sort((a, b) => a.firstSeen - b.firstSeen || a.id - b.id);
  const keep = new Map<string, Role>();
  for (const r of roles) {
    const key = normalizeTitle(r.title);
    const kept = keep.get(key);
    if (!kept) {
      keep.set(key, r);
      continue;
    }
    if (!kept.url && r.url) await db.roles.update(kept.id, { url: r.url });
    await db.applications.where('roleId').equals(r.id).modify({ roleId: kept.id });
    await db.events.where('roleId').equals(r.id).modify({ roleId: kept.id });
    await db.roles.delete(r.id);
  }
}
