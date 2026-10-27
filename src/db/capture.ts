import { matchByName } from '../lib/match';
import type { CaptureResult, CapturedOutreach, UndoToken } from '../lib/messages';
import { roleFromNote } from '../lib/noteRole';
import { db } from './index';
import { createCompany, findOutreachByPerson } from './repo';

/**
 * Saves outreach a content script saw go out. The company is the one this person is already logged
 * under, else an exact name match. A name JobTrail doesn't know is only added with `allowNew` (the
 * user said yes on the toast); when only similar names exist it isn't guessed.
 * The same request logged again updates the existing entry instead of adding a second one.
 */
export async function logCapturedOutreach(c: CapturedOutreach, allowNew = false): Promise<CaptureResult> {
  const before = await findOutreachByPerson(c.profileUrl);
  let companyId = before[0]?.companyId;
  if (companyId === undefined) {
    const name = c.companyName?.trim();
    if (!name) return { status: 'unclear' };
    const { exact, candidates } = matchByName(name, await db.companies.toArray());
    if (exact.length === 1) companyId = exact[0]!.id;
    else if (exact.length || candidates.length) return { status: 'unclear' };
    else if (!allowNew) return { status: 'new_company', companyName: name };
    else companyId = await createCompany({ name });
  }
  const company = await db.companies.get(companyId);
  if (!company) return { status: 'failed' };

  const roles = await db.roles.where('companyId').equals(companyId).toArray();
  const role = roleFromNote(c.note, roles);
  const fields = {
    personName: c.personName,
    ...(c.personTitle && { personTitle: c.personTitle }),
    notes: c.note.trim(),
    status: 'sent' as const,
    sentAt: Date.now(),
    ...role,
  };

  const same = before.find((o) => o.channel === c.channel && o.companyId === companyId);
  let undo: UndoToken;
  let outreachId: number;
  if (same) {
    // Without a note, the earlier notes and role stay (an empty note finds no role, so none is set).
    await db.outreach.update(same.id, { ...fields, notes: fields.notes || same.notes });
    undo = { restore: same };
    outreachId = same.id;
  } else {
    outreachId = await db.outreach.add({ companyId, profileUrl: c.profileUrl, channel: c.channel, ...fields });
    undo = { added: outreachId };
  }
  return { status: 'logged', outreachId, companyName: company.name, undo };
}

export async function undoCapture(undo: UndoToken): Promise<void> {
  if ('added' in undo) await db.outreach.delete(undo.added);
  else await db.outreach.put(undo.restore);
}
