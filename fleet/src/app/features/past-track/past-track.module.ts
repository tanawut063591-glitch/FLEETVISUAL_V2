import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { RouterModule, Routes } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { PastTrackDetailComponent } from './components/past-track-detail/past-track-detail.component';
import { PastTrackMapComponent } from './components/past-track-map/past-track-map.component';
import { PastTrackPlaybackComponent } from './components/past-track-playback/past-track-playback.component';
import { PastTrackSummaryComponent } from './components/past-track-summary/past-track-summary.component';
import { PastTrackTimelineComponent } from './components/past-track-timeline/past-track-timeline.component';
import { PastTrackComponent } from './past-track.component';

const routes: Routes = [
  { path: '', component: PastTrackComponent },
  { path: ':id', component: PastTrackComponent },
];

@NgModule({
  declarations: [
    PastTrackComponent,
    PastTrackMapComponent,
    PastTrackSummaryComponent,
    PastTrackDetailComponent,
    PastTrackTimelineComponent,
    PastTrackPlaybackComponent,
  ],
  imports: [CommonModule, FormsModule, ScrollingModule, SharedComponentsModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class PastTrackFeatureModule {}
