import type { OutreachChannel } from '../db/types';

// Messages between content scripts and the background worker, which owns the database writes.

/** A content script saw outreach go out (e.g. a LinkedIn connection request confirmed as Pending). */
export const LOG_CAPTURE_MESSAGE = 'jobtrail:log-capture';
export const UNDO_CAPTURE_MESSAGE = 'jobtrail:undo-capture';
export const OPEN_PANEL_MESSAGE = 'jobtrail:open-panel';

export interface CapturedOutreach {
  personName: string;
  personTitle?: string;
  profileUrl: string;
  companyName?: string;
  channel: OutreachChannel;
  /** What was sent with it, e.g. the connection note. */
  note: string;
}

export type CaptureResult =
  | { status: 'logged'; outreachId: number; companyName: string; undo: UndoToken }
  /** The company couldn't be told for sure; the note is kept for the side panel's form. */
  | { status: 'unclear' }
  /** The profile names a company JobTrail doesn't track yet; the user decides whether to add it. */
  | { status: 'new_company'; companyName: string }
  | { status: 'failed' };

/** How to take a capture back: delete what was added, or restore what was updated. */
export type UndoToken = { added: number } | { restore: import('../db/types').Outreach };

/** Notes from captures that still need a company, keyed by profile URL (chrome.storage.session). */
export const draftKey = (profileUrl: string) => `draft:${profileUrl}`;
