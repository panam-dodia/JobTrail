import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };
import { BOARD_HOSTS } from './src/lib/pageContext.ts';

const boardMatches = [
  'https://boards.greenhouse.io/*',
  'https://job-boards.greenhouse.io/*',
  ...BOARD_HOSTS.flatMap((b) => b.hosts.map((h) => (b.token === 'subdomain' ? `https://*.${h}/*` : `https://${h}/*`))),
];

// Read-only page readers, one per site (see src/sites/).
const contentScripts = [
  { matches: ['https://www.workatastartup.com/*', 'https://workatastartup.com/*'], js: ['src/sites/waas/content.ts'] },
  { matches: ['https://www.linkedin.com/*'], js: ['src/sites/linkedin/content.ts'] },
  { matches: boardMatches, js: ['src/sites/jobboard/content.ts'] },
  { matches: ['https://mail.google.com/*'], js: ['src/sites/gmail/content.ts'] },
].map((c) => ({ ...c, run_at: 'document_idle' as const }));

export default defineManifest({
  manifest_version: 3,
  name: 'JobTrail',
  description: 'A local-first memory for your job search.',
  version: pkg.version,
  action: { default_title: 'Open JobTrail' },
  side_panel: { default_path: 'src/sidepanel/index.html' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  // `tabs` lets the side panel read the active tab's URL so it can match it to a company.
  // `unlimitedStorage` keeps Chrome from clearing the local database when the disk runs low.
  permissions: ['sidePanel', 'tabs', 'storage', 'unlimitedStorage', 'scripting'],
  // `scripting` with these hosts lets the side panel start a reader in a tab that was open
  // before the extension loaded (Chrome only adds readers to pages opened afterwards).
  host_permissions: contentScripts.flatMap((c) => c.matches),
  content_scripts: contentScripts,
});
