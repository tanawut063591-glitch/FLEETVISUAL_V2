import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { DatetimeControlModule } from '../datetime-control/datetime-control.module';
import { DataLoggerComponent } from './data-logger.component';

const routes: Routes = [
  {
    path: '',
    component: DataLoggerComponent,
  },
];

@NgModule({
  declarations: [DataLoggerComponent],
  imports: [CommonModule, FormsModule, DatetimeControlModule, RouterModule.forChild(routes)],
})
export class DataLoggerFeatureModule {}
