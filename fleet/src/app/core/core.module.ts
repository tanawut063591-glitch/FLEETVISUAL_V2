import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedComponentsModule } from '../shared/shared-components.module';

import { LoginComponent } from './components/login/login.component';
import { MainComponent } from './components/main/main.component';
import { HeaderComponent } from './components/header/header.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';

@NgModule({
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SharedComponentsModule],

  declarations: [LoginComponent, MainComponent, HeaderComponent, SidebarComponent],

  exports: [
    LoginComponent,
    MainComponent,
    HeaderComponent,
    SidebarComponent,
    SharedComponentsModule,
  ],

  providers: [DatePipe, DecimalPipe],
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it only in AppModule.');
    }
  }
}
