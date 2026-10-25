import Dexie, { type EntityTable } from 'dexie';
import type { Application, Company, Note, Outreach, Role, RoleEvent } from './types';

export class JobTrailDB extends Dexie {
  companies!: EntityTable<Company, 'id'>;
  roles!: EntityTable<Role, 'id'>;
  applications!: EntityTable<Application, 'id'>;
  outreach!: EntityTable<Outreach, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  events!: EntityTable<RoleEvent, 'id'>;

  constructor(name = 'jobtrail') {
    super(name);
    // Booleans (watching, seen, open) aren't valid IndexedDB keys, so they're filtered in memory.
    this.version(1).stores({
      companies: '++id, name, *aliases, domain, ycSlug, ats.token, createdAt',
      roles: '++id, companyId, externalId, firstSeen',
      applications: '++id, companyId, roleId, appliedAt',
      outreach: '++id, companyId, channel, sentAt',
      notes: '++id, companyId, createdAt',
      events: '++id, companyId, roleId, at',
    });
  }
}

export const db = new JobTrailDB();
