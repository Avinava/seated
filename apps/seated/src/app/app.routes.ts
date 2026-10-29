import { type Routes } from '@angular/router';
import { AppLayout } from './shell/app-layout';

/**
 * Every screen is lazy. Route and query params bind straight to component
 * inputs (withComponentInputBinding), so a filtered guest list or an open guest
 * panel is a URL you can share or reload.
 */
export const routes: Routes = [
  {
    path: 's',
    title: $localize`:@@title.findSeat:Find your seat`,
    loadComponent: () => import('./features/share/find-seat-page'),
  },
  {
    path: '',
    component: AppLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: $localize`:@@title.events:Your events`,
        loadComponent: () => import('./features/events/events-page'),
      },
      {
        path: 'brand',
        title: $localize`:@@title.brand:Brand kit`,
        loadComponent: () => import('./features/brand/brand-page'),
      },
      {
        path: 'events/:eventId',
        loadComponent: () => import('./shell/event-layout'),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'seating' },
          {
            path: 'guests',
            title: $localize`:@@title.guests:Guests`,
            loadComponent: () => import('./features/guests/guests-page'),
          },
          {
            path: 'seating',
            title: $localize`:@@title.seating:Seating`,
            loadComponent: () => import('./features/seating/seating-page'),
          },
          {
            path: 'import',
            title: $localize`:@@title.import:Import guests`,
            loadComponent: () => import('./features/import/import-page'),
          },
          {
            path: 'share',
            title: $localize`:@@title.share:Share`,
            loadComponent: () => import('./features/share/share-page'),
          },
          {
            path: 'print',
            title: $localize`:@@title.print:Print`,
            loadComponent: () => import('./features/print/print-page'),
          },
        ],
      },
      {
        path: '**',
        title: $localize`:@@title.notFound:Not found`,
        loadComponent: () => import('./shell/not-found-page'),
      },
    ],
  },
];
