import { NgModule } from '@angular/core';

/**
 * Compatibility shell kept for older imports. Route features are lazy-loaded
 * from dedicated modules so the login and main shell no longer download every
 * dashboard implementation up front.
 */
@NgModule({})
export class FeaturesModule {}
