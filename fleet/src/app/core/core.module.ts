import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

import { MaterialModule } from './module/material-module';
import { ShareModule } from '../shared/shared.module';
import { ChartsModule } from '../shared/chart.module';

import { LoginComponent } from './components/login/login.component';
import { MainComponent } from './components/main/main.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { NotFound } from './components/not-found/not-found';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    DragDropModule,
    OverlayModule,
    PortalModule,

    MaterialModule,
    ShareModule,
    ChartsModule,
  ],

  declarations: [
    LoginComponent,
    MainComponent,
    HeaderComponent,
    SidebarComponent,
    NotFound,
  ],

  providers: [
    DatePipe,
    DecimalPipe,
  ],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule | null) {
    if (parentModule) {
      throw new Error(
        'CoreModule is already loaded. Import it only in AppModule.'
      );
    }
  }
}