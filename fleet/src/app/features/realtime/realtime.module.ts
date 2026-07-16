import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule, Routes } from '@angular/router';

import { SharedComponentsModule } from '../../shared/shared-components.module';
import { AuxEngineComponent } from './aux-engine/aux-engine.component';
import { DieselGeneratorNoRpmVtotalComponent } from './diesel-generator-no-rpm-vtotal/diesel-generator-no-rpm-vtotal.component';
import { DieselGeneratorNoRpmComponent } from './diesel-generator-no-rpm/diesel-generator-no-rpm.component';
import { ElectricMotorComponent } from './electric-motor/electric-motor.component';
import { Main2EngineComponent } from './main-2engine/main-engine.component';
import { MainEngineElectricComponent } from './main-engine-electric/main-engine-electric.component';
import { MainEngineComponent } from './main-engine/main-engine.component';
import { MapComponent } from './map/map.component';
import { RealtimeComponent } from './realtime.component';
import { SummaryComponent } from './summary/summary.component';

const routes: Routes = [
  { path: '', component: RealtimeComponent },
  { path: ':id', component: RealtimeComponent },
];

@NgModule({
  declarations: [
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
  ],
  imports: [CommonModule, MatTooltipModule, SharedComponentsModule, RouterModule.forChild(routes)],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class RealtimeFeatureModule {}
