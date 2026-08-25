// apps/angular-banking/src/app/app.routes.ts — the route table.
//
// Only routes whose screens actually exist are declared. A placeholder route rendering "coming soon"
// makes an unfinished app look finished, so an unbuilt step is simply absent rather than pretending
// to be a form.
//
// Every screen is lazily loaded with `loadComponent`. Angular's production budget starts warning at
// 500kB and this app carries a design system, an icon set and the consent SDK — splitting per route
// keeps the first paint to the login screen, which is the only page a signed-out visitor can reach.
import type { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
    title: 'Sign in — FinSecure Bank',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
    title: 'Dashboard — FinSecure Bank',
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];
