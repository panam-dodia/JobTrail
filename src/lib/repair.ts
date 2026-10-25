import type { Company, Role } from '../db/types';
import { normalizeName } from './normalize';
import { parseJobTitle } from './pageTitle';

export interface CompanyFix {
  companyId: number;
  from: string;
  to: string;
  /** Roles to add, from a company name like "Marketing at Stoa". */
  addRoles: string[];
  /** Saved roles whose title still contains the company, e.g. "Marketing at Stoa | Y Combinator's Work". */
  renameRoles: { roleId: number; title: string }[];
}

export interface Merge {
  into: number;
  from: number[];
  name: string;
}

export interface RepairPlan {
  fixes: CompanyFix[];
  merges: Merge[];
}

/**
 * Finds companies saved with a job title as their name (from the old title parser) and plans how
 * to fix them: rename to the real company, keep the role, and merge entries that end up the same.
 */
export function planRepairs(companies: Company[], roles: Pick<Role, 'id' | 'companyId' | 'title'>[]): RepairPlan {
  const fixes: CompanyFix[] = [];
  const finalName = new Map<number, string>();

  for (const c of companies) {
    let name = c.name;
    const addRoles: string[] = [];
    const renameRoles: CompanyFix['renameRoles'] = [];

    const fromName = parseJobTitle(c.name);
    if (fromName.company && fromName.role) {
      name = fromName.company;
      addRoles.push(fromName.role);
    }
    for (const r of roles.filter((r) => r.companyId === c.id)) {
      const fromRole = parseJobTitle(r.title);
      if (!fromRole.company || !fromRole.role) continue;
      renameRoles.push({ roleId: r.id, title: fromRole.role });
      // A role naming a different company means this company's name is the broken part.
      if (normalizeName(fromRole.company) !== normalizeName(name)) name = fromRole.company;
    }

    finalName.set(c.id, name);
    if (name !== c.name || addRoles.length || renameRoles.length) {
      fixes.push({ companyId: c.id, from: c.name, to: name, addRoles, renameRoles });
    }
  }

  // Merge companies that share a name after fixing, but only groups the fixes touched.
  const fixed = new Set(fixes.map((f) => f.companyId));
  const groups = new Map<string, Company[]>();
  for (const c of companies) {
    const key = normalizeName(finalName.get(c.id) ?? c.name);
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const merges: Merge[] = [];
  for (const group of groups.values()) {
    if (group.length < 2 || !group.some((c) => fixed.has(c.id))) continue;
    // Keep the untouched company if there is one, otherwise the oldest.
    const sorted = [...group].sort((a, b) => Number(fixed.has(a.id)) - Number(fixed.has(b.id)) || a.createdAt - b.createdAt || a.id - b.id);
    const [into, ...rest] = sorted;
    merges.push({ into: into!.id, from: rest.map((c) => c.id), name: finalName.get(into!.id) ?? into!.name });
  }

  return { fixes, merges };
}
