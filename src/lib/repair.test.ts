import { describe, expect, it } from 'vitest';
import type { Company } from '../db/types';
import { planRepairs } from './repair';

const company = (id: number, name: string): Company => ({
  id, name, aliases: [], sponsorship: 'unknown', watching: false, createdAt: id,
});

describe('planRepairs', () => {
  it('fixes the entries from the old title parser and merges the Stoa ones', () => {
    const companies = [
      company(1, 'Member of Technical Staff at Stoa'),
      company(2, 'Product Engineer, Full Stack at David AI'),
      company(3, 'Trader, Compute Markets at Stoa'),
      company(4, 'a Startup'),
    ];
    const roles = [{ id: 10, companyId: 4, title: "Marketing at Stoa | Y Combinator's Work" }];
    const plan = planRepairs(companies, roles);

    expect(plan.fixes).toEqual([
      { companyId: 1, from: 'Member of Technical Staff at Stoa', to: 'Stoa', addRoles: ['Member of Technical Staff'], renameRoles: [] },
      { companyId: 2, from: 'Product Engineer, Full Stack at David AI', to: 'David AI', addRoles: ['Product Engineer, Full Stack'], renameRoles: [] },
      { companyId: 3, from: 'Trader, Compute Markets at Stoa', to: 'Stoa', addRoles: ['Trader, Compute Markets'], renameRoles: [] },
      { companyId: 4, from: 'a Startup', to: 'Stoa', addRoles: [], renameRoles: [{ roleId: 10, title: 'Marketing' }] },
    ]);
    expect(plan.merges).toEqual([{ into: 1, from: [3, 4], name: 'Stoa' }]);
  });

  it('merges into an existing correct company rather than a fixed one', () => {
    const plan = planRepairs([company(1, 'Marketing at Stoa'), company(2, 'Stoa')], []);
    expect(plan.merges).toEqual([{ into: 2, from: [1], name: 'Stoa' }]);
  });

  it('leaves correct data alone', () => {
    const plan = planRepairs([company(1, 'Stoa'), company(2, 'Stoa Labs')], [{ id: 1, companyId: 1, title: 'Marketing' }]);
    expect(plan).toEqual({ fixes: [], merges: [] });
  });
});
