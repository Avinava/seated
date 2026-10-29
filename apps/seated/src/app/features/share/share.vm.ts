/**
 * The guest link: the app's origin and base href, the public route `s`, and
 * the encoded event in the fragment. Fragments never reach a server, so the
 * guest list stays between the hosts and their guests.
 */
export function shareUrl(origin: string, baseHref: string, token: string): string {
  const base = `/${baseHref.replace(/^\/+|\/+$/g, '')}/`.replace(/\/{2,}/g, '/');
  return `${origin.replace(/\/+$/, '')}${base}s#${token}`;
}
