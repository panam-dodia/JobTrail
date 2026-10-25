// Trailing words that don't distinguish one company from another ("Scale AI" == "Scale").
const SUFFIXES = new Set(['inc', 'incorporated', 'llc', 'ltd', 'limited', 'corp', 'corporation', 'co', 'labs', 'lab', 'ai', 'hq']);

/** "Acme Labs, Inc." -> "acme". Keeps at least one word, so "AI Labs" -> "ai". */
export function normalizeName(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1]!)) words.pop();
  return words.join(' ');
}

/** Normalized name with spaces removed, so "Air Table" and "Airtable" line up. */
export function compactKey(name: string): string {
  return normalizeName(name).replace(/ /g, '');
}

/** "https://www.Stripe.com/jobs" -> "stripe.com". Returns undefined for junk input. */
export function normalizeDomain(input: string): string | undefined {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, '');
    return host.includes('.') ? host : undefined;
  } catch {
    return undefined;
  }
}
