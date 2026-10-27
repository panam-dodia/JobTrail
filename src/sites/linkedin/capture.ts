import type { CapturedOutreach } from '../../lib/messages';
import { extractLinkedIn } from './extract';
import { LINKEDIN } from './selectors';

const clean = (s?: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Watches for a connection request sent from a profile. Clicking Connect, or closing the dialog,
 * does nothing: only "Send" counts, and only once the profile's own button turns into "Pending".
 * Sends from elsewhere on the page (sidebar suggestions) don't change that button, so they're ignored.
 * Only reads the page; never clicks or types. Fails quietly.
 */
export function watchConnectionRequests(onSent: (c: CapturedOutreach) => void): void {
  const I = LINKEDIN.invite;
  document.addEventListener(
    'click',
    (e) => {
      try {
        // composedPath reaches inside shadow roots, where LinkedIn sometimes renders dialogs.
        const path = e.composedPath().filter((n): n is Element => n instanceof Element);
        const button = path.find((el) => el.matches('button, [role="button"]'));
        if (!button || !I.send.test(clean(button.getAttribute('aria-label') || button.textContent))) return;
        const dialog = path.find((el) => el.matches(I.dialog));
        if (!dialog) return;

        const before = extractLinkedIn(document, location.href);
        if (!before.personName || !before.profileUrl || before.connection !== 'none') return;
        // Read the note now: the dialog is gone once the request is sent.
        const note = (dialog.querySelector(I.note) as HTMLTextAreaElement | null)?.value ?? '';
        const profileUrl = before.profileUrl;

        const started = Date.now();
        const timer = setInterval(() => {
          const now = extractLinkedIn(document, location.href);
          if (now.profileUrl !== profileUrl || Date.now() - started > I.confirmMs) return clearInterval(timer);
          if (now.connection !== 'pending') return;
          clearInterval(timer);
          onSent({
            personName: now.personName ?? before.personName!,
            personTitle: now.personTitle ?? before.personTitle,
            companyName: now.companyName ?? before.companyName,
            profileUrl,
            channel: 'linkedin_connection',
            note: note.trim(),
          });
        }, I.pollMs);
      } catch {
        // Selectors drifted; manual logging in the side panel still works.
      }
    },
    true,
  );
}
