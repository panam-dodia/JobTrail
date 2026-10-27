import { logCapturedOutreach, undoCapture } from '../db/capture';
import { LOG_CAPTURE_MESSAGE, OPEN_PANEL_MESSAGE, UNDO_CAPTURE_MESSAGE, draftKey, type CapturedOutreach, type UndoToken } from '../lib/messages';

// Clicking the toolbar icon opens the side panel notepad.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn('JobTrail: could not set side panel behavior', err));

// Chrome only adds page readers to pages loaded after JobTrail. On install, update or reload,
// start them in tabs already open, so it works whatever was opened when.
chrome.runtime.onInstalled.addListener(() => void startReadersInOpenTabs());

async function startReadersInOpenTabs(): Promise<void> {
  for (const entry of chrome.runtime.getManifest().content_scripts ?? []) {
    if (!entry.matches?.length || !entry.js?.length) continue;
    const tabs = await chrome.tabs.query({ url: entry.matches }).catch(() => []);
    for (const tab of tabs) {
      // Asleep (discarded) tabs reload with the reader anyway; other failures leave manual logging.
      if (tab.id === undefined || tab.discarded) continue;
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: entry.js }).catch(() => {});
    }
  }
}

// Content scripts can't reach the extension's database, so captures are saved here.
chrome.runtime.onMessage.addListener(
  (msg: { type?: string; captured?: CapturedOutreach; allowNew?: boolean; undo?: UndoToken }, sender, sendResponse) => {
    switch (msg?.type) {
      case LOG_CAPTURE_MESSAGE: {
        const captured = msg.captured!;
        const draft = draftKey(captured.profileUrl);
        logCapturedOutreach(captured, msg.allowNew)
          .then(async (result) => {
            // Not saved yet: keep the note for the side panel's form, in case it's logged there.
            if (result.status === 'logged') await chrome.storage.session.remove(draft);
            else if (captured.note) await chrome.storage.session.set({ [draft]: captured.note });
            sendResponse(result);
          })
          .catch((err) => {
            console.warn('JobTrail: could not log capture', err);
            sendResponse({ status: 'failed' });
          });
        return true;
      }
      case UNDO_CAPTURE_MESSAGE:
        undoCapture(msg.undo!).then(() => sendResponse({ ok: true }), () => sendResponse({ ok: false }));
        return true;
      case OPEN_PANEL_MESSAGE:
        // Called straight from the toast's click, so Chrome treats it as the user opening the panel.
        if (sender.tab?.id !== undefined) chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
        return;
    }
  },
);
