import { describe, expect, it } from 'vitest';
import { roleFromNote } from './noteRole';

const FELIX =
  'Hi Felix, reaching out here since the YC platform has a message limit. I feel I’m a strong fit for the MTS role. ' +
  'I built an agent that fills IRS forms from CRM data and messy client documents, routing anything unverified to human review.';

describe('roleFromNote', () => {
  it('reads "the X role" from a note', () => {
    expect(roleFromNote(FELIX)).toEqual({ roleTitle: 'MTS' });
    expect(roleFromNote('Excited about your Founding Engineer position at Acme')).toEqual({ roleTitle: 'Founding Engineer' });
    expect(roleFromNote('I applied to the Software Engineer - Backend opening')).toEqual({ roleTitle: 'Software Engineer - Backend' });
  });

  it('prefers a saved role named in the note', () => {
    const roles = [
      { id: 1, title: 'Engineer' },
      { id: 2, title: 'Founding Engineer' },
    ];
    expect(roleFromNote('Keen on the founding engineer job!', roles)).toEqual({ roleId: 2 });
    expect(roleFromNote(FELIX, [{ id: 7, title: 'MTS' }])).toEqual({ roleId: 7 });
  });

  it('gives nothing when no role is named', () => {
    expect(roleFromNote('Would love to learn about the right role for me on your team')).toEqual({});
    expect(roleFromNote('')).toEqual({});
  });
});
