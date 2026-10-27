/**
 * False in a content script left behind in a tab after JobTrail was reloaded or updated: it can no
 * longer reach the extension, and a fresh copy is running alongside it.
 */
export function isCurrent(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}
