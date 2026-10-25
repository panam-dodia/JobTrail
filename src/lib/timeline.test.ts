import { describe, expect, it } from 'vitest';
import type { Application, Note, Outreach, Role, RoleEvent } from '../db/types';
import { buildTimeline, glance } from './timeline';

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

describe('glance', () => {
  it('reports YC messages and emails', () => {
    expect(glance([])).toEqual({ ycMessaged: false, emailed: false });
    expect(glance([out])).toEqual({ ycMessaged: true, emailed: false });
    expect(glance([out, { ...out, id: 2, channel: 'email' }])).toEqual({ ycMessaged: true, emailed: true });
  });

  it('does not count LinkedIn outreach', () => {
    expect(glance([{ ...out, channel: 'linkedin_message' }])).toEqual({ ycMessaged: false, emailed: false });
  });
});
