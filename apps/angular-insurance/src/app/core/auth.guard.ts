// apps/angular-insurance/src/app/core/auth.guard.ts — every screen behind sign-in.
//
// The `ready` check is the whole reason this is not a one-liner. `AuthService` reads localStorage in
// its constructor, so by the time a guard runs the session IS known — but the flag is kept and
// honoured anyway, because a guard that redirects on a not-yet-loaded session sends a signed-in
// person to the login page on every hard refresh, and that bug is invisible until it is reported.
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.ready() && auth.isAuthenticated()) return true;
  // `from` is carried so sign-in can return the person to the page they actually asked for, rather
  // than dropping everyone on the dashboard.
  return router.createUrlTree(['/login'], { queryParams: { from: state.url } });
};
