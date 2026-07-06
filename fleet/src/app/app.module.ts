import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHighcharts } from 'highcharts-angular';
import { App } from './app';
import { CoreModule } from './core/core.module';
import { AppRoutingModule } from './app.routes';
import { AppInitService } from './shared/services/app-init.service';
import { PerformanceModule } from './features/central/pages/performance/performance-module';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { UrlSerializer } from '@angular/router';
import { CustomUrlSerializer } from './shared/services/url-serialize';


@NgModule({
  declarations: [
    App,
  ],
  imports: [
    BrowserModule,
    CoreModule,
    AppRoutingModule,
  ],
  providers: [
    provideHighcharts({
      modules: () => [import('highcharts/modules/xrange')]
    }),
    AppInitService,
    {
      provide: APP_INITIALIZER,
      useFactory: init_app,
      deps: [AppInitService],
      multi: true
    }
  ],
  bootstrap: [App],
})
export class AppModule {}

export function init_app(appInitService: AppInitService){
  return () => appInitService.getConfigs();
}