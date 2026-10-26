import type { Company } from '../db/types';

/** "Stoa / Stoa Labs": the main name, then other names. */
export function displayName(c: Pick<Company, 'name' | 'aliases'>): string {
  return [c.name, ...c.aliases].join(' / ');
}

/** Reads "Stoa / Stoa Labs" back into a main name and other names. Undefined when empty. */
export function splitNames(text: string): { name: string; aliases: string[] } | undefined {
  const parts = text.split('/').map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const unique = parts.filter((p) => !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
  const [name, ...aliases] = unique;
  return name ? { name, aliases } : undefined;
}
