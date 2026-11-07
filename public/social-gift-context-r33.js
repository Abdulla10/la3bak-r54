/* Presentation-only gift target. Does not join, seat, grant voice or authorize a send. */
const publicId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16}$/.test(value);
const list = value => Array.isArray(value) ? value : [];

export function publicGiftCouncils(snapshot) {
  const support = snapshot?.publicSupport;
  if (support?.available !== true || !snapshot?.room?.id) return [];
  const seen = new Set();
  return list(support.councils).filter(c => typeof c?.id === 'string' && c.id && !seen.has(c.id) && seen.add(c.id))
    .map(c => ({ id: c.id, name: typeof c.name === 'string' ? c.name : 'المجلس', recipients: list(c.recipients)
      .filter(p => publicId(p?.id) && p.id !== snapshot.selfId && p.available !== false && !p.unavailable) }));
}

export function giftTarget(snapshot, selectedCouncil = '') {
  const roomId = snapshot?.room?.id;
  if (typeof roomId !== 'string' || !roomId) return null;
  const current = snapshot.current;
  if (current?.roomId === roomId && current.councilId) {
    const c = list(snapshot.room.councils).find(x => x.id === current.councilId && x.joined !== false);
    if (c) return { roomId, councilId: c.id, name: c.name || 'المجلس', external: false,
      recipients: list(c.members).filter(p => publicId(p?.id) && p.id !== snapshot.selfId && p.available !== false && !p.unavailable) };
  }
  const councils = publicGiftCouncils(snapshot);
  const selected = selectedCouncil ? councils.find(c => c.id === selectedCouncil) : councils[0];
  return selected ? { roomId, councilId: selected.id, name: selected.name, external: true, recipients: selected.recipients } : null;
}

export function giftTargetKey(snapshot, selectedCouncil = '') {
  const target = giftTarget(snapshot, selectedCouncil);
  return target ? `${target.roomId}:${target.councilId}` : '';
}
