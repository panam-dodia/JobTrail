import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db';
import { applyRepairs } from '../../db/repo';
import { planRepairs } from '../../lib/repair';

/** Offers to fix companies saved with a job title as their name. Nothing changes until the user says so. */
export function RepairBanner() {
  const plan = useLiveQuery(async () => planRepairs(await db.companies.toArray(), await db.roles.toArray()), []);
  const [dismissed, setDismissed] = useState(false);
  if (!plan || dismissed || (!plan.fixes.length && !plan.merges.length)) return null;

  const mergedAway = new Set(plan.merges.flatMap((m) => m.from));
  return (
    <div className="card ask">
      <p>
        <strong>Some companies were saved with a job title as their name.</strong> Fix them?
      </p>
      <ul className="changes">
        {plan.fixes.map((f) => (
          <li key={f.companyId}>
            {f.from !== f.to ? (
              <>
                <s>{f.from}</s> → <strong>{f.to}</strong>
              </>
            ) : (
              <strong>{f.to}</strong>
            )}
            {[...f.addRoles, ...f.renameRoles.map((r) => r.title)].map((t) => (
              <span key={t} className="muted">
                {' '}
                · role: {t}
              </span>
            ))}
            {mergedAway.has(f.companyId) && <span className="muted"> (merged)</span>}
          </li>
        ))}
      </ul>
      {plan.merges.map((m) => (
        <p key={m.into} className="small">
          {m.from.length + 1} entries become one <strong>{m.name}</strong>, keeping all their history.
        </p>
      ))}
      <div className="row">
        <button className="primary" onClick={() => void applyRepairs(plan)}>
          Fix these
        </button>
        <button onClick={() => setDismissed(true)}>Not now</button>
      </div>
    </div>
  );
}
