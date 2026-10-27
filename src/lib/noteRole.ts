import type { Role } from '../db/types';

export interface RoleRef {
  roleId?: number;
  roleTitle?: string;
}

const normalize = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').trim()} `;

// "the MTS role", "your Founding Engineer position": capitalized words before a role word.
// No /i flag: lowercase words ("the right role") must not count as a title.
const WORD = String.raw`[A-Z0-9][\w+#/&.]*`;
const MENTION = new RegExp(
  String.raw`\b(?:[Tt]he|[Yy]our|[Tt]his|[Aa]n?)\s+(${WORD}(?:(?:\s+|\s+[-–]\s+|\s+(?:of|and|&)\s+)${WORD}){0,6})\s+(?:[Rr]ole|[Pp]osition|[Oo]pening|[Jj]ob)\b`,
);

/**
 * The role a note is about: a saved role named in it (longest title wins), else a title mentioned
 * as "the X role". Empty when the note names none.
 */
export function roleFromNote(note: string, roles: Pick<Role, 'id' | 'title'>[] = []): RoleRef {
  const text = normalize(note);
  const saved = roles
    .filter((r) => normalize(r.title).trim() && text.includes(normalize(r.title)))
    .sort((a, b) => b.title.length - a.title.length)[0];
  if (saved) return { roleId: saved.id };

  const title = note.match(MENTION)?.[1]?.trim();
  if (!title) return {};
  const same = roles.find((r) => normalize(r.title) === normalize(title));
  return same ? { roleId: same.id } : { roleTitle: title };
}
