import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'JobTrail',
  description: 'A local-first memory for your job search.',
  version: pkg.version,
  action: { default_title: 'Open JobTrail' },
  side_panel: { default_path: 'src/sidepanel/index.html' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  // `tabs` lets the side panel read the active tab's URL so it can match it to a company.
  permissions: ['sidePanel', 'tabs', 'storage'],
});
