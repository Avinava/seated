import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Prerender the pages a stranger lands on: home, the brand kit and the guest
 * "find your seat" page. Event screens read IndexedDB, so they render in the
 * browser only.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'brand', renderMode: RenderMode.Prerender },
  { path: 's', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
