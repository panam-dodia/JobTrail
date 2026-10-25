# CLAUDE.md — JobTrail (working name)

## What we're building
A local-first Chrome extension that acts as a memory for my job search. It has three jobs:

1. **Remember**: log every application and outreach I do across YC Work at a Startup (WaaS), LinkedIn, Glassdoor, and company career pages, with one-tap confirmation.
2. **Resurface**: whenever I open a company's page on any of those sites, a side-panel notepad shows my full history with that company (applications, connection requests, YC messages, my notes).
3. **Watch**: poll the public job boards of companies on my watchlist daily and notify me when a new role appears, alongside my past history with that company.

This is NOT an auto-apply tool. It never submits, clicks, or messages on my behalf.

## Environment
- I'm on Windows using cmd.exe (not PowerShell). All scripts and commands must work in cmd. Use npm scripts, no bash-only syntax, no `rm -rf`, no `&&`-chains that assume a POSIX shell inside package.json unless cross-platform (use `rimraf`, `cross-env` if needed).
- Load the extension unpacked in Chrome for testing.

## Stack
- Chrome Extension Manifest V3, TypeScript, Vite (with @crxjs/vite-plugin or an equivalent MV3 setup).
- UI: React in `chrome.sidePanel` (this is the always-available notepad; it stays open across tabs).
- Storage: IndexedDB via Dexie. Everything stays on the device. No backend in the MVP.
- Background: MV3 service worker with `chrome.alarms` for daily polling and `chrome.notifications` for alerts.
- Tests: Vitest for parsers, matching, and diff logic.

## Data model (Dexie)
- `companies`: id, name, aliases[], domain, ycSlug?, ats? { type: greenhouse | lever | ashby | other, token }, sponsorship: yes | no | unknown, watching: boolean, createdAt
- `roles`: id, companyId, title, url, source (yc | linkedin | glassdoor | greenhouse | lever | ashby | careers_page), externalId?, firstSeen, lastSeen, open: boolean
- `applications`: id, companyId, roleId?, platform, appliedAt, status (applied | interviewing | rejected | offer | ghosted), notes
- `outreach`: id, companyId, personName, personTitle?, profileUrl?, channel (linkedin_connection | linkedin_message | yc_message | email), sentAt, status (sent | accepted | replied | no_response), notes
- `notes`: id, companyId, text, createdAt
- `events`: id, companyId, type (new_role | role_closed), roleId, at, seen: boolean

Company matching: normalize names (lowercase, strip Inc/Labs/AI/HQ suffixes and punctuation) and also match by domain and ycSlug. When a match is uncertain, ask me in the side panel instead of guessing.

## Capture rules (content scripts)
- Only run on an allowlist: workatastartup.com, ycombinator.com/companies, linkedin.com, glassdoor.com, plus job board hosts (boards.greenhouse.io, jobs.lever.co, jobs.ashbyhq.com).
- Detect meaningful actions, not page visits:
  - WaaS: apply submit, and sending a message to a founder.
  - LinkedIn: "Send" in the connection request flow (capture the person's name, title, and company from the profile page), and Easy Apply submit.
  - Glassdoor and ATS pages: apply submit where detectable.
- On detection, show a small toast in the page: "Logged: <action> at <company> ✓ Undo / Edit". Nothing is saved silently without that toast.
- Every page also gets a manual "Log this" button in the side panel as a fallback when detection misses.
- DOM selectors break often. Prefer text and aria-label based detection, keep selectors in one config file per site, and fail quietly (fall back to manual logging) instead of throwing.
- Never make background requests to LinkedIn or WaaS. Only read the page I'm already on.

## Contextual notepad (side panel)
- When the active tab maps to a company, show: company header (sponsorship flag, watching toggle), timeline of applications, outreach, and new-role events, newest first, and a quick note box.
- Show at a glance: "YC message already sent to this company: yes/no" and "already emailed: yes/no". I use these to decide how to word LinkedIn outreach.
- When no company matches, show recent activity and unseen new-role events.

## Watching for new roles
- For watched companies with a known ATS, poll once a day via `chrome.alarms`:
  - Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{token}/jobs`
  - Lever: `https://api.lever.co/v0/postings/{token}?mode=json`
  - Ashby: `https://api.ashbyhq.com/posting-api/job-board/{token}`
- Detect ATS automatically when I'm on a company's careers page (look for these hosts or embedded boards) and offer to save the token.
- For WaaS-only companies: when I visit the company's WaaS page, snapshot its listed roles and diff against the last snapshot. No background polling of WaaS.
- Diff by externalId, falling back to normalized title + url. New role → create event + `chrome.notifications` with the company name, role title, and a one-line summary of my history ("Applied to Backend Eng on Sep 12; connected with CTO Oct 3").
- Respect rate limits: stagger requests, back off on errors, log failures to the panel.

## Privacy
- Local only. No analytics, no remote calls except the public ATS endpoints above.
- Settings page: site allowlist toggles, export all data to JSON/CSV, import JSON, delete everything.

## Build order (stop and show me after each phase)
1. Scaffold MV3 + Vite + React side panel + Dexie schema. Manual logging of companies, applications, outreach, notes. Contextual panel works by matching the active tab's domain or YC slug.
2. Content-script capture with confirmation toasts for LinkedIn connection requests and WaaS apply/message.
3. ATS polling (Greenhouse, Lever, Ashby), diffing, notifications, and WaaS visit snapshots.
4. Export/import, settings, polish.

Later, not now: LLM features (parse a pasted job post into fields, fit scoring, project and resume suggestions), a desktop always-on-top widget, sync across devices.

## Working rules
- Small, reviewable commits per feature. Write tests for name normalization, company matching, and role diffing before wiring the UI.
- Keep site-specific code isolated under `src/sites/<site>/` so a broken selector never affects other sites.
- If something is ambiguous, ask me before building it.
