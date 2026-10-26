import { PAGE_FACTS_MESSAGE } from '../../lib/pageFacts';
import { extractGmail } from './extract';

// Read-only: answers the side panel's questions about the email that's open. Nothing leaves the device.
chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if ((msg as { type?: string } | null)?.type !== PAGE_FACTS_MESSAGE) return;
  try {
    sendResponse(extractGmail(document));
  } catch {
    sendResponse({});
  }
});
