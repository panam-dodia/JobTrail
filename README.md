# JobTrail

A local-first Chrome extension that remembers your job search. See [CLAUDE.md](CLAUDE.md) for the full spec.

## Setup (cmd.exe)

```
npm install
npm test
npm run build
```

## Load in Chrome

1. Run `npm run build` (or `npm run dev` for hot reload).
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the `dist` folder.
3. Click the JobTrail toolbar icon to open the side panel. It stays open as you switch tabs.

## Layout

- `src/lib/`: pure logic (name normalization, URL parsing, matching, timeline), unit tested
- `src/db/`: Dexie schema and data helpers
- `src/sidepanel/`: React side panel
- `src/background/`: MV3 service worker
- `src/sites/<site>/`: per-site content scripts (from phase 2)
