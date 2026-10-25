// Clicking the toolbar icon opens the side panel notepad.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.warn('JobTrail: could not set side panel behavior', err));
