import { Component, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { ConsentService } from '../core/consent.service';

@Component({
  selector: 'app-dashboard-page',
  template: `
    <div class="p-8">
      <h1 class="text-xl font-semibold text-slate-900">
        Welcome back, {{ auth.user()?.name }}
      </h1>
      <p class="mt-2 text-sm text-slate-500">
        Consent is
        {{ consent.configured ? 'configured' : 'not configured' }}; purposes read:
        {{ consent.states()?.length ?? 'pending' }}
      </p>
    </div>
  `,
})
export class DashboardPage {
  readonly auth = inject(AuthService);
  readonly consent = inject(ConsentService);
}
