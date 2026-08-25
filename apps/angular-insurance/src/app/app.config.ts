import {
  type ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Zoneless: every piece of state in this app is a signal, so there is nothing for zone.js to
    // patch on its behalf. It also keeps the SDK's plain promises out of a change-detection scheme
    // that would otherwise re-render on each one.
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      // Land at the top of a newly opened screen, and restore position on Back. Without this a
      // router navigation keeps the previous scroll offset, so a long KYC page opens halfway down.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
  ],
};
