import test from 'node:test';
import assert from 'node:assert/strict';
import { canSend, drawParticipants } from '../lib/draw.mjs';

const p = (id, country, geography = 'domestic') => ({ id, country, geography, status: 'confirmed' });

test('domestic participants are matched inside their country', () => {
  const result = drawParticipants([p('a', 'Россия'), p('b', 'Россия')], {}, () => .5);
  assert.equal(result.ok, true);
  assert.deepEqual(result.assignments.sort((x,y) => x.senderId.localeCompare(y.senderId)), [
    { senderId: 'a', recipientId: 'b' }, { senderId: 'b', recipientId: 'a' }
  ]);
});

test('a domestic-only singleton blocks a draw', () => {
  const result = drawParticipants([p('a', 'Израиль'), p('b', 'Россия'), p('c', 'Россия')], {}, () => .5);
  assert.equal(result.ok, false);
  assert.deepEqual(result.blocked, ['a']);
});

test('international means same country or an allowed route', () => {
  const sender = p('a', 'Израиль', 'international');
  assert.equal(canSend(sender, p('b', 'Израиль'), {}), true);
  assert.equal(canSend(sender, p('c', 'Россия'), { 'Израиль->Россия': true }), true);
  assert.equal(canSend(sender, p('d', 'Германия'), {}), false);
});
