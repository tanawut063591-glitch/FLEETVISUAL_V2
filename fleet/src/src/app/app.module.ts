import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHighcharts } from 'highcharts-angular';

import { App } from './app';
import { AppRoutingModule } from './app.routes';
import { CoreModule } from './core/core.module';
import { reducers } from './store/reducers/recuder';
import { FvInfoEffects } from './store/effects/fv-info.effects';
import { FvOverviewEffects } from './store/effects/fv-overview.effects';

import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

@NgModule({
  declarations: [App],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    StoreModule.forRoot(reducers),
    EffectsModule.forRoot([FvInfoEffects, FvOverviewEffects]),
    CoreModule,
  ],

  providers: [
    provideHighcharts({
      instance: () => import('highcharts/esm/highcharts').then((module) => module.default),



      modules: () => [
        (async () => {
          await import('highcharts/esm/modules/exporting');
          return import('highcharts/esm/modules/offline-exporting');
        })(),
      ],
    }),
    provideHttpClient(withInterceptors([tokenInterceptor, errorInterceptor])),
  ],

  bootstrap: [App],
})
export class AppModule {}
