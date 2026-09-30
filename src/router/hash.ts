/**
 * `#fragment` helpers. A malformed escape (`/#%zz`) makes decodeURIComponent throw; left
 * unguarded in an effect that would unmount the whole app, so every fragment is decoded here.
 */

/** The fragment decoded, keeping its leading `#` if it had one; as written if it isn't valid. */
export function decodeHash(hash: string): string {
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

/** The element a `#fragment` (or a bare id) points at, or null. */
export function hashElement(hash: string): HTMLElement | null {
  const id = decodeHash(hash).replace(/^#/, '');
  return id ? document.getElementById(id) : null;
}
