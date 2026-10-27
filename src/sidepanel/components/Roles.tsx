import { useState } from 'react';
import { deleteRole, saveRole, updateRole } from '../../db/repo';
import { ROLE_SOURCES, type Application, type Role, type RoleSource } from '../../db/types';
import type { PageContext } from '../../lib/pageContext';
import { PLATFORM_LABELS, roleSource } from '../format';
import { EditButtons, EntryActions } from './Activity';

interface Props {
  companyId: number;
  roles: Role[];
  applications: Application[];
  ctx?: PageContext;
  /** The job open in the tab, and jobs a company page lists; offered for saving when not saved yet. */
  pageRoles: { title: string; url: string }[];
}

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A company's roles: saved ones (editable), ones on the page to save, and a form to add any. */
export function Roles({ companyId, roles, applications, ctx, pageRoles }: Props) {
  const [adding, setAdding] = useState(false);
  const unsaved = pageRoles.filter((p) => !roles.some((r) => (p.url && r.url === p.url) || sameTitle(r.title, p.title)));
  const applied = (r: Role) => applications.some((a) => a.roleId === r.id || (a.roleTitle && sameTitle(a.roleTitle, r.title)));
  const source = roleSource(ctx);

  return (
    <section className="section">
      <div className="section-head">
        <h3 className="section-title">Roles</h3>
        {!adding && (
          <button className="btn-ghost btn-xs" onClick={() => setAdding(true)}>
            + Role
          </button>
        )}
      </div>
      {unsaved.map((p) => (
        <div key={p.url || p.title} className="callout">
          <p className="grow">
            On this page: <strong>{p.title}</strong>
          </p>
          <button className="primary btn-sm" onClick={() => saveRole(companyId, { title: p.title, url: p.url, source })}>
            Save role
          </button>
        </div>
      ))}
      {adding && (
        <RoleForm
          initial={{ title: '', url: '', source }}
          onSave={async (r) => {
            await saveRole(companyId, r);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {roles.length ? (
        <ul className="list">
          {roles.map((r) => (
            <RoleRow key={r.id} role={r} applied={applied(r)} />
          ))}
        </ul>
      ) : (
        !unsaved.length && !adding && <p className="empty">No roles saved yet.</p>
      )}
    </section>
  );
}

function RoleRow({ role, applied }: { role: Role; applied: boolean }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="list-row">
        <RoleForm
          initial={role}
          onSave={async (r) => {
            await updateRole(role.id, r);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }
  return (
    <li className="list-row">
      {role.url ? (
        <a className="grow" href={role.url} target="_blank" rel="noreferrer">
          {role.title}
        </a>
      ) : (
        <span className="grow">{role.title}</span>
      )}
      {applied && <span className="tag tag-green">Applied</span>}
      <span className="muted small">{PLATFORM_LABELS[role.source]}</span>
      <EntryActions onEdit={() => setEditing(true)} onDelete={() => deleteRole(role.id)} />
    </li>
  );
}

type RoleFields = Pick<Role, 'title' | 'url' | 'source'>;

function RoleForm({ initial, onSave, onCancel }: { initial: RoleFields; onSave: (r: RoleFields) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [url, setUrl] = useState(initial.url);
  const [source, setSource] = useState<RoleSource>(initial.source);
  return (
    <form
      className="form entry-edit grow"
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) void onSave({ title: title.trim(), url: url.trim(), source });
      }}
    >
      <label>
        Role
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Member of Technical Staff" autoFocus />
      </label>
      <div className="row">
        <label className="grow">
          Found on
          <select value={source} onChange={(e) => setSource(e.target.value as RoleSource)}>
            {ROLE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {PLATFORM_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          Link <span className="muted">(optional)</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
      </div>
      <EditButtons onCancel={onCancel} />
    </form>
  );
}
