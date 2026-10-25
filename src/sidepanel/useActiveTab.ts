import { useEffect, useState } from 'react';

export interface ActiveTab {
  id?: number;
  url?: string;
  title?: string;
}

/** Tracks the active tab of the window this side panel belongs to. */
export function useActiveTab(): ActiveTab {
  const [tab, setTab] = useState<ActiveTab>({});

  useEffect(() => {
    let windowId: number | undefined;

    const refresh = async () => {
      const [t] = await chrome.tabs.query(windowId === undefined ? { active: true, currentWindow: true } : { active: true, windowId });
      setTab({ id: t?.id, url: t?.url, title: t?.title });
    };
    const onActivated = (info: chrome.tabs.OnActivatedInfo) => {
      if (info.windowId === windowId) void refresh();
    };
    const onUpdated = (_id: number, change: chrome.tabs.OnUpdatedInfo, t: chrome.tabs.Tab) => {
      if (t.active && t.windowId === windowId && (change.url || change.title)) void refresh();
    };

    chrome.windows.getCurrent().then((w) => {
      windowId = w.id;
      void refresh();
    });
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return tab;
}
