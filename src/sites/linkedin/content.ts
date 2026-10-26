import { PAGE_FACTS_MESSAGE } from '../../lib/pageFacts';
import { extractLinkedIn } from './extract';

// Read-only: answers the side panel's questions about the page that's already open.
// Never fetches anything from LinkedIn and never clicks or types.
chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if ((msg as { type?: string } | null)?.type !== PAGE_FACTS_MESSAGE) return;
  try {
    sendResponse(extractLinkedIn(document, location.href));
  } catch {
    sendResponse({});
  }
});
