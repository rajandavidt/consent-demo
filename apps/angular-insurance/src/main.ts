import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { seedBankingData } from '@finsecure/shared/core';

// Seeded before the first render so no screen ever sees an empty store mid-mount. The same call the
// React apps make, from the same module — the seed data is the platform's, not any one app's.
seedBankingData();

void bootstrapApplication(App, appConfig).catch((error: unknown) => {
  console.error(error);
});
