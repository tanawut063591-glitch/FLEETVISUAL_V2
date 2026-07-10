import {
  NgModule,
  NO_ERRORS_SCHEMA,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PdfViewerModule } from 'ng2-pdf-viewer';

import { SharedComponentsModule } from '../shared/shared-components.module';

import { OverviewComponent } from './overview/overview.component';
import { MapsAllComponent } from './overview/maps-all/maps-all.component';
import { SummaryOverviewComponent } from './overview/summary-overview/summary-overview.component';
import { SummaryOverviewCardComponent } from './overview/summary-overview-card/summary-overview-card.component';
import { OverviewCardComponent } from './overview/summary-overview-card/overview-card/overview-card.component';

import { DiagramComponent } from './diagram/diagram.component';
import { ReportComponent } from './report/report.component';
import { NotfoundComponent } from './notfound/notfound.component';

import { RealtimeComponent } from './realtime/realtime.component';
import { SummaryComponent } from './realtime/summary/summary.component';
import { MapComponent } from './realtime/map/map.component';
import { MainEngineComponent } from './realtime/main-engine/main-engine.component';
import { Main2EngineComponent } from './realtime/main-2engine/main-engine.component';
import { MainEngineElectricComponent } from './realtime/main-engine-electric/main-engine-electric.component';
import { AuxEngineComponent } from './realtime/aux-engine/aux-engine.component';
import { DieselGeneratorNoRpmComponent } from './realtime/diesel-generator-no-rpm/diesel-generator-no-rpm.component';
import { DieselGeneratorNoRpmVtotalComponent } from './realtime/diesel-generator-no-rpm-vtotal/diesel-generator-no-rpm-vtotal.component';
import { ElectricMotorComponent } from './realtime/electric-motor/electric-motor.component';

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
  ReportComponent,
  NotfoundComponent,

  RealtimeComponent,
  SummaryComponent,
  MapComponent,
  MainEngineComponent,
  Main2EngineComponent,
  MainEngineElectricComponent,
  AuxEngineComponent,
  DieselGeneratorNoRpmComponent,
  DieselGeneratorNoRpmVtotalComponent,
  ElectricMotorComponent,

  PastTrackComponent,
  PastTrackMapComponent,
  PastTrackSummaryComponent,
  PastTrackDetailComponent,
  PastTrackTimelineComponent,
  PastTrackPlaybackComponent,
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SharedComponentsModule,
    MatTooltipModule,
    PdfViewerModule,
  ],
  declarations: [
    ...FEATURE_COMPONENTS,
  ],
  exports: [
    ...FEATURE_COMPONENTS,
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA,
    NO_ERRORS_SCHEMA,
  ],
})
export class FeaturesModule {}
