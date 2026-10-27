// A small in-page toast for content scripts. Lives in a shadow root so the site's CSS can't touch it.

export interface ToastAction {
  label: string;
  onClick: () => void;
}

const STYLE = `
  .toast { position: fixed; z-index: 2147483647; right: 20px; bottom: 20px; max-width: 360px;
    display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px;
    background: #18181b; color: #fafafa; font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
    box-shadow: 0 8px 24px rgba(0,0,0,.25); }
  .text { flex: 1; }
  .brand { color: #a5b4fc; font-weight: 600; margin-right: 4px; }
  button { all: unset; cursor: pointer; color: #a5b4fc; font-weight: 600; padding: 2px 4px; border-radius: 4px; }
  button:hover { background: rgba(255,255,255,.08); }
  .close { color: #a1a1aa; }
`;

let current: HTMLElement | undefined;

/** Shows one toast at a time; returns a function that updates its text (and drops the actions). */
export function showToast(text: string, actions: ToastAction[] = [], timeoutMs = 10000): (text: string) => void {
  current?.remove();
  const host = document.createElement('div');
  current = host;
  const root = host.attachShadow({ mode: 'closed' });
  root.innerHTML = `<style>${STYLE}</style><div class="toast" role="status"><span class="text"><span class="brand">JobTrail</span><span class="msg"></span></span></div>`;
  const box = root.querySelector('.toast')!;
  const msg = root.querySelector('.msg')!;
  msg.textContent = text;

  const buttons = actions.map((a) => {
    const b = document.createElement('button');
    b.textContent = a.label;
    b.addEventListener('click', a.onClick);
    box.append(b);
    return b;
  });
  const close = document.createElement('button');
  close.className = 'close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => host.remove());
  box.append(close);

  document.body.append(host);
  let timer = setTimeout(() => host.remove(), timeoutMs);
  return (next: string) => {
    msg.textContent = next;
    buttons.forEach((b) => b.remove());
    clearTimeout(timer);
    timer = setTimeout(() => host.remove(), 4000);
  };
}
