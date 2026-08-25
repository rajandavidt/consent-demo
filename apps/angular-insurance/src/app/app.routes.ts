// apps/angular-insurance/src/app/app.routes.ts — the route table.
//
// Only routes whose screens actually exist are declared. A placeholder route rendering "coming soon"
// makes an unfinished app look finished, so an unbuilt step is simply absent rather than pretending
// to be a form.
//
// EVERY SIGNED-IN SCREEN IS A CHILD OF ONE PARENT. The guard and the chrome hang on that parent, so
// there is exactly one place a screen can be admitted from — the React app repeats
// `<Protected><AppShell>` on all eighteen routes, and eighteen chances to forget one is seventeen too
// many.
//
// Screens are lazily loaded with `loadComponent`. Angular's production budget starts warning at
// 500kB and this app carries a design system, an icon set and the consent SDK — splitting per route
// keeps the first paint down to the login screen, which is the only page a signed-out visitor reaches.
import type { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
    title: 'Sign in — FinSecure Insurance',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
        title: 'Overview — FinSecure Insurance',
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
