// Everything Gmail-specific that may break when Gmail changes lives here.
export const GMAIL = {
  /** Compose and pop-out reply windows. */
  compose: 'div[role="dialog"]',
  /** Recipient chips in a compose window. */
  composeRecipients: '[email], [data-hovercard-id*="@"]',
  composeSubject: 'input[name="subjectbox"]',
  /** An open conversation: its subject, and the people on each message (sender and recipients). */
  threadSubject: 'h2.hP',
  participants: 'span.gD[email], span.g2[email]',
  /** Your own address is in the tab title: "Inbox (3) - me@example.com - Gmail". */
  ownEmail: /\s-\s([^\s@]+@[^\s]+)\s-\s/,
  /** Personal email providers: the address says nothing about the company. */
  freeDomains: [
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com',
    'aol.com', 'proton.me', 'protonmail.com',
  ],
};
