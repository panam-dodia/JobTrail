// All timestamps are epoch milliseconds.

export type AtsType = 'greenhouse' | 'lever' | 'ashby' | 'other';
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
  sponsorship: Sponsorship;
  watching: boolean;
  createdAt: number;
}

export type RoleSource = 'yc' | 'linkedin' | 'glassdoor' | 'greenhouse' | 'lever' | 'ashby' | 'careers_page';

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

export type Platform = 'yc' | 'linkedin' | 'glassdoor' | 'careers_page' | 'greenhouse' | 'lever' | 'ashby' | 'email' | 'other';
export const PLATFORMS: Platform[] = ['yc', 'linkedin', 'glassdoor', 'careers_page', 'greenhouse', 'lever', 'ashby', 'email', 'other'];

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
