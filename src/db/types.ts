// All timestamps are epoch milliseconds.

/** Hiring tools that host companies' job pages. Only Greenhouse, Lever and Ashby have public APIs to poll. */
export const JOB_BOARDS = [
  'greenhouse', 'lever', 'ashby', 'gem', 'workable', 'rippling', 'smartrecruiters', 'bamboohr', 'recruitee', 'breezy', 'teamtailor', 'dover',
] as const;
export type JobBoard = (typeof JOB_BOARDS)[number];
export type AtsType = JobBoard | 'other';
export type Sponsorship = 'yes' | 'no' | 'unknown';

export interface AtsRef {
  type: AtsType;
  token: string;
}

export interface Company {
  id: number;
  name: string;
  aliases: string[];
  domain?: string;
  ycSlug?: string;
  ats?: AtsRef;
  /** Where the company or role is based, as the page shows it, e.g. "San Francisco, CA, US / Remote". */
  location?: string;
  sponsorship: Sponsorship;
  watching: boolean;
  createdAt: number;
}

export type RoleSource = 'yc' | 'linkedin' | 'glassdoor' | JobBoard | 'careers_page';
export const ROLE_SOURCES: RoleSource[] = ['yc', 'linkedin', 'glassdoor', ...JOB_BOARDS, 'careers_page'];

export interface Role {
  id: number;
  companyId: number;
  title: string;
  url: string;
  source: RoleSource;
  externalId?: string;
  firstSeen: number;
  lastSeen: number;
  open: boolean;
}

export type ApplicationStatus = 'applied' | 'interviewing' | 'rejected' | 'offer' | 'ghosted';
export const APPLICATION_STATUSES: ApplicationStatus[] = ['applied', 'interviewing', 'rejected', 'offer', 'ghosted'];

export type Platform = RoleSource | 'email' | 'other';
export const PLATFORMS: Platform[] = [...ROLE_SOURCES, 'email', 'other'];

export interface Application {
  id: number;
  companyId: number;
  roleId?: number;
  /** Free-text role title for manual logs that aren't tied to a tracked role. */
  roleTitle?: string;
  platform: Platform;
  appliedAt: number;
  status: ApplicationStatus;
  notes: string;
}

export type OutreachChannel = 'linkedin_connection' | 'linkedin_message' | 'yc_message' | 'email';
export const OUTREACH_CHANNELS: OutreachChannel[] = ['linkedin_connection', 'linkedin_message', 'yc_message', 'email'];

export type OutreachStatus = 'sent' | 'accepted' | 'replied' | 'no_response';
export const OUTREACH_STATUSES: OutreachStatus[] = ['sent', 'accepted', 'replied', 'no_response'];

export interface Outreach {
  id: number;
  companyId: number;
  personName: string;
  personTitle?: string;
  profileUrl?: string;
  channel: OutreachChannel;
  /** The role it was about, when known: a saved role, or a title read from the note. */
  roleId?: number;
  roleTitle?: string;
  sentAt: number;
  status: OutreachStatus;
  notes: string;
}

export interface Note {
  id: number;
  companyId: number;
  text: string;
  createdAt: number;
}

export type EventType = 'new_role' | 'role_closed';

export interface RoleEvent {
  id: number;
  companyId: number;
  type: EventType;
  roleId: number;
  at: number;
  seen: boolean;
}
