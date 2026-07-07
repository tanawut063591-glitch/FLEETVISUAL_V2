import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { App } from './app';
import { CoreModule } from './core/core.module';
import { AppRoutingModule } from './app.routes';

@NgModule({
  declarations: [
    App,
  ],

  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    CoreModule,
    AppRoutingModule,
  ],

  providers: [],

  bootstrap: [
    App,
  ],
})
export class AppModule {}