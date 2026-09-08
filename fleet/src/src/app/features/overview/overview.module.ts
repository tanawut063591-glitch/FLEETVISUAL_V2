import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { MapsAllComponent } from './maps-all/maps-all.component';
import { OverviewComponent } from './overview.component';
import { OverviewCardComponent } from './summary-overview-card/overview-card/overview-card.component';
import { SummaryOverviewCardComponent } from './summary-overview-card/summary-overview-card.component';
import { SummaryOverviewComponent } from './summary-overview/summary-overview.component';

const routes: Routes = [{ path: '', component: OverviewComponent }];

@NgModule({
  declarations: [
    OverviewComponent,
    MapsAllComponent,
    SummaryOverviewComponent,
    SummaryOverviewCardComponent,
    OverviewCardComponent,
  ],
  imports: [CommonModule, SharedComponentsModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class OverviewFeatureModule {}
