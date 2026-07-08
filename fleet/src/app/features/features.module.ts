import { NgModule, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { SharedComponentsModule } from '../shared/shared-components.module';

import { OverviewComponent } from './overview/overview.component';
import { MapsAllComponent } from './overview/maps-all/maps-all.component';
import { SummaryOverviewComponent } from './overview/summary-overview/summary-overview.component';
import { SummaryOverviewCardComponent } from './overview/summary-overview-card/summary-overview-card.component';
import { OverviewCardComponent } from './overview/summary-overview-card/overview-card/overview-card.component';

import { DiagramComponent } from './diagram/diagram.component';
import { NotfoundComponent } from './notfound/notfound.component';

import { PastTrackComponent } from './past-track/past-track.component';
import { PastTrackMapComponent } from './past-track/components/past-track-map/past-track-map.component';
import { PastTrackSummaryComponent } from './past-track/components/past-track-summary/past-track-summary.component';
import { PastTrackDetailComponent } from './past-track/components/past-track-detail/past-track-detail.component';
import { PastTrackTimelineComponent } from './past-track/components/past-track-timeline/past-track-timeline.component';
import { PastTrackPlaybackComponent } from './past-track/components/past-track-playback/past-track-playback.component';

const FEATURE_COMPONENTS = [
  OverviewComponent,
  MapsAllComponent,
  SummaryOverviewComponent,
  SummaryOverviewCardComponent,
  OverviewCardComponent,
  DiagramComponent,
  NotfoundComponent,
  PastTrackComponent,
  PastTrackMapComponent,
  PastTrackSummaryComponent,
  PastTrackDetailComponent,
  PastTrackTimelineComponent,
  PastTrackPlaybackComponent,
];

@NgModule({
  imports: [
    SharedComponentsModule,
  ],
  declarations: FEATURE_COMPONENTS,
  exports: FEATURE_COMPONENTS,
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class FeaturesModule {}
