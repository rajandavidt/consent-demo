// apps/angular-insurance/src/app/pages/privacy.page.ts — the standing privacy screen.
//
// A heading, the preference panel, and three reference cards below it. The panel names no purposes and
// neither does this page: everything a customer reads here comes from the published policy.
//
// GUARDED ON CONFIGURATION BEFORE ANYTHING READS CONSENT. An unconfigured build has no manager, so a
// panel mounted anyway would fire a read that can only fail and then report a loading state forever.
// The React version learned this the hard way on its first Vercel deploy, where the environment
// variables were unset and the screen went white with the real cause only in the console. Saying
// plainly that the build is unconfigured is the whole fix.
//
// THE CARDS SIT BELOW, NOT BESIDE. They were beside in an earlier React layout, which stacked three
// squeezes: the shell capped content, the grid gave the panel two thirds of that, and the panel then
// split off its own summary rail — leaving the decision cards around 460px, at which width purpose
// names wrapped to two lines and "Not now" broke mid-button. The cards carry a name, a reason, an
// element, two actions and an expiry window; they need the room.
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-angular';
import { ConsentService } from '../core/consent.service';
import { ConsentPreferences } from '../consent/consent-preferences';

@Component({
  selector: 'app-privacy-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConsentPreferences, LucideAngularModule],
  templateUrl: './privacy.page.html',
})
export class PrivacyPage {
  readonly consent = inject(ConsentService);

  readonly icons = { warning: TriangleAlert, rotate: RotateCcw, shield: ShieldCheck };
}
