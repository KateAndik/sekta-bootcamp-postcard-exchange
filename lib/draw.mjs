import crypto from 'node:crypto';

export function canSend(sender, recipient, routes = {}) {
  if (sender.id === recipient.id) return false;
  if (sender.country === recipient.country) return true;
  if (sender.geography !== 'international') return false;
  return routes[`${sender.country}->${recipient.country}`] === true;
}

export function drawParticipants(participants, routes = {}, random = Math.random) {
  const ready = participants.filter(item => item.status === 'confirmed');
  const recipients = [...ready];
  const ordered = [...ready].sort((a, b) => {
    const aCount = recipients.filter(r => canSend(a, r, routes)).length;
    const bCount = recipients.filter(r => canSend(b, r, routes)).length;
    return aCount - bCount;
  });
  const assignments = new Map();
  const used = new Set();

  function search(index) {
    if (index === ordered.length) return true;
    const sender = ordered[index];
    const candidates = recipients
      .filter(recipient => !used.has(recipient.id) && canSend(sender, recipient, routes))
      .map(recipient => ({ recipient, weight: random() }))
      .sort((a, b) => a.weight - b.weight)
      .map(item => item.recipient);

    for (const recipient of candidates) {
      assignments.set(sender.id, recipient.id);
      used.add(recipient.id);
      if (search(index + 1)) return true;
      assignments.delete(sender.id);
      used.delete(recipient.id);
    }
    return false;
  }

  if (ready.length < 2 || !search(0)) {
    return {
      ok: false,
      reason: ready.length < 2 ? 'not_enough_participants' : 'no_valid_assignment',
      blocked: ordered
        .filter(sender => !recipients.some(recipient => canSend(sender, recipient, routes)))
        .map(sender => sender.id)
    };
  }

  return {
    ok: true,
    assignments: [...assignments].map(([senderId, recipientId]) => ({ senderId, recipientId }))
  };
}

export function secureShuffleSeed() {
  return crypto.randomBytes(16).toString('hex');
}
