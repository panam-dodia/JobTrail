/**
 * Whether a URL fits a Chrome match pattern such as "https://*.bamboohr.com/*".
 * "*." in the host also matches the bare host, as Chrome does.
 */
export function matchesPattern(pattern: string, url: string): boolean {
  const m = pattern.match(/^(https?|\*):\/\/([^/]+)(\/.*)$/);
  if (!m) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const [, scheme, host, path] = m as unknown as [string, string, string, string];
  if (scheme !== '*' ? u.protocol !== `${scheme}:` : !/^https?:$/.test(u.protocol)) return false;
  if (host.startsWith('*.')) {
    const base = host.slice(2);
    if (u.hostname !== base && !u.hostname.endsWith(`.${base}`)) return false;
  } else if (host !== '*' && u.hostname !== host) return false;
  const glob = new RegExp(`^${path.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  return glob.test(u.pathname + u.search);
}
