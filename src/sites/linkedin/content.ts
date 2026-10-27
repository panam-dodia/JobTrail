import { LOG_CAPTURE_MESSAGE, OPEN_PANEL_MESSAGE, UNDO_CAPTURE_MESSAGE, type CaptureResult, type CapturedOutreach } from '../../lib/messages';
import { PAGE_FACTS_MESSAGE } from '../../lib/pageFacts';
import { isCurrent } from '../../lib/runtime';
import { showToast } from '../../lib/toast';
import { watchConnectionRequests } from './capture';
import { extractLinkedIn } from './extract';

// Reads the page that's already open. Never fetches anything from LinkedIn and never clicks or types.
chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  if ((msg as { type?: string } | null)?.type !== PAGE_FACTS_MESSAGE) return;
  try {
    sendResponse(extractLinkedIn(document, location.href));
  } catch {
    sendResponse({});
  }
});

const openPanel = () => void chrome.runtime.sendMessage({ type: OPEN_PANEL_MESSAGE }).catch(() => {});

async function log(captured: CapturedOutreach, allowNew = false): Promise<CaptureResult> {
  try {
    return (await chrome.runtime.sendMessage({ type: LOG_CAPTURE_MESSAGE, captured, allowNew })) ?? { status: 'failed' };
  } catch {
    return { status: 'failed' };
  }
}

/** Tells what happened to a captured request; a company JobTrail doesn't know is added only on Save. */
function report(captured: CapturedOutreach, result: CaptureResult): void {
  const who = captured.personName;
  switch (result.status) {
    case 'logged': {
      const { undo } = result;
      const update = showToast(`Logged: connection request to ${who} at ${result.companyName} ✓`, [
        {
          label: 'Undo',
          onClick: () => {
            void chrome.runtime
              .sendMessage({ type: UNDO_CAPTURE_MESSAGE, undo })
              .catch(() => undefined)
              .then((r: { ok?: boolean } | undefined) => update(r?.ok ? 'Undone.' : 'Could not undo; edit it in the side panel.'));
          },
        },
        { label: 'Edit', onClick: openPanel },
      ]);
      return;
    }
    case 'new_company':
      showToast(
        `Request to ${who} sent. New company: ${result.companyName}`,
        [
          { label: 'Save', onClick: () => void log(captured, true).then((r) => report(captured, r)) },
          { label: 'Pick another', onClick: openPanel },
        ],
        30000,
      );
      return;
    case 'unclear':
      showToast(`Request to ${who} sent. Which company? Open JobTrail to log it.`, [{ label: 'Open', onClick: openPanel }], 30000);
      return;
    default:
      showToast(`Couldn't log the request to ${who}. Log it from the side panel.`, [{ label: 'Open', onClick: openPanel }]);
  }
}

// A connection request that went out is logged right away, with Undo on the toast.
// A copy left over from before JobTrail was reloaded stays silent; the fresh copy handles it.
watchConnectionRequests(async (captured) => {
  if (!isCurrent()) return;
  report(captured, await log(captured));
});
