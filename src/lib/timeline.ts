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

export type ActivityChannel = 'yc' | 'linkedin' | 'email' | 'applied';
export const ACTIVITY_CHANNELS: ActivityChannel[] = ['yc', 'linkedin', 'email', 'applied'];

export type ActivityEntry =
  | { kind: 'outreach'; at: number; record: Outreach; role?: Role }
  | { kind: 'application'; at: number; record: Application; role?: Role };

/**
 * A company's outreach and applications by channel, newest first in each:
 * YC messages, LinkedIn (connection requests and messages), email, and applications.
 */
export function activity(outreach: Outreach[], applications: Application[], roles: Role[] = []): Record<ActivityChannel, ActivityEntry[]> {
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const out: Record<ActivityChannel, ActivityEntry[]> = { yc: [], linkedin: [], email: [], applied: [] };
  for (const record of outreach) {
    const channel = record.channel === 'yc_message' ? 'yc' : record.channel === 'email' ? 'email' : 'linkedin';
    out[channel].push({ kind: 'outreach', at: record.sentAt, record, role: record.roleId ? rolesById.get(record.roleId) : undefined });
  }
  for (const record of applications) {
    out.applied.push({ kind: 'application', at: record.appliedAt, record, role: record.roleId ? rolesById.get(record.roleId) : undefined });
  }
  for (const list of Object.values(out)) list.sort((a, b) => b.at - a.at || b.record.id - a.record.id);
  return out;
}
