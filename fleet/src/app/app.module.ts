import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { StoreModule } from '@ngrx/store';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { App } from './app';
import { AppRoutingModule } from './app.routes';
import { CoreModule } from './core/core.module';
import { FeaturesModule } from './features/features.module';
import { reducers } from './store/reducers/recuder';

import { tokenInterceptor } from './core/interceptors/token.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

@NgModule({
  declarations: [
    App,
  ],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    StoreModule.forRoot(reducers),
    CoreModule,
    FeaturesModule,
  ],

  providers: [
    provideHttpClient(
      withInterceptors([
        tokenInterceptor,
        errorInterceptor,
      ])
    ),
  ],

  bootstrap: [
    App,
  ],
})
export class AppModule {}