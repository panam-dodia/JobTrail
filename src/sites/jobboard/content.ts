import { PAGE_FACTS_MESSAGE } from '../../lib/pageFacts';
import { extractJobBoard } from './extract';

// Read-only: answers the side panel's questions about the page that's already open.
chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if ((msg as { type?: string } | null)?.type !== PAGE_FACTS_MESSAGE) return;
  try {
    sendResponse(extractJobBoard(document));
  } catch {
    sendResponse({});
  }
});
