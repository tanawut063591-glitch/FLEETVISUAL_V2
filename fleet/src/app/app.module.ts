import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { UrlSerializer } from '@angular/router';

import { provideHighcharts } from 'highcharts-angular';

import { App } from './app';
import { CoreModule } from './core/core.module';
import { AppRoutingModule } from './app.routes';

import { AppInitService } from './shared/services/app-init.service';
//import { CustomUrlSerializer } from './shared/services/url-serialize';

export function init_app(appInitService: AppInitService): () => Promise<boolean> {
  return () => appInitService.getConfigs();
}

@NgModule({
  declarations: [App],
  imports: [
    BrowserModule,
    //CoreModule,
    AppRoutingModule,
  ],
  providers: [
    provideHighcharts({
      modules: () => [
        import('highcharts/modules/xrange'),
      ],
    }),

    AppInitService,

    {
      provide: APP_INITIALIZER,
      useFactory: init_app,
      deps: [AppInitService],
      multi: true,
    },

    // {
    //   provide: UrlSerializer,
    //   useClass: CustomUrlSerializer,
    // },
  ],
  bootstrap: [App],
})
export class AppModule {}