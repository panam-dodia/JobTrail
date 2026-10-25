import type { Application, Note, Outreach, Role, RoleEvent } from '../db/types';

export type TimelineItem =
  | { kind: 'application'; at: number; record: Application }
  | { kind: 'outreach'; at: number; record: Outreach }
  | { kind: 'note'; at: number; record: Note }
  | { kind: 'event'; at: number; record: RoleEvent; role?: Role };

export interface TimelineInput {
  applications: Application[];
  outreach: Outreach[];
  notes: Note[];
  events: RoleEvent[];
  roles?: Role[];
}

/** Everything that happened with a company (or across companies), newest first. */
export function buildTimeline({ applications, outreach, notes, events, roles = [] }: TimelineInput): TimelineItem[] {
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const items: TimelineItem[] = [
    ...applications.map((record) => ({ kind: 'application' as const, at: record.appliedAt, record })),
    ...outreach.map((record) => ({ kind: 'outreach' as const, at: record.sentAt, record })),
    ...notes.map((record) => ({ kind: 'note' as const, at: record.createdAt, record })),
    ...events.map((record) => ({ kind: 'event' as const, at: record.at, record, role: rolesById.get(record.roleId) })),
  ];
  return items.sort((a, b) => b.at - a.at || b.record.id - a.record.id);
}

export interface Glance {
  ycMessaged: boolean;
  emailed: boolean;
}

export function glance(outreach: Outreach[]): Glance {
  return {
    ycMessaged: outreach.some((o) => o.channel === 'yc_message'),
    emailed: outreach.some((o) => o.channel === 'email'),
  };
}
