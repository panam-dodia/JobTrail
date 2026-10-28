// Everything Gmail-specific that may break when Gmail changes lives here.
export const GMAIL = {
  /** Compose and pop-out reply windows. */
  compose: 'div[role="dialog"]',
  /** Recipient chips in a compose window. */
  composeRecipients: '[email], [data-hovercard-id*="@"]',
  composeSubject: 'input[name="subjectbox"]',
  /** The text being written in a compose window. */
  composeBody: '[contenteditable="true"][role="textbox"], div[aria-label="Message Body"]',
  /** An open conversation: its subject, and the people on each message (sender and recipients). */
  threadSubject: 'h2.hP',
  participants: 'span.gD[email], span.g2[email], span.g2[data-hovercard-id]',
  /** Each message's text in an open conversation, oldest first. */
  messageBody: 'div.a3s',
  /** Your own address is in the tab title: "Inbox (3) - me@example.com - Gmail". */
  ownEmail: /\s-\s([^\s@]+@[^\s]+)\s-\s/,
  /** Marketing words around a company's name in its domain: withbasis.co, getacme.com, acmehq.com. */
  domainPrefixes: ['with', 'get', 'try', 'join'],
  domainSuffixes: ['hq', 'app', 'inc', 'labs', 'team'],
  /** Shared inboxes, not a person: hello@, jobs@, careers@… */
  sharedInbox: /^(hello|hi|hey|info|contact|team|founders?|jobs|careers|hiring|recruiting|talent|people|hr|apply|work|join|admin|support)$/,
  minCompanyLength: 3,
  /** The greeting that opens an email: "Hi Helios team," / "Dear Hiring Team at Acme". */
  greeting: /^\s*(?:hi|hello|hey|dear)\s+([^,!\n]{2,60}?)\s*[,!\n]/i,
  /** "Helios team" names the company; "Hiring Team" alone doesn't. */
  teamGreeting: /^(?:the\s+)?(.+?)\s+team$/i,
  genericTeam: /^(hiring|recruiting|talent|people|engineering|founding)$/i,
  /** Greetings that name no one: "Hi there," / "Hello all,". */
  noOneGreeting: /^(there|all|everyone|folks|team|(the\s+)?(hiring|recruiting)\s+(team|manager))$/i,
  /** Personal email providers: the address says nothing about the company. */
  freeDomains: [
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com',
    'aol.com', 'proton.me', 'protonmail.com',
  ],
};
