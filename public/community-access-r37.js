/* Compatibility safety guard only. No children's page, game, age picker,
 * settings UI, new storage or unlock operation is implemented here.
 * Removing a section must not silently unlock a pre-existing device restriction. */
export function isCommunityRestricted() {
  try {
    const saved = JSON.parse(localStorage.getItem('qa_kids_v1') || 'null');
    return saved?.v === 1 && saved.noCommunity === true;
  } catch {
    // Match the old read behaviour when storage is unavailable or malformed.
    return false;
  }
}
