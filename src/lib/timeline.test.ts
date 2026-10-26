import { describe, expect, it } from 'vitest';
import type { Application, Note, Outreach, Role, RoleEvent } from '../db/types';
import { activity, buildTimeline } from './timeline';

const app: Application = { id: 1, companyId: 1, platform: 'yc', appliedAt: 100, status: 'applied', notes: '' };
const out: Outreach = { id: 1, companyId: 1, personName: 'Ada', channel: 'yc_message', sentAt: 300, status: 'sent', notes: '' };
const note: Note = { id: 1, companyId: 1, text: 'hi', createdAt: 200 };
const role: Role = { id: 7, companyId: 1, title: 'Backend Eng', url: 'u', source: 'greenhouse', firstSeen: 0, lastSeen: 0, open: true };
const event: RoleEvent = { id: 1, companyId: 1, type: 'new_role', roleId: 7, at: 400, seen: false };

describe('buildTimeline', () => {
  it('merges all kinds newest first', () => {
    const items = buildTimeline({ applications: [app], outreach: [out], notes: [note], events: [event], roles: [role] });
    expect(items.map((i) => i.kind)).toEqual(['event', 'outreach', 'note', 'application']);
  });

  it('attaches the role to events', () => {
    const [item] = buildTimeline({ applications: [], outreach: [], notes: [], events: [event], roles: [role] });
    expect(item?.kind === 'event' && item.role?.title).toBe('Backend Eng');
  });

  it('breaks ties by newest id', () => {
    const a2 = { ...app, id: 2 };
    const items = buildTimeline({ applications: [app, a2], outreach: [], notes: [], events: [] });
    expect(items.map((i) => i.record.id)).toEqual([2, 1]);
  });
});

describe('activity', () => {
  it('groups outreach by channel and applications with their role, newest first', () => {
    const connect: Outreach = { ...out, id: 2, channel: 'linkedin_connection', sentAt: 500 };
    const message: Outreach = { ...out, id: 3, channel: 'linkedin_message', sentAt: 600 };
    const applied: Application = { ...app, roleId: 7 };
    const a = activity([out, connect, message], [applied], [role]);
    expect(a.yc.map((e) => e.record.id)).toEqual([1]);
    expect(a.linkedin.map((e) => e.record.id)).toEqual([3, 2]);
    expect(a.email).toEqual([]);
    expect(a.applied[0]?.kind === 'application' && a.applied[0].role?.title).toBe('Backend Eng');
  });
});
